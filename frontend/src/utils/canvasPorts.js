/**
 * canvasPorts.js
 * 画布端口坐标契约（必须与 CanvasNode.vue 的端口 CSS 保持一致）：
 * - 输出圆点中心 x = node_x + NODE_WIDTH + 2（dot 12px，right: -8px）
 * - 输入圆点中心 x = node_x - 2；连线终点在其左侧留 8px 给箭头尖端
 * - True/False 输出圆点中心 y = 节点垂直中心 ∓/± 16
 */
import { NODE_WIDTH } from './edgeRouting'

export const PORT_OUTPUT_DX = NODE_WIDTH + 2
export const PORT_TRUE_DY = -16
export const PORT_FALSE_DY = 16
export const PORT_INPUT_GAP = 8

export const NODE_FALLBACK_X = 100
export const NODE_FALLBACK_Y = 160

export const outputPortX = (step) => (step.node_x || NODE_FALLBACK_X) + PORT_OUTPUT_DX

export const outputPortY = (step, nodeHeight, kind) =>
  (step.node_y || NODE_FALLBACK_Y) + nodeHeight / 2 + (kind === 'false' ? PORT_FALSE_DY : PORT_TRUE_DY)

export const inputPortY = (step, nodeHeight) => (step.node_y || NODE_FALLBACK_Y) + nodeHeight / 2
