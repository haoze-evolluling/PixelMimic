<script setup>
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  LayoutGrid,
  Trash2,
} from 'lucide-vue-next'

/**
 * CanvasToolbar.vue
 * 画布浮动控制条：缩放、自适应、自动排版与清空画布。
 * （连线统一为网格对齐的正交折线，不再提供曲线样式切换）
 */
defineProps({
  scale: {
    type: Number,
    required: true,
  },
  hasSteps: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'zoom-in',
  'zoom-out',
  'reset-zoom',
  'fit-view',
  'auto-layout',
  'clear',
])
</script>

<template>
  <div class="canvas-toolbar">
    <button class="toolbar-btn" title="放大 (Ctrl + +)" @click="emit('zoom-in')">
      <ZoomIn :size="14" />
    </button>
    <span class="zoom-text">{{ Math.round(scale * 100) }}%</span>
    <button class="toolbar-btn" title="缩小 (Ctrl + -)" @click="emit('zoom-out')">
      <ZoomOut :size="14" />
    </button>
    <button class="toolbar-btn" title="重置 100%" @click="emit('reset-zoom')">
      <RotateCcw :size="13" />
    </button>
    <button class="toolbar-btn" title="自适应居中" @click="emit('fit-view')">
      <Maximize2 :size="13" />
    </button>

    <div class="toolbar-divider"></div>

    <button class="toolbar-btn highlight-btn" title="一键智能排版对齐" @click="emit('auto-layout')">
      <LayoutGrid :size="13" />
      <span>自动整理</span>
    </button>

    <div class="toolbar-divider"></div>

    <button
      v-if="hasSteps"
      class="toolbar-btn danger-btn"
      title="清空画布"
      @click="emit('clear')"
    >
      <Trash2 :size="13" />
    </button>
  </div>
</template>

<style scoped>
/* Floating Toolbar */
.canvas-toolbar {
  position: absolute;
  bottom: var(--space-4);
  left: var(--space-4);
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-1-5);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-toolbar);
  user-select: none;
}

.toolbar-btn {
  height: 26px;
  padding: 0 var(--space-1-5);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-family: inherit;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.toolbar-btn:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.toolbar-btn.highlight-btn {
  color: var(--color-info);
}

.toolbar-btn.highlight-btn:hover {
  background: var(--soft-info);
  border-color: color-mix(in srgb, var(--color-info) 30%, transparent);
}

.toolbar-btn.danger-btn:hover {
  background: var(--soft-danger);
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
}

.zoom-text {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  min-width: 34px;
  text-align: center;
  font-family: var(--font-mono);
}

.toolbar-divider {
  width: 1px;
  height: 14px;
  background: var(--border-subtle);
  margin: 0 var(--space-0-5);
}
</style>
