/**
 * constants.js
 * 画布节点尺寸与路由算法的常量契约。
 */

export const NODE_WIDTH = 220
export const NODE_DEFAULT_HEIGHT = 120

/** 同侧绕行走廊中，相邻通道之间的垂直间距 */
export const CHANNEL_SPACING = 18
/** 同一对节点之间存在多条 S 弯连线时，弯折点的水平错位间距 */
export const SPATH_STAGGER = 28
/** 判定两条绕行走廊“重叠”所需的最小水平重合长度 */
export const CORRIDOR_OVERLAP_MIN = 24

/**
 * 节点实际渲染高度（由 WorkflowCanvas 通过 ResizeObserver 写入 step.node_h，
 * 未测量到时回退默认值）
 */
export function getNodeHeight(step) {
  return step?.node_h || NODE_DEFAULT_HEIGHT
}

/**
 * Generate bounding box for a workflow node
 */
export function getNodeBox(step, margin = 20, defaultWidth = NODE_WIDTH, defaultHeight = NODE_DEFAULT_HEIGHT) {
  const x = step.node_x || 100
  const y = step.node_y || 160
  const h = step?.node_h || defaultHeight
  return {
    left: x - margin,
    right: x + defaultWidth + margin,
    top: y - margin,
    bottom: y + h + margin,
    cx: x + defaultWidth / 2,
    cy: y + h / 2,
    width: defaultWidth + margin * 2,
    height: h + margin * 2,
  }
}
