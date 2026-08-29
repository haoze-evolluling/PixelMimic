/**
 * edgeRouting/index.js
 * 智能避让连线路由模块的统一出口。
 *
 * 核心能力：
 * 1. 障碍绕行（bypass）：回跳/被遮挡的连线自动从上方或下方走廊绕行
 * 2. 通道错位（channel assignment）：多条绕行连线水平范围重叠时，各自分配独立通道，
 *    彻底避免多条连线完全重合
 * 3. 标签智能定位：沿路径滑动 + 垂直偏移搜索，自动避开节点、其他连线与其他标签
 */
export {
  NODE_WIDTH,
  NODE_DEFAULT_HEIGHT,
  getNodeHeight,
  getNodeBox,
} from './constants'

export { computeBaseRoute } from './baseRoute'

export { routeAllEdges } from './batchRouting'

export {
  measureTextWidth,
  longestSegmentCenter,
  findLabelPlacement,
} from './labels'

export {
  calculateSmartWaypoints,
  generateRoundedOrthogonalPath,
  generateSmoothBezierPath,
} from './pathGeneration'
