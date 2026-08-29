<script setup>
import { ref, computed } from 'vue'
import { useWorkflow } from '../composables/useWorkflow'
import {
  SlidersHorizontal,
  Pin,
  Crosshair,
  MousePointer,
  Move,
  Type,
  Zap,
  Clock,
  Settings2,
  ChevronDown,
  ChevronUp,
  Scissors,
  Search,
  MapPin,
  ImageIcon,
  ArrowRight,
  Sliders,
  GitBranch,
  Navigation,
} from 'lucide-vue-next'

const {
  workflow,
  selectedStepIndex,
  selectedStep,
  updateCurrentStep,
  changeStepActionType,
  setHotkeyString,
  startSnipForCurrentStep,
  testMatchForCurrentStep,
  pickMousePosForCurrentStep,
  pickDragEndPos,
} = useWorkflow()

const isAdvancedOpen = ref(false)

const isImageAction = computed(() => {
  if (!selectedStep.value) return false
  return ['image_click', 'image_wait', 'image_drag'].includes(selectedStep.value.action_type)
})

const isCondition = computed(() => {
  if (!selectedStep.value) return false
  return selectedStep.value.action_type === 'condition'
})

const isMouseClick = computed(() => {
  if (!selectedStep.value) return false
  return ['mouse_click', 'mouse_longpress'].includes(selectedStep.value.action_type)
})

const isScroll = computed(() => {
  if (!selectedStep.value) return false
  return selectedStep.value.action_type === 'mouse_scroll'
})

const isMove = computed(() => {
  if (!selectedStep.value) return false
  return selectedStep.value.action_type === 'mouse_move'
})

const isDrag = computed(() => {
  if (!selectedStep.value) return false
  return selectedStep.value.action_type === 'mouse_drag' || selectedStep.value.action_type === 'image_drag'
})

const isText = computed(() => {
  if (!selectedStep.value) return false
  return selectedStep.value.action_type === 'type_text'
})

const isHotkey = computed(() => {
  if (!selectedStep.value) return false
  return selectedStep.value.action_type === 'hotkey' || selectedStep.value.action_type === 'key_press'
})

const isWait = computed(() => {
  if (!selectedStep.value) return false
  return selectedStep.value.action_type === 'wait_time'
})

const scrollDirection = computed({
  get() {
    if (!selectedStep.value) return 'down'
    return (selectedStep.value.scroll_amount !== undefined ? selectedStep.value.scroll_amount : -3) >= 0 ? 'up' : 'down'
  },
  set(val) {
    const curMag = Math.abs(selectedStep.value?.scroll_amount || 3)
    updateCurrentStep('scroll_amount', val === 'up' ? curMag : -curMag)
  },
})

const scrollMagnitude = computed({
  get() {
    if (!selectedStep.value) return 3
    return Math.abs(selectedStep.value.scroll_amount !== undefined ? selectedStep.value.scroll_amount : 3)
  },
  set(val) {
    const dir = scrollDirection.value === 'up' ? 1 : -1
    const mag = Math.max(1, parseInt(val) || 1)
    updateCurrentStep('scroll_amount', dir * mag)
  },
})

const hotkeyInputString = computed({
  get() {
    if (!selectedStep.value) return ''
    if (selectedStep.value.hotkeys && selectedStep.value.hotkeys.length > 0) {
      return selectedStep.value.hotkeys.join('+')
    }
    return selectedStep.value.key_press_key || ''
  },
  set(val) {
    setHotkeyString(val)
  },
})

const confidencePercent = computed({
  get() {
    if (!selectedStep.value) return 80
    return Math.round((selectedStep.value.confidence !== undefined ? selectedStep.value.confidence : 0.8) * 100)
  },
  set(val) {
    updateCurrentStep('confidence', parseFloat(val) / 100)
  },
})

