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
  right: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: var(--z-toast);
  pointer-events: none;
}

.toast-card {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  padding: var(--space-2-5) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  font-weight: 500;
  background: var(--bg-card);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  min-width: 240px;
  max-width: 400px;
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-card);
  color: var(--text-primary);
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
  border-left: 4px solid var(--color-primary);
}
.toast-card.info .toast-icon {
  color: var(--color-primary);
}

.toast-card.success {
  border-left: 4px solid var(--color-success);
}
.toast-card.success .toast-icon {
  color: var(--color-success);
}

.toast-card.warning {
  border-left: 4px solid var(--color-warning);
}
.toast-card.warning .toast-icon {
  color: var(--color-warning);
}

.toast-card.error {
  border-left: 4px solid var(--color-danger);
}
.toast-card.error .toast-icon {
  color: var(--color-danger);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--duration) var(--ease-out),
    transform var(--duration) var(--ease-out);
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
