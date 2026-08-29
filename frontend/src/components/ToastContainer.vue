<script setup>
import { useToast } from '../composables/useToast'
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast-card', toast.type]"
        role="status"
        aria-live="polite"
      >
        <div class="toast-icon">
          <CheckCircle2 v-if="toast.type === 'success'" :size="16" />
          <AlertTriangle v-else-if="toast.type === 'warning'" :size="16" />
          <XCircle v-else-if="toast.type === 'error'" :size="16" />
          <Info v-else :size="16" />
        </div>
        <span class="toast-msg">{{ toast.message }}</span>
        <button
          class="toast-close"
          type="button"
          aria-label="关闭提示"
          @click="removeToast(toast.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 52px;
  right: var(--space-4);
  left: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  z-index: var(--z-toast);
  pointer-events: none;
}

.toast-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2-5) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: var(--leading-normal);
  background: var(--bg-card);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  min-width: 240px;
  max-width: min(420px, calc(100vw - var(--space-4) * 2));
  width: fit-content;
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-card);
  color: var(--text-primary);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-msg {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 2px;
  margin: -2px -4px -2px 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.toast-close:hover {
  opacity: 1;
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.toast-close:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
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
