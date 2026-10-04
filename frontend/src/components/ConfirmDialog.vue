<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useConfirm } from '../composables/useConfirm'
import { AlertTriangle, Trash2, HelpCircle, Info } from 'lucide-vue-next'

const { confirmState, handleConfirm, handleCancel } = useConfirm()

const iconMap = {
  warning: AlertTriangle,
  danger: Trash2,
  question: HelpCircle,
  info: Info,
}

const confirmButtonRef = ref(null)

const handleKeydown = (e) => {
  if (!confirmState.isOpen) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    handleCancel()
  } else if (e.key === 'Enter') {
    e.stopPropagation()
    handleConfirm()
  }
}

watch(
  () => confirmState.isOpen,
  async (open) => {
    if (open) {
      window.addEventListener('keydown', handleKeydown, true)
      await nextTick()
      confirmButtonRef.value?.focus()
    } else {
      window.removeEventListener('keydown', handleKeydown, true)
    }
  }
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="confirmState.isOpen" class="confirm-backdrop" @mousedown.self="handleCancel">
        <div class="confirm-dialog modal-dialog" role="alertdialog" aria-modal="true">
          <div class="confirm-icon-wrap" :class="`type-${confirmState.type}`">
            <component :is="iconMap[confirmState.type] || AlertTriangle" :size="22" />
          </div>
          <div class="confirm-title">{{ confirmState.title }}</div>
          <div class="confirm-message">{{ confirmState.message }}</div>
          <div class="confirm-actions">
            <button class="btn btn-secondary btn-confirm-cancel" @click="handleCancel">
              {{ confirmState.cancelText }}
            </button>
            <button
              ref="confirmButtonRef"
              class="btn"
              :class="confirmState.type === 'danger' ? 'btn-danger' : 'btn-primary'"
              @click="handleConfirm"
            >
              {{ confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: var(--bg-scrim);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-confirm);
}

.confirm-dialog {
  width: 360px;
  max-width: 90vw;
  padding: var(--space-6) var(--space-5) var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.confirm-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
}
.confirm-icon-wrap.type-warning {
  background: var(--soft-warning);
  color: var(--color-warning);
}
.confirm-icon-wrap.type-danger {
  background: var(--soft-danger);
  color: var(--color-danger);
}
.confirm-icon-wrap.type-question {
  background: var(--soft-primary);
  color: var(--color-primary);
}
.confirm-icon-wrap.type-info {
  background: var(--soft-info);
  color: var(--color-info);
}

.confirm-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.confirm-message {
  font-size: var(--text-md);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  margin-bottom: var(--space-5);
}

.confirm-actions {
  display: flex;
  gap: var(--space-2-5);
  justify-content: center;
  width: 100%;
}
.confirm-actions .btn {
  min-width: 88px;
  padding: var(--space-1-5) var(--space-3);
  font-size: var(--text-md);
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}
.confirm-fade-enter-active .confirm-dialog,
.confirm-fade-leave-active .confirm-dialog {
  transition: transform var(--duration-fast) var(--ease-out);
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
.confirm-fade-enter-from .confirm-dialog,
.confirm-fade-leave-to .confirm-dialog {
  transform: scale(0.95);
}
</style>
