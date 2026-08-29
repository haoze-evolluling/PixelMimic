<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch, nextTick } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import { useExecution } from '../composables/useExecution'
import { useConfirm } from '../composables/useConfirm'
import CanvasNode from './CanvasNode.vue'
import {
  calculateSmartWaypoints,
  generateRoundedOrthogonalPath,
  generateSmoothBezierPath,
  routeAllEdges,
  NODE_WIDTH,
  NODE_DEFAULT_HEIGHT,
} from '../utils/edgeRouting'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  Trash2,
  Plus,
  GitBranch,
  Route,
  Waypoints,
} from 'lucide-vue-next'

const {
  workflow,
  selectedStepIndex,
  selectStep,
  updateStepPosition,
  connectSteps,
  disconnectBranch,
  deleteStep,
  duplicateStep,
  autoLayoutNodes,
  clearAllSteps,
  loadSampleTemplate,
  testSingleStep,
  edgeStyle,
  quickAddStep,
  updateEdgeCustomWaypoint,
  resetEdgeCustomWaypoint,
} = useWorkflow()

const { stepStatuses, activeStepIndex } = useExecution()
const { confirm } = useConfirm()

// Canvas Viewport State (Pan & Zoom)
const scale = ref(1.0)
const panX = ref(60)
const panY = ref(60)
const isPanning = ref(false)
const panStart = reactive({ x: 0, y: 0 })

// Dragging Node State
const draggingNodeIndex = ref(-1)
const dragOffset = reactive({ x: 0, y: 0 })

// Port Wiring State
const isWiring = ref(false)
const wiringData = reactive({
  sourceIndex: -1,
  portType: 'next',
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
})

// Edge Selection & Waypoint Dragging State
const selectedEdgeId = ref(null)
const hoveredEdgeId = ref(null)
const draggingEdgeData = reactive({
  isDragging: false,
  sourceIndex: -1,
  portType: 'next',
  tempWaypoint: null,
})

const canvasContainerRef = ref(null)

// ---- 端口坐标契约（必须与 CanvasNode.vue 的端口 CSS 保持一致）----
// 输出圆点中心 x = node_x + NODE_WIDTH + 2（dot 12px，right: -8px）
// 输入圆点中心 x = node_x - 2；连线终点在其左侧留 8px 给箭头尖端
// True/False 输出圆点中心 y = 节点垂直中心 ∓/± 16（与 CanvasNode.vue 的端口 CSS 保持一致）
const PORT_OUTPUT_DX = NODE_WIDTH + 2
const PORT_TRUE_DY = -16
const PORT_FALSE_DY = 16
const PORT_INPUT_GAP = 8

// 节点实际渲染高度（ResizeObserver 测量），连线端点与路由据此动态对齐端口
const nodeHeights = reactive({})
const nodeHeightObserver = ref(null)
const observedNodeEls = new WeakSet()

const getNodeHeightAt = (idx) => nodeHeights[idx] || NODE_DEFAULT_HEIGHT

const syncNodeHeights = () => {
  workflow.steps.forEach((_, idx) => {
    const el = document.getElementById(`canvas-node-${idx}`)
    if (!el) return
    if (nodeHeightObserver.value && !observedNodeEls.has(el)) {
      nodeHeightObserver.value.observe(el)
      observedNodeEls.add(el)
    }
    const h = el.offsetHeight
    if (h > 0 && nodeHeights[idx] !== h) {
      nodeHeights[idx] = h
    }
  })
}

const outputPortX = (step) => (step.node_x || 100) + PORT_OUTPUT_DX
const outputPortY = (step, idx, kind) => {
  const centerY = (step.node_y || 160) + getNodeHeightAt(idx) / 2
  return kind === 'false' ? centerY + PORT_FALSE_DY : centerY + PORT_TRUE_DY
}
const inputPortY = (step, idx) => (step.node_y || 160) + getNodeHeightAt(idx) / 2

// 携带实际高度的步骤快照，供路由算法做障碍避让（避免默认高度与实际不符）
const stepsForRouting = computed(() =>
  workflow.steps.map((s, idx) => ({ ...s, node_h: getNodeHeightAt(idx) }))
)

