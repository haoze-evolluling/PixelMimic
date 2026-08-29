<script setup>
import { SlidersHorizontal, ArrowRight } from 'lucide-vue-next'
import { useWorkflow } from '../composables/useWorkflow'
import StepBasicSection from './inspector/StepBasicSection.vue'
import StepImageSection from './inspector/StepImageSection.vue'
import StepConditionSection from './inspector/StepConditionSection.vue'
import StepScrollSection from './inspector/StepScrollSection.vue'
import StepMoveSection from './inspector/StepMoveSection.vue'
import StepClickSection from './inspector/StepClickSection.vue'
import StepDragSection from './inspector/StepDragSection.vue'
import StepTextSection from './inspector/StepTextSection.vue'
import StepHotkeySection from './inspector/StepHotkeySection.vue'
import StepWaitSection from './inspector/StepWaitSection.vue'
import StepAdvancedSection from './inspector/StepAdvancedSection.vue'

/**
 * Inspector.vue
 * 步骤属性面板容器：仅负责面板骨架与分区编排，
 * 各动作类型的表单分区见 ./inspector/ 目录。
 */
const { workflow, selectedStepIndex, selectedStep } = useWorkflow()
</script>

<template>
  <section class="panel-inspector">
    <!-- Panel Header -->
    <div class="panel-header">
      <div class="panel-title">
        <SlidersHorizontal :size="15" class="panel-title-icon" />
        <span>步骤属性配置</span>
        <span class="panel-badge">
          {{ selectedStep ? `步骤 #${selectedStepIndex + 1}` : '未选中' }}
        </span>
      </div>
    </div>

    <!-- Inspector Body -->
    <div class="inspector-body">
      <!-- Empty Selection State -->
      <div v-if="!selectedStep" class="inspector-empty">
        <ArrowRight :size="24" class="empty-guide-icon" />
        <span>请在左侧选择或添加一个操作步骤以配置属性</span>
      </div>

      <!-- Active Step Properties Form -->
      <div v-else class="inspector-form">
        <StepBasicSection />
        <StepImageSection />
        <StepConditionSection />
        <StepScrollSection />
        <StepMoveSection />
        <StepClickSection />
        <StepDragSection />
        <StepTextSection />
        <StepHotkeySection />
        <StepWaitSection />
        <StepAdvancedSection />
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel-inspector {
  flex: 1;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  min-width: 280px;
  overflow: hidden;
}

.panel-header {
  height: 36px;
  padding: 0 var(--space-3);
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
  gap: var(--space-1-5);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.panel-title-icon {
  color: var(--color-primary);
}

.panel-badge {
  background: var(--bg-card);
  padding: 1px var(--space-1-5);
  border-radius: var(--radius-full);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  font-weight: 500;
  border: 1px solid var(--border-subtle);
}

.inspector-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2-5);
}

.inspector-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2-5);
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-5);
}

.empty-guide-icon {
  color: var(--text-muted);
  opacity: 0.5;
}

.inspector-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
