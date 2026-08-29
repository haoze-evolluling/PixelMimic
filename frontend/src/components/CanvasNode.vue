<script setup>
import { computed } from 'vue'
import {
  Crosshair,
  MousePointer,
  Type,
  Zap,
  Clock,
  Move,
  Timer,
  Eye,
  Sliders,
  Command,
  GitBranch,
  Navigation,
  Play,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Image as ImageIcon,
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
  isActive: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits([
  'select',
  'node-pointerdown',
  'port-pointerdown',
  'delete',
  'duplicate',
  'test',
])

const isCondition = computed(() => props.step.action_type === 'condition')

const categoryConfig = computed(() => {
  const t = props.step.action_type
  if (['image_click', 'image_wait', 'image_drag'].includes(t)) {
    return { name: '图像识别', color: '#3b82f6', icon: Crosshair }
  }
  if (['mouse_click', 'mouse_scroll', 'mouse_drag', 'mouse_longpress', 'mouse_move'].includes(t)) {
    return { name: '鼠标操作', color: '#06b6d4', icon: MousePointer }
  }
  if (['type_text', 'hotkey', 'key_press'].includes(t)) {
    return { name: '键盘操作', color: '#8b5cf6', icon: KeyboardIcon(t) }
  }
  if (t === 'condition') {
    return { name: '条件分支', color: '#f59e0b', icon: GitBranch }
  }
  return { name: '流程控制', color: '#10b981', icon: Clock }
})

function KeyboardIcon(type) {
  if (type === 'type_text') return Type
  if (type === 'hotkey') return Zap
  return Command
}

const iconComponent = computed(() => {
  const map = {
    image_click: Crosshair,
    image_wait: Eye,
    image_drag: Move,
    mouse_click: MousePointer,
    mouse_scroll: Sliders,
    mouse_drag: Move,
    mouse_longpress: Timer,
    mouse_move: Navigation,
    type_text: Type,
    hotkey: Zap,
    key_press: Command,
    wait_time: Clock,
    condition: GitBranch,
  }
  return map[props.step.action_type] || Sparkles
})

const handleNodePointerDown = (e) => {
  // Ignore clicks on buttons or sockets
  if (e.target.closest('.port-socket') || e.target.closest('.node-action-btn') || e.target.closest('.toggle-switch')) {
    return
  }
  emit('select', props.index)
  emit('node-pointerdown', { event: e, index: props.index })
}

const handlePortPointerDown = (e, portType) => {
  e.stopPropagation()
  emit('port-pointerdown', {
    event: e,
    stepIndex: props.index,
    portType,
  })
}
</script>

<template>
  <div
    :id="`canvas-node-${index}`"
    class="canvas-node"
    :class="{
      'is-selected': isSelected,
      'is-active': isActive,
      'is-disabled': step.enabled === false,
      [`status-${status?.state}`]: status?.state,
    }"
    :style="{
      left: `${step.node_x || 100}px`,
      top: `${step.node_y || 160}px`,
      '--cat-color': categoryConfig.color,
    }"
    @pointerdown="handleNodePointerDown"
  >
    <!-- Left Input Socket -->
    <div
      class="port-socket port-input"
      :data-step-index="index"
      title="输入端口：接收前序执行信号"
    >
      <div class="port-dot"></div>
    </div>

    <!-- Node Header -->
    <div class="node-header" :style="{ borderTopColor: categoryConfig.color }">
      <div class="node-badge" :style="{ backgroundColor: categoryConfig.color }">
        {{ String(index + 1).padStart(2, '0') }}
      </div>

      <div class="node-icon-box" :style="{ color: categoryConfig.color }">
        <component :is="iconComponent" :size="13" />
      </div>

      <div class="node-title" :title="step.name">
        {{ step.name || '未命名步骤' }}
      </div>

      <!-- Quick Action Buttons -->
      <div class="node-actions">
        <button
          class="node-action-btn"
          title="测试单步"
          @click.stop="emit('test', index)"
        >
          <Play :size="10" />
        </button>
        <button
          class="node-action-btn"
          title="复制步骤"
          @click.stop="emit('duplicate', index)"
        >
          <Copy :size="10" />
        </button>
        <button
          class="node-action-btn btn-danger"
          title="删除步骤"
          @click.stop="emit('delete', index)"
        >
          <Trash2 :size="10" />
        </button>
      </div>
    </div>

    <!-- Node Content Body -->
    <div class="node-body">
      <!-- Target Image Thumbnail if image action -->
      <div v-if="step.image_base64" class="node-image-preview">
        <img :src="`data:image/png;base64,${step.image_base64}`" alt="目标图片" />
      </div>

      <!-- Natural Description Text -->
      <div class="node-desc-text">
        <span v-if="step.action_type === 'image_click'">
          找图匹配 (置信度 {{ Math.round(step.confidence * 100) }}%) 单击
        </span>
        <span v-else-if="step.action_type === 'image_wait'">
          等待图像 {{ step.wait_for_disappear ? '消失' : '出现' }} (超时 {{ step.wait_timeout }}s)
        </span>
        <span v-else-if="step.action_type === 'mouse_click'">
          坐标 ({{ step.x }}, {{ step.y }}) {{ step.click_type === 'double' ? '双击' : '单击' }}{{ step.mouse_button === 'right' ? '右键' : '左键' }}
        </span>
        <span v-else-if="step.action_type === 'mouse_scroll'">
          {{ step.scroll_amount < 0 ? '向下滚动' : '向上滚动' }} {{ Math.abs(step.scroll_amount) }} 格
        </span>
        <span v-else-if="step.action_type === 'type_text'">
          输入: "{{ step.text_to_type || '无内容' }}"
        </span>
        <span v-else-if="step.action_type === 'hotkey'">
          快捷键: {{ step.hotkeys?.join('+') || '未设置' }}
        </span>
        <span v-else-if="step.action_type === 'key_press'">
          按键: 【{{ step.key_press_key || 'Enter' }}】
        </span>
        <span v-else-if="step.action_type === 'wait_time'">
          延时等待: {{ step.pre_delay }} 秒
        </span>
        <span v-else-if="step.action_type === 'condition'">
          检测: {{ step.condition_type === 'image_not_exists' ? '不存在目标图像' : '存在目标图像' }}
        </span>
        <span v-else>
          {{ step.action_type }}
        </span>
      </div>

      <!-- Status Indicator Pill -->
      <div v-if="status || isActive" class="node-status-pill" :class="`pill-${status?.state || (isActive ? 'running' : 'idle')}`">
        <Loader2 v-if="status?.state === 'running' || isActive" :size="11" class="spin-icon" />
        <CheckCircle2 v-else-if="status?.state === 'success'" :size="11" class="success-icon" />
        <XCircle v-else-if="status?.state === 'error'" :size="11" class="error-icon" />
        <span>{{ status?.message || (isActive ? '执行中...' : '') }}</span>
      </div>
    </div>

    <!-- Right Output Socket(s) -->
    <!-- For Condition: 2 branch ports (True / False) -->
    <template v-if="isCondition">
      <div
        class="port-socket port-output port-true"
        :data-step-index="index"
        title="成立分支 (True)：拖拽连线至条件成立时跳转的步骤"
        @pointerdown="handlePortPointerDown($event, 'then')"
      >
        <span class="port-label true-label">True (成立)</span>
        <div class="port-dot true-dot"></div>
      </div>

      <div
        class="port-socket port-output port-false"
        :data-step-index="index"
        title="不成立分支 (False)：拖拽连线至条件不成立时跳转的步骤"
        @pointerdown="handlePortPointerDown($event, 'else')"
      >
        <span class="port-label false-label">False (不成立)</span>
        <div class="port-dot false-dot"></div>
      </div>
    </template>

    <!-- For Standard Action: Success / Failure branch ports -->
    <template v-else>
      <div
        class="port-socket port-output port-true"
        :data-step-index="index"
        title="成功出口 (True)：拖拽连线至执行成功后要执行的步骤"
        @pointerdown="handlePortPointerDown($event, 'next')"
      >
        <span class="port-label true-label">True</span>
        <div class="port-dot true-dot"></div>
      </div>

      <div
        class="port-socket port-output port-false"
        :data-step-index="index"
        title="失败出口 (False)：拖拽连线至执行失败后要执行的步骤"
        @pointerdown="handlePortPointerDown($event, 'fail')"
      >
        <span class="port-label false-label">False</span>
        <div class="port-dot false-dot"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.canvas-node {
  position: absolute;
  width: 220px;
  background: #151b28;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.2);
  user-select: none;
  cursor: grab;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
  z-index: 10;
}

