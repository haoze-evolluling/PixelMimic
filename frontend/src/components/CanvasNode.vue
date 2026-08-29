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
    return { name: '图像识别', color: 'var(--cat-image)', icon: Crosshair }
  }
  if (['mouse_click', 'mouse_scroll', 'mouse_drag', 'mouse_longpress', 'mouse_move'].includes(t)) {
    return { name: '鼠标操作', color: 'var(--cat-mouse)', icon: MousePointer }
  }
  if (['type_text', 'hotkey', 'key_press'].includes(t)) {
    return { name: '键盘操作', color: 'var(--cat-keyboard)', icon: KeyboardIcon(t) }
  }
  if (t === 'condition') {
    return { name: '条件分支', color: 'var(--cat-condition)', icon: GitBranch }
  }
  return { name: '流程控制', color: 'var(--cat-flow)', icon: Clock }
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
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  user-select: none;
  cursor: grab;
  transition: box-shadow var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
  z-index: 10;
}

.canvas-node:active {
  cursor: grabbing;
}

.canvas-node:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lg);
}

.canvas-node.is-selected {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 40%, transparent), var(--shadow-lg);
  z-index: 20;
}

.canvas-node.is-active {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 60%, transparent);
  animation: node-pulse 1.5s infinite;
  z-index: 30;
}

.canvas-node.is-disabled {
  opacity: 0.5;
  filter: grayscale(0.6);
}

.canvas-node.status-error {
  border-color: var(--color-danger) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-danger) 40%, transparent);
}

.canvas-node.status-success {
  border-color: var(--color-success);
}

@keyframes node-pulse {
  0% {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 80%, transparent);
  }
  100% {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }
}

/* Header */
.node-header {
  height: 32px;
  padding: 0 var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  background: color-mix(in srgb, var(--text-primary) 3%, transparent);
  border-top: 3px solid var(--cat-color);
  border-bottom: 1px solid var(--border-subtle);
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
}

.node-badge {
  font-size: var(--text-2xs);
  font-weight: 700;
  color: var(--text-on-accent);
  padding: 1px var(--space-1);
  border-radius: var(--radius-xs);
  line-height: 1;
}

.node-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.node-actions {
  display: none;
  align-items: center;
  gap: var(--space-0-5);
}

.canvas-node:hover .node-actions {
  display: flex;
}

.node-action-btn {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-xs);
  background: var(--glass-hover);
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.node-action-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.node-action-btn.btn-danger:hover {
  background: var(--color-danger);
  color: var(--text-on-accent);
}

/* Body */
.node-body {
  padding: var(--space-2) var(--space-2-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5);
}

.node-image-preview {
  height: 38px;
  background: var(--bg-input);
  border-radius: var(--radius-xs);
  border: 1px solid var(--border-subtle);
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
  font-size: var(--text-2xs);
  color: var(--text-secondary);
  line-height: var(--leading-tight);
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
  gap: var(--space-1);
  font-size: var(--text-2xs);
  padding: var(--space-0-5) var(--space-1-5);
  border-radius: var(--radius-xs);
  background: var(--glass-hover);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill-running {
  background: var(--soft-primary);
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.pill-success {
  background: var(--soft-success);
  color: var(--color-success);
  border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
}

.pill-error {
  background: var(--soft-danger);
  color: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
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

/* 输出端口统一锚定在节点垂直中心 ±16px，与 WorkflowCanvas 的连线端点坐标计算保持一致 */
.port-output.port-true {
  right: -8px;
  top: calc(50% - 16px);
  transform: translateY(-50%);
  flex-direction: row;
}

.port-output.port-false {
  right: -8px;
  top: calc(50% + 16px);
  transform: translateY(-50%);
  flex-direction: row;
}

.port-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 2px solid var(--text-muted);
  transition: transform var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
  box-shadow: var(--shadow-sm);
}

.port-socket:hover .port-dot {
  transform: scale(1.35);
  background: var(--color-primary);
  border-color: var(--text-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 80%, transparent);
}

.true-dot {
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 18%, var(--bg-card));
}

.port-true:hover .true-dot {
  background: var(--color-success);
  border-color: var(--text-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-success) 80%, transparent);
}

.false-dot {
  border-color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 18%, var(--bg-card));
}

.port-false:hover .false-dot {
  background: var(--color-warning);
  border-color: var(--text-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-warning) 80%, transparent);
}

.port-label {
  font-size: 8.5px;
  font-weight: 600;
  margin-right: var(--space-1);
  padding: 1px var(--space-0-5);
  border-radius: var(--space-0-5);
  opacity: 0.85;
  pointer-events: none;
}

.true-label {
  color: var(--color-success);
  background: var(--soft-success);
}

.false-label {
  color: var(--color-warning);
  background: var(--soft-warning);
}

.next-label {
  color: var(--text-secondary);
  background: var(--glass-hover);
}
</style>
