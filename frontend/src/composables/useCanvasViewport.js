import { ref, reactive } from 'vue'

/**
 * useCanvasViewport.js
 * 画布视口状态：平移、缩放（滚轮以鼠标为锚点）与自适应居中。
 */
export function useCanvasViewport({ steps, connections, containerRef }) {
  const scale = ref(1.0)
  const panX = ref(60)
  const panY = ref(60)
  const isPanning = ref(false)
  const panStart = reactive({ x: 0, y: 0 })

  // Zoom with Mouse Wheel（rAF 合帧：高分辨率滚轮事件频率可超 100Hz，
  // 每次都读 getBoundingClientRect 并写三个响应式值会导致多余的重排/重渲染）
  let wheelRafId = 0
  let pendingWheelEvent = null

  const applyWheelZoom = (e) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newScale = Math.min(2.0, Math.max(0.3, scale.value * zoomFactor))

    const containerRect = containerRef.value?.getBoundingClientRect()
    if (!containerRect) return

    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    // Zoom towards mouse pointer
    panX.value = mouseX - (mouseX - panX.value) * (newScale / scale.value)
    panY.value = mouseY - (mouseY - panY.value) * (newScale / scale.value)
    scale.value = newScale
  }

  const handleWheel = (e) => {
    e.preventDefault()
    pendingWheelEvent = e
    if (wheelRafId) return
    wheelRafId = requestAnimationFrame(() => {
      wheelRafId = 0
      if (pendingWheelEvent) applyWheelZoom(pendingWheelEvent)
      pendingWheelEvent = null
    })
  }

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
    if (!steps || steps.length === 0) {
      resetZoom()
      return
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    steps.forEach(s => {
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

    const containerRect = containerRef.value?.getBoundingClientRect()
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

  return {
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
  }
}
