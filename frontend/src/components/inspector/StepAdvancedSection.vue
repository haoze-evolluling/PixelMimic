<script setup>
import { ref } from 'vue'
import { Settings2, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepAdvancedSection.vue — 高级参数折叠面板（渐进式披露）。
 */
const { selectedStep, updateCurrentStep } = useWorkflow()
const { isImageAction, confidencePercent } = useInspectorStep()

const isAdvancedOpen = ref(false)
</script>

<template>
  <div class="advanced-accordion">
    <button class="advanced-toggle-btn" @click="isAdvancedOpen = !isAdvancedOpen">
      <div class="accordion-title">
        <Settings2 :size="13" class="accordion-icon" />
        <span>高级参数设置</span>
      </div>
      <ChevronUp v-if="isAdvancedOpen" :size="13" />
      <ChevronDown v-else :size="13" />
    </button>

    <div v-show="isAdvancedOpen" class="advanced-content">
      <template v-if="isImageAction">
        <div class="form-group">
          <label class="form-label">
            <span>识别相似度阈值</span>
            <span class="slider-val-badge">{{ confidencePercent }}%</span>
          </label>
          <div class="slider-wrapper">
            <input
              type="range"
              class="form-range"
              min="10"
              max="100"
              v-model="confidencePercent"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="toggle-switch-label">
              <input
                type="checkbox"
                :checked="selectedStep.use_grayscale !== false"
                @change="updateCurrentStep('use_grayscale', $event.target.checked)"
              />
              <span>灰度匹配</span>
            </label>
          </div>
          <div class="form-group">
            <label class="toggle-switch-label">
              <input
                type="checkbox"
                :checked="selectedStep.multi_scale"
                @change="updateCurrentStep('multi_scale', $event.target.checked)"
              />
              <span>多尺度自适应</span>
            </label>
          </div>
        </div>
      </template>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">前延时 (秒)</label>
          <input
            type="number"
            class="form-input"
            min="0"
            step="0.1"
            :value="selectedStep.pre_delay || 0"
            @input="updateCurrentStep('pre_delay', parseFloat($event.target.value) || 0)"
          />
        </div>
        <div class="form-group">
          <label class="form-label">后延时 (秒)</label>
          <input
            type="number"
            class="form-input"
            min="0"
            step="0.1"
            :value="selectedStep.post_delay !== undefined ? selectedStep.post_delay : 0.2"
            @input="updateCurrentStep('post_delay', parseFloat($event.target.value) || 0)"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">重试次数</label>
          <input
            type="number"
            class="form-input"
            min="1"
            max="10"
            :value="selectedStep.retry_count || 1"
            @input="updateCurrentStep('retry_count', parseInt($event.target.value) || 1)"
          />
        </div>
        <div class="form-group">
          <label class="form-label">失败策略（未连「失败」出口时生效）</label>
          <select
            class="form-select"
            :value="selectedStep.on_failure || 'stop'"
            @change="updateCurrentStep('on_failure', $event.target.value)"
          >
            <option value="stop">终止流程 (推荐)</option>
            <option value="continue">忽略继续</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">步骤备注</label>
        <input
          type="text"
          class="form-input"
          :value="selectedStep.comment || ''"
          placeholder="选填，记录提示"
          @input="updateCurrentStep('comment', $event.target.value)"
        />
      </div>
    </div>
  </div>
</template>
