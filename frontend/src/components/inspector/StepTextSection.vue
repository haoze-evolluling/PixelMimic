<script setup>
import { Type } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepTextSection.vue — 文本输入内容。
 */
const { selectedStep, updateCurrentStep } = useWorkflow()
const { isText } = useInspectorStep()
</script>

<template>
  <div v-if="isText" class="prop-section-card">
    <div class="section-title">
      <Type :size="13" class="section-icon" />
      <span>文本输入内容</span>
    </div>

    <div class="form-group">
      <label class="form-label">待输入文本 (支持中文与特殊字符)</label>
      <textarea
        class="form-textarea"
        rows="3"
        placeholder="请输入想要自动键入的文本..."
        :value="selectedStep.text_to_type || ''"
        @input="updateCurrentStep('text_to_type', $event.target.value)"
      ></textarea>
    </div>

    <div class="form-group">
      <label class="toggle-switch-label">
        <input
          type="checkbox"
          :checked="selectedStep.use_clipboard !== false"
          @change="updateCurrentStep('use_clipboard', $event.target.checked)"
        />
        <span>使用剪贴板快速粘贴 (推荐)</span>
      </label>
    </div>
  </div>
</template>
