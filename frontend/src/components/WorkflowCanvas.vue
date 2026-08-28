<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import { useExecution } from '../composables/useExecution'
import CanvasNode from './CanvasNode.vue'
import {
  calculateSmartWaypoints,
  generateRoundedOrthogonalPath,
  generateSmoothBezierPath,
  getLongestSegmentCenter,
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
  PlayCircle,
  Crop,
  MousePointerClick,
  ChevronRight,
  List,
  GitBranch,
  Route,
  Waypoints,
  CornerDownRight,
  X,
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
  viewMode,
  edgeStyle,
  quickAddStep,
  updateEdgeCustomWaypoint,
  resetEdgeCustomWaypoint,
} = useWorkflow()

const { stepStatuses, activeStepIndex, executionState } = useExecution()

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

// Calculate all active connections (Edges) with Smart Obstacle Avoidance
const connections = computed(() => {
  const list = []
  if (!workflow.steps || workflow.steps.length === 0) return list

  workflow.steps.forEach((step, idx) => {
    const fromX = (step.node_x || 100) + 220
    const fromYBase = (step.node_y || 160)
    const customRoutes = step.metadata?.custom_routes || {}

    if (step.action_type === 'condition') {
      // 1. True Branch
      const thenAction = step.then_action || 'continue'
      let targetThenIdx = -1
      if (thenAction === 'jump' && step.then_jump_step) {
        targetThenIdx = step.then_jump_step - 1
      } else if (thenAction === 'continue' && idx < workflow.steps.length - 1) {
        targetThenIdx = idx + 1
      }

      if (targetThenIdx >= 0 && targetThenIdx < workflow.steps.length && targetThenIdx !== idx) {
        const targetStep = workflow.steps[targetThenIdx]
        const fromPos = { x: fromX, y: fromYBase + 26 }
        const toPos = { x: targetStep.node_x || 100, y: (targetStep.node_y || 160) + 40 }

        // Check if currently dragging waypoint for this edge
        let customWp = customRoutes['then'] || null
        if (draggingEdgeData.isDragging && draggingEdgeData.sourceIndex === idx && draggingEdgeData.portType === 'then') {
          customWp = draggingEdgeData.tempWaypoint
        }

        const waypoints = calculateSmartWaypoints(fromPos, toPos, workflow.steps, idx, targetThenIdx, customWp)
        const pathD = edgeStyle.value === 'bezier'
          ? generateSmoothBezierPath(waypoints)
          : generateRoundedOrthogonalPath(waypoints, 12)
        const labelAnchor = getLongestSegmentCenter(waypoints)

        list.push({
          id: `conn-${idx}-true-${targetThenIdx}`,
          fromIndex: idx,
          toIndex: targetThenIdx,
          type: 'then',
          color: '#10b981',
          label: 'True 成立',
          fromX: fromPos.x,
          fromY: fromPos.y,
          toX: toPos.x,
          toY: toPos.y,
          waypoints,
          pathD,
          labelAnchor,
          hasCustomRoute: !!customRoutes['then'],
          isActive: activeStepIndex.value === idx || activeStepIndex.value === targetThenIdx,
        })
      }

      // 2. False Branch
      const elseAction = step.else_action || 'continue'
      let targetElseIdx = -1
      if (elseAction === 'jump' && step.else_jump_step) {
        targetElseIdx = step.else_jump_step - 1
      } else if (elseAction === 'continue' && idx < workflow.steps.length - 1) {
        targetElseIdx = idx + 1
      }

      if (targetElseIdx >= 0 && targetElseIdx < workflow.steps.length && targetElseIdx !== idx) {
        const targetStep = workflow.steps[targetElseIdx]
        const fromPos = { x: fromX, y: fromYBase + 62 }
        const toPos = { x: targetStep.node_x || 100, y: (targetStep.node_y || 160) + 40 }

        let customWp = customRoutes['else'] || null
        if (draggingEdgeData.isDragging && draggingEdgeData.sourceIndex === idx && draggingEdgeData.portType === 'else') {
          customWp = draggingEdgeData.tempWaypoint
        }

        const waypoints = calculateSmartWaypoints(fromPos, toPos, workflow.steps, idx, targetElseIdx, customWp)
        const pathD = edgeStyle.value === 'bezier'
          ? generateSmoothBezierPath(waypoints)
          : generateRoundedOrthogonalPath(waypoints, 12)
        const labelAnchor = getLongestSegmentCenter(waypoints)

        list.push({
          id: `conn-${idx}-false-${targetElseIdx}`,
          fromIndex: idx,
          toIndex: targetElseIdx,
          type: 'else',
          color: '#f59e0b',
          label: 'False 不成立',
          fromX: fromPos.x,
          fromY: fromPos.y,
          toX: toPos.x,
          toY: toPos.y,
          waypoints,
          pathD,
          labelAnchor,
          hasCustomRoute: !!customRoutes['else'],
          isActive: activeStepIndex.value === idx || activeStepIndex.value === targetElseIdx,
        })
      }
    } else {
      // Standard Action Node -> Next Step or Custom Jump / Loop
      let targetIdx = -1
      const isJump = step.next_action === 'jump' && step.next_jump_step
      if (isJump) {
        targetIdx = step.next_jump_step - 1
      } else if (idx < workflow.steps.length - 1) {
        targetIdx = idx + 1
      }

      if (targetIdx >= 0 && targetIdx < workflow.steps.length && targetIdx !== idx) {
        const nextStep = workflow.steps[targetIdx]
        const fromPos = { x: fromX, y: fromYBase + 40 }
        const toPos = { x: nextStep.node_x || 100, y: (nextStep.node_y || 160) + 40 }

        let customWp = customRoutes['next'] || null
        if (draggingEdgeData.isDragging && draggingEdgeData.sourceIndex === idx && draggingEdgeData.portType === 'next') {
          customWp = draggingEdgeData.tempWaypoint
        }

        const waypoints = calculateSmartWaypoints(fromPos, toPos, workflow.steps, idx, targetIdx, customWp)
        const pathD = edgeStyle.value === 'bezier'
          ? generateSmoothBezierPath(waypoints)
          : generateRoundedOrthogonalPath(waypoints, 12)
        const labelAnchor = getLongestSegmentCenter(waypoints)

        list.push({
          id: `conn-${idx}-next-${targetIdx}`,
          fromIndex: idx,
          toIndex: targetIdx,
          type: 'next',
          isCustomJump: isJump,
          color: '#38bdf8',
          label: isJump ? `跳至 #${targetIdx + 1}` : 'Next',
          fromX: fromPos.x,
          fromY: fromPos.y,
          toX: toPos.x,
          toY: toPos.y,
          waypoints,
          pathD,
          labelAnchor,
          hasCustomRoute: !!customRoutes['next'],
          isActive: activeStepIndex.value === idx || activeStepIndex.value === targetIdx,
        })
      }
    }
  })

  return list
})