// 步骤增删/重排后重新测量节点高度
watch(
  () => workflow.steps.map(s => s.id || '').join('|'),
  () => nextTick(syncNodeHeights)
)

// Calculate all active connections (Edges) with Smart Obstacle Avoidance
const connections = computed(() => {
  const list = []
  if (!workflow.steps || workflow.steps.length === 0) return list

  const resolveCustomWaypoint = (step, idx, portType) => {
    if (draggingEdgeData.isDragging && draggingEdgeData.sourceIndex === idx && draggingEdgeData.portType === portType) {
      return draggingEdgeData.tempWaypoint
    }
    return step.metadata?.custom_routes?.[portType] || null
  }

  workflow.steps.forEach((step, idx) => {
    const fromX = outputPortX(step)
    const isCondition = step.action_type === 'condition'

    const branches = isCondition
      ? [
          { type: 'then', portKind: 'true', color: 'var(--color-success)', label: 'True 成立', action: step.then_action || 'continue', jumpStep: step.then_jump_step },
          { type: 'else', portKind: 'false', color: 'var(--color-warning)', label: 'False 不成立', action: step.else_action || 'continue', jumpStep: step.else_jump_step },
        ]
      : [
          // 标准动作：True=成功出口（未连线时顺序执行下一步），False=失败出口（仅显式连线时生效）
          { type: 'next', portKind: 'true', color: 'var(--color-success)', action: step.next_action || 'continue', jumpStep: step.next_jump_step, sequential: true },
          { type: 'fail', portKind: 'false', color: 'var(--color-warning)', action: step.fail_action || 'default', jumpStep: step.fail_jump_step, sequential: false },
        ]

    for (const branch of branches) {
      const isJump = branch.action === 'jump' && branch.jumpStep
      let targetIdx = -1
      if (isJump) {
        targetIdx = branch.jumpStep - 1
      } else if (branch.sequential && idx < workflow.steps.length - 1) {
        targetIdx = idx + 1
      }

      // 自环 (targetIdx === idx) 是合法的"重复执行自身"连线，保留
      if (targetIdx < 0 || targetIdx >= workflow.steps.length) continue

      const targetStep = workflow.steps[targetIdx]
      const labelText = isCondition
        ? branch.label
        : (isJump ? `${branch.type === 'fail' ? 'False' : 'True'} 跳至 #${targetIdx + 1}` : null)

      list.push({
        id: `conn-${idx}-${branch.type}-${targetIdx}`,
        fromIndex: idx,
        toIndex: targetIdx,
        type: branch.type,
        isCustomJump: !isCondition && isJump,
        color: branch.color,
        label: labelText || 'Next',
        hasLabel: !!labelText,
        fromX,
        fromY: outputPortY(step, idx, branch.portKind),
        toX: (targetStep.node_x || 100) - PORT_INPUT_GAP,
        toY: inputPortY(targetStep, targetIdx),
        hasCustomRoute: !!step.metadata?.custom_routes?.[branch.type],
        customWaypoint: resolveCustomWaypoint(step, idx, branch.type),
        isActive: activeStepIndex.value === idx || activeStepIndex.value === targetIdx,
      })
    }
  })

  // 统一路由：绕行走廊通道错位 + 标签智能定位，避免连线/标签重合
  const routes = routeAllEdges(
    stepsForRouting.value,
    list.map(c => ({
      key: c.id,
      fromIndex: c.fromIndex,
      toIndex: c.toIndex,
      from: { x: c.fromX, y: c.fromY },
      to: { x: c.toX, y: c.toY },
      customWaypoint: c.customWaypoint,
      labelText: c.hasLabel ? c.label : null,
      fontSize: 8.5,
    }))
  )

  list.forEach(c => {
    const route = routes.get(c.id)
    if (!route) return
    c.waypoints = route.waypoints
    c.pathD = edgeStyle.value === 'bezier'
      ? generateSmoothBezierPath(route.waypoints)
      : generateRoundedOrthogonalPath(route.waypoints, 12)
    c.labelAnchor = route.labelAnchor
    c.labelWidth = route.labelWidth
    c.labelHeight = route.labelHeight
  })

  return list
})

