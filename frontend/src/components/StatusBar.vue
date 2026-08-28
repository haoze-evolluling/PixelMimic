<script setup>
import { computed } from 'vue'
import { useExecution } from '../composables/useExecution'
import { MousePointer, Repeat } from 'lucide-vue-next'

const { executionState, cursorPos, loopProgress } = useExecution()

const stateText = computed(() => {
  switch (executionState.value) {
    case 'running':
      return '运行中'
    case 'paused':
      return '已暂停'
    case 'error':
      return '执行异常'
    default:
      return '就绪'
  }
})

const stateClass = computed(() => {
  switch (executionState.value) {
    case 'running':
      return 'running'
    case 'paused':
      return 'paused'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
})

const loopText = computed(() => {
  const tot = loopProgress.total > 0 ? loopProgress.total : '∞'
  return `${loopProgress.current}/${tot}`
})
</script>

<template>
  <footer class="status-bar">
    <!-- Status Left -->
    <div class="status-left">
      <div class="status-item">
        <div :class="['status-indicator-dot', stateClass]"></div>
        <span :class="['status-state-text', stateClass]">{{ stateText }}</span>
      </div>

      <div class="status-item">
        <Repeat :size="12" class="status-icon" />
        <span>循环: <b class="highlight-val">{{ loopText }}</b></span>
      </div>
    </div>

    <!-- Status Right -->
    <div class="status-right">
      <div class="status-item">
        <MousePointer :size="12" class="status-icon" />
        <span>实时光标: <b class="cursor-pos-val">X: {{ cursorPos.x }}, Y: {{ cursorPos.y }}</b></span>
      </div>

      <div class="status-item hotkey-reminders">
        <span class="hk-tag"><kbd>F7</kbd> 截屏</span>
        <span class="hk-tag"><kbd>F8</kbd> 运行</span>
        <span class="hk-tag"><kbd>F9</kbd> 暂停</span>
        <span class="hk-tag"><kbd>F10</kbd> 停止</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  height: 24px;
  background: var(--bg-header);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  font-size: 10.5px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-icon {
  color: var(--text-muted);
}

.status-indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success);
  transition: all 0.2s ease;
}

.status-indicator-dot.running {
  background: var(--color-cyan);
  box-shadow: 0 0 6px var(--color-cyan);
  animation: pulse 1.5s infinite;
}

.status-indicator-dot.paused {
  background: var(--color-warning);
  box-shadow: 0 0 6px var(--color-warning);
}

.status-indicator-dot.error {
  background: var(--color-danger);
  box-shadow: 0 0 6px var(--color-danger);
}

.status-state-text {
  font-weight: 600;
}
.status-state-text.idle {
  color: var(--color-success);
}
.status-state-text.running {
  color: var(--color-cyan);
}
.status-state-text.paused {
  color: var(--color-warning);
}
.status-state-text.error {
  color: var(--color-danger);
}

.highlight-val {
  color: var(--text-primary);
}

.cursor-pos-val {
  color: var(--color-cyan);
  font-variant-numeric: tabular-nums;
}

.hotkey-reminders {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.hk-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.hk-tag kbd {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 2px;
  padding: 0 3px;
  font-size: 9.5px;
  font-family: inherit;
  color: var(--text-primary);
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
