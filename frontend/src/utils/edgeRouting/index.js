/**
 * edgeRouting/index.js
 * 正交连线路由模块的统一出口（Multisim 电路图风格）。
 *
 * 核心能力：
 * 1. 网格体系：节点摆放、端口坐标与全部转折点对齐到 GRID_SIZE 网格
 * 2. 正交折线：所有连线仅由水平/垂直直线段构成，无任何曲线
 * 3. 障碍绕行（bypass）：回跳/被遮挡的连线自动从上方或下方走廊绕行
 * 4. 通道错位（channel assignment）：多条绕行连线水平范围重叠时，各自分配独立通道
 * 5. 标签智能定位：沿路径滑动 + 垂直偏移搜索，自动避开节点、其他连线与其他标签
 * 6. 用户自绘多点路径 + 线段/转折点拖拽编辑（保持正交）
 */
export {
  NODE_WIDTH,
  NODE_DEFAULT_HEIGHT,
  GRID_SIZE,
  snapToGrid,
  finalizeWaypoints,
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
  generateOrthogonalPath,
  calculateGridLRoute,
  finishRouteToPort,
} from './pathGeneration'

export { moveEdgeVertex } from './edgeEditing'
