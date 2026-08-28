/**
 * edgeRouting.js
 * Intelligent Obstacle-Avoidance & Interactive Edge Routing for Workflow Canvas
 */

/**
 * Generate bounding box for a workflow node
 */
export function getNodeBox(step, margin = 20, defaultWidth = 220, defaultHeight = 120) {
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

/**
 * Calculate smart waypoints between source and target port with obstacle avoidance
 */
export function calculateSmartWaypoints(from, to, allSteps = [], fromIndex = -1, toIndex = -1, customWaypoint = null) {
  const { x: x1, y: y1 } = from
  const { x: x2, y: y2 } = to

  // If user provided a custom waypoint via dragging, route cleanly through it
  if (customWaypoint && typeof customWaypoint.x === 'number' && typeof customWaypoint.y === 'number') {
    const cp = customWaypoint
    // Build clean path via custom control point
    if (x2 >= x1 + 60 && Math.abs(cp.x - (x1 + x2) / 2) < 25) {
      return [
        { x: x1, y: y1 },
        { x: cp.x, y: y1 },
        { x: cp.x, y: y2 },
        { x: x2, y: y2 },
      ]
    }
    const midX1 = Math.max(x1 + 25, Math.min(cp.x - 20, (x1 + cp.x) / 2))
    const midX2 = Math.min(x2 - 25, Math.max(cp.x + 20, (x2 + cp.x) / 2))
    return [
      { x: x1, y: y1 },
      { x: midX1, y: y1 },
      { x: cp.x, y: cp.y },
      { x: midX2, y: y2 },
      { x: x2, y: y2 },
    ]
  }

  // Get all relevant obstacle boxes (excluding source and target)
  const obstacleBoxes = allSteps
    .filter((_, idx) => idx !== fromIndex && idx !== toIndex)
    .map(step => getNodeBox(step, 18))

  const sourceBox = fromIndex >= 0 && fromIndex < allSteps.length ? getNodeBox(allSteps[fromIndex], 16) : null
  const targetBox = toIndex >= 0 && toIndex < allSteps.length ? getNodeBox(allSteps[toIndex], 16) : null

  // CASE 1: Backward Jump or Loop (target is to the left or directly stacked with not enough room)
  if (x2 < x1 + 60) {
    const minX = Math.min(x1, x2) - 40
    const maxX = Math.max(x1, x2) + 40

    // Find all nodes in the horizontal span
    const spanBoxes = allSteps.map(s => getNodeBox(s, 22))

    let topMinY = Math.min(y1, y2)
    let bottomMaxY = Math.max(y1, y2)

    spanBoxes.forEach(b => {
      if (b.right >= minX && b.left <= maxX) {
        topMinY = Math.min(topMinY, b.top)
        bottomMaxY = Math.max(bottomMaxY, b.bottom)
      }
    })

    const topBypassY = topMinY - 36
    const bottomBypassY = bottomMaxY + 36

    // Choose the corridor that requires less detour or has fewer obstacles
    const distTop = Math.abs(y1 - topBypassY) + Math.abs(y2 - topBypassY)
    const distBottom = Math.abs(bottomBypassY - y1) + Math.abs(bottomBypassY - y2)

    const bypassY = distTop <= distBottom ? topBypassY : bottomBypassY
    const exitX = Math.max(x1 + 36, (sourceBox?.right || x1) + 24)
    const enterX = Math.min(x2 - 36, (targetBox?.left || x2) - 24)

    return [
      { x: x1, y: y1 },
      { x: exitX, y: y1 },
      { x: exitX, y: bypassY },
      { x: enterX, y: bypassY },
      { x: enterX, y: y2 },
      { x: x2, y: y2 },
    ]
  }

  // CASE 2: Forward Path - check if direct forward 2-bend path intersects any obstacle
  const midX = (x1 + x2) / 2
  const simpleP1 = { x: x1, y: y1 }
  const simpleP2 = { x: midX, y: y1 }
  const simpleP3 = { x: midX, y: y2 }
  const simpleP4 = { x: x2, y: y2 }

  const blockedMid = isPathBlocked(simpleP2, simpleP3, obstacleBoxes) ||
                     isPathBlocked(simpleP1, simpleP2, obstacleBoxes) ||
                     isPathBlocked(simpleP3, simpleP4, obstacleBoxes)

  if (!blockedMid) {
    // Clean direct S-path
    return [simpleP1, simpleP2, simpleP3, simpleP4]
  }

  // Obstacle detected between forward nodes! Calculate top or bottom bypass
  let topMinY = Math.min(y1, y2)
  let bottomMaxY = Math.max(y1, y2)

  obstacleBoxes.forEach(b => {
    if (b.right >= x1 && b.left <= x2) {
      topMinY = Math.min(topMinY, b.top)
      bottomMaxY = Math.max(bottomMaxY, b.bottom)
    }
  })

  const topBypassY = topMinY - 32
  const bottomBypassY = bottomMaxY + 32

  const distTop = Math.abs(y1 - topBypassY) + Math.abs(y2 - topBypassY)
  const distBottom = Math.abs(bottomBypassY - y1) + Math.abs(bottomBypassY - y2)
  const bypassY = distTop <= distBottom ? topBypassY : bottomBypassY

  const exitX = x1 + 28
  const enterX = x2 - 28

  return [
    { x: x1, y: y1 },
    { x: exitX, y: y1 },
    { x: exitX, y: bypassY },
    { x: enterX, y: bypassY },
    { x: enterX, y: y2 },
    { x: x2, y: y2 },
  ]
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

/**
 * Find the center of the longest segment in the waypoints (best place for label & handle)
 */
export function getLongestSegmentCenter(points) {
  if (!points || points.length < 2) return { x: 0, y: 0, length: 0 }

  let maxLen = -1
  let bestCenter = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    if (len > maxLen) {
      maxLen = len
      bestCenter = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        isVertical: Math.abs(p2.x - p1.x) < 2,
        isHorizontal: Math.abs(p2.y - p1.y) < 2,
        length: len,
      }
    }
  }

  return bestCenter
}
