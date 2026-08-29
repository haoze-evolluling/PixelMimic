/**
 * canvasPorts.js
 * 画布端口坐标契约（必须与 CanvasNode.vue 的端口 CSS 保持一致）：
 * - 输出圆点中心 x = node_x + NODE_WIDTH（圆点与节点右缘相切，中心恰落在网格点上）
 * - 输入圆点中心 x = node_x - 2；连线终点在其左侧留 8px 给箭头尖端（短水平引入线）
 * - 端口组锚定 y = node_y + portCenterDy(节点高度)（吸附到网格），
 *   True/False 输出圆点在锚点 ∓/± 20
 */
import { NODE_WIDTH, NODE_DEFAULT_HEIGHT, snapToGrid } from './edgeRouting'

export const PORT_OUTPUT_DX = NODE_WIDTH
export const PORT_TRUE_DY = -20
export const PORT_FALSE_DY = 20
export const PORT_INPUT_GAP = 8

export const NODE_FALLBACK_X = 100
export const NODE_FALLBACK_Y = 160

/** 端口组锚定 y 相对节点顶部的偏移（吸附网格，保证连线端点落在网格点上） */
export const portCenterDy = (nodeHeight) =>
  snapToGrid((nodeHeight || NODE_DEFAULT_HEIGHT) / 2)

export const outputPortX = (step) => (step.node_x || NODE_FALLBACK_X) + PORT_OUTPUT_DX

export const outputPortY = (step, nodeHeight, kind) =>
  (step.node_y || NODE_FALLBACK_Y) + portCenterDy(nodeHeight) + (kind === 'false' ? PORT_FALSE_DY : PORT_TRUE_DY)

export const inputPortY = (step, nodeHeight) =>
  (step.node_y || NODE_FALLBACK_Y) + portCenterDy(nodeHeight)
