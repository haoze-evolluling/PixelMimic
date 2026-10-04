<script setup>
import { computed } from 'vue'
import { Play, Copy, Trash2 } from 'lucide-vue-next'

/**
 * NodeContextMenu.vue
 * 节点右键上下文菜单：测试单步 / 复制步骤 / 删除步骤。
 * 以 fixed 定位渲染到 body，避免事件冒泡干扰画布交互。
 */
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['close', 'test', 'duplicate', 'delete'])

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const posStyle = computed(() => ({
  left: `${clamp(props.x, 8, window.innerWidth - 168)}px`,
  top: `${clamp(props.y, 8, window.innerHeight - 116)}px`,
}))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="node-context-menu"
      :style="posStyle"
      @pointerdown.stop
      @contextmenu.prevent.stop
    >
      <button class="menu-item" @click.stop="emit('test')">
        <Play :size="12" />
        <span>测试单步</span>
      </button>
      <button class="menu-item" @click.stop="emit('duplicate')">
        <Copy :size="12" />
        <span>复制步骤</span>
      </button>
      <div class="menu-divider"></div>
      <button class="menu-item menu-danger" @click.stop="emit('delete')">
        <Trash2 :size="12" />
        <span>删除步骤</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.node-context-menu {
  position: fixed;
  z-index: 2000;
  min-width: 152px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: var(--shadow-lg);
  user-select: none;
}

.menu-item {
  width: 100%;
  height: 28px;
  padding: 0 var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  color: var(--text-primary);
  font-size: var(--text-xs);
  font-family: inherit;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.menu-item:hover {
  background: var(--glass-hover);
}

.menu-danger {
  color: var(--color-danger);
}

.menu-danger:hover {
  background: var(--soft-danger);
}

.menu-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 3px 6px;
}
</style>