// Live Preview Wire Path
const livePreviewPath = computed(() => {
  if (!isWiring.value) return ''
  const waypoints = calculateSmartWaypoints(
    { x: wiringData.startX, y: wiringData.startY },
    { x: wiringData.currentX, y: wiringData.currentY },
    stepsForRouting.value,
    wiringData.sourceIndex,
    -1
  )
  return edgeStyle.value === 'bezier'
    ? generateSmoothBezierPath(waypoints)
    : generateRoundedOrthogonalPath(waypoints, 12)
})

// Canvas Pointer Handlers
const handleCanvasPointerDown = (e) => {
  if (
    e.target.closest('.canvas-node') ||
    e.target.closest('.canvas-toolbar') ||
    e.target.closest('.onboarding-canvas') ||
    e.target.closest('.edge-group') ||
    e.target.closest('.edge-control-handle')
  ) {
    return
  }
  // Click on empty canvas background
  selectStep(-1)
  selectedEdgeId.value = null
  isPanning.value = true
  panStart.x = e.clientX - panX.value
  panStart.y = e.clientY - panY.value
}

// Coalesce pointermove (up to 1000Hz on high-polling mice) into one edge
// recomputation per animation frame
let pointerMoveRafId = 0
let pendingPointerEvent = null

const processPointerMove = (e) => {
  // 1. Panning Canvas
  if (isPanning.value) {
    panX.value = e.clientX - panStart.x
    panY.value = e.clientY - panStart.y
    return
  }

  // 2. Dragging Node
  if (draggingNodeIndex.value >= 0) {
    const containerRect = canvasContainerRef.value?.getBoundingClientRect()
    if (containerRect) {
      const mouseCanvasX = (e.clientX - containerRect.left - panX.value) / scale.value
      const mouseCanvasY = (e.clientY - containerRect.top - panY.value) / scale.value
      const newX = mouseCanvasX - dragOffset.x
      const newY = mouseCanvasY - dragOffset.y
      updateStepPosition(draggingNodeIndex.value, newX, newY)
    }
    return
  }

  // 3. Dragging Wire (Wiring)
  if (isWiring.value) {
    const containerRect = canvasContainerRef.value?.getBoundingClientRect()
    if (containerRect) {
      wiringData.currentX = (e.clientX - containerRect.left - panX.value) / scale.value
      wiringData.currentY = (e.clientY - containerRect.top - panY.value) / scale.value
    }
    return
  }

  // 4. Dragging Edge Waypoint Handle
  if (draggingEdgeData.isDragging) {
    const containerRect = canvasContainerRef.value?.getBoundingClientRect()
    if (containerRect) {
      const mouseCanvasX = (e.clientX - containerRect.left - panX.value) / scale.value
      const mouseCanvasY = (e.clientY - containerRect.top - panY.value) / scale.value
      draggingEdgeData.tempWaypoint = {
        x: mouseCanvasX,
        y: mouseCanvasY,
      }
    }
  }
}

const handleGlobalPointerMove = (e) => {
  pendingPointerEvent = e
  if (pointerMoveRafId) return
  pointerMoveRafId = requestAnimationFrame(() => {
    pointerMoveRafId = 0
    processPointerMove(pendingPointerEvent)
    pendingPointerEvent = null
  })
}

const handleGlobalPointerUp = (e) => {
  if (isPanning.value) {
    isPanning.value = false
  }
  if (draggingNodeIndex.value >= 0) {
    draggingNodeIndex.value = -1
  }
  if (isWiring.value) {
    // Check if pointer is over an input socket
    const target = document.elementFromPoint(e.clientX, e.clientY)
    const inputSocket = target?.closest('.port-input')
    if (inputSocket) {
      const targetStepIdx = parseInt(inputSocket.getAttribute('data-step-index'))
      // 允许 targetStepIdx === sourceIndex：自环连线（重复执行自身）
      if (!isNaN(targetStepIdx)) {
        connectSteps(wiringData.sourceIndex, targetStepIdx, wiringData.portType)
      }
    }
    isWiring.value = false
    wiringData.sourceIndex = -1
  }
  if (draggingEdgeData.isDragging) {
    if (draggingEdgeData.tempWaypoint && draggingEdgeData.sourceIndex >= 0) {
      updateEdgeCustomWaypoint(
        draggingEdgeData.sourceIndex,
        draggingEdgeData.portType,
        draggingEdgeData.tempWaypoint
      )
    }
    draggingEdgeData.isDragging = false
    draggingEdgeData.sourceIndex = -1
    draggingEdgeData.tempWaypoint = null
  }
}