const commonHotkeys = [
  { label: 'Ctrl+C 复制', key: 'ctrl+c' },
  { label: 'Ctrl+V 粘贴', key: 'ctrl+v' },
  { label: 'Ctrl+A 全选', key: 'ctrl+a' },
  { label: 'Enter 回车', key: 'enter' },
  { label: 'Esc 取消', key: 'esc' },
  { label: 'Tab 切换', key: 'tab' },
]
</script>

<template>
  <section class="panel-inspector">
    <!-- Panel Header -->
    <div class="panel-header">
      <div class="panel-title">
        <SlidersHorizontal :size="15" class="panel-title-icon" />
        <span>步骤属性配置</span>
        <span class="panel-badge">
          {{ selectedStep ? `步骤 #${selectedStepIndex + 1}` : '未选中' }}
        </span>
      </div>
    </div>

    <!-- Inspector Body -->
    <div class="inspector-body">
      <!-- Empty Selection State -->
      <div v-if="!selectedStep" class="inspector-empty">
        <ArrowRight :size="24" class="empty-guide-icon" />
        <span>请在左侧选择或添加一个操作步骤以配置属性</span>
      </div>

      <!-- Active Step Properties Form -->
      <div v-else class="inspector-form">
        <!-- 1. Basic Info Section -->
        <div class="prop-section-card">
          <div class="section-title">
            <Pin :size="13" class="section-icon" />
            <span>步骤基础信息</span>
          </div>

          <div class="form-group">
            <label class="form-label">步骤名称</label>
            <input
              type="text"
              class="form-input"
              :value="selectedStep.name || ''"
              @input="updateCurrentStep('name', $event.target.value)"
              placeholder="如: 点击确认按钮"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">操作类型</label>
              <select
                class="form-select"
                :value="selectedStep.action_type"
                @change="changeStepActionType($event.target.value)"
              >
                <optgroup label="图像识别">
                  <option value="image_click">找图点击</option>
                  <option value="image_wait">等待图像</option>
                  <option value="image_drag">图像拖拽</option>
                </optgroup>
                <optgroup label="鼠标操作">
                  <option value="mouse_click">坐标点击</option>
                  <option value="mouse_scroll">鼠标滚轮</option>
                  <option value="mouse_drag">鼠标拖拽</option>
                  <option value="mouse_longpress">鼠标长按</option>
                  <option value="mouse_move">鼠标移动</option>
                </optgroup>
                <optgroup label="键盘操作">
                  <option value="type_text">输入文字</option>
                  <option value="hotkey">组合快捷键</option>
                  <option value="key_press">单个按键</option>
                </optgroup>
                <optgroup label="流程控制">
                  <option value="wait_time">等待延时</option>
                </optgroup>
              </select>
            </div>

            <div class="form-group toggle-align">
              <label class="toggle-switch-label">
                <input
                  type="checkbox"
                  :checked="selectedStep.enabled !== false"
                  @change="updateCurrentStep('enabled', $event.target.checked)"
                />
                <span>启用此步骤</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 2. Image Configuration Section (for image actions & condition) -->
        <div v-if="isImageAction || isCondition" class="prop-section-card">
          <div class="section-title">
            <Crosshair :size="13" class="section-icon" />
            <span>{{ isCondition ? '条件目标图片识别' : '目标图像配置' }}</span>
          </div>

          <div class="image-target-preview-box">
            <img
              v-if="selectedStep.image_base64"
              :src="`data:image/png;base64,${selectedStep.image_base64}`"
              class="target-img-display"
              alt="目标图片"
            />
            <div v-else class="target-img-placeholder">
              <ImageIcon :size="20" class="placeholder-icon" />
              <span>尚未设置目标图片</span>
              <span class="subtext">点击下方按钮截屏框选目标</span>
            </div>
          </div>

          <div class="image-buttons-row">
            <button class="btn btn-primary btn-snip" @click="startSnipForCurrentStep">
              <Scissors :size="13" />
              <span>截取目标 (F7)</span>
            </button>
            <button
              class="btn btn-secondary btn-test-match"
              :disabled="!selectedStep.image_base64"
              @click="testMatchForCurrentStep"
            >
              <Search :size="13" />
              <span>测试匹配</span>
            </button>
          </div>

          <div v-if="selectedStep.action_type === 'image_click'" class="form-row">
            <div class="form-group">
              <label class="form-label">点击偏移 X (像素)</label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.offset_x || 0"
                @input="updateCurrentStep('offset_x', parseInt($event.target.value) || 0)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">点击偏移 Y (像素)</label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.offset_y || 0"
                @input="updateCurrentStep('offset_y', parseInt($event.target.value) || 0)"
              />
            </div>
          </div>

          <div v-if="selectedStep.action_type === 'image_wait'" class="form-row">
            <div class="form-group">
              <label class="form-label">最长超时 (秒)</label>
              <input
                type="number"
                class="form-input"
                min="0.5"
                step="0.5"
                :value="selectedStep.wait_timeout || 5.0"
                @input="updateCurrentStep('wait_timeout', parseFloat($event.target.value) || 5.0)"
              />
            </div>
            <div class="form-group toggle-align">
              <label class="toggle-switch-label">
                <input
                  type="checkbox"
                  :checked="selectedStep.wait_for_disappear"
                  @change="updateCurrentStep('wait_for_disappear', $event.target.checked)"
                />
                <span>等待图像消失</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 3. Condition Branching Configuration Section -->
        <div v-if="isCondition" class="prop-section-card">
          <div class="section-title">
            <GitBranch :size="13" class="section-icon" />
            <span>条件判断与分支流控</span>
          </div>

          <div class="form-group">
            <label class="form-label">判断条件类型</label>
            <select
              class="form-select"
              :value="selectedStep.condition_type || 'image_exists'"
              @change="updateCurrentStep('condition_type', $event.target.value)"
            >
              <option value="image_exists">屏幕中【存在】目标图像</option>
              <option value="image_not_exists">屏幕中【不存在】目标图像</option>
            </select>
          </div>

          <!-- THEN branch -->
          <div class="branch-config-box then-branch">
            <div class="branch-title-row">
              <span class="branch-tag branch-tag-then">IF 条件成立时</span>
              <span class="branch-hint">当判定结果为真时执行</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">执行动作</label>
                <select
                  class="form-select"
                  :value="selectedStep.then_action || 'continue'"
                  @change="updateCurrentStep('then_action', $event.target.value)"
                >
                  <option value="continue">继续执行下一步</option>
                  <option value="jump">跳转到指定步骤</option>
                  <option value="skip">跳过后续步骤</option>
                  <option value="stop">终止流程执行</option>
                </select>
              </div>

              <div v-if="selectedStep.then_action === 'jump'" class="form-group">
                <label class="form-label">跳转目标步骤</label>
                <select
                  class="form-select"
                  :value="selectedStep.then_jump_step || 1"
                  @change="updateCurrentStep('then_jump_step', parseInt($event.target.value) || 1)"
                >
                  <option
                    v-for="(st, idx) in workflow.steps"
                    :key="st.id || idx"
                    :value="idx + 1"
                  >
                    步骤 #{{ idx + 1 }}: {{ st.name }}
                  </option>
                </select>
              </div>

              <div v-if="selectedStep.then_action === 'skip'" class="form-group">
                <label class="form-label">跳过步骤数量</label>
                <input
                  type="number"
                  class="form-input"
                  min="1"
                  max="100"
                  :value="selectedStep.then_skip_count || 1"
                  @input="updateCurrentStep('then_skip_count', parseInt($event.target.value) || 1)"
                />
              </div>
            </div>
          </div>

          <!-- ELSE branch -->
          <div class="branch-config-box else-branch mt-sm">
            <div class="branch-title-row">
              <span class="branch-tag branch-tag-else">ELSE 条件不成立时</span>
              <span class="branch-hint">当判定结果为假时执行</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">执行动作</label>
                <select
                  class="form-select"
                  :value="selectedStep.else_action || 'continue'"
                  @change="updateCurrentStep('else_action', $event.target.value)"
                >
                  <option value="continue">继续执行下一步</option>
                  <option value="jump">跳转到指定步骤</option>
                  <option value="skip">跳过后续步骤</option>
                  <option value="stop">终止流程执行</option>
                </select>
              </div>

              <div v-if="selectedStep.else_action === 'jump'" class="form-group">
                <label class="form-label">跳转目标步骤</label>
                <select
                  class="form-select"
                  :value="selectedStep.else_jump_step || 1"
                  @change="updateCurrentStep('else_jump_step', parseInt($event.target.value) || 1)"
                >
                  <option
                    v-for="(st, idx) in workflow.steps"
                    :key="st.id || idx"
                    :value="idx + 1"
                  >
                    步骤 #{{ idx + 1 }}: {{ st.name }}
                  </option>
                </select>
              </div>

              <div v-if="selectedStep.else_action === 'skip'" class="form-group">
                <label class="form-label">跳过步骤数量</label>
                <input
                  type="number"
                  class="form-input"
                  min="1"
                  max="100"
                  :value="selectedStep.else_skip_count || 1"
                  @input="updateCurrentStep('else_skip_count', parseInt($event.target.value) || 1)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Mouse Scroll Section -->
        <div v-if="isScroll" class="prop-section-card">
          <div class="section-title">
            <Sliders :size="13" class="section-icon" />
            <span>鼠标滚轮滚动设置</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">滚动方向</label>
              <select
                class="form-select"
                v-model="scrollDirection"
              >
                <option value="down">向下滚动 (页面下翻)</option>
                <option value="up">向上滚动 (页面上翻)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">滚动格数 (步长)</label>
              <input
                type="number"
                class="form-input"
                min="1"
                max="100"
                v-model="scrollMagnitude"
                placeholder="如: 3"
              />
            </div>
          </div>

          <div class="form-row mt-sm">
            <div class="form-group">
              <label class="form-label">指定坐标 X (0为当前位置)</label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.x || 0"
                @input="updateCurrentStep('x', parseInt($event.target.value) || 0)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">指定坐标 Y (0为当前位置)</label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.y || 0"
                @input="updateCurrentStep('y', parseInt($event.target.value) || 0)"
              />
            </div>
          </div>

          <button class="btn btn-secondary full-btn" @click="pickMousePosForCurrentStep">
            <MapPin :size="13" />
            <span>拾取当前鼠标位置作为滚动坐标</span>
          </button>
        </div>

        <!-- 5. Mouse Move Section -->
        <div v-if="isMove" class="prop-section-card">
          <div class="section-title">
            <Navigation :size="13" class="section-icon" />
            <span>鼠标移动目标坐标</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">目标坐标 X</label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.x || 0"
                @input="updateCurrentStep('x', parseInt($event.target.value) || 0)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">目标坐标 Y</label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.y || 0"
                @input="updateCurrentStep('y', parseInt($event.target.value) || 0)"
              />
            </div>
          </div>

          <button class="btn btn-secondary full-btn" @click="pickMousePosForCurrentStep">
            <MapPin :size="13" />
            <span>拾取当前鼠标位置</span>
          </button>
        </div>

        <!-- 6. Mouse & Coordinates Section -->
        <div v-if="isMouseClick || selectedStep.action_type === 'image_click'" class="prop-section-card">
          <div class="section-title">
            <MousePointer :size="13" class="section-icon" />
            <span>鼠标点击行为</span>
          </div>

          <template v-if="isMouseClick">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">目标坐标 X</label>
                <input
                  type="number"
                  class="form-input"
                  :value="selectedStep.x || 0"
                  @input="updateCurrentStep('x', parseInt($event.target.value) || 0)"
                />
              </div>
              <div class="form-group">
                <label class="form-label">目标坐标 Y</label>
                <input
                  type="number"
                  class="form-input"
                  :value="selectedStep.y || 0"
                  @input="updateCurrentStep('y', parseInt($event.target.value) || 0)"
                />
              </div>
            </div>

            <button class="btn btn-secondary full-btn" @click="pickMousePosForCurrentStep">
              <MapPin :size="13" />
              <span>拾取当前鼠标位置</span>
            </button>
          </template>

          <div class="form-row mt-sm">
            <div class="form-group">
              <label class="form-label">鼠标按键</label>
              <select
                class="form-select"
                :value="selectedStep.mouse_button || 'left'"
                @change="updateCurrentStep('mouse_button', $event.target.value)"
              >
                <option value="left">鼠标左键</option>
                <option value="right">鼠标右键</option>
                <option value="middle">鼠标中键</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">点击方式</label>
              <select
                class="form-select"
                :value="selectedStep.click_type || 'single'"
                @change="updateCurrentStep('click_type', $event.target.value)"
              >
                <option value="single">单击</option>
                <option value="double">双击</option>
                <option value="triple">三击</option>
                <option value="down">按下保持</option>
                <option value="up">释放</option>
              </select>
            </div>
          </div>

          <div v-if="selectedStep.action_type === 'mouse_longpress'" class="form-group">
            <label class="form-label">长按持续时间 (秒)</label>
            <input
              type="number"
              class="form-input"
              min="0.1"
              step="0.1"
              :value="selectedStep.press_duration || 1.0"
              @input="updateCurrentStep('press_duration', parseFloat($event.target.value) || 1.0)"
            />
          </div>
        </div>

        <!-- 4. Drag Section -->
        <div v-if="isDrag" class="prop-section-card">
          <div class="section-title">
            <Move :size="13" class="section-icon" />
            <span>拖拽起点与终点</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">起点 X: <span class="val-primary">{{ selectedStep.x || 0 }}</span></label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.x || 0"
                @input="updateCurrentStep('x', parseInt($event.target.value) || 0)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">起点 Y: <span class="val-primary">{{ selectedStep.y || 0 }}</span></label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.y || 0"
                @input="updateCurrentStep('y', parseInt($event.target.value) || 0)"
              />
            </div>
          </div>

          <button class="btn btn-secondary full-btn" @click="pickMousePosForCurrentStep">
            <MapPin :size="13" />
            <span>拾取当前鼠标为起点</span>
          </button>

          <div class="form-row mt-sm">
            <div class="form-group">
              <label class="form-label">终点 X: <span class="val-cyan">{{ selectedStep.drag_to_x || 0 }}</span></label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.drag_to_x || 0"
                @input="updateCurrentStep('drag_to_x', parseInt($event.target.value) || 0)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">终点 Y: <span class="val-cyan">{{ selectedStep.drag_to_y || 0 }}</span></label>
              <input
                type="number"
                class="form-input"
                :value="selectedStep.drag_to_y || 0"
                @input="updateCurrentStep('drag_to_y', parseInt($event.target.value) || 0)"
              />
            </div>
          </div>

          <button class="btn btn-secondary full-btn" @click="pickDragEndPos">
            <MapPin :size="13" />
            <span>拾取当前鼠标为终点</span>
          </button>

          <div class="form-row mt-sm">
            <div class="form-group">
              <label class="form-label">拖拽耗时 (秒)</label>
              <input
                type="number"
                class="form-input"
                min="0.1"
                step="0.1"
                :value="selectedStep.drag_duration || 0.5"
                @input="updateCurrentStep('drag_duration', parseFloat($event.target.value) || 0.5)"
              />
            </div>
            <div class="form-group toggle-align">
              <label class="toggle-switch-label">
                <input
                  type="checkbox"
                  :checked="selectedStep.smooth_drag !== false"
                  @change="updateCurrentStep('smooth_drag', $event.target.checked)"
                />
                <span>平滑贝塞尔缓动</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 5. Text Input Section -->
        <div v-if="isText" class="prop-section-card">
          <div class="section-title">
            <Type :size="13" class="section-icon" />
            <span>文本输入内容</span>
          </div>

          <div class="form-group">
            <label class="form-label">待输入文本 (支持中文与特殊字符)</label>
            <textarea
              class="form-textarea"
              rows="3"
              placeholder="请输入想要自动键入的文本..."
              :value="selectedStep.text_to_type || ''"
              @input="updateCurrentStep('text_to_type', $event.target.value)"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="toggle-switch-label">
              <input
                type="checkbox"
                :checked="selectedStep.use_clipboard !== false"
                @change="updateCurrentStep('use_clipboard', $event.target.checked)"
              />
              <span>使用剪贴板快速粘贴 (推荐)</span>
            </label>
          </div>
        </div>

        <!-- 6. Hotkeys Section -->
        <div v-if="isHotkey" class="prop-section-card">
          <div class="section-title">
            <Zap :size="13" class="section-icon" />
            <span>快捷键配置</span>
          </div>

          <div class="form-group">
            <label class="form-label">组合按键 (如 ctrl+c, alt+f4, enter)</label>
            <input
              type="text"
              class="form-input"
              v-model="hotkeyInputString"
              placeholder="例如: ctrl+c 或 enter"
            />
          </div>

          <div class="form-group">
            <label class="form-label">常用快捷键:</label>
            <div class="hotkey-chips">
              <button
                v-for="hk in commonHotkeys"
                :key="hk.key"
                class="btn btn-secondary chip-btn"
                @click="setHotkeyString(hk.key)"
              >
                {{ hk.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- 7. Delay Section -->
        <div v-if="isWait" class="prop-section-card">
          <div class="section-title">
            <Clock :size="13" class="section-icon" />
            <span>延时等待设置</span>
          </div>

          <div class="form-group">
            <label class="form-label">等待时长 (秒)</label>
            <input
              type="number"
              class="form-input"
              min="0.1"
              step="0.1"
              :value="selectedStep.pre_delay || 1.0"
              @input="updateCurrentStep('pre_delay', parseFloat($event.target.value) || 1.0)"
            />
          </div>
        </div>

        <!-- 8. Advanced Accordion (Progressive Disclosure) -->
        <div class="advanced-accordion">
          <button class="advanced-toggle-btn" @click="isAdvancedOpen = !isAdvancedOpen">
            <div class="accordion-title">
              <Settings2 :size="13" class="accordion-icon" />
              <span>高级参数设置</span>
            </div>
            <ChevronUp v-if="isAdvancedOpen" :size="13" />
            <ChevronDown v-else :size="13" />
          </button>

          <div v-show="isAdvancedOpen" class="advanced-content">
            <template v-if="isImageAction">
              <div class="form-group">
                <label class="form-label">
                  <span>识别相似度阈值</span>
                  <span class="slider-val-badge">{{ confidencePercent }}%</span>
                </label>
                <div class="slider-wrapper">
                  <input
                    type="range"
                    class="form-range"
                    min="10"
                    max="100"
                    v-model="confidencePercent"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="toggle-switch-label">
                    <input
                      type="checkbox"
                      :checked="selectedStep.use_grayscale !== false"
                      @change="updateCurrentStep('use_grayscale', $event.target.checked)"
                    />
                    <span>灰度匹配</span>
                  </label>
                </div>
                <div class="form-group">
                  <label class="toggle-switch-label">
                    <input
                      type="checkbox"
                      :checked="selectedStep.multi_scale"
                      @change="updateCurrentStep('multi_scale', $event.target.checked)"
                    />
                    <span>多尺度自适应</span>
                  </label>
                </div>
              </div>
            </template>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">前延时 (秒)</label>
                <input
                  type="number"
                  class="form-input"
                  min="0"
                  step="0.1"
                  :value="selectedStep.pre_delay || 0"
                  @input="updateCurrentStep('pre_delay', parseFloat($event.target.value) || 0)"
                />
              </div>
              <div class="form-group">
                <label class="form-label">后延时 (秒)</label>
                <input
                  type="number"
                  class="form-input"
                  min="0"
                  step="0.1"
                  :value="selectedStep.post_delay !== undefined ? selectedStep.post_delay : 0.2"
                  @input="updateCurrentStep('post_delay', parseFloat($event.target.value) || 0)"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">重试次数</label>
                <input
                  type="number"
                  class="form-input"
                  min="1"
                  max="10"
                  :value="selectedStep.retry_count || 1"
                  @input="updateCurrentStep('retry_count', parseInt($event.target.value) || 1)"
                />
              </div>
              <div class="form-group">
                <label class="form-label">失败策略 (未连 False 口时)</label>
                <select
                  class="form-select"
                  :value="selectedStep.on_failure || 'stop'"
                  @change="updateCurrentStep('on_failure', $event.target.value)"
                >
                  <option value="stop">终止流程 (推荐)</option>
                  <option value="continue">忽略继续</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">步骤备注</label>
              <input
                type="text"
                class="form-input"
                :value="selectedStep.comment || ''"
                placeholder="选填，记录提示"
                @input="updateCurrentStep('comment', $event.target.value)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel-inspector {
  flex: 1.1;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  min-width: 280px;
  overflow: hidden;
}

.panel-header {
  height: 36px;
  padding: 0 12px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-title-icon {
  color: var(--color-primary);
}

.panel-badge {
  background: var(--bg-card);
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 500;
  border: 1px solid var(--border-subtle);
}

.inspector-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.inspector-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

.empty-guide-icon {
  color: var(--text-muted);
  opacity: 0.5;
}

.inspector-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prop-section-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}

.section-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.section-icon {
  color: var(--color-primary);
}

.toggle-align {
  justify-content: flex-end;
}

.image-target-preview-box {
  background: var(--bg-input);
  border: 1px dashed var(--border-card);
  border-radius: var(--radius-sm);
  min-height: 64px;
  max-height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 8px;
  padding: 4px;
}

.target-img-display {
  max-width: 100%;
  max-height: 100px;
  object-fit: contain;
  border-radius: 3px;
}

.target-img-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

.placeholder-icon {
  color: var(--text-muted);
  opacity: 0.6;
}

.subtext {
  font-size: 9.5px;
  color: var(--text-muted);
}

.image-buttons-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.btn-snip {
  flex: 1.8;
}

.btn-test-match {
  flex: 1.2;
}

.full-btn {
  width: 100%;
}

.mt-sm {
  margin-top: 6px;
}

.val-primary {
  color: var(--color-primary);
  font-weight: 600;
}

.val-cyan {
  color: var(--color-cyan);
  font-weight: 600;
}

.hotkey-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip-btn {
  font-size: 10.5px;
  padding: 2px 6px;
}

/* Branch Box Styling */
.branch-config-box {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.branch-config-box.then-branch {
  border-left: 3px solid var(--color-success);
}

.branch-config-box.else-branch {
  border-left: 3px solid var(--color-warning);
}

.branch-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.branch-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.branch-tag-then {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.branch-tag-else {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.branch-hint {
  font-size: 10.5px;
  color: var(--text-muted);
}

/* Accordion */
.advanced-accordion {
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  overflow: hidden;
}

.advanced-toggle-btn {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.advanced-toggle-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 5px;
}

.accordion-icon {
  color: var(--color-primary);
}

.advanced-content {
  padding: 10px 12px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-input);
}
</style>
