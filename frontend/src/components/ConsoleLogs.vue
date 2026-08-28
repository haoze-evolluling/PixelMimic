<script setup>
import { ref, watch, nextTick } from 'vue'
import { useExecution } from '../composables/useExecution'
import { Terminal, Trash2 } from 'lucide-vue-next'

const { logs, autoScroll, clearLogs } = useExecution()
const logContainerRef = ref(null)

watch(
  () => logs.value.length,
  async () => {
    if (autoScroll.value) {
      await nextTick()
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
      }
    }
  }
)
</script>

<template>
  <section class="bottom-console-container">
    <!-- Console Header -->
    <div class="console-header">
      <div class="console-tabs">
        <div class="console-tab active">
          <Terminal :size="13" class="tab-icon" />
          <span>运行日志</span>
          <span v-if="logs.length > 0" class="log-count">{{ logs.length }}</span>
        </div>
      </div>

      <div class="console-actions">
        <label class="toggle-switch-label log-scroll-toggle">
          <input type="checkbox" v-model="autoScroll" />
          <span>自动滚动</span>
        </label>

        <button class="btn btn-secondary btn-clear" @click="clearLogs" title="清空所有日志">
          <Trash2 :size="12" />
          <span>清空日志</span>
        </button>
      </div>
    </div>

    <!-- Log Console Scroll Area -->
    <div ref="logContainerRef" class="log-scroll-area">
      <div v-if="logs.length === 0" class="log-empty">
        暂无运行日志输出
      </div>
      <div
        v-for="log in logs"
        :key="log.id"
        class="log-entry"
      >
        <span class="log-time">[{{ log.time }}]</span>
        <span :class="['log-badge', log.level]">{{ log.level }}</span>
        <span class="log-text">{{ log.message }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bottom-console-container {
  height: 160px;
  background: var(--bg-app);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.console-header {
  height: 32px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
}

.console-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.console-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 4px 8px;
}

.tab-icon {
  color: var(--color-primary);
}

.log-count {
  font-size: 10px;
  background: var(--bg-card);
  padding: 1px 5px;
  border-radius: 8px;
  color: var(--text-muted);
}

.console-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-scroll-toggle {
  font-size: 11px;
  color: var(--text-muted);
}

.btn-clear {
  font-size: 11px;
  padding: 2px 8px;
}

.log-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-empty {
  color: var(--text-muted);
  font-style: italic;
  font-size: 11px;
  padding: 8px 0;
}

.log-entry {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
  word-break: break-all;
}

.log-time {
  color: var(--text-muted);
  font-size: 11px;
  flex-shrink: 0;
}

.log-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.log-badge.info {
  background: rgba(59, 130, 246, 0.2);
  color: var(--color-primary);
}

.log-badge.success {
  background: rgba(16, 185, 129, 0.2);
  color: var(--color-success);
}

.log-badge.warning {
  background: rgba(245, 158, 11, 0.2);
  color: var(--color-warning);
}

.log-badge.error {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-danger);
}

.log-text {
  color: var(--text-primary);
  flex: 1;
}
</style>
