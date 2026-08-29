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
    <div class="modal-dialog modal-dialog-wide">
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
.modal-dialog-wide {
  width: 480px;
}

.modal-body {
  padding: var(--space-5);
  gap: var(--space-3);
  font-size: var(--text-md);
  line-height: var(--leading-relaxed);
}

.about-hero {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
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
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
}

.about-sub {
  font-size: var(--text-sm);
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
  padding: var(--space-3) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2-5);
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2-5);
  font-size: var(--text-sm);
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
</style>
