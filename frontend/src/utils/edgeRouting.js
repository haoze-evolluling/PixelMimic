/**
 * edgeRouting.js
 * Intelligent Obstacle-Avoidance & Interactive Edge Routing for Workflow Canvas
 *
 * 核心能力：
 * 1. 障碍绕行（bypass）：回跳/被遮挡的连线自动从上方或下方走廊绕行
 * 2. 通道错位（channel assignment）：多条绕行连线水平范围重叠时，各自分配独立通道，
 *    彻底避免多条连线完全重合
 * 3. 标签智能定位：沿路径滑动 + 垂直偏移搜索，自动避开节点、其他连线与其他标签
 */

export const NODE_WIDTH = 220
export const NODE_DEFAULT_HEIGHT = 120

/** 同侧绕行走廊中，相邻通道之间的垂直间距 */
const CHANNEL_SPACING = 18
/** 同一对节点之间存在多条 S 弯连线时，弯折点的水平错位间距 */
const SPATH_STAGGER = 28
/** 判定两条绕行走廊“重叠”所需的最小水平重合长度 */
const CORRIDOR_OVERLAP_MIN = 24

/**
 * Generate bounding box for a workflow node
 */
export function getNodeBox(step, margin = 20, defaultWidth = NODE_WIDTH, defaultHeight = NODE_DEFAULT_HEIGHT) {
  const x = step.node_x || 100
  const y = step.node_y || 160
  return {
    left: x - margin,
    right: x + defaultWidth + margin,
    top: y - margin,
    bottom: y + defaultHeight + margin,
    cx: x + defaultWidth / 2,
    cy: y + defaultHeight / 2,
    width: defaultWidth + margin * 2,
    height: defaultHeight + margin * 2,
  }
}

// ---------------------------------------------------------------------------
// 基础几何工具
// ---------------------------------------------------------------------------

/**
 * Check if a horizontal line segment intersects with a box
 */
function horizontalSegmentIntersectsBox(x1, x2, y, box) {
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  return y >= box.top && y <= box.bottom && maxX >= box.left && minX <= box.right
}

/**
 * Check if a vertical line segment intersects with a box
 */
function verticalSegmentIntersectsBox(x, y1, y2, box) {
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)
  return x >= box.left && x <= box.right && maxY >= box.top && minY <= box.bottom
}

/**
 * Check if any node box blocks the line between two points
 */
function isPathBlocked(p1, p2, obstacleBoxes) {
  for (const box of obstacleBoxes) {
    if (p1.y === p2.y) {
      if (horizontalSegmentIntersectsBox(p1.x, p2.x, p1.y, box)) return true
    } else if (p1.x === p2.x) {
      if (verticalSegmentIntersectsBox(p1.x, p1.y, p2.y, box)) return true
    } else {
      const minX = Math.min(p1.x, p2.x)
      const maxX = Math.max(p1.x, p2.x)
      const minY = Math.min(p1.y, p2.y)
      const maxY = Math.max(p1.y, p2.y)
      if (maxX >= box.left && minX <= box.right && maxY >= box.top && minY <= box.bottom) {
        return true
      }
    }
  }
  return false
}

function rectsIntersect(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
}

