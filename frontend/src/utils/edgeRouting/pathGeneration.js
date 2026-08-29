/**
 * pathGeneration.js
 * SVG 路径生成：智能途经点计算（单线快捷入口）、圆角折线与平滑贝塞尔曲线。
 */
import { computeBaseRoute, buildBypassWaypoints } from './baseRoute'

/**
 * Calculate smart waypoints between source and target port with obstacle avoidance
 * (单条连线的快捷入口，供连线拖拽实时预览使用；正式渲染请使用 routeAllEdges 以获得通道错位)
 */
export function calculateSmartWaypoints(from, to, allSteps = [], fromIndex = -1, toIndex = -1, customWaypoint = null) {
  const info = computeBaseRoute(
    { from, to, fromIndex, toIndex, customWaypoint },
    allSteps
  )
  if (info.kind !== 'bypass') return info.waypoints

  const corridorY = info.side === 'top' ? info.topBypassY : info.bottomBypassY
  return buildBypassWaypoints(info, corridorY, info.exitX, info.enterX)
}

/**
 * Generate SVG Path string with rounded orthogonal corners (Corner Radius R)
 */
export function generateRoundedOrthogonalPath(points, radius = 14) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    // Vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }

    const len1 = Math.hypot(v1.x, v1.y)
    const len2 = Math.hypot(v2.x, v2.y)

    if (len1 === 0 || len2 === 0) {
      path += ` L ${curr.x} ${curr.y}`
      continue
    }

    const r = Math.min(radius, len1 / 2, len2 / 2)

    // Point before corner
    const pBefore = {
      x: curr.x - (v1.x / len1) * r,
      y: curr.y - (v1.y / len1) * r,
    }

    // Point after corner
    const pAfter = {
      x: curr.x + (v2.x / len2) * r,
      y: curr.y + (v2.y / len2) * r,
    }

    path += ` L ${pBefore.x} ${pBefore.y} Q ${curr.x} ${curr.y}, ${pAfter.x} ${pAfter.y}`
  }

  const last = points[points.length - 1]
  path += ` L ${last.x} ${last.y}`

  return path
}

/**
 * Generate smooth cubic bezier SVG Path connecting waypoints seamlessly
 */
export function generateSmoothBezierPath(points) {
  if (!points || points.length === 0) return ''
  if (points.length === 2) {
    const [p1, p2] = points
    const dx = Math.max(40, Math.abs(p2.x - p1.x) * 0.5)
    return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`
  }

  // Multi-point smooth rounded orthogonal spline
  return generateRoundedOrthogonalPath(points, 20)
}
