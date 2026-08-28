<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import {
  PlusCircle,
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
  ChevronDown,
  Keyboard,
  Workflow as WorkflowIcon,
} from 'lucide-vue-next'

const { quickAddStep } = useWorkflow()

const activeCategory = ref(null)
const paletteRef = ref(null)

const categories = [
  {
    id: 'image',
    name: '图像识别',
    icon: Crosshair,
    color: '#3b82f6',
    items: [
      {
        type: 'image_click',
        label: '找图点击',
        icon: Crosshair,
        desc: '屏幕识别目标图像并自动点击',
      },
      {
        type: 'image_wait',
        label: '等待图像',
        icon: Eye,
        desc: '持续检测直到目标图像出现或消失',
      },
      {
        type: 'image_drag',
        label: '图像拖拽',
        icon: Move,
        desc: '识别目标图像并平滑拖拽至指定位置',
      },
    ],
  },
  {
    id: 'mouse',
    name: '鼠标操作',
    icon: MousePointer,
    color: '#06b6d4',
    items: [
      {
        type: 'mouse_click',
        label: '坐标点击',
        icon: MousePointer,
        desc: '在指定屏幕坐标单击、双击或右键',
      },
      {
        type: 'mouse_scroll',
        label: '鼠标滚轮',
        icon: Sliders,
        desc: '模拟鼠标滚轮向上或向下滚动指定格数',
      },
      {
        type: 'mouse_drag',
        label: '鼠标拖拽',
        icon: Move,
        desc: '从起点坐标平滑拖拽至终点坐标',
      },
      {
        type: 'mouse_longpress',
        label: '鼠标长按',
        icon: Timer,
        desc: '在指定坐标按住鼠标保持指定秒数',
      },
      {
        type: 'mouse_move',
        label: '鼠标移动',
        icon: Navigation,
        desc: '平滑移动鼠标光标至指定屏幕坐标',
      },
    ],
  },
  {
    id: 'keyboard',
    name: '键盘操作',
    icon: Keyboard,
    color: '#8b5cf6',
    items: [
      {
        type: 'type_text',
        label: '输入文字',
        icon: Type,
        desc: '自动键入文本内容或通过剪贴板快速粘贴',
      },
      {
        type: 'hotkey',
        label: '组合快捷键',
        icon: Zap,
        desc: '触发 Ctrl+C、Alt+F4 等常用系统快捷键',
      },
      {
        type: 'key_press',
        label: '单个按键',
        icon: Command,
        desc: '模拟按下 Enter、Esc、Tab、空格等按键',
      },
    ],
  },
  {
    id: 'flow',
    name: '流程控制',
    icon: WorkflowIcon,
    color: '#10b981',
    items: [
      {
        type: 'wait_time',
        label: '等待延时',
        icon: Clock,
        desc: '暂停执行指定秒数或随机等待时长',
      },
      {
        type: 'condition',
        label: '条件判断',
        icon: GitBranch,
        desc: '检测图像存在/不存在并跳转或跳过后续步骤',
      },
    ],
  },
]

const toggleCategory = (catId) => {
  if (activeCategory.value === catId) {
    activeCategory.value = null
  } else {
    activeCategory.value = catId
  }
}

const handleSelectAction = (actionType) => {
  quickAddStep(actionType)
  activeCategory.value = null
}

const handleDocumentClick = (e) => {
  if (paletteRef.value && !paletteRef.value.contains(e.target)) {
    activeCategory.value = null
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    activeCategory.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div ref="paletteRef" class="action-palette-bar">
    <div class="palette-label">
      <PlusCircle :size="13" class="label-icon" />
      <span>添加步骤:</span>
    </div>

    <div class="palette-categories">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="category-wrapper"
      >
        <button
          class="category-btn"
          :class="{ active: activeCategory === cat.id }"
          @click.stop="toggleCategory(cat.id)"
        >
          <component :is="cat.icon" :size="13" class="category-icon" :style="{ color: cat.color }" />
          <span class="category-name">{{ cat.name }}</span>
          <span class="category-badge">{{ cat.items.length }}</span>
          <ChevronDown
            :size="12"
            class="chevron-icon"
            :class="{ rotated: activeCategory === cat.id }"
          />
        </button>

        <!-- Dropdown Menu -->
        <transition name="dropdown-fade">
          <div
            v-if="activeCategory === cat.id"
            class="category-dropdown"
          >
            <div class="dropdown-header">
              <component :is="cat.icon" :size="13" :style="{ color: cat.color }" />
              <span>{{ cat.name }}操作</span>
              <span class="dropdown-count">{{ cat.items.length }} 种操作</span>
            </div>

            <div class="dropdown-items-list">
              <button
                v-for="item in cat.items"
                :key="item.type"
                class="action-item-btn"
                @click="handleSelectAction(item.type)"
              >
                <div class="action-item-icon-box" :style="{ color: cat.color }">
                  <component :is="item.icon" :size="14" />
                </div>
                <div class="action-item-info">
                  <div class="action-item-title">{{ item.label }}</div>
                  <div class="action-item-desc">{{ item.desc }}</div>
                </div>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-palette-bar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  padding: 5px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.palette-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.label-icon {
  color: var(--color-primary);
}

.palette-categories {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-wrapper {
  position: relative;
}

.category-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  color: var(--text-primary);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  user-select: none;
}

.category-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--color-primary);
  color: #ffffff;
}

.category-btn.active {
  background: var(--bg-card-selected);
  border-color: var(--color-primary);
  color: #ffffff;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
}

.category-badge {
  font-size: 10px;
  background: var(--bg-surface);
  color: var(--text-muted);
  padding: 0 4px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.chevron-icon {
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* Dropdown Menu styling */
.category-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 260px;
  background: #111827;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6), 0 0 15px rgba(59, 130, 246, 0.15);
  backdrop-filter: blur(12px);
  padding: 6px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.dropdown-count {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-muted);
  font-weight: normal;
}

.dropdown-items-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.action-item-btn {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 9px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.action-item-btn:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.35);
  transform: translateX(2px);
}

.action-item-icon-box {
  width: 28px;
  height: 28px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  transition: all 0.15s ease;
}

.action-item-btn:hover .action-item-icon-box {
  border-color: currentColor;
  background: rgba(255, 255, 255, 0.05);
}

.action-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.action-item-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.action-item-desc {
  font-size: 10.5px;
  color: var(--text-muted);
  line-height: 1.3;
}

.action-item-btn:hover .action-item-title {
  color: #ffffff;
}

.action-item-btn:hover .action-item-desc {
  color: var(--text-secondary);
}

/* Animations */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