function rectOverlapArea(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

function pointInRect(p, r) {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom
}

function segIntersectsSeg(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
  if (d === 0) return false
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

function segIntersectsRect(p1, p2, rect) {
  if (pointInRect(p1, rect) || pointInRect(p2, rect)) return true
  const c = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ]
  for (let i = 0; i < 4; i++) {
    if (segIntersectsSeg(p1, p2, c[i], c[(i + 1) % 4])) return true
  }
  return false
}

/**
 * 估算文本渲染宽度（px），用于给标签胶囊动态定宽，避免文字被裁切
 */
export function measureTextWidth(text, fontSize = 8.5) {
  let w = 0
  for (const ch of String(text ?? '')) {
    const code = ch.codePointAt(0)
    if (code >= 0x2e80) w += fontSize // CJK / 全角字符
    else if (/[A-Z0-9]/.test(ch)) w += fontSize * 0.62
    else if (/[a-z]/.test(ch)) w += fontSize * 0.52
    else w += fontSize * 0.35 // 空格与标点
  }
  return w
}

// ---------------------------------------------------------------------------
// 基础路由（单条连线，不考虑与其他连线错位）
// ---------------------------------------------------------------------------

function buildBypassRoute(x1, y1, x2, y2, steps, sourceBox, targetBox) {
  const minX = Math.min(x1, x2) - 40
  const maxX = Math.max(x1, x2) + 40

  let topMinY = Math.min(y1, y2)
  let bottomMaxY = Math.max(y1, y2)

  steps.forEach(s => {
    const b = getNodeBox(s, 22)
    if (b.right >= minX && b.left <= maxX) {
      topMinY = Math.min(topMinY, b.top)
      bottomMaxY = Math.max(bottomMaxY, b.bottom)
    }
  })

  const topBypassY = topMinY - 36
  const bottomBypassY = bottomMaxY + 36

  const distTop = Math.abs(y1 - topBypassY) + Math.abs(y2 - topBypassY)
  const distBottom = Math.abs(bottomBypassY - y1) + Math.abs(bottomBypassY - y2)

  const exitX = Math.max(x1 + 36, (sourceBox ? sourceBox.right : x1) + 24)
  const enterX = Math.min(x2 - 36, (targetBox ? targetBox.left : x2) - 24)

  return {
    kind: 'bypass',
    backward: x2 < x1,
    sideTie: Math.abs(distTop - distBottom) <= 12,
    side: distTop < distBottom ? 'top' : 'bottom',
    topBypassY,
    bottomBypassY,
    exitX,
    enterX,
    spanMin: Math.min(exitX, enterX),
    spanMax: Math.max(exitX, enterX),
  }
}

/**
 * 计算单条连线的基础路由（绕行模板 + 走廊参数，尚未做通道错位）
 */
function computeBaseRoute(spec, steps) {
  const x1 = spec.from.x
  const y1 = spec.from.y
  const x2 = spec.to.x
  const y2 = spec.to.y
  const start = { x: x1, y: y1 }
  const end = { x: x2, y: y2 }

  // 用户手动拖拽的自定义途经点：按用户意图干净地连线
  const cp = spec.customWaypoint
  if (cp && Number.isFinite(cp.x) && Number.isFinite(cp.y)) {
    if (x2 >= x1 + 60 && Math.abs(cp.x - (x1 + x2) / 2) < 25) {
      return { kind: 'custom', waypoints: [start, { x: cp.x, y: y1 }, { x: cp.x, y: y2 }, end] }
    }
    const midX1 = Math.max(x1 + 25, Math.min(cp.x - 20, (x1 + cp.x) / 2))
    const midX2 = Math.min(x2 - 25, Math.max(cp.x + 20, (x2 + cp.x) / 2))
    return { kind: 'custom', waypoints: [start, { x: midX1, y: y1 }, { x: cp.x, y: cp.y }, { x: midX2, y: y2 }, end] }
  }

  const obstacleBoxes = steps
    .filter((_, idx) => idx !== spec.fromIndex && idx !== spec.toIndex)
    .map(s => getNodeBox(s, 18))

  const sourceBox = spec.fromIndex >= 0 && spec.fromIndex < steps.length ? getNodeBox(steps[spec.fromIndex], 16) : null
  const targetBox = spec.toIndex >= 0 && spec.toIndex < steps.length ? getNodeBox(steps[spec.toIndex], 16) : null

  // 回跳 / 环形连线：目标在源头左侧或水平空间不足，必须绕行
  if (x2 < x1 + 60) {
    return { x1, y1, x2, y2, ...buildBypassRoute(x1, y1, x2, y2, steps, sourceBox, targetBox) }
  }

  // 前向：优先尝试简洁的两折 S 弯（或同行直线）
  const midX = (x1 + x2) / 2
  const p2 = { x: midX, y: y1 }
  const p3 = { x: midX, y: y2 }
  const blocked =
    isPathBlocked(start, p2, obstacleBoxes) ||
    isPathBlocked(p2, p3, obstacleBoxes) ||
    isPathBlocked(p3, end, obstacleBoxes)

  if (!blocked) {
    if (Math.abs(y1 - y2) < 1) {
      return { kind: 'straight', waypoints: [start, end] }
    }
    return { kind: 'spath', x1, y1, x2, y2, midX, waypoints: [start, p2, p3, end] }
  }

  // 前向路径被节点遮挡，同样走绕行模板
  return { x1, y1, x2, y2, ...buildBypassRoute(x1, y1, x2, y2, steps, sourceBox, targetBox) }
}

function buildBypassWaypoints(info, corridorY, exitX, enterX) {
  return [
    { x: info.x1, y: info.y1 },
    { x: exitX, y: info.y1 },
    { x: exitX, y: corridorY },
    { x: enterX, y: corridorY },
    { x: enterX, y: info.y2 },
    { x: info.x2, y: info.y2 },
  ]
}

// ---------------------------------------------------------------------------
// 批量路由：通道错位 + 标签定位
// ---------------------------------------------------------------------------

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
 *   { key, fromIndex, toIndex, from:{x,y}, to:{x,y}, customWaypoint, labelText, fontSize }
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

// ---------------------------------------------------------------------------
// 标签定位
// ---------------------------------------------------------------------------

/**
 * 在路径上为标签寻找一个不与节点、其他连线、其他标签冲突的位置。
 * 策略：优先最长的线段，沿线滑动 + 垂直偏移逐个尝试；全部冲突时退回重叠最小的位置。
 */
function findLabelPlacement(waypoints, w, h, nodeBoxes, placedRects, otherSegments) {
  const segs = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i]
    const p2 = waypoints[i + 1]
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    if (len >= 24) segs.push({ p1, p2, len })
  }
  segs.sort((a, b) => b.len - a.len)

  const perpOffsets = [
    0,
    h / 2 + 6,
    -(h / 2 + 6),
    h / 2 + 24,
    -(h / 2 + 24),
    h / 2 + 48,
    -(h / 2 + 48),
    h / 2 + 72,
    -(h / 2 + 72),
    h / 2 + 100,
    -(h / 2 + 100),
  ]
  let best = null
  let bestScore = Infinity

  const evaluate = (x, y) => {
    const rect = {
      left: x - w / 2 - 2,
      right: x + w / 2 + 2,
      top: y - h / 2 - 2,
      bottom: y + h / 2 + 2,
    }
    let score = 0
    for (const box of nodeBoxes) {
      const area = rectOverlapArea(rect, box)
      if (area > 0) score += area * 3 + 60
    }
    for (const placed of placedRects) {
      const area = rectOverlapArea(rect, placed)
      if (area > 0) score += area * 2 + 60
    }
    for (const seg of otherSegments) {
      if (segIntersectsRect(seg.p1, seg.p2, rect)) score += 220
    }
    return { score, rect }
  }

  for (const seg of segs.slice(0, 4)) {
    const dx = seg.p2.x - seg.p1.x
    const dy = seg.p2.y - seg.p1.y
    const dir = { x: dx / seg.len, y: dy / seg.len }
    const norm = { x: -dir.y, y: dir.x }
    const mid = { x: (seg.p1.x + seg.p2.x) / 2, y: (seg.p1.y + seg.p2.y) / 2 }
    const proj = Math.abs(dir.x) * (w / 2) + Math.abs(dir.y) * (h / 2)
    const half = seg.len / 2
    // 标签能完整放在线段上时只沿线滑动；放不下时允许适度外延（仍紧贴线段端部）
    const maxT = proj <= half ? Math.max(0, half - proj - 2) : proj + 24

    const ts = [0]
    for (let s = 24; s <= maxT; s += 24) {
      ts.push(s, -s)
    }

    for (const perp of perpOffsets) {
      for (const t of ts) {
        const x = mid.x + dir.x * t + norm.x * perp
        const y = mid.y + dir.y * t + norm.y * perp
        const { score, rect } = evaluate(x, y)
        if (score === 0) {
          return { x, y, rect }
        }
        if (score < bestScore) {
          bestScore = score
          best = { x, y, rect }
        }
      }
    }
  }

  if (best) return best
  const center = longestSegmentCenter(waypoints)
  const rect = {
    left: center.x - w / 2 - 2,
    right: center.x + w / 2 + 2,
    top: center.y - h / 2 - 2,
    bottom: center.y + h / 2 + 2,
  }
  return { x: center.x, y: center.y, rect }
}

