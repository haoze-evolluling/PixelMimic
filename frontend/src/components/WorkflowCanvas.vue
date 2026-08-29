<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import { useExecution } from '../composables/useExecution'
import { useConfirm } from '../composables/useConfirm'
import { useCanvasViewport } from '../composables/useCanvasViewport'
import { useNodeHeights } from '../composables/useNodeHeights'
import CanvasNode from './CanvasNode.vue'
import CanvasEdges from './canvas/CanvasEdges.vue'
import CanvasToolbar from './canvas/CanvasToolbar.vue'
import CanvasOnboarding from './canvas/CanvasOnboarding.vue'
import {
  calculateSmartWaypoints,
  generateRoundedOrthogonalPath,
  generateSmoothBezierPath,
  routeAllEdges,
} from '../utils/edgeRouting'
import { outputPortX, outputPortY, inputPortY, PORT_INPUT_GAP } from '../utils/canvasPorts'

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

const canvasContainerRef = ref(null)

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
const draggingEdgeData = reactive({
  isDragging: false,
  sourceIndex: -1,
  portType: 'next',
  tempWaypoint: null,
})

// 节点实际渲染高度测量（ResizeObserver），连线端点据此对齐端口
const { getNodeHeightAt } = useNodeHeights(workflow)

// 携带实际高度的步骤快照，供路由算法做障碍避让（避免默认高度与实际不符）
const stepsForRouting = computed(() =>
  workflow.steps.map((s, idx) => ({ ...s, node_h: getNodeHeightAt(idx) }))
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
        fromY: outputPortY(step, getNodeHeightAt(idx), branch.portKind),
        toX: (targetStep.node_x || 100) - PORT_INPUT_GAP,
        toY: inputPortY(targetStep, getNodeHeightAt(targetIdx)),
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

// Canvas Viewport (Pan & Zoom)
const {
  scale,
  panX,
  panY,
  isPanning,
  panStart,
  handleWheel,
  zoomIn,
  zoomOut,
  resetZoom,
  fitView,
} = useCanvasViewport({
  steps: workflow.steps,
  connections,
  containerRef: canvasContainerRef,
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

  isWiring.value = true
  wiringData.sourceIndex = stepIndex
  wiringData.portType = portType
  wiringData.startX = outputPortX(step)
  wiringData.startY = outputPortY(step, getNodeHeightAt(stepIndex), portKind)
  wiringData.currentX = wiringData.startX
  wiringData.currentY = wiringData.startY
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
      <CanvasEdges
        :connections="connections"
        :selected-edge-id="selectedEdgeId"
        :dragging-edge="draggingEdgeData"
        :preview-path="livePreviewPath"
        :preview-port-type="wiringData.portType"
        @select="handleEdgeClick"
        @reset-waypoint="handleEdgeDoubleClick"
        @disconnect="disconnectBranch($event.fromIndex, $event.type)"
        @handle-pointerdown="handleEdgeHandlePointerDown"
      />

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
    <CanvasOnboarding
      v-if="workflow.steps.length === 0"
      @load-sample="loadSampleTemplate"
      @quick-add="quickAddStep"
    />

    <!-- Floating Canvas Controls Toolbar -->
    <CanvasToolbar
      :scale="scale"
      :edge-style="edgeStyle"
      :has-steps="workflow.steps.length > 0"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
      @fit-view="fitView"
      @toggle-style="edgeStyle = edgeStyle === 'orthogonal' ? 'bezier' : 'orthogonal'"
      @auto-layout="autoLayoutNodes"
      @clear="handleClearCanvas"
    />
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
</style>
