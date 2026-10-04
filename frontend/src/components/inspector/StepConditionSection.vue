<script setup>
import { GitBranch } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepConditionSection.vue — 条件判断与 True/False 分支流控。
 */
const { workflow, selectedStep, updateCurrentStep } = useWorkflow()
const { isCondition } = useInspectorStep()

// THEN / ELSE 两个分支的配置结构完全一致，此处统一驱动渲染
const branchDefs = [
  {
    key: 'then',
    tag: 'IF 条件成立时',
    tagClass: 'branch-tag-then',
    boxClass: 'then-branch',
    hint: '当判定结果为真时执行',
  },
  {
    key: 'else',
    tag: 'ELSE 条件不成立时',
    tagClass: 'branch-tag-else',
    boxClass: 'else-branch',
    hint: '当判定结果为假时执行',
  },
]
</script>

<template>
  <div v-if="isCondition" class="prop-section-card">
    <div class="section-title">
      <GitBranch :size="13" class="section-icon" />
      <span>条件判断与分支流控</span>
    </div>

    <div class="form-group">
      <label class="form-label">判断条件类型</label>
      <select
        class="form-select"
        :value="selectedStep.condition_type || 'image_exists'"
        @change="updateCurrentStep('condition_type', $event.target.value)"
      >
        <option value="image_exists">屏幕中【存在】目标图像</option>
        <option value="image_not_exists">屏幕中【不存在】目标图像</option>
      </select>
    </div>

    <div
      v-for="branch in branchDefs"
      :key="branch.key"
      class="branch-config-box"
      :class="[branch.boxClass, branch.key === 'else' ? 'mt-sm' : '']"
    >
      <div class="branch-title-row">
        <span class="branch-tag" :class="branch.tagClass">{{ branch.tag }}</span>
        <span class="branch-hint">{{ branch.hint }}</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">执行动作</label>
          <select
            class="form-select"
            :value="selectedStep[`${branch.key}_action`] || 'continue'"
            @change="updateCurrentStep(`${branch.key}_action`, $event.target.value)"
          >
            <option value="continue">继续执行下一步</option>
            <option value="jump">跳转到指定步骤</option>
            <option value="skip">跳过后续步骤</option>
            <option value="stop">终止流程执行</option>
          </select>
        </div>

        <div v-if="selectedStep[`${branch.key}_action`] === 'jump'" class="form-group">
          <label class="form-label">跳转目标步骤</label>
          <select
            class="form-select"
            :value="selectedStep[`${branch.key}_jump_step`] || 1"
            @change="updateCurrentStep(`${branch.key}_jump_step`, parseInt($event.target.value) || 1)"
          >
            <option
              v-for="(st, idx) in workflow.steps"
              :key="st.id || idx"
              :value="idx + 1"
            >
              步骤 #{{ idx + 1 }}: {{ st.name }}
            </option>
          </select>
        </div>

        <div v-if="selectedStep[`${branch.key}_action`] === 'skip'" class="form-group">
          <label class="form-label">跳过步骤数量</label>
          <input
            type="number"
            class="form-input"
            min="1"
            max="100"
            :value="selectedStep[`${branch.key}_skip_count`] || 1"
            @input="updateCurrentStep(`${branch.key}_skip_count`, parseInt($event.target.value) || 1)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
