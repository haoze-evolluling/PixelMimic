<script setup>
import { computed } from 'vue'
import { getNaturalDescription } from '../utils/naturalLanguage'
import {
  GripVertical,
  Crosshair,
  MousePointer,
  Timer,
  Move,
  Type,
  Zap,
  Command,
  Clock,
  Eye,
  Sliders,
  Play,
  Copy,
  ChevronUp,
  ChevronDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-vue-next'

const props = defineProps({
  step: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits([
  'select',
  'test',
  'duplicate',
  'move-up',
  'move-down',
  'delete',
  'drag-start',
  'drag-over',
  'drop',
])

const actionIcon = computed(() => {
  const map = {
    image_click: Crosshair,
    mouse_click: MousePointer,
    mouse_longpress: Timer,
    mouse_drag: Move,
    mouse_scroll: Sliders,
    type_text: Type,
    hotkey: Zap,
    key_press: Command,
    wait_time: Clock,
    image_wait: Eye,
  }
  return map[props.step.action_type] || Crosshair
})

const naturalDesc = computed(() => {
  return getNaturalDescription(props.step)
})

const isRunning = computed(() => props.status?.state === 'running')
const isSuccess = computed(() => props.status?.state === 'success')
const isError = computed(() => props.status?.state === 'error')
const isDisabled = computed(() => props.step.enabled === false)
</script>

<template>
  <div
    :id="`step-card-${index}`"
    :class="[
      'step-card',
      {
        selected: isSelected,
        disabled: isDisabled,
        running: isRunning,
        'success-border': isSuccess,
        'error-border': isError,
      },
    ]"
    draggable="true"
    @dragstart="emit('drag-start', $event, index)"
    @dragover="emit('drag-over', $event, index)"
    @drop="emit('drop', $event, index)"
    @click="emit('select', index)"
  >
    <!-- Drag Handle -->
    <div class="step-drag-handle" title="按住拖拽调整顺序">
      <GripVertical :size="14" />
    </div>

    <!-- Step Index Badge -->
    <div class="step-index-badge">
      {{ String(index + 1).padStart(2, '0') }}
    </div>

    <!-- Step Icon Badge -->
    <div class="step-icon-badge">
      <component :is="actionIcon" :size="16" />
    </div>

    <!-- Step Main Content -->
    <div class="step-main-info">
      <div class="step-title-row">
        <span class="step-name">{{ step.name || '未命名步骤' }}</span>
        <span v-if="isDisabled" class="step-disabled-tag">已禁用</span>
        <Loader2 v-if="isRunning" :size="14" class="status-icon-running" />
        <CheckCircle2 v-else-if="isSuccess" :size="14" class="status-icon-success" />
        <AlertCircle v-else-if="isError" :size="14" class="status-icon-error" />
      </div>

      <!-- Natural Language Description -->
      <div class="step-natural-desc">
        <template v-if="naturalDesc.type === 'image_click' || naturalDesc.type === 'image_wait'">
          <span>{{ naturalDesc.prefix }}</span>
          <img
            v-if="naturalDesc.hasImage"
            :src="naturalDesc.image"
            class="step-thumb-mini"
            alt="目标"
          />
          <span v-else class="step-unspecified">[未设置图片]</span>
          <span class="desc-highlight">{{ naturalDesc.action }}</span>
        </template>
        <template v-else>
          <span>{{ naturalDesc.text }}</span>
        </template>
      </div>
    </div>

    <!-- Step Action Tooltips/Buttons -->
    <div class="step-actions" @click.stop>
      <button
        class="step-action-btn"
        title="单步即时测试"
        @click="emit('test', index)"
      >
        <Play :size="13" />
      </button>

      <button
        class="step-action-btn"
        title="复制副本"
        @click="emit('duplicate', index)"
      >
        <Copy :size="13" />
      </button>

      <button
        class="step-action-btn"
        title="上移"
        @click="emit('move-up', index)"
      >
        <ChevronUp :size="13" />
      </button>

      <button
        class="step-action-btn"
        title="下移"
        @click="emit('move-down', index)"
      >
        <ChevronDown :size="13" />
      </button>

      <button
        class="step-action-btn delete"
        title="删除步骤"
        @click="emit('delete', index)"
      >
        <Trash2 :size="13" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.step-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.step-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-focus);
}

.step-card.selected {
  background: var(--bg-card-selected);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

.step-card.disabled {
  opacity: 0.55;
}

.step-card.running {
  border-color: var(--color-cyan);
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
}

.step-card.success-border {
  border-color: var(--color-success);
}

.step-card.error-border {
  border-color: var(--color-danger);
}

.step-drag-handle {
  color: var(--text-muted);
  cursor: grab;
  display: flex;
  align-items: center;
  padding: 2px;
}
.step-drag-handle:hover {
  color: var(--text-primary);
}

.step-index-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  width: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.step-icon-badge {
  width: 32px;
  height: 32px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
}

.step-main-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.step-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-disabled-tag {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 1px 5px;
  border-radius: 3px;
}

.status-icon-running {
  color: var(--color-cyan);
  animation: spin 1s linear infinite;
}

.status-icon-success {
  color: var(--color-success);
}

.status-icon-error {
  color: var(--color-danger);
}

.step-natural-desc {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.desc-highlight {
  font-weight: 600;
  color: var(--text-primary);
}

.step-thumb-mini {
  height: 18px;
  max-width: 48px;
  object-fit: contain;
  border-radius: 2px;
  border: 1px solid var(--border-subtle);
  background: #000;
  vertical-align: middle;
}

.step-unspecified {
  color: var(--color-warning);
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.85;
}

.step-card:hover .step-actions {
  opacity: 1;
}

.step-action-btn {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.step-action-btn:hover {
  background: var(--bg-input);
  color: var(--text-primary);
  border-color: var(--color-primary);
}

.step-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
