<script setup>
import { Plus, Sparkles, GitBranch } from 'lucide-vue-next'

/**
 * CanvasOnboarding.vue
 * 空画布引导页：新手示例载入与快速添加入口。
 */
const emit = defineEmits(['load-sample', 'quick-add'])
</script>

<template>
  <div class="onboarding-canvas">
    <div class="empty-icon-wrap">
      <GitBranch :size="32" class="empty-icon-svg" />
    </div>
    <div class="empty-title">可视化流程编排画布</div>
    <div class="empty-desc">
      拖拽或点击上方各类动作卡片即可生成流程节点；支持节点自由拖拽排版与端口连线。
    </div>

    <div class="guide-actions-row">
      <button class="btn btn-primary" @click="emit('load-sample')">
        <Sparkles :size="13" />
        <span>载入新手示例流程</span>
      </button>
      <button class="btn btn-secondary" @click="emit('quick-add', 'image_click')">
        <Plus :size="13" />
        <span>添加找图点击节点</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Empty Canvas Onboarding Guide */
.onboarding-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  max-width: 400px;
  padding: var(--space-6);
  background: color-mix(in srgb, var(--bg-card) 82%, transparent);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
  z-index: 5;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--soft-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
}

.empty-icon-svg {
  color: var(--color-info);
}

.empty-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1-5);
}

.empty-desc {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.guide-actions-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2-5);
}
</style>
