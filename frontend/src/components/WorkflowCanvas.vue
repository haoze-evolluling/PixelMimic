<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, nextTick, watch } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import { useExecution } from '../composables/useExecution'
import { useConfirm } from '../composables/useConfirm'
import { useCanvasViewport } from '../composables/useCanvasViewport'
import { useNodeHeights } from '../composables/useNodeHeights'
import CanvasNode from './CanvasNode.vue'
import CanvasEdges from './canvas/CanvasEdges.vue'
import CanvasToolbar from './canvas/CanvasToolbar.vue'
import CanvasOnboarding from './canvas/CanvasOnboarding.vue'
import EdgeContextMenu from './canvas/EdgeContextMenu.vue'
import NodeContextMenu from './canvas/NodeContextMenu.vue'
import {
  routeAllEdges,
  generateOrthogonalPath,
  calculateGridLRoute,
  finishRouteToPort,
  moveEdgeVertex,
  finalizeWaypoints,
  snapToGrid,
  GRID_SIZE,
  NODE_WIDTH,
  NODE_DEFAULT_HEIGHT,
} from '../utils/edgeRouting'
import { outputPortX, outputPortY, inputPortY, portCenterDy, portTrueDy, portFalseDy, PORT_INPUT_GAP } from '../utils/canvasPorts'

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
  quickAddStep,
  setEdgeCustomRoute,
  resetEdgeRoute,
  normalizeStepPositions,
} = useWorkflow()

const { stepStatuses, activeStepIndex } = useExecution()
const { confirm } = useConfirm()

const canvasContainerRef = ref(null)

// Dragging Node State
const draggingNodeIndex = ref(-1)
const dragOffset = reactive({ x: 0, y: 0 })

// 连线绘制状态（Multisim 式多点绘制）：
// 从输出端口拖出后，依次单击网格点规划转折，最后点击目标输入端口完成。
const isWiring = ref(false)
const wiringData = reactive({
  sourceIndex: -1,
  portType: 'next',
  points: [], // 已确认的路径点（首点为输出端口坐标）
  cursor: { x: 0, y: 0 },
})

// 连线编辑状态：拖拽中间线段（垂直于线段方向平移）或转折点（保持正交联动）
const edgeDrag = reactive({
  active: false,
  mode: null, // 'segment' | 'vertex'
  fromIndex: -1,
  portType: null,
  segIndex: -1,
  vertIndex: -1,
  origin: [], // 拖拽起始时的完整路径点
  points: [], // 当前路径点（实时预览）
  startMouse: { x: 0, y: 0 },
})

// 连线选中 & 右键菜单
const selectedEdgeId = ref(null)
const edgeMenu = reactive({ visible: false, x: 0, y: 0, conn: null })
const nodeMenu = reactive({ visible: false, x: 0, y: 0, index: -1 })

// 节点实际渲染高度测量（ResizeObserver），连线端点据此对齐端口
const { getNodeHeightAt } = useNodeHeights(workflow)

// 携带实际高度的步骤快照，供路由算法做障碍避让（避免默认高度与实际不符）。
// 路由只依赖 node_x/node_y/node_h 三个字段，最小化快照可使
// Inspector 中编辑名称/备注/截图等无关字段时不触发全量连线重算
const stepsForRouting = computed(() =>
  workflow.steps.map((s, idx) => ({
    node_x: s.node_x,
    node_y: s.node_y,
    node_h: getNodeHeightAt(idx),
  }))
)

// 节点端口组锚定偏移（已按网格吸附），传给 CanvasNode 与连线端点计算保持一致
const nodePortCenterDy = (idx) => portCenterDy(getNodeHeightAt(idx))
const nodePortTrueDy = (idx) => portTrueDy(getNodeHeightAt(idx))
const nodePortFalseDy = (idx) => portFalseDy(getNodeHeightAt(idx))

