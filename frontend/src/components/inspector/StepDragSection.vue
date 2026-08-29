<script setup>
import { Move, MapPin } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepDragSection.vue — 拖拽起点与终点配置。
 */
const { selectedStep, updateCurrentStep, pickMousePosForCurrentStep, pickDragEndPos } = useWorkflow()
const { isDrag } = useInspectorStep()
</script>

<template>
  <div v-if="isDrag" class="prop-section-card">
    <div class="section-title">
      <Move :size="13" class="section-icon" />
      <span>拖拽起点与终点</span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">起点 X: <span class="val-primary">{{ selectedStep.x || 0 }}</span></label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.x || 0"
          @input="updateCurrentStep('x', parseInt($event.target.value) || 0)"
        />
      </div>
      <div class="form-group">
        <label class="form-label">起点 Y: <span class="val-primary">{{ selectedStep.y || 0 }}</span></label>
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
      <span>拾取当前鼠标为起点</span>
    </button>

    <div class="form-row mt-sm">
      <div class="form-group">
        <label class="form-label">终点 X: <span class="val-cyan">{{ selectedStep.drag_to_x || 0 }}</span></label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.drag_to_x || 0"
          @input="updateCurrentStep('drag_to_x', parseInt($event.target.value) || 0)"
        />
      </div>
      <div class="form-group">
        <label class="form-label">终点 Y: <span class="val-cyan">{{ selectedStep.drag_to_y || 0 }}</span></label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.drag_to_y || 0"
          @input="updateCurrentStep('drag_to_y', parseInt($event.target.value) || 0)"
        />
      </div>
    </div>

    <button class="btn btn-secondary full-btn" @click="pickDragEndPos">
      <MapPin :size="13" />
      <span>拾取当前鼠标为终点</span>
    </button>

    <div class="form-row mt-sm">
      <div class="form-group">
        <label class="form-label">拖拽耗时 (秒)</label>
        <input
          type="number"
          class="form-input"
          min="0.1"
          step="0.1"
          :value="selectedStep.drag_duration || 0.5"
          @input="updateCurrentStep('drag_duration', parseFloat($event.target.value) || 0.5)"
        />
      </div>
      <div class="form-group toggle-align">
        <label class="toggle-switch-label">
          <input
            type="checkbox"
            :checked="selectedStep.smooth_drag !== false"
            @change="updateCurrentStep('smooth_drag', $event.target.checked)"
          />
          <span>平滑贝塞尔缓动</span>
        </label>
      </div>
    </div>
  </div>
</template>
