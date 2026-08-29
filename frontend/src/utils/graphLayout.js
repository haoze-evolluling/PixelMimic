/**
 * graphLayout.js
 * 自动整理的分层布局算法（Sugiyama 简化版）。
 *
 * 依据画布连线语义（WorkflowCanvas 中 connections 的构建规则）把步骤
 * 还原为一张有向图，然后：
 * 1. DFS 识别回边（循环跳转），打破成环
 * 2. 剩余 DAG 按最长路径分层，层数 = 节点所在列
 * 3. 层内按父节点次序排行，行 = 节点所在行
 * 4. 各列按总高度垂直居中，坐标全部吸附网格
 *
 * 纯函数：只读 steps，返回与 steps 等长的 { x, y } 数组。
 */
import { snapToGrid, NODE_WIDTH, NODE_DEFAULT_HEIGHT } from './edgeRouting'

const LAYOUT_START_X = 80
const LAYOUT_START_Y = 160
const COL_GAP = 100 // 列间距额外留白（节点宽 220 + 100 = 320，容纳连线走廊）
const ROW_GAP = 140 // 行间距额外留白（容纳横向绕行连线与标签）

const jumpTarget = (jumpStep, steps) => {
  const n = Number(jumpStep)
  if (!Number.isFinite(n)) return -1
  const idx = Math.round(n) - 1
  return idx >= 0 && idx < steps.length ? idx : -1
}

/**
 * 依据与画布渲染一致的分支语义构建有向边。
 * 条件节点成立/不成立分支显式跳转；标准动作 next 跳转或顺序执行；
 * 失败分支仅在显式 jump 时成边。continue 的条件分支隐式顺序流转，
 * 自环（重复执行自身）不参与布局。
 */
export function buildFlowEdges(steps) {
  const seen = new Set()
  const edges = []
  const add = (from, to) => {
    if (to < 0 || to >= steps.length || to === from) return
    const key = `${from}->${to}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ from, to })
  }

  steps.forEach((step, i) => {
    if (step.action_type === 'condition') {
      const thenJump = step.then_action === 'jump' ? jumpTarget(step.then_jump_step, steps) : -1
      const elseJump = step.else_action === 'jump' ? jumpTarget(step.else_jump_step, steps) : -1
      if (thenJump >= 0) add(i, thenJump)
      if (elseJump >= 0) add(i, elseJump)
      // 无任何显式跳转（或仅单侧跳转）时，continue 一侧隐式顺序流转
      if (i < steps.length - 1 && (thenJump < 0 || elseJump < 0)) add(i, i + 1)
    } else {
      if (step.next_action === 'jump') {
        add(i, jumpTarget(step.next_jump_step, steps))
      } else if (i < steps.length - 1) {
        add(i, i + 1)
      }
      if (step.fail_action === 'jump') {
        add(i, jumpTarget(step.fail_jump_step, steps))
      }
    }
  })
  return edges
}

/**
 * DFS 识别回边（指向 DFS 栈中祖先节点的边），用于打破循环。
 */
function findBackEdges(n, edges) {
  const adj = Array.from({ length: n }, () => [])
  edges.forEach((e, ei) => adj[e.from].push({ to: e.to, ei }))
  const color = new Array(n).fill(0) // 0 未访问 1 在栈中 2 已完成
  const back = new Set()
  const dfs = (start) => {
    const stack = [{ v: start, it: 0 }]
    color[start] = 1
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (frame.it < adj[frame.v].length) {
        const { to, ei } = adj[frame.v][frame.it++]
        if (color[to] === 1) back.add(ei)
        else if (color[to] === 0) {
          color[to] = 1
          stack.push({ v: to, it: 0 })
        }
      } else {
        color[frame.v] = 2
        stack.pop()
      }
    }
  }
  for (let v = 0; v < n; v++) if (color[v] === 0) dfs(v)
  return back
}

/**
 * 计算分层布局坐标。
 * @param {Array} steps 步骤列表（可含实测高度 height）
 * @returns {Array<{x:number,y:number}>}
 */
export function computeLayeredLayout(steps) {
  const n = steps.length
  if (n === 0) return []

  const edges = buildFlowEdges(steps)
  const back = findBackEdges(n, edges)
  const dagEdges = edges.filter((_, ei) => !back.has(ei))

  // 入度表 + Kahn 拓扑序（仅非回边）
  const indeg = new Array(n).fill(0)
  const adj = Array.from({ length: n }, () => [])
  dagEdges.forEach(({ from, to }) => {
    adj[from].push(to)
    indeg[to]++
  })
  const topo = []
  const queue = []
  for (let v = 0; v < n; v++) if (indeg[v] === 0) queue.push(v)
  for (let qi = 0; qi < queue.length; qi++) {
    const v = queue[qi]
    topo.push(v)
    adj[v].forEach((to) => {
      if (--indeg[to] === 0) queue.push(to)
    })
  }
  // 环中残留节点（全部互指、无入度零起点）兜底：按序号补入
  for (let v = 0; v < n; v++) if (!topo.includes(v)) topo.push(v)

  // 最长路径分层：沿拓扑序松弛
  const layer = new Array(n).fill(0)
  topo.forEach((v) => {
    adj[v].forEach((to) => {
      if (layer[to] < layer[v] + 1) layer[to] = layer[v] + 1
    })
  })

  // 层内排序：按父节点的已排次序（取最小者优先），无父则按步骤序号
  const byLayer = new Map()
  layer.forEach((l, v) => {
    if (!byLayer.has(l)) byLayer.set(l, [])
    byLayer.get(l).push(v)
  })
  const orderInLayer = new Map() // v -> 层内行号
  const parents = Array.from({ length: n }, () => [])
  dagEdges.forEach(({ from, to }) => parents[to].push(from))

  const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b)
  sortedLayers.forEach((l) => {
    const nodes = byLayer.get(l)
    nodes.sort((a, b) => {
      const pa = parents[a].length ? Math.min(...parents[a].map((p) => orderInLayer.get(p) ?? 0)) : a
      const pb = parents[b].length ? Math.min(...parents[b].map((p) => orderInLayer.get(p) ?? 0)) : b
      return pa - pb || a - b
    })
    nodes.forEach((v, row) => orderInLayer.set(v, row))
  })

  // 逐列自上而下排布，再做各列垂直居中
  const colHeights = new Map()
  const colNodes = new Map()
  sortedLayers.forEach((l) => {
    const nodes = byLayer.get(l)
    const h =
      nodes.reduce((acc, v) => acc + (steps[v].height || NODE_DEFAULT_HEIGHT), 0) +
      (nodes.length - 1) * ROW_GAP
    colHeights.set(l, h)
    colNodes.set(l, nodes)
  })
  const maxColHeight = Math.max(...colHeights.values(), 0)

  const positions = new Array(n)
  sortedLayers.forEach((l) => {
    let cursor = LAYOUT_START_Y + (maxColHeight - colHeights.get(l)) / 2
    colNodes.get(l).forEach((v) => {
      positions[v] = {
        x: snapToGrid(LAYOUT_START_X + l * (NODE_WIDTH + COL_GAP)),
        y: snapToGrid(cursor),
      }
      cursor += (steps[v].height || NODE_DEFAULT_HEIGHT) + ROW_GAP
    })
  })
  return positions
}
