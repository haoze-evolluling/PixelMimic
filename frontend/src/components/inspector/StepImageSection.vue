<script setup>
import { Crosshair, Scissors, Search, ImageIcon } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepImageSection.vue — 目标图像配置（图像动作与条件判断共用）。
 */
const { selectedStep, updateCurrentStep, startSnipForCurrentStep, testMatchForCurrentStep } = useWorkflow()
const { isImageAction, isCondition } = useInspectorStep()
</script>

<template>
  <div v-if="isImageAction" class="prop-section-card">
    <div class="section-title">
      <Crosshair :size="13" class="section-icon" />
      <span>{{ isCondition ? '条件目标图片识别' : '目标图像配置' }}</span>
    </div>

    <div class="image-target-preview-box">
      <img
        v-if="selectedStep.image_base64"
        :src="`data:image/png;base64,${selectedStep.image_base64}`"
        class="target-img-display"
        alt="目标图片"
      />
      <div v-else class="target-img-placeholder">
        <ImageIcon :size="20" class="placeholder-icon" />
        <span>尚未设置目标图片</span>
        <span class="subtext">点击下方按钮截屏框选目标</span>
      </div>
    </div>

    <div class="image-buttons-row">
      <button class="btn btn-primary btn-snip" @click="startSnipForCurrentStep">
        <Scissors :size="13" />
        <span>截取目标 (F7)</span>
      </button>
      <button
        class="btn btn-secondary btn-test-match"
        :disabled="!selectedStep.image_base64"
        @click="testMatchForCurrentStep"
      >
        <Search :size="13" />
        <span>测试匹配</span>
      </button>
    </div>

    <div v-if="selectedStep.action_type === 'image_click'" class="form-row">
      <div class="form-group">
        <label class="form-label">点击偏移 X (像素)</label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.offset_x || 0"
          @input="updateCurrentStep('offset_x', parseInt($event.target.value) || 0)"
        />
      </div>
      <div class="form-group">
        <label class="form-label">点击偏移 Y (像素)</label>
        <input
          type="number"
          class="form-input"
          :value="selectedStep.offset_y || 0"
          @input="updateCurrentStep('offset_y', parseInt($event.target.value) || 0)"
        />
      </div>
    </div>

    <div v-if="selectedStep.action_type === 'image_wait'" class="form-row">
      <div class="form-group">
        <label class="form-label">最长超时 (秒)</label>
        <input
          type="number"
          class="form-input"
          min="0.5"
          step="0.5"
          :value="selectedStep.wait_timeout || 5.0"
          @input="updateCurrentStep('wait_timeout', parseFloat($event.target.value) || 5.0)"
        />
      </div>
      <div class="form-group toggle-align">
        <label class="toggle-switch-label">
          <input
            type="checkbox"
            :checked="selectedStep.wait_for_disappear"
            @change="updateCurrentStep('wait_for_disappear', $event.target.checked)"
          />
          <span>等待图像消失</span>
        </label>
      </div>
    </div>
  </div>
</template>
