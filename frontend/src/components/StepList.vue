<script setup>
import { ref } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import { useExecution } from '../composables/useExecution'
import StepCard from './StepCard.vue'
import {
  ListTree,
  Trash2,
  Sparkles,
  MousePointerClick,
  Crop,
  PlayCircle,
} from 'lucide-vue-next'

const {
  workflow,
  selectedStepIndex,
  selectStep,
  deleteStep,
  duplicateStep,
  moveStep,
  reorderSteps,
  clearAllSteps,
  loadSampleTemplate,
  testSingleStep,
} = useWorkflow()

const { stepStatuses } = useExecution()

const draggedIndex = ref(null)

const handleDragStart = (event, index) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

const handleDrop = (event, index) => {
  event.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === index) return
  reorderSteps(draggedIndex.value, index)
  draggedIndex.value = null
}

const handleClearSteps = () => {
  if (confirm('确定要清空当前所有操作步骤吗？')) {
    clearAllSteps()
  }
}
</script>

<template>
  <section class="panel-steps">
    <!-- Panel Header -->
    <div class="panel-header">
      <div class="panel-title">
        <ListTree :size="15" class="panel-title-icon" />
        <span>自动化步骤流</span>
        <span class="panel-badge">{{ workflow.steps.length }} 步</span>
      </div>

      <div class="panel-actions">
        <button
          v-if="workflow.steps.length > 0"
          class="btn btn-secondary btn-icon-only"
          title="清空全部步骤"
          @click="handleClearSteps"
        >
          <Trash2 :size="12" />
        </button>
      </div>
    </div>

    <!-- Steps Container -->
    <div class="steps-scroll-container">
      <!-- Empty State / Onboarding Guide -->
      <div v-if="workflow.steps.length === 0" class="empty-state">
        <div class="empty-icon-wrap">
          <Sparkles :size="30" class="empty-icon-svg" />
        </div>
        <div class="empty-title">欢迎使用 PixelMimic 自动化大师</div>
        <div class="empty-desc">
          当前还没有添加任何操作步骤。您可以点击上方快捷操作栏添加，或直接体验新手示例：
        </div>

        <div class="onboarding-guide-box">
          <div class="guide-step">
            <div class="guide-num-badge">
              <MousePointerClick :size="13" />
            </div>
            <div class="guide-text">
              点击上方 <b>【找图点击】</b> 或 <b>【坐标点击】</b>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-num-badge">
              <Crop :size="13" />
            </div>
            <div class="guide-text">
              按 <b>F7</b> 框选您想自动识别点击的目标图标或按钮
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-num-badge">
              <PlayCircle :size="13" />
            </div>
            <div class="guide-text">
              点击右上角 <b>【运行】(F8)</b> 即可全自动执行
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-sample" @click="loadSampleTemplate">
          <Sparkles :size="14" />
          <span>载入新手示例流程体验</span>
        </button>
      </div>

      <!-- Step Cards List -->
      <div v-else class="step-cards-wrapper">
        <StepCard
          v-for="(step, idx) in workflow.steps"
          :key="step.id || idx"
          :step="step"
          :index="idx"
          :is-selected="idx === selectedStepIndex"
          :status="stepStatuses[idx]"
          @select="selectStep"
          @test="testSingleStep"
          @duplicate="duplicateStep"
          @move-up="moveStep(idx, -1)"
          @move-down="moveStep(idx, 1)"
          @delete="deleteStep"
          @drag-start="handleDragStart"
          @drag-over="handleDragOver"
          @drop="handleDrop"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel-steps {
  flex: 1.1;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  min-width: 280px;
  overflow: hidden;
}

.panel-header {
  height: 36px;
  padding: 0 12px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-title-icon {
  color: var(--color-primary);
}

.panel-badge {
  background: var(--bg-card);
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 500;
  border: 1px solid var(--border-subtle);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.steps-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.step-cards-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Empty State & Onboarding */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border: 1px solid var(--border-card);
}

.empty-icon-svg {
  color: var(--color-primary);
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 11.5px;
  line-height: 1.5;
  max-width: 340px;
  margin-bottom: 16px;
  color: var(--text-muted);
}

.onboarding-guide-box {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  width: 100%;
  max-width: 340px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.guide-step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11.5px;
  color: var(--text-secondary);
}

.guide-num-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-surface);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
}

.guide-text b {
  color: var(--text-primary);
}

.btn-sample {
  padding: 7px 16px;
  font-size: 12px;
}
</style>