.canvas-node:active {
  cursor: grabbing;
}

.canvas-node:hover {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(59, 130, 246, 0.15);
}

.canvas-node.is-selected {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 0 8px 28px rgba(0, 0, 0, 0.6);
  z-index: 20;
}

.canvas-node.is-active {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.4);
  animation: node-pulse 1.5s infinite;
  z-index: 30;
}

.canvas-node.is-disabled {
  opacity: 0.5;
  filter: grayscale(0.6);
}

.canvas-node.status-error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4);
}

.canvas-node.status-success {
  border-color: #10b981;
}

@keyframes node-pulse {
  0% {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 0 0 10px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.8), 0 0 22px rgba(59, 130, 246, 0.5);
  }
  100% {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 0 0 10px rgba(59, 130, 246, 0.2);
  }
}

/* Header */
.node-header {
  height: 32px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  border-top: 3px solid var(--cat-color);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
}

.node-badge {
  font-size: 9.5px;
  font-weight: 700;
  color: #ffffff;
  padding: 1px 4px;
  border-radius: 3px;
  line-height: 1;
}

.node-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.node-actions {
  display: none;
  align-items: center;
  gap: 3px;
}

.canvas-node:hover .node-actions {
  display: flex;
}

.node-action-btn {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}

.node-action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.node-action-btn.btn-danger:hover {
  background: #ef4444;
  color: #ffffff;
}

