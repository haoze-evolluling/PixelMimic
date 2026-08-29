<script setup>
import { Navigation, MapPin } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepMoveSection.vue — 鼠标移动目标坐标。
 */
const { selectedStep, updateCurrentStep, pickMousePosForCurrentStep } = useWorkflow()
const { isMove } = useInspectorStep()
</script>

<template>
  <div v-if="isMove" class="prop-section-card">
    <div class="section-title">
      <Navigation :size="13" class="section-icon" />
      <span>鼠标移动目标坐标</span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">目标坐标 X</label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.x || 0"
          @input="updateCurrentStep('x', parseInt($event.target.value) || 0)"
        />
      </div>
      <div class="form-group">
        <label class="form-label">目标坐标 Y</label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.y || 0"
          @input="updateCurrentStep('y', parseInt($event.target.value) || 0)"
        />
      </div>
    </div>

    <button class="btn btn-secondary full-btn" @click="pickMousePosForCurrentStep">
      <MapPin :size="13" />
      <span>拾取当前鼠标位置</span>
    </button>
  </div>
</template>
