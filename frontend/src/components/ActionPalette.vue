<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import { PlusCircle, ChevronDown } from 'lucide-vue-next'
import { ACTION_CATEGORIES } from '../utils/actionCatalog'

const { quickAddStep } = useWorkflow()

const activeCategory = ref(null)
const paletteRef = ref(null)

const categories = ACTION_CATEGORIES

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
          <span class="category-badge">{{ cat.actions.length }}</span>
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
              <span class="dropdown-count">{{ cat.actions.length }} 种操作</span>
            </div>

            <div class="dropdown-items-list">
              <button
                v-for="item in cat.actions"
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
  padding: var(--space-1) var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
  position: relative;
  z-index: var(--z-header);
}

.palette-label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
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
  gap: var(--space-2);
}

.category-wrapper {
  position: relative;
}

.category-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  color: var(--text-primary);
  padding: var(--space-1) var(--space-2-5);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
  user-select: none;
}

.category-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-focus);
}

.category-btn.active {
  background: var(--bg-card-selected);
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus-ring);
}

.category-badge {
  font-size: var(--text-2xs);
  background: var(--bg-input);
  color: var(--text-muted);
  padding: 0 var(--space-1);
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
}

.chevron-icon {
  color: var(--text-muted);
  transition: transform var(--duration) var(--ease-out);
}

.chevron-icon.rotated {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* Dropdown Menu styling */
.category-dropdown {
  position: absolute;
  top: calc(100% + var(--space-1-5));
  left: 0;
  min-width: 260px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1-5);
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-1-5) var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.dropdown-count {
  margin-left: auto;
  font-size: var(--text-2xs);
  color: var(--text-muted);
  font-weight: normal;
}

.dropdown-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
}

.action-item-btn {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2-5);
  padding: var(--space-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
  width: 100%;
}

.action-item-btn:hover {
  background: var(--soft-primary);
  border-color: var(--border-focus);
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
  transition: border-color var(--duration-fast) var(--ease-out);
}

.action-item-btn:hover .action-item-icon-box {
  border-color: currentColor;
}

.action-item-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.action-item-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.action-item-desc {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  line-height: var(--leading-tight);
}

.action-item-btn:hover .action-item-title {
  color: var(--color-primary);
}

.action-item-btn:hover .action-item-desc {
  color: var(--text-secondary);
}

/* Animations */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
