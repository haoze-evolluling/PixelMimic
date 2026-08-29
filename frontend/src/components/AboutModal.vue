<script setup>
import { Bot, X, Sparkles, Target, ShieldCheck } from 'lucide-vue-next'

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-title">
          <Bot :size="16" class="title-icon" />
          <span>关于 PixelMimic</span>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <div class="about-hero">
          <div class="about-logo-wrap">
            <Bot :size="32" class="about-logo-icon" />
          </div>
          <div class="about-title-text">
            <h3>PixelMimic</h3>
            <p class="about-sub">所见即达，一触即成</p>
          </div>
        </div>

        <p class="about-intro">
          基于 <b>Python 3.10+</b>、<b>Vue 3</b>、<b>PyWebView (Edge WebView2)</b> 与 <b>OpenCV</b> 打造的现代化极简桌面可视化自动化操作工具。
        </p>

        <div class="about-features-card">
          <div class="feature-item">
            <Sparkles :size="15" class="feature-icon" />
            <div>
              <b>积木式可视化编排</b>：语义化自然语言描述，无门槛直观理解每一步操作。
            </div>
          </div>
          <div class="feature-item">
            <Target :size="15" class="feature-icon" />
            <div>
              <b>毫秒级图像识别</b>：OpenCV 模板匹配，支持多尺度与高分屏 DPI 自适应。
            </div>
          </div>
          <div class="feature-item">
            <ShieldCheck :size="15" class="feature-icon" />
            <div>
              <b>全局热键与安全保护</b>：F7 全屏取样、F8 运行、F9 暂停、F10 紧急急停。
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="btn btn-primary" @click="emit('close')">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
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
  z-index: 1000;
}

.modal-dialog {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  width: 480px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  height: 48px;
  padding: 0 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.title-icon {
  color: var(--color-primary);
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-close:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13px;
  line-height: 1.6;
}

.about-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 4px;
}

.about-logo-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}

.about-logo-icon {
  color: var(--color-primary);
}

.about-title-text h3 {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.about-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.about-intro {
  color: var(--text-secondary);
}

.about-intro b {
  color: var(--text-primary);
}

.about-features-card {
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.feature-item b {
  color: var(--text-primary);
}

.feature-icon {
  color: var(--color-primary);
  flex-shrink: 0;
  margin-top: 3px;
}

.modal-footer {
  padding: 12px 16px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
}
</style>
