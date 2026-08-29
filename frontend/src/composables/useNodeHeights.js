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

  const syncNodeHeights = () => {
    workflow.steps.forEach((_, idx) => {
      const el = document.getElementById(`canvas-node-${idx}`)
      if (!el) return
      if (nodeHeightObserver.value && !observedNodeEls.has(el)) {
        nodeHeightObserver.value.observe(el)
        observedNodeEls.add(el)
      }
      const h = el.offsetHeight
      if (h > 0 && nodeHeights[idx] !== h) {
        nodeHeights[idx] = h
      }
    })
  }

  // 步骤增删/重排后重新测量节点高度
  watch(
    () => workflow.steps.map(s => s.id || '').join('|'),
    () => nextTick(syncNodeHeights)
  )

  onMounted(() => {
    nodeHeightObserver.value = new ResizeObserver(() => syncNodeHeights())
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
