/**
 * constants.js
 * 画布节点尺寸与路由算法的常量契约。
 */

export const NODE_WIDTH = 220
export const NODE_DEFAULT_HEIGHT = 120

/**
 * 画布网格间距（px），与背景网格点完全一致。
 * 节点摆放、端口坐标与连线的全部转折点都对齐到该网格，
 * 是「Multisim 式网格 + 正交折线」体系的基准单位。
 */
export const GRID_SIZE = 20

export const snapToGrid = (v) => Math.round(v / GRID_SIZE) * GRID_SIZE

/**
 * 将折线的内部转折点吸附到网格，并清理零长度段与共线段。
 * 首末两端是端口锚点，坐标保持不变（端口 y 已按网格对齐，
 * 末端仅保留一小段水平引入线接入输入端口圆点）。
 * 前提：输入折线为正交折线（相邻点共享 x 或 y），吸附后仍保持正交。
 */
export function finalizeWaypoints(points) {
  if (!points || points.length === 0) return points
  const pts = points.map(p => ({ x: p.x, y: p.y }))
  for (let i = 1; i < pts.length - 1; i++) {
    pts[i] = { x: snapToGrid(pts[i].x), y: snapToGrid(pts[i].y) }
  }
  const out = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1]
    const cur = pts[i]
    if (cur.x === prev.x && cur.y === prev.y) continue
    if (out.length >= 2) {
      const pre = out[out.length - 2]
      const collinear =
        (pre.y === prev.y && prev.y === cur.y) ||
        (pre.x === prev.x && prev.x === cur.x)
      if (collinear) {
        out[out.length - 1] = cur
        continue
      }
    }
    out.push(cur)
  }
  return out
}

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