// Edge Handle Pointer Down
const handleEdgeHandlePointerDown = ({ event, conn }) => {
  event.stopPropagation()
  selectedEdgeId.value = conn.id
  draggingEdgeData.isDragging = true
  draggingEdgeData.sourceIndex = conn.fromIndex
  draggingEdgeData.portType = conn.type
  draggingEdgeData.tempWaypoint = { x: conn.labelAnchor.x, y: conn.labelAnchor.y }
}

const handleEdgeClick = (conn, e) => {
  e.stopPropagation()
  selectedEdgeId.value = conn.id
  selectStep(-1)
}

const handleEdgeDoubleClick = (conn, e) => {
  e.stopPropagation()
  resetEdgeCustomWaypoint(conn.fromIndex, conn.type)
}

// Zoom with Mouse Wheel
const handleWheel = (e) => {
  e.preventDefault()
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
  const newScale = Math.min(2.0, Math.max(0.3, scale.value * zoomFactor))

  const containerRect = canvasContainerRef.value?.getBoundingClientRect()
  if (!containerRect) return

  const mouseX = e.clientX - containerRect.left
  const mouseY = e.clientY - containerRect.top

  // Zoom towards mouse pointer
  panX.value = mouseX - (mouseX - panX.value) * (newScale / scale.value)
  panY.value = mouseY - (mouseY - panY.value) * (newScale / scale.value)
  scale.value = newScale
}

// Node Drag Initiation
const handleNodePointerDown = ({ event, index }) => {
  draggingNodeIndex.value = index
  const step = workflow.steps[index]
  const containerRect = canvasContainerRef.value?.getBoundingClientRect()
  if (containerRect) {
    const mouseCanvasX = (event.clientX - containerRect.left - panX.value) / scale.value
    const mouseCanvasY = (event.clientY - containerRect.top - panY.value) / scale.value
    dragOffset.x = mouseCanvasX - (step.node_x || 100)
    dragOffset.y = mouseCanvasY - (step.node_y || 160)
  }
}

// Port Drag Initiation
const handlePortPointerDown = ({ event, stepIndex, portType }) => {
  const step = workflow.steps[stepIndex]
  // 与正式连线一致：从输出端口圆点中心起笔
  const portKind = portType === 'else' || portType === 'fail' ? 'false' : 'true'
  const fromX = outputPortX(step)
  const fromY = outputPortY(step, stepIndex, portKind)

  isWiring.value = true
  wiringData.sourceIndex = stepIndex
  wiringData.portType = portType
  wiringData.startX = fromX
  wiringData.startY = fromY
  wiringData.currentX = fromX
  wiringData.currentY = fromY
}

// Zoom Controls
const zoomIn = () => {
  scale.value = Math.min(2.0, scale.value * 1.2)
}

const zoomOut = () => {
  scale.value = Math.max(0.3, scale.value * 0.8)
}

const resetZoom = () => {
  scale.value = 1.0
  panX.value = 60
  panY.value = 60
}

const fitView = () => {
  if (!workflow.steps || workflow.steps.length === 0) {
    resetZoom()
    return
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  workflow.steps.forEach(s => {
    const nx = s.node_x || 100
    const ny = s.node_y || 160
    minX = Math.min(minX, nx)
    minY = Math.min(minY, ny)
    maxX = Math.max(maxX, nx + 220)
    maxY = Math.max(maxY, ny + 120)
  })
  // 边界同时包含连线走廊与标签，避免自适应居中后顶部绕行线被裁切
  connections.value.forEach(c => {
    (c.waypoints || []).forEach(p => {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    })
    if (c.labelAnchor) {
      const halfW = (c.labelWidth || 40) / 2
      const halfH = (c.labelHeight || 19) / 2
      minX = Math.min(minX, c.labelAnchor.x - halfW)
      maxX = Math.max(maxX, c.labelAnchor.x + halfW)
      minY = Math.min(minY, c.labelAnchor.y - halfH)
      maxY = Math.max(maxY, c.labelAnchor.y + halfH)
    }
  })

  const containerRect = canvasContainerRef.value?.getBoundingClientRect()
  if (!containerRect) return

  const padding = 80
  const graphWidth = maxX - minX + padding * 2
  const graphHeight = maxY - minY + padding * 2

  const scaleX = containerRect.width / graphWidth
  const scaleY = containerRect.height / graphHeight
  const targetScale = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY)))

  scale.value = targetScale
  panX.value = (containerRect.width - (maxX - minX) * targetScale) / 2 - minX * targetScale
  panY.value = (containerRect.height - (maxY - minY) * targetScale) / 2 - minY * targetScale
}

