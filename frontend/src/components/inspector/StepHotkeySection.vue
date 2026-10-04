<script setup>
import { Zap } from 'lucide-vue-next'
import { useWorkflow } from '../../composables/useWorkflow'
import { useInspectorStep } from '../../composables/useInspectorStep'

/**
 * StepHotkeySection.vue — 快捷键配置。
 */
const { setHotkeyString } = useWorkflow()
const { isHotkey, hotkeyInputString, commonHotkeys } = useInspectorStep()
</script>

<template>
  <div v-if="isHotkey" class="prop-section-card">
    <div class="section-title">
      <Zap :size="13" class="section-icon" />
      <span>快捷键配置</span>
    </div>

    <div class="form-group">
      <label class="form-label">组合按键 (如 ctrl+c, alt+f4, enter)</label>
      <input
        type="text"
        class="form-input"
        v-model="hotkeyInputString"
        placeholder="例如: ctrl+c 或 enter"
      />
    </div>

    <div class="form-group">
      <label class="form-label">常用快捷键:</label>
      <div class="hotkey-chips">
        <button
          v-for="hk in commonHotkeys"
          :key="hk.key"
          class="btn btn-secondary chip-btn"
          @click="setHotkeyString(hk.key)"
        >
          {{ hk.label }}
        </button>
      </div>
    </div>
  </div>
</template>
