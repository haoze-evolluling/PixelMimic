<script setup>
import { Pin } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { ACTION_CATEGORIES } from '../../utils/actionCatalog'

/**
 * StepBasicSection.vue — 步骤基础信息：名称、操作类型与启用开关。
 */
const { selectedStep, updateCurrentStep, changeStepActionType } = useWorkflow()
</script>

<template>
  <div class="prop-section-card">
    <div class="section-title">
      <Pin :size="13" class="section-icon" />
      <span>步骤基础信息</span>
    </div>

    <div class="form-group">
      <label class="form-label">步骤名称</label>
      <input
        type="text"
        class="form-input"
        :value="selectedStep.name || ''"
        @input="updateCurrentStep('name', $event.target.value)"
        placeholder="如: 点击确认按钮"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">操作类型</label>
        <select
          class="form-select"
          :value="selectedStep.action_type"
          @change="changeStepActionType($event.target.value)"
        >
          <optgroup
            v-for="cat in ACTION_CATEGORIES"
            :key="cat.id"
            :label="cat.name"
          >
            <option v-for="action in cat.actions" :key="action.type" :value="action.type">
              {{ action.label }}
            </option>
          </optgroup>
        </select>
      </div>

      <div class="form-group toggle-align">
        <label class="toggle-switch-label">
          <input
            type="checkbox"
            :checked="selectedStep.enabled !== false"
            @change="updateCurrentStep('enabled', $event.target.checked)"
          />
          <span>启用此步骤</span>
        </label>
      </div>
    </div>
  </div>
</template>
