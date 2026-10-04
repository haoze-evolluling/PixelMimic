/**
 * labels.js
 * 连线标签：文本宽度估算 + 智能定位（避开节点 / 其他连线 / 已放置标签）
 */
import { rectOverlapArea, segIntersectsRect } from './geometry'

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

/**
 * Find the center of the longest segment in the waypoints (fallback label / handle anchor)
 */
export function longestSegmentCenter(points) {
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

/**
 * 在路径上为标签寻找一个不与节点、其他连线、其他标签冲突的位置。
 * 策略：优先最长的线段，沿线滑动 + 垂直偏移逐个尝试；全部冲突时退回重叠最小的位置。
 */
export function findLabelPlacement(waypoints, w, h, nodeBoxes, placedRects, otherSegments) {
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
