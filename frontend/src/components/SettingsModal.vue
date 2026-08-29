<script setup>
import { reactive, watch } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useToast } from '../composables/useToast'
import { Settings, X, Repeat, Clock, Minimize2, ShieldAlert } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const { settings, setSettings, saveSettings } = useSettings()
const { showToast } = useToast()

const form = reactive({
  loop_count: 1,
  loop_interval: 1.0,
  minimize_on_run: true,
  failsafe: true,
})

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      form.loop_count = settings.value.loop_count ?? 1
      form.loop_interval = settings.value.loop_interval ?? 1.0
      form.minimize_on_run = settings.value.minimize_on_run !== false
      form.failsafe = settings.value.failsafe !== false
    }
  }
)

const handleSave = async () => {
  const parsedLoop = parseInt(form.loop_count)
  const parsedInterval = parseFloat(form.loop_interval)
  setSettings({
    loop_count: isNaN(parsedLoop) ? 1 : Math.max(0, parsedLoop),
    loop_interval: isNaN(parsedInterval) ? 1.0 : Math.max(0, parsedInterval),
    minimize_on_run: form.minimize_on_run,
    failsafe: form.failsafe,
  })
  await saveSettings()
  showToast('设置已保存', 'success')
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-title">
          <Settings :size="16" class="title-icon" />
          <span>全局运行设置</span>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">
            <span class="label-with-icon">
              <Repeat :size="14" class="field-icon" />
              <span>循环执行次数 (0 为无限循环)</span>
            </span>
          </label>
          <input
            type="number"
            class="form-input"
            min="0"
            max="9999"
            v-model="form.loop_count"
          />
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="label-with-icon">
              <Clock :size="14" class="field-icon" />
              <span>每次循环间隔时间 (秒)</span>
            </span>
          </label>
          <input
            type="number"
            class="form-input"
            min="0"
            step="0.1"
            v-model="form.loop_interval"
          />
        </div>

        <div class="form-group">
          <label class="toggle-switch-label">
            <input type="checkbox" v-model="form.minimize_on_run" />
            <span class="label-with-icon">
              <Minimize2 :size="14" class="field-icon" />
              <span>启动时自动最小化主窗口 (便于自动化操作)</span>
            </span>
          </label>
        </div>

        <div class="form-group">
          <label class="toggle-switch-label">
            <input type="checkbox" v-model="form.failsafe" />
            <span class="label-with-icon">
              <ShieldAlert :size="14" class="field-icon" />
              <span>启用鼠标四角急停保护 (FailSafe)</span>
            </span>
          </label>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave">保存设置</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.label-with-icon {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
}

.field-icon {
  color: var(--color-primary);
}
</style>