const handleClearCanvas = async () => {
  const confirmed = await confirm({
    title: '清空画布',
    message: '确定要清空画布中的所有步骤吗？此操作无法撤销。',
    confirmText: '清空',
    cancelText: '取消',
    type: 'danger',
  })
  if (confirmed) {
    clearAllSteps()
  }
}

const handleKeyDown = (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedEdgeId.value) {
      const edge = connections.value.find(c => c.id === selectedEdgeId.value)
      if (edge) {
        if (['then', 'else', 'next', 'fail'].includes(edge.type)) {
          disconnectBranch(edge.fromIndex, edge.type)
        }
        selectedEdgeId.value = null
      }
      return
    }
    if (selectedStepIndex.value >= 0) {
      deleteStep(selectedStepIndex.value)
    }
  }
}

onMounted(() => {
  window.addEventListener('pointermove', handleGlobalPointerMove)
  window.addEventListener('pointerup', handleGlobalPointerUp)
  window.addEventListener('keydown', handleKeyDown)
  // 跟踪节点实际高度，保证连线端点始终吸附在端口圆点上
  nodeHeightObserver.value = new ResizeObserver(() => syncNodeHeights())
  nextTick(syncNodeHeights)
  // Ensure existing steps have default positions
  if (workflow.steps && workflow.steps.length > 0) {
    let needsLayout = workflow.steps.some(s => s.node_x === undefined || s.node_y === undefined)
    if (needsLayout) {
      autoLayoutNodes()
    }
  }
})

onUnmounted(() => {
  if (pointerMoveRafId) cancelAnimationFrame(pointerMoveRafId)
  window.removeEventListener('pointermove', handleGlobalPointerMove)
  window.removeEventListener('pointerup', handleGlobalPointerUp)
  window.removeEventListener('keydown', handleKeyDown)
  if (nodeHeightObserver.value) {
    nodeHeightObserver.value.disconnect()
    nodeHeightObserver.value = null
  }
})
</script>

