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
        <div class="confirm-dialog" role="alertdialog" aria-modal="true">
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  width: 360px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
  padding: 24px 20px 18px;
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
  margin-bottom: 14px;
}
.confirm-icon-wrap.type-warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
}
.confirm-icon-wrap.type-danger {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-danger);
}
.confirm-icon-wrap.type-question {
  background: rgba(59, 130, 246, 0.12);
  color: var(--color-primary);
}
.confirm-icon-wrap.type-info {
  background: rgba(59, 130, 246, 0.12);
  color: var(--color-primary);
}

.confirm-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.confirm-message {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  width: 100%;
}
.confirm-actions .btn {
  min-width: 88px;
  padding: 7px 14px;
  font-size: 13px;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.15s ease;
}
.confirm-fade-enter-active .confirm-dialog,
.confirm-fade-leave-active .confirm-dialog {
  transition: transform 0.15s ease;
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
