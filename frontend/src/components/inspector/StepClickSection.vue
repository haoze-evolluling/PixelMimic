<script setup>
import { MousePointer, MapPin } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepClickSection.vue — 鼠标点击行为（坐标点击/长按/找图点击共用）。
 */
const { selectedStep, updateCurrentStep, pickMousePosForCurrentStep } = useWorkflow()
const { isMouseClick } = useInspectorStep()
</script>

<template>
  <div v-if="isMouseClick || selectedStep.action_type === 'image_click'" class="prop-section-card">
    <div class="section-title">
      <MousePointer :size="13" class="section-icon" />
      <span>鼠标点击行为</span>
    </div>

    <template v-if="isMouseClick">
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
    </template>

    <div class="form-row mt-sm">
      <div class="form-group">
        <label class="form-label">鼠标按键</label>
        <select
          class="form-select"
          :value="selectedStep.mouse_button || 'left'"
          @change="updateCurrentStep('mouse_button', $event.target.value)"
        >
          <option value="left">鼠标左键</option>
          <option value="right">鼠标右键</option>
          <option value="middle">鼠标中键</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">点击方式</label>
        <select
          class="form-select"
          :value="selectedStep.click_type || 'single'"
          @change="updateCurrentStep('click_type', $event.target.value)"
        >
          <option value="single">单击</option>
          <option value="double">双击</option>
          <option value="triple">三击</option>
          <option value="down">按下保持</option>
          <option value="up">释放</option>
        </select>
      </div>
    </div>

    <div v-if="selectedStep.action_type === 'mouse_longpress'" class="form-group">
      <label class="form-label">长按持续时间 (秒)</label>
      <input
        type="number"
        class="form-input"
        min="0.1"
        step="0.1"
        :value="selectedStep.press_duration || 1.0"
        @input="updateCurrentStep('press_duration', parseFloat($event.target.value) || 1.0)"
      />
    </div>
  </div>
</template>
