/**
 * geometry.js
 * 基础几何工具：线段与矩形/盒子相交检测。
 */

/**
 * Check if a horizontal line segment intersects with a box
 */
export function horizontalSegmentIntersectsBox(x1, x2, y, box) {
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  return y >= box.top && y <= box.bottom && maxX >= box.left && minX <= box.right
}

/**
 * Check if a vertical line segment intersects with a box
 */
export function verticalSegmentIntersectsBox(x, y1, y2, box) {
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)
  return x >= box.left && x <= box.right && maxY >= box.top && minY <= box.bottom
}

/**
 * Check if any node box blocks the line between two points
 */
export function isPathBlocked(p1, p2, obstacleBoxes) {
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

export function rectOverlapArea(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

export function pointInRect(p, r) {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom
}

export function segIntersectsSeg(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
  if (d === 0) return false
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

export function segIntersectsRect(p1, p2, rect) {
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
