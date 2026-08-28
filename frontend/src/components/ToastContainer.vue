<script setup>
import { useToast } from '../composables/useToast'
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-vue-next'

const { toasts } = useToast()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast-card', toast.type]"
      >
        <div class="toast-icon">
          <CheckCircle2 v-if="toast.type === 'success'" :size="16" />
          <AlertTriangle v-else-if="toast.type === 'warning'" :size="16" />
          <XCircle v-else-if="toast.type === 'error'" :size="16" />
          <Info v-else :size="16" />
        </div>
        <span class="toast-msg">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 68px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
}

.toast-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  min-width: 240px;
  max-width: 400px;
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-card);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-msg {
  flex: 1;
  word-break: break-word;
}

.toast-card.info {
  background: rgba(30, 41, 59, 0.95);
  color: var(--text-primary);
  border-left: 4px solid var(--color-primary);
}
.toast-card.info .toast-icon {
  color: var(--color-primary);
}

.toast-card.success {
  background: rgba(15, 45, 34, 0.95);
  color: #ecfdf5;
  border-left: 4px solid var(--color-success);
}
.toast-card.success .toast-icon {
  color: var(--color-success);
}

.toast-card.warning {
  background: rgba(45, 35, 15, 0.95);
  color: #fffbeb;
  border-left: 4px solid var(--color-warning);
}
.toast-card.warning .toast-icon {
  color: var(--color-warning);
}

.toast-card.error {
  background: rgba(45, 20, 20, 0.95);
  color: #fef2f2;
  border-left: 4px solid var(--color-danger);
}
.toast-card.error .toast-icon {
  color: var(--color-danger);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
