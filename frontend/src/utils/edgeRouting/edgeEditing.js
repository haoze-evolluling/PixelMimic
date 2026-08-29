/**
 * edgeEditing.js
 * 连线编辑几何：拖拽转折点时保持折线正交（水平/垂直）的逐轴判定与联动。
 *
 * 规则（与 Multisim 等电路图软件一致）：
 * - 拖拽转折点时按 x / y 轴独立判定是否允许移动：
 *   与「固定端口端点」直接相连的共线线段会锁死该轴；
 *   其余情况移动转折点后，相邻共线线段的另一端跟随移动以保持正交。
 * - 所有坐标最终吸附到画布网格。
 */
import { snapToGrid } from './constants'

const same = (a, b) => Math.abs(a - b) < 0.01

/**
 * 将折线 pts 中第 i 个转折点拖拽到 cursor 位置，返回保持正交的新折线。
 * @param {Array<{x:number,y:number}>} origin 拖拽起始时的完整路径点（含首末端口点）
 * @param {number} i 转折点下标（1 .. length-2）
 * @param {{x:number,y:number}} cursor 画布坐标系下的鼠标位置
 */
export function moveEdgeVertex(origin, i, cursor) {
  const pts = origin.map(p => ({ ...p }))
  const n = pts.length
  if (i <= 0 || i >= n - 1) return pts

  const nx = snapToGrid(cursor.x)
  const ny = snapToGrid(cursor.y)
  const isFixed = j => j <= 0 || j >= n - 1

  const seg1Vert = same(pts[i - 1].x, pts[i].x)
  const seg1Horiz = same(pts[i - 1].y, pts[i].y)
  const seg2Vert = same(pts[i].x, pts[i + 1].x)
  const seg2Horiz = same(pts[i].y, pts[i + 1].y)

  // 逐轴判定：若某轴的移动会破坏与固定端口相连线段的正交性，则锁定该轴
  let canX = true
  let canY = true
  if (seg1Vert && isFixed(i - 1) && !same(pts[i - 1].x, nx)) canX = false
  if (seg2Vert && isFixed(i + 1) && !same(pts[i + 1].x, nx)) canX = false
  if (seg1Horiz && isFixed(i - 1) && !same(pts[i - 1].y, ny)) canY = false
  if (seg2Horiz && isFixed(i + 1) && !same(pts[i + 1].y, ny)) canY = false

  if (canX) {
    pts[i].x = nx
    if (seg1Vert && !isFixed(i - 1)) pts[i - 1].x = nx
    if (seg2Vert && !isFixed(i + 1)) pts[i + 1].x = nx
  }
  if (canY) {
    pts[i].y = ny
    if (seg1Horiz && !isFixed(i - 1)) pts[i - 1].y = ny
    if (seg2Horiz && !isFixed(i + 1)) pts[i + 1].y = ny
  }
  return pts
}
