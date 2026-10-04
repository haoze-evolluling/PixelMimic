<script setup>
import { Sliders, MapPin } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepScrollSection.vue — 鼠标滚轮滚动设置。
 */
const { selectedStep, updateCurrentStep, pickMousePosForCurrentStep } = useWorkflow()
const { isScroll, scrollDirection, scrollMagnitude } = useInspectorStep()
</script>

<template>
  <div v-if="isScroll" class="prop-section-card">
    <div class="section-title">
      <Sliders :size="13" class="section-icon" />
      <span>鼠标滚轮滚动设置</span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">滚动方向</label>
        <select
          class="form-select"
          v-model="scrollDirection"
        >
          <option value="down">向下滚动 (页面下翻)</option>
          <option value="up">向上滚动 (页面上翻)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">滚动格数 (步长)</label>
        <input
          type="number"
          class="form-input"
          min="1"
          max="100"
          v-model="scrollMagnitude"
          placeholder="如: 3"
        />
      </div>
    </div>

    <div class="form-row mt-sm">
      <div class="form-group">
        <label class="form-label">指定坐标 X (0为当前位置)</label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.x || 0"
          @input="updateCurrentStep('x', parseInt($event.target.value) || 0)"
        />
      </div>
      <div class="form-group">
        <label class="form-label">指定坐标 Y (0为当前位置)</label>
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
      <span>拾取当前鼠标位置作为滚动坐标</span>
    </button>
  </div>
</template>
