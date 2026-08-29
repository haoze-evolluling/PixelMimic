/**
 * baseRoute.js
 * 单条连线的基础路由：绕行模板 + S 弯 + 自环 + 自定义途经点
 * （不考虑与其他连线的通道错位，批量错位见 batchRouting.js）
 */
import { getNodeBox, getNodeHeight } from './constants'
import { isPathBlocked } from './geometry'

function buildBypassRoute(x1, y1, x2, y2, steps, sourceBox, targetBox) {
  const minX = Math.min(x1, x2) - 40
  const maxX = Math.max(x1, x2) + 40

  let topMinY = Math.min(y1, y2)
  let bottomMaxY = Math.max(y1, y2)

  steps.forEach(s => {
    const b = getNodeBox(s, 22)
    if (b.right >= minX && b.left <= maxX) {
      topMinY = Math.min(topMinY, b.top)
      bottomMaxY = Math.max(bottomMaxY, b.bottom)
    }
  })

  const topBypassY = topMinY - 36
  const bottomBypassY = bottomMaxY + 36

  const distTop = Math.abs(y1 - topBypassY) + Math.abs(y2 - topBypassY)
  const distBottom = Math.abs(bottomBypassY - y1) + Math.abs(bottomBypassY - y2)

  const exitX = Math.max(x1 + 36, (sourceBox ? sourceBox.right : x1) + 24)
  const enterX = Math.min(x2 - 36, (targetBox ? targetBox.left : x2) - 24)

  return {
    kind: 'bypass',
    backward: x2 < x1,
    sideTie: Math.abs(distTop - distBottom) <= 12,
    side: distTop < distBottom ? 'top' : 'bottom',
    topBypassY,
    bottomBypassY,
    exitX,
    enterX,
    spanMin: Math.min(exitX, enterX),
    spanMax: Math.max(exitX, enterX),
  }
}

/**
 * 计算单条连线的基础路由（绕行模板 + 走廊参数，尚未做通道错位）
 */
export function computeBaseRoute(spec, steps) {
  const x1 = spec.from.x
  const y1 = spec.from.y
  const x2 = spec.to.x
  const y2 = spec.to.y
  const start = { x: x1, y: y1 }
  const end = { x: x2, y: y2 }

  // 用户手动拖拽的自定义途经点：按用户意图干净地连线
  const cp = spec.customWaypoint
  if (cp && Number.isFinite(cp.x) && Number.isFinite(cp.y)) {
    if (x2 >= x1 + 60 && Math.abs(cp.x - (x1 + x2) / 2) < 25) {
      return { kind: 'custom', waypoints: [start, { x: cp.x, y: y1 }, { x: cp.x, y: y2 }, end] }
    }
    const midX1 = Math.max(x1 + 25, Math.min(cp.x - 20, (x1 + cp.x) / 2))
    const midX2 = Math.min(x2 - 25, Math.max(cp.x + 20, (x2 + cp.x) / 2))
    return { kind: 'custom', waypoints: [start, { x: midX1, y: y1 }, { x: cp.x, y: cp.y }, { x: midX2, y: y2 }, end] }
  }

  // 自环连线（跳回自身）：端口在节点中心上方走上方小环（True 口），下方走下方小环（False 口）；
  // 同一节点同一侧的多条自环由 routeAllEdges 的通道错位进一步垂直错开
  const isSelfLoop = spec.fromIndex >= 0 && spec.fromIndex === spec.toIndex
  if (isSelfLoop && !(cp && Number.isFinite(cp.x) && Number.isFinite(cp.y))) {
    const node = steps[spec.fromIndex]
    const nx = node.node_x || 100
    const ny = node.node_y || 160
    const nodeH = getNodeHeight(node)
    const goTop = y1 < ny + nodeH / 2
    const loopX1 = x1 + 36
    const loopX2 = x2 - 30
    const loopY = goTop ? ny - 44 : ny + nodeH + 44
    return {
      kind: 'self',
      side: goTop ? 'top' : 'bottom',
      loopBaseY: loopY,
      loopX1,
      loopX2,
      x1,
      y1,
      x2,
      y2,
      waypoints: [
        start,
        { x: loopX1, y: y1 },
        { x: loopX1, y: loopY },
        { x: loopX2, y: loopY },
        { x: loopX2, y: y2 },
        end,
      ],
    }
  }

  const obstacleBoxes = steps
    .filter((_, idx) => idx !== spec.fromIndex && idx !== spec.toIndex)
    .map(s => getNodeBox(s, 18))

  const sourceBox = spec.fromIndex >= 0 && spec.fromIndex < steps.length ? getNodeBox(steps[spec.fromIndex], 16) : null
  const targetBox = spec.toIndex >= 0 && spec.toIndex < steps.length ? getNodeBox(steps[spec.toIndex], 16) : null

  // 回跳 / 环形连线：目标在源头左侧或水平空间不足，必须绕行
  if (x2 < x1 + 60) {
    return { x1, y1, x2, y2, ...buildBypassRoute(x1, y1, x2, y2, steps, sourceBox, targetBox) }
  }

  // 前向：优先尝试简洁的两折 S 弯（或同行直线）
  const midX = (x1 + x2) / 2
  const p2 = { x: midX, y: y1 }
  const p3 = { x: midX, y: y2 }
  const blocked =
    isPathBlocked(start, p2, obstacleBoxes) ||
    isPathBlocked(p2, p3, obstacleBoxes) ||
    isPathBlocked(p3, end, obstacleBoxes)

  if (!blocked) {
    if (Math.abs(y1 - y2) < 1) {
      return { kind: 'straight', waypoints: [start, end] }
    }
    return { kind: 'spath', x1, y1, x2, y2, midX, waypoints: [start, p2, p3, end] }
  }

  // 前向路径被节点遮挡，同样走绕行模板
  return { x1, y1, x2, y2, ...buildBypassRoute(x1, y1, x2, y2, steps, sourceBox, targetBox) }
}

export function buildBypassWaypoints(info, corridorY, exitX, enterX) {
  return [
    { x: info.x1, y: info.y1 },
    { x: exitX, y: info.y1 },
    { x: exitX, y: corridorY },
    { x: enterX, y: corridorY },
    { x: enterX, y: info.y2 },
    { x: info.x2, y: info.y2 },
  ]
}
