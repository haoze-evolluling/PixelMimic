/**
 * batchRouting.js
 * 批量路由：为画布上的所有连线统一分配路由，
 * 包含绕行侧平衡、通道错位、S 弯错位与标签定位四个阶段。
 */
import { CHANNEL_SPACING, SPATH_STAGGER, CORRIDOR_OVERLAP_MIN, getNodeBox, finalizeWaypoints } from './constants'
import { computeBaseRoute, buildBypassWaypoints } from './baseRoute'
import { measureTextWidth, findLabelPlacement, longestSegmentCenter } from './labels'

/**
 * 计算出口竖直段允许延伸到的最大 X（不撞进右侧节点的避让盒）
 */
function exitXCap(steps, spec, exitX, y1, corridorY) {
  const obstacles = steps
    .filter((_, idx) => idx !== spec.fromIndex && idx !== spec.toIndex)
    .map(s => getNodeBox(s, 18))
  const top = Math.min(y1, corridorY)
  const bottom = Math.max(y1, corridorY)
  let cap = Infinity
  for (const b of obstacles) {
    if (b.left > exitX + 14 && b.bottom >= top && b.top <= bottom) {
      cap = Math.min(cap, b.left - 14)
    }
  }
  return cap
}

/**
 * 计算入口竖直段允许收窄到的最小 X（不撞进左侧节点的避让盒）
 */
function enterXFloor(steps, spec, enterX, y2, corridorY) {
  const obstacles = steps
    .filter((_, idx) => idx !== spec.fromIndex && idx !== spec.toIndex)
    .map(s => getNodeBox(s, 18))
  const top = Math.min(y2, corridorY)
  const bottom = Math.max(y2, corridorY)
  let floor = 8
  for (const b of obstacles) {
    if (b.right < enterX - 14 && b.bottom >= top && b.top <= bottom) {
      floor = Math.max(floor, b.right + 16)
    }
  }
  return floor
}

/**
 * 为画布上的所有连线统一计算路由。
 *
 * @param {Array} steps 所有节点（用于障碍检测）
 * @param {Array} specs 连线定义列表
 *   { key, fromIndex, toIndex, from:{x,y}, to:{x,y}, customPoints, labelText, fontSize }
 * @returns {Map} key -> { waypoints, labelAnchor:{x,y}, labelWidth, labelHeight }
 */