<template>
  <div
    ref="canvasContainerRef"
    class="workflow-canvas-container"
    @pointerdown="handleCanvasPointerDown"
    @wheel="handleWheel"
  >
    <!-- Background Grid Pattern -->
    <div
      class="canvas-grid-bg"
      :style="{
        backgroundPosition: `${panX}px ${panY}px`,
        backgroundSize: `${24 * scale}px ${24 * scale}px`,
      }"
    ></div>

    <!-- Canvas Transform Layer -->
    <div
      class="canvas-transform-layer"
      :style="{
        transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
        transformOrigin: '0 0',
      }"
    >
      <!-- SVG Edges & Connections Layer -->
      <svg class="canvas-svg-layer">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <!-- Arrowhead Markers: 尖端锚定在线段终点 (refX=10.5)，userSpaceOnUse 保证悬停加粗时箭头不变形 -->
          <marker
            id="arrow-next"
            viewBox="0 0 12 12"
            refX="10.5"
            refY="6"
            markerWidth="11"
            markerHeight="11"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-success" />
          </marker>

          <marker
            id="arrow-then"
            viewBox="0 0 12 12"
            refX="10.5"
            refY="6"
            markerWidth="11"
            markerHeight="11"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-success" />
          </marker>

          <marker
            id="arrow-else"
            viewBox="0 0 12 12"
            refX="10.5"
            refY="6"
            markerWidth="11"
            markerHeight="11"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-warning" />
          </marker>

          <marker
            id="arrow-fail"
            viewBox="0 0 12 12"
            refX="10.5"
            refY="6"
            markerWidth="11"
            markerHeight="11"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-warning" />
          </marker>
        </defs>

        <!-- Existing Active Connections -->
        <g
          v-for="conn in connections"
          :key="conn.id"
          class="edge-group"
          :class="{
            'edge-is-selected': selectedEdgeId === conn.id,
            'edge-has-custom': conn.hasCustomRoute,
          }"
          @click="handleEdgeClick(conn, $event)"
          @dblclick="handleEdgeDoubleClick(conn, $event)"
          @mouseenter="hoveredEdgeId = conn.id"
          @mouseleave="hoveredEdgeId = null"
        >
          <!-- Background wider hit-box path for easier selection -->
          <path
            :d="conn.pathD"
            class="edge-hitbox"
          />

          <!-- Selection Outer Glow -->
          <path
            v-if="selectedEdgeId === conn.id"
            :d="conn.pathD"
            class="edge-selection-halo"
            :style="{ stroke: conn.color }"
          />

          <!-- Visible Connection Line -->
          <path
            :d="conn.pathD"
            class="edge-path"
            :class="{ 'edge-active': conn.isActive, 'edge-selected': selectedEdgeId === conn.id }"
            :style="{ stroke: conn.color }"
            :marker-end="`url(#arrow-${conn.type})`"
          />

          <!-- Edge Label Pill（已做碰撞避让，点击断开该跳转连线） -->
          <g
            v-if="conn.hasLabel && conn.labelAnchor"
            :transform="`translate(${conn.labelAnchor.x}, ${conn.labelAnchor.y})`"
          >
            <g
              class="edge-label-group"
              :class="{ 'label-plain': conn.type === 'next' }"
              @click.stop="disconnectBranch(conn.fromIndex, conn.type)"
              title="点击断开该跳转连线"
            >
              <rect
                :x="-(conn.labelWidth || 60) / 2"
                :y="-(conn.labelHeight || 19) / 2"
                :width="conn.labelWidth || 60"
                :height="conn.labelHeight || 19"
                :rx="(conn.labelHeight || 19) / 2"
                class="edge-label-pill"
                :style="{ stroke: conn.color }"
              />
              <text
                x="0"
                y="3"
                text-anchor="middle"
                class="edge-label-text"
                :style="{ fill: conn.color }"
                font-size="8.5"
                font-weight="600"
              >
                {{ conn.label }}
              </text>
            </g>
          </g>

          <!-- Interactive Waypoint Control Drag Handle -->
          <g
            v-if="hoveredEdgeId === conn.id || selectedEdgeId === conn.id || conn.hasCustomRoute"
            :transform="`translate(${conn.labelAnchor.x}, ${conn.labelAnchor.y})`"
          >
            <g
              class="edge-control-handle"
              :class="{
                'is-dragging': draggingEdgeData.isDragging && draggingEdgeData.sourceIndex === conn.fromIndex && draggingEdgeData.portType === conn.type,
                'has-custom': conn.hasCustomRoute
              }"
              @pointerdown="handleEdgeHandlePointerDown({ event: $event, conn })"
              @dblclick.stop="resetEdgeCustomWaypoint(conn.fromIndex, conn.type)"
            >
              <circle r="14" class="handle-hitbox" fill="transparent" />
              <circle
                r="7"
                class="handle-outer"
                :style="{ stroke: conn.color }"
              />
              <circle
                r="3.5"
                class="handle-inner"
                :style="{ fill: conn.color }"
              />

              <!-- Tooltip text when hovered -->
              <g v-if="hoveredEdgeId === conn.id" class="handle-tooltip" transform="translate(0, -18)">
                <rect x="-44" y="-9" width="88" height="18" rx="4" class="handle-tooltip-box" />
                <text x="0" y="3" text-anchor="middle" class="handle-tooltip-text" font-size="8.5" font-weight="500">
                  {{ conn.hasCustomRoute ? '拖拽调整 / 双击复位' : '拖动调整连线位置' }}
                </text>
              </g>
            </g>
          </g>
        </g>

        <!-- Live Dragging Connection Line -->
        <path
          v-if="isWiring"
          :d="livePreviewPath"
          class="edge-preview"
          :style="{ stroke: wiringData.portType === 'fail' ? 'var(--color-warning)' : 'var(--color-success)' }"
          stroke-dasharray="5 5"
        />
      </svg>

      <!-- Nodes Layer -->
      <CanvasNode
        v-for="(step, idx) in workflow.steps"
        :key="step.id || idx"
        :step="step"
        :index="idx"
        :is-selected="idx === selectedStepIndex"
        :is-active="idx === activeStepIndex"
        :status="stepStatuses[idx]"
        @select="selectStep"
        @node-pointerdown="handleNodePointerDown"
        @port-pointerdown="handlePortPointerDown"
        @delete="deleteStep"
        @duplicate="duplicateStep"
        @test="testSingleStep"
      />
    </div>

    <!-- Empty Canvas Onboarding Guide -->
    <div v-if="workflow.steps.length === 0" class="onboarding-canvas">
      <div class="empty-icon-wrap">
        <GitBranch :size="32" class="empty-icon-svg" />
      </div>
      <div class="empty-title">可视化流程编排画布</div>
      <div class="empty-desc">
        拖拽或点击上方各类动作卡片即可生成流程节点；支持节点自由拖拽排版与端口连线。
      </div>

      <div class="guide-actions-row">
        <button class="btn btn-primary" @click="loadSampleTemplate">
          <Sparkles :size="13" />
          <span>载入新手示例流程</span>
        </button>
        <button class="btn btn-secondary" @click="quickAddStep('image_click')">
          <Plus :size="13" />
          <span>添加找图点击节点</span>
        </button>
      </div>
    </div>

    <!-- Floating Canvas Controls Toolbar -->
    <div class="canvas-toolbar">
      <button class="toolbar-btn" title="放大 (Ctrl + +)" @click="zoomIn">
        <ZoomIn :size="14" />
      </button>
      <span class="zoom-text">{{ Math.round(scale * 100) }}%</span>
      <button class="toolbar-btn" title="缩小 (Ctrl + -)" @click="zoomOut">
        <ZoomOut :size="14" />
      </button>
      <button class="toolbar-btn" title="重置 100%" @click="resetZoom">
        <RotateCcw :size="13" />
      </button>
      <button class="toolbar-btn" title="自适应居中" @click="fitView">
        <Maximize2 :size="13" />
      </button>

      <div class="toolbar-divider"></div>

      <!-- Edge Routing Style Toggle -->
      <button
        class="toolbar-btn"
        :class="{ 'highlight-btn': edgeStyle === 'orthogonal' }"
        :title="edgeStyle === 'orthogonal' ? '当前：智能圆角折线 (点击切换为平滑曲线)' : '当前：平滑避让曲线 (点击切换为智能圆角折线)'"
        @click="edgeStyle = edgeStyle === 'orthogonal' ? 'bezier' : 'orthogonal'"
      >
        <Route v-if="edgeStyle === 'orthogonal'" :size="13" />
        <Waypoints v-else :size="13" />
        <span>{{ edgeStyle === 'orthogonal' ? '智能折线' : '平滑曲线' }}</span>
      </button>

      <div class="toolbar-divider"></div>

      <button class="toolbar-btn highlight-btn" title="一键智能排版对齐" @click="autoLayoutNodes">
        <LayoutGrid :size="13" />
        <span>自动整理</span>
      </button>

      <div class="toolbar-divider"></div>

      <button
        v-if="workflow.steps.length > 0"
        class="toolbar-btn danger-btn"
        title="清空画布"
        @click="handleClearCanvas"
      >
        <Trash2 :size="13" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.workflow-canvas-container {
  flex: 2;
  position: relative;
  overflow: hidden;
  background-color: var(--canvas-bg);
  border-right: 1px solid var(--border-subtle);
  min-width: 320px;
  cursor: grab;
  user-select: none;
}