// Calculate all active connections (Edges) with Smart Obstacle Avoidance
const connections = computed(() => {
  const list = []
  if (!workflow.steps || workflow.steps.length === 0) return list

  // 自定义正交路径（用户自绘或拖拽调整），拖拽中优先取实时预览点
  const resolveCustomPoints = (idx, portType) => {
    if (edgeDrag.active && edgeDrag.fromIndex === idx && edgeDrag.portType === portType) {
      return edgeDrag.points.slice(1, -1)
    }
    const stored = workflow.steps[idx]?.metadata?.custom_routes?.[portType]
    return Array.isArray(stored) && stored.length > 0 ? stored : null
  }

  /**
   * 普通动作卡片的出口语义是「成功 / 失败」，不是 True / False，
   * 连线标签同样跟随中文语义；自环连线特化为「重试 / 重复」，一眼能看懂意图。
   */
  const buildJumpLabel = (branchType, sourceIdx, targetIdx) => {
    if (sourceIdx === targetIdx) return branchType === 'fail' ? '失败重试' : '成功后重复'
    return branchType === 'fail' ? `失败跳至 #${targetIdx + 1}` : `跳至 #${targetIdx + 1}`
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
      } else if (branch.sequential && branch.action !== 'stop' && idx < workflow.steps.length - 1) {
        targetIdx = idx + 1
      }

      // 自环 (targetIdx === idx) 是合法的"重复执行自身"连线，保留
      if (targetIdx < 0 || targetIdx >= workflow.steps.length) continue

      const targetStep = workflow.steps[targetIdx]
      const labelText = isCondition
        ? branch.label
        : (isJump ? buildJumpLabel(branch.type, idx, targetIdx) : null)
      const customPoints = resolveCustomPoints(idx, branch.type)

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
        customPoints,
        hasCustomRoute: !!customPoints,
        isActive: activeStepIndex.value === idx || activeStepIndex.value === targetIdx,
      })
    }
  })

  // 统一路由：网格对齐 + 绕行走廊通道错位 + 标签智能定位，避免连线/标签重合
  const routes = routeAllEdges(
    stepsForRouting.value,
    list.map(c => ({
      key: c.id,
      fromIndex: c.fromIndex,
      toIndex: c.toIndex,
      from: { x: c.fromX, y: c.fromY },
      to: { x: c.toX, y: c.toY },
      customPoints: c.customPoints,
      labelText: c.hasLabel ? c.label : null,
      fontSize: 8.5,
    }))
  )

  list.forEach(c => {
    const route = routes.get(c.id)
    if (!route) return
    c.waypoints = route.waypoints
    c.pathD = generateOrthogonalPath(route.waypoints)
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

// 自动整理后视口自适应居中，让排版结果立即可见
const runAutoLayout = (silent = false) => {
  autoLayoutNodes({ silent })
  nextTick(() => fitView())
}

const handleAutoLayout = () => runAutoLayout(false)

// 载入外部数据（示例模板 / 打开文件）后，步骤若没有任何有效坐标
// （后端模板 node_x/node_y 默认全为 0），节点会全部叠在原点、
// 连线绕成矩形环——自动做一次分层排版并居中显示
watch(
  () => workflow.steps,
  (steps) => {
    if (steps && steps.length > 0 && steps.every((s) => !s.node_x && !s.node_y)) {
      runAutoLayout(true)
    }
  }
)

// ---- 坐标换算与命中辅助 ----

const getCanvasPoint = (e) => {
  const containerRect = canvasContainerRef.value?.getBoundingClientRect()
  if (!containerRect) return { x: 0, y: 0 }
  return {
    x: (e.clientX - containerRect.left - panX.value) / scale.value,
    y: (e.clientY - containerRect.top - panY.value) / scale.value,
  }
}

// 网格点是否落在某个节点内部（自环源节点除外）——连线不允许无意义地穿过节点
const isInsideAnyNode = (p, excludeIdx = -1) => {
  return stepsForRouting.value.some((s, idx) => {
    if (idx === excludeIdx) return false
    const x = s.node_x || 100
    const y = s.node_y || 160
    return p.x > x && p.x < x + NODE_WIDTH && p.y > y && p.y < y + (s.node_h || NODE_DEFAULT_HEIGHT)
  })
}

// ---- 连线绘制（多点点击规划路径） ----

const startWiring = ({ stepIndex, portType }) => {
  const step = workflow.steps[stepIndex]
  const portKind = portType === 'else' || portType === 'fail' ? 'false' : 'true'
  isWiring.value = true
  wiringData.sourceIndex = stepIndex
  wiringData.portType = portType
  wiringData.points = [{
    x: outputPortX(step),
    y: outputPortY(step, getNodeHeightAt(stepIndex), portKind),
  }]
  wiringData.cursor = { ...wiringData.points[0] }
}

const cancelWiring = () => {
  isWiring.value = false
  wiringData.sourceIndex = -1
  wiringData.points = []
}

// 单击空白网格点：把路径延伸至该点（先水平后垂直的 L 形转折）
const appendWiringPoint = (e) => {
  const p = getCanvasPoint(e)
  const snapped = { x: snapToGrid(p.x), y: snapToGrid(p.y) }
  if (isInsideAnyNode(snapped, wiringData.sourceIndex)) return
  const last = wiringData.points[wiringData.points.length - 1]
  const seg = calculateGridLRoute(last, snapped)
  wiringData.points.push(...seg.slice(1))
}

// 点击目标输入端口：收尾接线并持久化用户规划的转折点
const finishWiring = (inputSocket) => {
  const targetStepIdx = parseInt(inputSocket.getAttribute('data-step-index'))
  if (!isNaN(targetStepIdx)) {
    const targetStep = workflow.steps[targetStepIdx]
    const last = wiringData.points[wiringData.points.length - 1]
    const port = {
      x: (targetStep.node_x || 100) - PORT_INPUT_GAP,
      y: inputPortY(targetStep, getNodeHeightAt(targetStepIdx)),
    }
    const seg = finishRouteToPort(last, port)
    const full = finalizeWaypoints([...wiringData.points, ...seg.slice(1)])
    const mids = full.slice(1, -1)
    connectSteps(wiringData.sourceIndex, targetStepIdx, wiringData.portType)
    if (mids.length > 0) {
      setEdgeCustomRoute(wiringData.sourceIndex, wiringData.portType, mids)
    }
  }
  cancelWiring()
}

// 连线绘制实时预览：最后一个已确认点到光标的 L 形网格路径
const livePreviewPath = computed(() => {
  if (!isWiring.value || wiringData.points.length === 0) return ''
  const last = wiringData.points[wiringData.points.length - 1]
  const seg = calculateGridLRoute(last, wiringData.cursor)
  return generateOrthogonalPath([...wiringData.points, ...seg.slice(1)])
})

// ---- 连线编辑（拖拽线段 / 转折点） ----

const beginEdgeDrag = (conn, mode, indices, event) => {
  selectedEdgeId.value = conn.id
  edgeDrag.active = true
  edgeDrag.mode = mode
  edgeDrag.fromIndex = conn.fromIndex
  edgeDrag.portType = conn.type
  edgeDrag.segIndex = indices.segIndex ?? -1
  edgeDrag.vertIndex = indices.vertIndex ?? -1
  edgeDrag.origin = conn.waypoints.map(p => ({ ...p }))
  edgeDrag.points = conn.waypoints.map(p => ({ ...p }))
  edgeDrag.startMouse = getCanvasPoint(event)
}

const handleEdgeSegmentPointerDown = ({ conn, segIndex, event }) => {
  beginEdgeDrag(conn, 'segment', { segIndex }, event)
}

const handleEdgeVertexPointerDown = ({ conn, vertIndex, event }) => {
  beginEdgeDrag(conn, 'vertex', { vertIndex }, event)
}

const applyEdgeDragMove = (cur) => {
  if (edgeDrag.mode === 'segment') {
    const a = edgeDrag.origin[edgeDrag.segIndex]
    const b = edgeDrag.origin[edgeDrag.segIndex + 1]
    if (!a || !b) return
    const pts = edgeDrag.points
    if (a.y === b.y) {
      // 水平段：沿垂直方向平移（网格吸附）
      const ny = snapToGrid(a.y + (cur.y - edgeDrag.startMouse.y))
      pts[edgeDrag.segIndex].y = ny
      pts[edgeDrag.segIndex + 1].y = ny
    } else {
      // 垂直段：沿水平方向平移（网格吸附）
      const nx = snapToGrid(a.x + (cur.x - edgeDrag.startMouse.x))
      pts[edgeDrag.segIndex].x = nx
      pts[edgeDrag.segIndex + 1].x = nx
    }
  } else {
    edgeDrag.points = moveEdgeVertex(edgeDrag.origin, edgeDrag.vertIndex, cur)
  }
}

const endEdgeDrag = () => {
  const cleaned = finalizeWaypoints(edgeDrag.points)
  const mids = cleaned.slice(1, -1)
  if (mids.length > 0) {
    setEdgeCustomRoute(edgeDrag.fromIndex, edgeDrag.portType, mids)
  } else {
    resetEdgeRoute(edgeDrag.fromIndex, edgeDrag.portType)
  }
  edgeDrag.active = false
  edgeDrag.mode = null
  edgeDrag.origin = []
  edgeDrag.points = []
}

// ---- 右键菜单 ----

const closeEdgeMenu = () => {
  edgeMenu.visible = false
  edgeMenu.conn = null
}

const closeNodeMenu = () => {
  nodeMenu.visible = false
  nodeMenu.index = -1
}

const handleEdgeContextMenu = ({ conn, event }) => {
  event.preventDefault()
  event.stopPropagation()
  if (isWiring.value) {
    cancelWiring()
    return
  }
  closeNodeMenu()
  selectedEdgeId.value = conn.id
  edgeMenu.visible = true
  edgeMenu.x = event.clientX
  edgeMenu.y = event.clientY
  edgeMenu.conn = conn
}

const handleNodeContextMenu = ({ event, index }) => {
  if (isWiring.value) {
    cancelWiring()
    return
  }
  closeEdgeMenu()
  selectStep(index)
  nodeMenu.visible = true
  nodeMenu.x = event.clientX
  nodeMenu.y = event.clientY
  nodeMenu.index = index
}

const handleNodeMenuTest = () => {
  const index = nodeMenu.index
  closeNodeMenu()
  if (index >= 0) testSingleStep(index)
}

const handleNodeMenuDuplicate = () => {
  const index = nodeMenu.index
  closeNodeMenu()
  if (index >= 0) duplicateStep(index)
}

const handleNodeMenuDelete = () => {
  const index = nodeMenu.index
  closeNodeMenu()
  if (index >= 0) deleteStep(index)
}

const handleMenuDelete = () => {
  const conn = edgeMenu.conn
  closeEdgeMenu()
  if (!conn) return
  if (['then', 'else', 'next', 'fail'].includes(conn.type)) {
    disconnectBranch(conn.fromIndex, conn.type)
  }
  selectedEdgeId.value = null
}

const handleMenuReset = () => {
  const conn = edgeMenu.conn
  closeEdgeMenu()
  if (conn) resetEdgeRoute(conn.fromIndex, conn.type)
}

// ---- 画布指针事件编排 ----

const handleCanvasPointerDown = (e) => {
  if (
    e.target.closest('.canvas-toolbar') ||
    e.target.closest('.onboarding-canvas') ||
    e.target.closest('.canvas-context-hint')
  ) {
    return
  }
  closeEdgeMenu()
  closeNodeMenu()

  // 连线绘制模式：点击输入端口完成连线，点击空白处追加网格转折点
  if (isWiring.value) {
    const inputSocket = e.target.closest('.port-input')
    if (inputSocket) {
      finishWiring(inputSocket)
      return
    }
    appendWiringPoint(e)
    return
  }

  if (
    e.target.closest('.canvas-node') ||
    e.target.closest('.edge-group')
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

const handleCanvasContextMenu = (e) => {
  e.preventDefault()
  if (isWiring.value) {
    cancelWiring()
  }
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
      // 节点落点吸附网格，保证端口与连线端点始终落在网格点上
      const newX = snapToGrid(mouseCanvasX - dragOffset.x)
      const newY = snapToGrid(mouseCanvasY - dragOffset.y)
      updateStepPosition(draggingNodeIndex.value, newX, newY)
    }
    return
  }

  // 3. Wiring Preview
  if (isWiring.value) {
    wiringData.cursor = getCanvasPoint(e)
    return
  }

  // 4. Dragging Edge Segment / Vertex
  if (edgeDrag.active) {
    applyEdgeDragMove(getCanvasPoint(e))
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
    // 拖拽释放到输入端口上同样完成连线；否则保持绘制状态等待下一次点击
    const target = document.elementFromPoint(e.clientX, e.clientY)
    const inputSocket = target?.closest('.port-input')
    if (inputSocket) {
      finishWiring(inputSocket)
    }
    return
  }
  if (edgeDrag.active) {
    endEdgeDrag()
  }
}

// Edge Selection / Reset
const handleEdgeClick = (conn, e) => {
  e.stopPropagation()
  selectedEdgeId.value = conn.id
  selectStep(-1)
}

const handleEdgeDoubleClick = (conn, e) => {
  e.stopPropagation()
  resetEdgeRoute(conn.fromIndex, conn.type)
}

// Node Drag Initiation
const handleNodePointerDown = ({ event, index }) => {
  if (isWiring.value) return
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

// Port Drag Initiation（Multisim 式：拖出端口进入多点绘制模式）
const handlePortPointerDown = ({ event, stepIndex, portType }) => {
  if (isWiring.value) return
  closeEdgeMenu()
  closeNodeMenu()
  startWiring({ stepIndex, portType })
}

// 连线绘制模式下点击节点不改变选中状态
const selectStepGuarded = (index) => {
  if (!isWiring.value) selectStep(index)
}

const handleClearCanvas = async () => {  const confirmed = await confirm({
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
  if (e.key === 'Escape') {
    if (isWiring.value) {
      cancelWiring()
      return
    }
    if (edgeMenu.visible) {
      closeEdgeMenu()
      return
    }
    if (nodeMenu.visible) {
      closeNodeMenu()
      return
    }
    selectedEdgeId.value = null
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (isWiring.value) {
      cancelWiring()
      return
    }
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
  // Ensure existing steps have default positions, and snap legacy
  // free-form coordinates onto the grid so ports/edges stay aligned
  if (workflow.steps && workflow.steps.length > 0) {
    const needsLayout = workflow.steps.some(s => s.node_x === undefined || s.node_y === undefined)
    normalizeStepPositions()
    if (needsLayout) {
      autoLayoutNodes()
      nextTick(() => fitView())
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
    @contextmenu="handleCanvasContextMenu"
  >
    <!-- Background Grid Pattern -->
    <div
      class="canvas-grid-bg"
      :style="{
        backgroundPosition: `${panX}px ${panY}px`,
        backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
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
        :preview-path="livePreviewPath"
        :preview-port-type="wiringData.portType"
        @select="handleEdgeClick"
        @reset-route="handleEdgeDoubleClick"
        @disconnect="disconnectBranch($event.fromIndex, $event.type)"
        @context-menu="handleEdgeContextMenu"
        @segment-pointerdown="handleEdgeSegmentPointerDown"
        @vertex-pointerdown="handleEdgeVertexPointerDown"
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
        :port-center-dy="nodePortCenterDy(idx)"
        :port-true-dy="nodePortTrueDy(idx)"
        :port-false-dy="nodePortFalseDy(idx)"
        @select="selectStepGuarded"
        @node-pointerdown="handleNodePointerDown"
        @port-pointerdown="handlePortPointerDown"
        @node-context-menu="handleNodeContextMenu"
      />
    </div>

    <!-- Wiring Mode Hint -->
    <div v-if="isWiring" class="canvas-context-hint">
      单击网格点添加转折 · 点击节点左侧输入端口完成连线 · 右键 / Esc 取消
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
      :has-steps="workflow.steps.length > 0"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
      @fit-view="fitView"
      @auto-layout="handleAutoLayout"
      @clear="handleClearCanvas"
    />
  </div>

  <!-- Edge Right-Click Context Menu（Teleport 到 body，不参与画布变换） -->
  <EdgeContextMenu
    :visible="edgeMenu.visible"
    :x="edgeMenu.x"
    :y="edgeMenu.y"
    :has-custom-route="!!edgeMenu.conn?.hasCustomRoute"
    @close="closeEdgeMenu"
    @delete="handleMenuDelete"
    @reset="handleMenuReset"
  />

  <!-- Node Right-Click Context Menu（Teleport 到 body，不参与画布变换） -->
  <NodeContextMenu
    :visible="nodeMenu.visible"
    :x="nodeMenu.x"
    :y="nodeMenu.y"
    @close="closeNodeMenu"
    @test="handleNodeMenuTest"
    @duplicate="handleNodeMenuDuplicate"
    @delete="handleNodeMenuDelete"
  />
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

/* Wiring Mode Hint */
.canvas-context-hint {
  position: absolute;
  top: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-1) var(--space-3);
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  box-shadow: var(--shadow-md);
  pointer-events: none;
  z-index: var(--z-toolbar);
  white-space: nowrap;
}
</style>
