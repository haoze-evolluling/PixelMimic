<script setup>
import { useWorkflow } from '../composables/useWorkflow'
import {
  PlusCircle,
  Crosshair,
  MousePointer,
  Type,
  Zap,
  Clock,
  Move,
  Timer,
  Eye,
} from 'lucide-vue-next'

const { quickAddStep } = useWorkflow()

const actions = [
  { type: 'image_click', label: '找图点击', icon: Crosshair },
  { type: 'mouse_click', label: '坐标点击', icon: MousePointer },
  { type: 'type_text', label: '输入文字', icon: Type },
  { type: 'hotkey', label: '组合快捷键', icon: Zap },
  { type: 'wait_time', label: '等待延时', icon: Clock },
  { type: 'mouse_drag', label: '鼠标拖拽', icon: Move },
  { type: 'mouse_longpress', label: '鼠标长按', icon: Timer },
  { type: 'image_wait', label: '等待图像', icon: Eye },
]
</script>

<template>
  <div class="action-palette-bar">
    <div class="palette-label">
      <PlusCircle :size="13" class="label-icon" />
      <span>常用操作:</span>
    </div>

    <div class="palette-buttons">
      <button
        v-for="item in actions"
        :key="item.type"
        class="palette-item-btn"
        @click="quickAddStep(item.type)"
      >
        <component :is="item.icon" :size="13" class="item-icon" />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-palette-bar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  padding: 5px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  overflow-x: auto;
}

.palette-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.label-icon {
  color: var(--color-primary);
}

.palette-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.palette-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  color: var(--text-primary);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.palette-item-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--color-primary);
  color: #ffffff;
}

.palette-item-btn:active {
  transform: scale(0.97);
}

.item-icon {
  color: var(--color-primary);
}
</style>
