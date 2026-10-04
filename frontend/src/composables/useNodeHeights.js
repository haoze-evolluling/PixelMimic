import { reactive, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { NODE_DEFAULT_HEIGHT } from '../utils/edgeRouting'

/**
 * useNodeHeights.js
 * 通过 ResizeObserver 测量节点实际渲染高度，
 * 保证连线端点与路由始终动态吸附在端口圆点上。
 */
export function useNodeHeights(workflow) {
  const nodeHeights = reactive({})
  const nodeHeightObserver = ref(null)
  const observedNodeEls = new WeakSet()

  const getNodeHeightAt = (idx) => nodeHeights[idx] || NODE_DEFAULT_HEIGHT

  // 读取单个节点的实际高度并按元素 id 中的索引写入缓存
  const measureEl = (el) => {
    const h = el.offsetHeight
    const idx = Number(el.id.replace('canvas-node-', ''))
    if (!Number.isNaN(idx) && h > 0 && nodeHeights[idx] !== h) {
      nodeHeights[idx] = h
    }
  }

  const syncNodeHeights = () => {
    workflow.steps.forEach((_, idx) => {
      const el = document.getElementById(`canvas-node-${idx}`)
      if (!el) return
      if (nodeHeightObserver.value && !observedNodeEls.has(el)) {
        nodeHeightObserver.value.observe(el)
        observedNodeEls.add(el)
      }
      measureEl(el)
    })
  }

  // 步骤增删/重排后重新测量节点高度
  watch(
    () => workflow.steps.map(s => s.id || '').join('|'),
    () => nextTick(syncNodeHeights)
  )

  onMounted(() => {
    // 回调只测量真正发生尺寸变化的节点，避免单个节点高度变化触发全画布 DOM 回读
    nodeHeightObserver.value = new ResizeObserver((entries) => {
      entries.forEach((entry) => measureEl(entry.target))
    })
    nextTick(syncNodeHeights)
  })

  onUnmounted(() => {
    if (nodeHeightObserver.value) {
      nodeHeightObserver.value.disconnect()
      nodeHeightObserver.value = null
    }
  })

  return { getNodeHeightAt, syncNodeHeights }
}