/* Body */
.node-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-image-preview {
  height: 38px;
  background: #0b0f19;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.node-image-preview img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.node-desc-text {
  font-size: 10.5px;
  color: #94a3b8;
  line-height: 1.35;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Status Pill */
.node-status-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill-running {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.pill-success {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.pill-error {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Ports & Sockets */
.port-socket {
  position: absolute;
  display: flex;
  align-items: center;
  z-index: 15;
  cursor: crosshair;
}

.port-input {
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
}

.port-output.port-next {
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: row;
}

.port-output.port-true {
  right: -8px;
  top: 26px;
  flex-direction: row;
}

.port-output.port-false {
  right: -8px;
  bottom: 12px;
  flex-direction: row;
}

.port-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1e293b;
  border: 2px solid #64748b;
  transition: all 0.15s ease;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

.port-socket:hover .port-dot {
  transform: scale(1.35);
  background: #3b82f6;
  border-color: #ffffff;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
}

.true-dot {
  border-color: #10b981;
  background: #064e3b;
}

.port-true:hover .true-dot {
  background: #10b981;
  border-color: #ffffff;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
}

.false-dot {
  border-color: #f59e0b;
  background: #78350f;
}

.port-false:hover .false-dot {
  background: #f59e0b;
  border-color: #ffffff;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
}

.port-label {
  font-size: 8.5px;
  font-weight: 600;
  margin-right: 4px;
  padding: 1px 3px;
  border-radius: 2px;
  opacity: 0.85;
  pointer-events: none;
}

.true-label {
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
}

.false-label {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
}

.next-label {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
}
</style>
