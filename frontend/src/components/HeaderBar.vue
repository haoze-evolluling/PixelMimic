<script setup>
import { computed } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import { useExecution } from '../composables/useExecution'
import { useSettings } from '../composables/useSettings'
import {
  Bot,
  PenLine,
  FilePlus2,
  FolderOpen,
  Save,
  Play,
  Pause,
  Square,
  Scissors,
  Settings,
  HelpCircle,
} from 'lucide-vue-next'

const emit = defineEmits(['open-settings', 'open-about'])

const { workflow, fileName, newWorkflow, openWorkflow, saveWorkflow, startSnipForCurrentStep, syncWorkflow } = useWorkflow()
const { executionState, startWorkflow, togglePause, stopWorkflow } = useExecution()
const { settings } = useSettings()

const isRunning = computed(() => executionState.value === 'running')
const isPaused = computed(() => executionState.value === 'paused')

const handleRun = () => {
  startWorkflow(workflow, settings.value)
}
</script>

<template>
  <header class="app-header">
    <!-- Left Section -->
    <div class="header-left">
      <div class="brand-logo">
        <Bot class="brand-icon-svg" :size="20" />
        <span class="brand-name">PixelMimic</span>
      </div>

      <div class="workflow-title-wrapper" title="点击可修改当前工作流名称">
        <PenLine :size="14" class="title-edit-icon" />
        <input
          type="text"
          class="workflow-title-input"
          v-model="workflow.name"
          @input="syncWorkflow"
          placeholder="未命名工作流"
        />
      </div>

      <span class="file-status-badge" :title="fileName">
        {{ fileName }}
      </span>
    </div>

    <!-- Center Section: File Operations -->
    <div class="header-center">
      <button class="btn btn-secondary" title="新建工作流 (Ctrl+N)" @click="newWorkflow">
        <FilePlus2 :size="15" />
        <span>新建</span>
      </button>
      <button class="btn btn-secondary" title="打开工作流 (Ctrl+O)" @click="openWorkflow">
        <FolderOpen :size="15" />
        <span>打开</span>
      </button>
      <button class="btn btn-secondary" title="保存工作流 (Ctrl+S)" @click="saveWorkflow">
        <Save :size="15" />
        <span>保存</span>
      </button>
    </div>

    <!-- Right Section: Execution & Global Actions -->
    <div class="header-right">
      <button
        class="btn btn-success"
        :disabled="isRunning || isPaused"
        title="启动执行 (快捷键 F8)"
        @click="handleRun"
      >
        <Play :size="15" />
        <span>启动运行 (F8)</span>
      </button>

      <button
        class="btn btn-warning"
        :disabled="!isRunning && !isPaused"
        :title="isPaused ? '继续执行 (快捷键 F9)' : '暂停执行 (快捷键 F9)'"
        @click="togglePause"
      >
        <Play v-if="isPaused" :size="15" />
        <Pause v-else :size="15" />
        <span>{{ isPaused ? '继续 (F9)' : '暂停 (F9)' }}</span>
      </button>

      <button
        class="btn btn-danger"
        :disabled="!isRunning && !isPaused"
        title="紧急停止 (快捷键 F10)"
        @click="stopWorkflow"
      >
        <Square :size="15" />
        <span>停止 (F10)</span>
      </button>

      <div class="header-divider"></div>

      <button
        class="btn btn-secondary"
        title="全屏截取目标图片 (快捷键 F7)"
        @click="startSnipForCurrentStep"
      >
        <Scissors :size="15" />
        <span>截屏 (F7)</span>
      </button>

      <button
        class="btn btn-secondary btn-icon-only"
        title="首选项设置"
        @click="emit('open-settings')"
      >
        <Settings :size="16" />
      </button>

      <button
        class="btn btn-secondary btn-icon-only"
        title="关于与帮助"
        @click="emit('open-about')"
      >
        <HelpCircle :size="16" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 54px;
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 16px;
  flex-shrink: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.3px;
  color: #ffffff;
}

.brand-icon-svg {
  color: var(--color-primary);
}

.workflow-title-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.title-edit-icon {
  color: var(--text-muted);
}

.workflow-title-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  width: 130px;
  outline: none;
}

.workflow-title-input:focus {
  border-bottom: 1px solid var(--color-primary);
}

.file-status-badge {
  font-size: 11px;
  color: var(--text-muted);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-divider {
  width: 1px;
  height: 18px;
  background: var(--border-subtle);
  margin: 0 4px;
}
</style>