// Live Preview Wire Path
const livePreviewPath = computed(() => {
  if (!isWiring.value) return ''
  const waypoints = calculateSmartWaypoints(
    { x: wiringData.startX, y: wiringData.startY },
    { x: wiringData.currentX, y: wiringData.currentY },
    workflow.steps,
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

const handleGlobalPointerMove = (e) => {
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
      if (!isNaN(targetStepIdx) && targetStepIdx !== wiringData.sourceIndex) {
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
  const fromX = (step.node_x || 100) + 220
  let fromY = (step.node_y || 160) + 40
  if (portType === 'then') fromY = (step.node_y || 160) + 26
  if (portType === 'else') fromY = (step.node_y || 160) + 62

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

const handleClearCanvas = () => {
  if (confirm('确定要清空画布中的所有步骤吗？')) {
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
        if (edge.type === 'then' || edge.type === 'else') {
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
      <svg class="canvas-svg-layer">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <!-- Animated Arrowhead Markers -->
          <marker
            id="arrow-next"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
          </marker>

          <marker
            id="arrow-then"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
          </marker>

          <marker
            id="arrow-else"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
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
            :stroke="conn.color"
          />

          <!-- Visible Connection Line -->
          <path
            :d="conn.pathD"
            class="edge-path"
            :class="{ 'edge-active': conn.isActive, 'edge-selected': selectedEdgeId === conn.id }"
            :stroke="conn.color"
            :marker-end="`url(#arrow-${conn.type})`"
          />

          <!-- Edge Midpoint Branch Tag / Disconnect Button -->
          <g
            v-if="conn.type === 'then' || conn.type === 'else' || conn.isCustomJump"
            class="edge-label-group"
            :transform="`translate(${conn.labelAnchor.x}, ${conn.labelAnchor.y})`"
            @click.stop="disconnectBranch(conn.fromIndex, conn.type)"
            title="点击断开该跳转连线"
          >
            <rect
              :x="conn.type === 'next' ? -38 : -30"
              y="-10"
              :width="conn.type === 'next' ? 76 : 60"
              height="20"
              rx="10"
              :fill="conn.type === 'then' ? 'rgba(16, 185, 129, 0.25)' : (conn.type === 'else' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.25)')"
              :stroke="conn.color"
              stroke-width="1.2"
            />
            <text
              x="0"
              y="3.5"
              text-anchor="middle"
              :fill="conn.color"
              font-size="9"
              font-weight="600"
            >
              {{ conn.type === 'then' ? 'True 成立' : (conn.type === 'else' ? 'False 不成立' : conn.label) }}
            </text>
          </g>

          <!-- Interactive Waypoint Control Drag Handle -->
          <g
            v-if="hoveredEdgeId === conn.id || selectedEdgeId === conn.id || conn.hasCustomRoute"
            class="edge-control-handle"
            :class="{
              'is-dragging': draggingEdgeData.isDragging && draggingEdgeData.sourceIndex === conn.fromIndex && draggingEdgeData.portType === conn.type,
              'has-custom': conn.hasCustomRoute
            }"
            :transform="`translate(${conn.labelAnchor.x}, ${conn.labelAnchor.y})`"
            @pointerdown="handleEdgeHandlePointerDown({ event: $event, conn })"
            @dblclick.stop="resetEdgeCustomWaypoint(conn.fromIndex, conn.type)"
          >
            <circle r="14" class="handle-hitbox" fill="transparent" />
            <circle
              r="7"
              class="handle-outer"
              :stroke="conn.color"
            />
            <circle
              r="3.5"
              class="handle-inner"
              :fill="conn.color"
            />

            <!-- Tooltip text when hovered -->
            <g v-if="hoveredEdgeId === conn.id" class="handle-tooltip" transform="translate(0, -18)">
              <rect x="-44" y="-9" width="88" height="18" rx="4" fill="#0f172a" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
              <text x="0" y="3" text-anchor="middle" fill="#e2e8f0" font-size="8.5" font-weight="500">
                {{ conn.hasCustomRoute ? '拖拽调整 / 双击复位' : '拖动调整连线位置' }}
              </text>
            </g>
          </g>
        </g>

        <!-- Live Dragging Connection Line -->
        <path
          v-if="isWiring"
          :d="livePreviewPath"
          class="edge-preview"
          :stroke="wiringData.portType === 'then' ? '#10b981' : (wiringData.portType === 'else' ? '#f59e0b' : '#38bdf8')"
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

    <!-- Floating View Mode Switcher -->
    <div class="view-mode-toggle-pill">
      <button
        class="mode-pill-btn"
        :class="{ active: viewMode === 'canvas' }"
        @click="viewMode = 'canvas'"
        title="切换到流程图画布编排模式"
      >
        <GitBranch :size="12" />
        <span>画布模式</span>
      </button>
      <button
        class="mode-pill-btn"
        :class="{ active: viewMode === 'list' }"
        @click="viewMode = 'list'"
        title="切换到紧凑清单列表模式"
      >
        <List :size="12" />
        <span>列表模式</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.workflow-canvas-container {
  flex: 1.2;
  position: relative;
  overflow: hidden;
  background-color: #0b0f19;
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
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
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
  transition: stroke-width 0.15s ease, stroke 0.15s ease, filter 0.15s ease;
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

.edge-label-group {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.edge-label-group:hover {
  transform: scale(1.12);
}

/* Edge Control Handle */
.edge-control-handle {
  cursor: grab;
  transition: transform 0.15s ease;
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
  fill: #0f172a;
  stroke-width: 2;
  transition: all 0.15s ease;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.6));
}

.edge-control-handle:hover .handle-outer {
  transform: scale(1.3);
  stroke-width: 2.5;
  filter: drop-shadow(0 0 8px currentColor);
}

.handle-inner {
  transition: all 0.15s ease;
}

.edge-control-handle.has-custom .handle-outer {
  stroke-dasharray: 2 2;
}

.handle-tooltip {
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
}

/* Floating Toolbar */
.canvas-toolbar {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(17, 24, 39, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 50;
  user-select: none;
}

.toolbar-btn {
  height: 26px;
  padding: 0 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.15);
}

.toolbar-btn.highlight-btn {
  color: #38bdf8;
}

.toolbar-btn.highlight-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.3);
}

.toolbar-btn.danger-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.4);
}

.zoom-text {
  font-size: 10.5px;
  color: #64748b;
  min-width: 34px;
  text-align: center;
  font-family: monospace;
}

.toolbar-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 2px;
}

/* View Mode Switcher */
.view-mode-toggle-pill {
  position: absolute;
  top: 12px;
  right: 14px;
  background: rgba(17, 24, 39, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2px;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  z-index: 50;
}

.mode-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 16px;
  background: transparent;
  border: none;
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-pill-btn:hover {
  color: #ffffff;
}

.mode-pill-btn.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
}

/* Empty Canvas Onboarding Guide */
.onboarding-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  max-width: 400px;
  padding: 24px;
  background: rgba(17, 24, 39, 0.7);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  z-index: 5;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}

.empty-icon-svg {
  color: #38bdf8;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 11.5px;
  line-height: 1.5;
  color: #94a3b8;
  margin-bottom: 18px;
}

.guide-actions-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
</style>
