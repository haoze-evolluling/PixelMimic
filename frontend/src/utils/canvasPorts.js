/**
 * canvasPorts.js
 * 画布端口坐标契约（必须与 CanvasNode.vue 的端口 CSS 保持一致）：
 * - 输出圆点中心 x = node_x + NODE_WIDTH（圆点与节点右缘相切，中心恰落在网格点上）
 * - 输入圆点中心 x = node_x - 2；连线终点在其左侧留 8px 给箭头尖端（短水平引入线）
 * - 输入端口 y = node_y + portCenterDy(节点高度)（吸附到网格）
 * - True/False 输出端口 y 由 portOutputDys 按节点实际高度选取：
 *   优先 ±20 大间距，卡片矮时收缩到 ±10，且整组始终与卡片真实中心对齐、
 *   不贴上下边缘。端口 y 全部落在网格点上（连线端点保持正交的前提）。
 */
import { NODE_WIDTH, NODE_DEFAULT_HEIGHT, GRID_SIZE, snapToGrid } from './edgeRouting'

export const PORT_OUTPUT_DX = NODE_WIDTH
// True/False 端口间距的上下限：高卡片 ±20，紧凑卡片收缩到 ±10
export const PORT_MAX_SPREAD = 20
export const PORT_MIN_SPREAD = 10
// ±20 间距时端口中心距卡片上下边缘的舒适余量；±10 收缩间距时的最低余量
export const PORT_COZY_MARGIN = 28
export const PORT_MIN_MARGIN = 20
export const PORT_INPUT_GAP = 8

export const NODE_FALLBACK_X = 100
export const NODE_FALLBACK_Y = 160

/** 端口组锚定 y 相对节点顶部的偏移（吸附网格，保证连线端点落在网格点上） */
export const portCenterDy = (nodeHeight) =>
  snapToGrid((nodeHeight || NODE_DEFAULT_HEIGHT) / 2)

/**
 * 依据节点实际高度选取 True/False 输出端口的 y 偏移（相对节点顶部）。
 * 卡片高度通常不是网格整数倍，固定「中心 ±20」会让端口贴住上下边缘；
 * 这里在网格点上搜索端口对：优先大间距（±20），放不下再收缩（±10），
 * 并取中点最接近卡片真实中心的一组。
 */
export function portOutputDys(nodeHeight) {
  const h = nodeHeight || NODE_DEFAULT_HEIGHT
  for (const spread of [PORT_MAX_SPREAD, PORT_MIN_SPREAD]) {
    const margin = spread === PORT_MAX_SPREAD ? PORT_COZY_MARGIN : PORT_MIN_MARGIN
    const upper = h - margin
    let best = null
    for (let p1 = GRID_SIZE; p1 + 2 * spread <= upper; p1 += GRID_SIZE) {
      if (p1 < margin) continue
      const mid = p1 + spread
      if (!best || Math.abs(mid - h / 2) < Math.abs(best.mid - h / 2)) {
        best = { p1, p2: p1 + 2 * spread, mid }
      }
    }
    if (best) return best
  }
  // 极矮卡片兜底：最后一个网格点与再上方的网格点
  const p2 = Math.max(GRID_SIZE * 2, Math.floor((h - GRID_SIZE) / GRID_SIZE) * GRID_SIZE)
  return { p1: p2 - GRID_SIZE, p2, mid: p2 - GRID_SIZE / 2 }
}

/** True/False 输出端口 y 相对节点顶部的偏移 */
export const portTrueDy = (nodeHeight) => portOutputDys(nodeHeight).p1
export const portFalseDy = (nodeHeight) => portOutputDys(nodeHeight).p2

export const outputPortX = (step) => (step.node_x || NODE_FALLBACK_X) + PORT_OUTPUT_DX

export const outputPortY = (step, nodeHeight, kind) =>
  (step.node_y || NODE_FALLBACK_Y) + (kind === 'false' ? portFalseDy(nodeHeight) : portTrueDy(nodeHeight))

export const inputPortY = (step, nodeHeight) =>
  (step.node_y || NODE_FALLBACK_Y) + portCenterDy(nodeHeight)