.workflow-canvas-container:active {
  cursor: grabbing;
}

/* Background Grid Pattern */
.canvas-grid-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(var(--canvas-grid-dot) 1px, transparent 1px);
  pointer-events: none;
}

/* Transform Layer */
.canvas-transform-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 10000px;
  height: 10000px;
  pointer-events: none;
}

.canvas-transform-layer > * {
  pointer-events: auto;
}

/* SVG Connections Layer */
.canvas-svg-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.arrow-success {
  fill: var(--color-success);
}

.arrow-warning {
  fill: var(--color-warning);
}

.edge-group {
  pointer-events: auto;
  cursor: pointer;
}

.edge-hitbox {
  fill: none;
  stroke: transparent;
  stroke-width: 22;
  cursor: pointer;
}

.edge-selection-halo {
  fill: none;
  stroke-width: 8;
  opacity: 0.35;
  filter: drop-shadow(0 0 8px currentColor);
  pointer-events: none;
}

.edge-path {
  fill: none;
  stroke-width: 2.2;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: stroke-width var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

.edge-group:hover .edge-path {
  stroke-width: 3.5;
  filter: drop-shadow(0 0 6px currentColor);
}

.edge-path.edge-selected {
  stroke-width: 3.5;
  filter: drop-shadow(0 0 8px currentColor);
}

.edge-path.edge-active {
  stroke-width: 3.2;
  stroke-dasharray: 6 6;
  animation: flow-dash 1s linear infinite;
  filter: drop-shadow(0 0 10px currentColor);
}

@keyframes flow-dash {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.edge-preview {
  fill: none;
  stroke-width: 2.2;
  stroke-linejoin: round;
  stroke-linecap: round;
  animation: flow-dash 0.6s linear infinite;
}

.edge-label-pill {
  fill: var(--edge-label-bg);
  stroke-opacity: 0.75;
  stroke-width: 1.1;
}

.edge-label-text {
  pointer-events: none;
}

.edge-label-group {
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.edge-label-group:hover {
  transform: scale(1.12);
}

/* Edge Control Handle */
.edge-control-handle {
  cursor: grab;
  transition: transform var(--duration-fast) var(--ease-out);
}

.edge-control-handle:active,
.edge-control-handle.is-dragging {
  cursor: grabbing;
  transform: scale(1.25);
}

.handle-hitbox {
  cursor: grab;
}

.handle-outer {
  fill: var(--bg-input);
  stroke-width: 2;
  transition: transform var(--duration-fast) var(--ease-out),
    stroke-width var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
  filter: drop-shadow(0 2px 5px rgba(15, 23, 42, 0.5));
}

.edge-control-handle:hover .handle-outer {
  transform: scale(1.3);
  stroke-width: 2.5;
  filter: drop-shadow(0 0 8px currentColor);
}

.handle-inner {
  transition: fill var(--duration-fast) var(--ease-out);
}

.edge-control-handle.has-custom .handle-outer {
  stroke-dasharray: 2 2;
}

.handle-tooltip {
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.45));
}

.handle-tooltip-box {
  fill: var(--edge-tooltip-bg);
  stroke: var(--border-strong);
  stroke-width: 1;
}

.handle-tooltip-text {
  fill: var(--edge-tooltip-text);
}

/* Floating Toolbar */
.canvas-toolbar {
  position: absolute;
  bottom: var(--space-4);
  left: var(--space-4);
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-1-5);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-toolbar);
  user-select: none;
}

.toolbar-btn {
  height: 26px;
  padding: 0 var(--space-1-5);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-family: inherit;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.toolbar-btn:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.toolbar-btn.highlight-btn {
  color: var(--color-info);
}

.toolbar-btn.highlight-btn:hover {
  background: var(--soft-info);
  border-color: color-mix(in srgb, var(--color-info) 30%, transparent);
}

.toolbar-btn.danger-btn:hover {
  background: var(--soft-danger);
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
}

.zoom-text {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  min-width: 34px;
  text-align: center;
  font-family: var(--font-mono);
}

.toolbar-divider {
  width: 1px;
  height: 14px;
  background: var(--border-subtle);
  margin: 0 var(--space-0-5);
}

/* Empty Canvas Onboarding Guide */
.onboarding-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  max-width: 400px;
  padding: var(--space-6);
  background: color-mix(in srgb, var(--bg-card) 82%, transparent);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
  z-index: 5;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--soft-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
}

.empty-icon-svg {
  color: var(--color-info);
}

.empty-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1-5);
}

.empty-desc {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.guide-actions-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2-5);
}
</style>