/**
 * Find the center of the longest segment in the waypoints (fallback label / handle anchor)
 */
function longestSegmentCenter(points) {
  if (!points || points.length < 2) return { x: 0, y: 0 }
  let maxLen = -1
  let best = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    if (len > maxLen) {
      maxLen = len
      best = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// 路径生成
// ---------------------------------------------------------------------------

/**
 * Calculate smart waypoints between source and target port with obstacle avoidance
 * (单条连线的快捷入口，供连线拖拽实时预览使用；正式渲染请使用 routeAllEdges 以获得通道错位)
 */
export function calculateSmartWaypoints(from, to, allSteps = [], fromIndex = -1, toIndex = -1, customWaypoint = null) {
  const info = computeBaseRoute(
    { from, to, fromIndex, toIndex, customWaypoint },
    allSteps
  )
  if (info.kind !== 'bypass') return info.waypoints

  const corridorY = info.side === 'top' ? info.topBypassY : info.bottomBypassY
  return buildBypassWaypoints(info, corridorY, info.exitX, info.enterX)
}

/**
 * Generate SVG Path string with rounded orthogonal corners (Corner Radius R)
 */
export function generateRoundedOrthogonalPath(points, radius = 14) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    // Vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }

    const len1 = Math.hypot(v1.x, v1.y)
    const len2 = Math.hypot(v2.x, v2.y)

    if (len1 === 0 || len2 === 0) {
      path += ` L ${curr.x} ${curr.y}`
      continue
    }

    const r = Math.min(radius, len1 / 2, len2 / 2)

    // Point before corner
    const pBefore = {
      x: curr.x - (v1.x / len1) * r,
      y: curr.y - (v1.y / len1) * r,
    }

    // Point after corner
    const pAfter = {
      x: curr.x + (v2.x / len2) * r,
      y: curr.y + (v2.y / len2) * r,
    }

    path += ` L ${pBefore.x} ${pBefore.y} Q ${curr.x} ${curr.y}, ${pAfter.x} ${pAfter.y}`
  }

  const last = points[points.length - 1]
  path += ` L ${last.x} ${last.y}`

  return path
}

/**
 * Generate smooth cubic bezier SVG Path connecting waypoints seamlessly
 */
export function generateSmoothBezierPath(points) {
  if (!points || points.length === 0) return ''
  if (points.length === 2) {
    const [p1, p2] = points
    const dx = Math.max(40, Math.abs(p2.x - p1.x) * 0.5)
    return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`
  }

  // Multi-point smooth rounded orthogonal spline
  return generateRoundedOrthogonalPath(points, 20)
}
