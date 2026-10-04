<script setup>
import { Clock } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepWaitSection.vue — 延时等待设置。
 */
const { selectedStep, updateCurrentStep } = useWorkflow()
const { isWait } = useInspectorStep()
</script>

<template>
  <div v-if="isWait" class="prop-section-card">
    <div class="section-title">
      <Clock :size="13" class="section-icon" />
      <span>延时等待设置</span>
    </div>

    <div class="form-group">
      <label class="form-label">等待时长 (秒)</label>
      <input
        type="number"
        class="form-input"
        min="0.1"
        step="0.1"
        :value="selectedStep.pre_delay || 1.0"
        @input="updateCurrentStep('pre_delay', parseFloat($event.target.value) || 1.0)"
      />
    </div>
  </div>
</template>
