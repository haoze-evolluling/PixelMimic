/**
 * pathGeneration.js
 * SVG 路径生成：纯直角折线（Multisim 电路图风格）。
 * 不再存在任何曲线、圆角或贝塞尔过渡，所有连线由水平/垂直直线段构成。
 */
import { snapToGrid, finalizeWaypoints } from './constants'

/**
 * 由正交转折点序列生成纯直线 SVG Path（仅 M / L 指令，直角转折）
 */
export function generateOrthogonalPath(points) {
  if (!points || points.length === 0) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

/**
 * 两点间的 L 形正交路由（先水平后垂直），转折点与终点吸附到网格。
 * 供连线拖拽预览与「逐个点击网格点」绘制使用。
 */
export function calculateGridLRoute(from, to) {
  const start = { x: from.x, y: from.y }
  const end = { x: snapToGrid(to.x), y: snapToGrid(to.y) }
  if (end.x === start.x || end.y === start.y) {
    return finalizeWaypoints([start, end])
  }
  return finalizeWaypoints([start, { x: end.x, y: start.y }, end])
}

/**
 * 连线的收尾段路由：从最后一个已确认网格点接入目标输入端口。
 * 采用「先垂直后水平」的 Z/L 形，保证最后一段始终水平进入端口圆点，
 * 垂直段落在网格上，末端只留一小段水平引入线（端口 x 不在网格上属预期）。
 */
export function finishRouteToPort(from, port) {
  const start = { x: from.x, y: from.y }
  const end = { x: port.x, y: port.y }
  if (end.y === start.y) {
    return finalizeWaypoints([start, end])
  }
  return finalizeWaypoints([start, { x: start.x, y: end.y }, end])
}
