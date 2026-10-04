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
  height: 120px;
  background: var(--bg-app);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.console-header {
  height: 28px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
}

.console-tabs {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
}

.console-tab {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  padding: var(--space-0-5) var(--space-1-5);
}

.tab-icon {
  color: var(--color-primary);
}

.log-count {
  font-size: var(--text-2xs);
  background: var(--bg-card);
  padding: 1px var(--space-1);
  border-radius: var(--radius-full);
  color: var(--text-muted);
}

.console-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
}

.log-scroll-toggle {
  font-size: var(--text-2xs);
  color: var(--text-muted);
}

.btn-clear {
  font-size: var(--text-2xs);
  padding: var(--space-0-5) var(--space-1-5);
}

.log-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1-5) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
}

.log-empty {
  color: var(--text-muted);
  font-style: italic;
  font-size: var(--text-xs);
  padding: var(--space-1) 0;
}

.log-entry {
  display: flex;
  align-items: baseline;
  gap: var(--space-1-5);
  margin-bottom: var(--space-0-5);
  word-break: break-all;
}

.log-time {
  color: var(--text-muted);
  font-size: var(--text-2xs);
  flex-shrink: 0;
}

.log-badge {
  font-size: var(--text-2xs);
  font-weight: 700;
  padding: 0 var(--space-1);
  border-radius: var(--radius-xs);
  text-transform: uppercase;
  flex-shrink: 0;
}

.log-badge.info {
  background: var(--soft-primary);
  color: var(--color-primary);
}

.log-badge.success {
  background: var(--soft-success);
  color: var(--color-success);
}

.log-badge.warning {
  background: var(--soft-warning);
  color: var(--color-warning);
}

.log-badge.error {
  background: var(--soft-danger);
  color: var(--color-danger);
}

.log-text {
  color: var(--text-primary);
  flex: 1;
}
</style>
