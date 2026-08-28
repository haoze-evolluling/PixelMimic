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
      <div class="brand-logo" title="PixelMimic 桌面可视化自动化大师">
        <Bot class="brand-icon-svg" :size="17" />
        <span class="brand-name">PixelMimic</span>
      </div>

      <div class="workflow-title-wrapper" title="点击可修改当前工作流名称">
        <PenLine :size="12" class="title-edit-icon" />
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
      <button class="btn btn-secondary header-btn" title="新建工作流 (Ctrl+N)" @click="newWorkflow">
        <FilePlus2 :size="13" />
        <span class="btn-text">新建</span>
      </button>
      <button class="btn btn-secondary header-btn" title="打开工作流 (Ctrl+O)" @click="openWorkflow">
        <FolderOpen :size="13" />
        <span class="btn-text">打开</span>
      </button>
      <button class="btn btn-secondary header-btn" title="保存工作流 (Ctrl+S)" @click="saveWorkflow">
        <Save :size="13" />
        <span class="btn-text">保存</span>
      </button>
    </div>

    <!-- Right Section: Execution & Global Actions -->
    <div class="header-right">
      <button
        class="btn btn-success header-btn"
        :disabled="isRunning || isPaused"
        title="启动执行 (快捷键 F8)"
        @click="handleRun"
      >
        <Play :size="13" />
        <span class="btn-text">运行 (F8)</span>
      </button>

      <button
        class="btn btn-warning header-btn"
        :disabled="!isRunning && !isPaused"
        :title="isPaused ? '继续执行 (快捷键 F9)' : '暂停执行 (快捷键 F9)'"
        @click="togglePause"
      >
        <Play v-if="isPaused" :size="13" />
        <Pause v-else :size="13" />
        <span class="btn-text">{{ isPaused ? '继续' : '暂停' }} (F9)</span>
      </button>

      <button
        class="btn btn-danger header-btn"
        :disabled="!isRunning && !isPaused"
        title="紧急停止 (快捷键 F10)"
        @click="stopWorkflow"
      >
        <Square :size="13" />
        <span class="btn-text">停止 (F10)</span>
      </button>

      <div class="header-divider"></div>

      <button
        class="btn btn-secondary header-btn"
        title="全屏截取目标图片 (快捷键 F7)"
        @click="startSnipForCurrentStep"
      >
        <Scissors :size="13" />
        <span class="btn-text">截屏 (F7)</span>
      </button>

      <button
        class="btn btn-secondary btn-icon-only header-icon-btn"
        title="首选项设置"
        @click="emit('open-settings')"
      >
        <Settings :size="14" />
      </button>

      <button
        class="btn btn-secondary btn-icon-only header-icon-btn"
        title="关于与帮助"
        @click="emit('open-about')"
      >
        <HelpCircle :size="14" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 44px;
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  gap: 8px;
  flex-shrink: 0;
  z-index: 100;
  overflow-x: hidden;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 1;
  min-width: 0;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  font-size: 13.5px;
  letter-spacing: -0.3px;
  color: #ffffff;
  flex-shrink: 0;
}

.brand-icon-svg {
  color: var(--color-primary);
}

.workflow-title-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  box-sizing: border-box;
  background: var(--bg-surface);
  padding: 0 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  max-width: 120px;
  min-width: 70px;
}

.title-edit-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.workflow-title-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 500;
  width: 100%;
  outline: none;
  min-width: 0;
  height: 100%;
  line-height: 26px;
}

.workflow-title-input:focus {
  border-bottom: 1px solid var(--color-primary);
}

.file-status-badge {
  font-size: 10.5px;
  color: var(--text-muted);
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

/* Ensure completely uniform height for all buttons in HeaderBar */
.app-header .btn {
  height: 28px;
  min-height: 28px;
  max-height: 28px;
  box-sizing: border-box;
  line-height: 1;
}

.header-btn {
  padding: 0 8px !important;
  font-size: 11.5px !important;
  gap: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header-icon-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.header-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
  margin: 0 2px;
  flex-shrink: 0;
}

@media (max-width: 860px) {
  .file-status-badge {
    display: none;
  }
}
</style>