export function routeAllEdges(steps, specs, options = {}) {
  const spacing = options.channelSpacing || CHANNEL_SPACING
  const infos = specs.map(spec => ({ spec, ...computeBaseRoute(spec, steps) }))

  // ---- Pass 1: 绕行侧平衡（上下距离接近时，分配到当前更空的一侧） ----
  let topCount = 0
  let bottomCount = 0
  infos.forEach(r => {
    if (r.kind !== 'bypass') return
    if (r.sideTie) {
      r.side = topCount <= bottomCount ? 'top' : 'bottom'
    }
    if (r.side === 'top') topCount++
    else bottomCount++
    r.corridorBaseY = r.side === 'top' ? r.topBypassY : r.bottomBypassY
  })

  // ---- Pass 1.5: 自环通道错位：同一节点同一侧的多条自环小环，逐通道垂直错开 ----
  const selfGroups = new Map()
  infos.forEach(r => {
    if (r.kind !== 'self') return
    const key = `${r.spec.fromIndex}|${r.side}`
    if (!selfGroups.has(key)) selfGroups.set(key, [])
    selfGroups.get(key).push(r)
  })
  selfGroups.forEach(members => {
    members.sort((a, b) => (a.spec.key < b.spec.key ? -1 : 1))
    members.forEach((r, i) => {
      if (i === 0) return // 第一条保持贴节点的基础位置
      const offset = i * spacing
      const loopY = r.side === 'top' ? r.loopBaseY - offset : r.loopBaseY + offset
      r.waypoints = [
        { x: r.x1, y: r.y1 },
        { x: r.loopX1, y: r.y1 },
        { x: r.loopX1, y: loopY },
        { x: r.loopX2, y: loopY },
        { x: r.loopX2, y: r.y2 },
        { x: r.x2, y: r.y2 },
      ]
    })
  })

  // ---- Pass 2: 通道错位：同侧且水平范围重叠的绕行连线，按跨度 nesting 分配独立通道 ----
  const bypassInfos = infos.filter(r => r.kind === 'bypass')
  const parent = bypassInfos.map((_, i) => i)
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a, b) => {
    parent[find(a)] = find(b)
  }
  for (let i = 0; i < bypassInfos.length; i++) {
    for (let j = i + 1; j < bypassInfos.length; j++) {
      const a = bypassInfos[i]
      const b = bypassInfos[j]
      if (a.side !== b.side) continue
      const overlap = Math.min(a.spanMax, b.spanMax) - Math.max(a.spanMin, b.spanMin)
      if (overlap >= CORRIDOR_OVERLAP_MIN) union(i, j)
    }
  }

  const groups = new Map()
  bypassInfos.forEach((r, i) => {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(r)
  })

  groups.forEach(members => {
    // 跨度最长的环安排到最外侧通道，短的环贴内侧行成嵌套，视觉最自然
    members.sort((a, b) => {
      const spanA = a.spanMax - a.spanMin
      const spanB = b.spanMax - b.spanMin
      if (spanB !== spanA) return spanB - spanA
      return a.spec.key < b.spec.key ? -1 : 1
    })
    const n = members.length
    members.forEach((r, i) => {
      const offset = (n - 1 - i) * spacing
      r.corridorY = r.side === 'top' ? r.corridorBaseY - offset : r.corridorBaseY + offset
      // 回跳线：入口/出口竖直段按通道适度错开（上限 28px），避免多条线在同一 X 上共轨，
      // 同时受节点避让盒约束，不切入相邻节点
      let finalExitX = r.exitX
      let finalEnterX = r.enterX
      if (r.backward) {
        const cap = exitXCap(steps, r.spec, r.exitX, r.y1, r.corridorY)
        finalExitX = Math.min(r.exitX + Math.min(offset, 28), cap)
        const floor = enterXFloor(steps, r.spec, r.enterX, r.y2, r.corridorY)
        finalEnterX = Math.max(r.enterX - Math.min(offset, 28), floor)
      }
      r.waypoints = buildBypassWaypoints(r, r.corridorY, finalExitX, finalEnterX)
    })
  })

  // ---- Pass 3: 同一对节点间的多条 S 弯连线，弯折点水平错位 ----
  const spathGroups = new Map()
  infos.forEach(r => {
    if (r.kind !== 'spath') return
    const key = `${r.spec.fromIndex}->${r.spec.toIndex}`
    if (!spathGroups.has(key)) spathGroups.set(key, [])
    spathGroups.get(key).push(r)
  })
  spathGroups.forEach(members => {
    members.forEach((r, i) => {
      const midX = r.midX + (i - (members.length - 1) / 2) * SPATH_STAGGER
      r.waypoints = [
        { x: r.x1, y: r.y1 },
        { x: midX, y: r.y1 },
        { x: midX, y: r.y2 },
        { x: r.x2, y: r.y2 },
      ]
    })
  })

  // ---- Pass 3.5: 网格对齐：所有转折点吸附到画布网格，并清理退化段 ----
  infos.forEach(r => {
    if (r.waypoints) r.waypoints = finalizeWaypoints(r.waypoints)
  })

  // ---- Pass 4: 标签智能定位（避开节点 / 其他连线 / 已放置标签） ----
  const nodeBoxes = steps.map(s => getNodeBox(s, 6))
  const allSegments = []
  infos.forEach(r => {
    const wp = r.waypoints || []
    for (let i = 0; i < wp.length - 1; i++) {
      allSegments.push({ owner: r.spec.key, p1: wp[i], p2: wp[i + 1] })
    }
  })

  const placedRects = []
  infos.forEach(r => {
    const labelText = r.spec.labelText
    if (!labelText || !r.waypoints) {
      r.label = null
      r.labelAnchor = longestSegmentCenter(r.waypoints || [])
      return
    }
    const fontSize = r.spec.fontSize || 8.5
    const w = Math.ceil(measureTextWidth(labelText, fontSize)) + 15
    const h = 19
    const otherSegments = allSegments.filter(s => s.owner !== r.spec.key)
    const placement = findLabelPlacement(r.waypoints, w, h, nodeBoxes, placedRects, otherSegments)
    r.label = { ...placement, w, h }
    r.labelAnchor = { x: placement.x, y: placement.y }
    placedRects.push(placement.rect)
  })

  const result = new Map()
  infos.forEach(r => {
    result.set(r.spec.key, {
      waypoints: r.waypoints,
      labelAnchor: r.labelAnchor,
      labelWidth: r.label ? r.label.w : null,
      labelHeight: r.label ? r.label.h : null,
    })
  })
  return result
}
