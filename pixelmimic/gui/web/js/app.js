/**
 * PixelMimic Web Frontend Application Controller.
 * Handles state, natural language step rendering, drag-and-drop,
 * property inspector binding, and PyWebView backend synchronization.
 */

class PixelMimicController {
  constructor() {
    this.api = null;
    this.workflow = {
      id: "wf-1",
      name: "新工作流",
      description: "",
      loop_count: 1,
      loop_interval: 1.0,
      stop_on_error: true,
      steps: [],
    };
    this.selectedStepIndex = -1;
    this.filePath = null;
    this.executionState = "idle";
    this.settings = {
      loop_count: 1,
      loop_interval: 1.0,
      minimize_on_run: true,
      failsafe: true,
      auto_scroll_logs: true,
    };
    this.draggedIndex = null;
    this.stepExecutionStatus = {}; // index -> { state: 'running'|'success'|'error', message: '' }

    this.init();
  }

  async init() {
    this.renderIcons();
    this.bindGlobalEvents();

    // Wait for pywebview API to be ready
    if (window.pywebview && window.pywebview.api) {
      this.api = window.pywebview.api;
      await this.loadInitialData();
    } else {
      window.addEventListener("pywebviewready", async () => {
        this.api = window.pywebview.api;
        await this.loadInitialData();
      });
      // Fallback polling in case event already fired
      setTimeout(async () => {
        if (!this.api && window.pywebview && window.pywebview.api) {
          this.api = window.pywebview.api;
          await this.loadInitialData();
        }
      }, 500);
    }
  }

  renderIcons() {
    if (typeof Icons === "undefined") return;
    const map = {
      iconNew: Icons.filePlus,
      iconOpen: Icons.folder,
      iconSave: Icons.save,
      iconRun: Icons.play,
      iconPause: Icons.pause,
      iconStop: Icons.stop,
      iconSnip: Icons.scissors,
      iconSettings: Icons.settings,
      iconHelp: Icons.help,
      iconCloseSettings: Icons.close,
      iconCloseAbout: Icons.close,
    };
    for (const [id, svg] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = svg;
    }
  }

  async loadInitialData() {
    if (!this.api) return;
    try {
      const data = await this.api.get_initial_data();
      if (data) {
        if (data.workflow) this.workflow = data.workflow;
        if (data.filePath) this.filePath = data.filePath;
        if (data.settings) this.settings = Object.assign(this.settings, data.settings);
        if (data.cursorPos) this.updateCursorPos(data.cursorPos.x, data.cursorPos.y);
        if (data.state) this.onStateChanged(data.state);

        this.updateWorkflowHeader();
        this.renderStepList();
        if (this.workflow.steps && this.workflow.steps.length > 0) {
          this.selectStep(0);
        } else {
          this.renderInspector();
        }
      }
    } catch (e) {
      console.error("Failed to load initial data from backend:", e);
    }
  }

  // ==================== Backend Event Handler ====================
  onBackendEvent(eventName, data) {
    switch (eventName) {
      case "step_started":
        this.onStepStarted(data.index, data.name);
        break;
      case "step_finished":
        this.onStepFinished(data.index, data.success, data.message);
        break;
      case "state_changed":
        this.onStateChanged(data.state);
        break;
      case "log_emitted":
        this.appendLog(data.level, data.message, data.time);
        break;
      case "loop_progress":
        this.updateLoopProgress(data.current, data.total);
        break;
      case "execution_finished":
        this.onExecutionFinished(data.success, data.message);
        break;
      case "cursor_moved":
        this.updateCursorPos(data.x, data.y);
        break;
      case "snip_captured":
        this.onSnipCaptured(data);
        break;
      default:
        console.log("Unhandled backend event:", eventName, data);
    }
  }

  onStepStarted(index, name) {
    this.stepExecutionStatus[index] = { state: "running" };
    this.renderStepList();
    // Scroll running step into view
    const el = document.getElementById(`step-card-${index}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  onStepFinished(index, success, message) {
    this.stepExecutionStatus[index] = {
      state: success ? "success" : "error",
      message: message,
    };
    this.renderStepList();
  }

  onStateChanged(state) {
    this.executionState = state;
    const btnRun = document.getElementById("btnRun");
    const btnPause = document.getElementById("btnPause");
    const btnStop = document.getElementById("btnStop");
    const statusDot = document.getElementById("statusDot");
    const statusStateText = document.getElementById("statusStateText");

    const isRunning = state === "running";
    const isPaused = state === "paused";

    btnRun.disabled = isRunning || isPaused;
    btnPause.disabled = !isRunning && !isPaused;
    btnStop.disabled = !isRunning && !isPaused;

    if (btnPause) {
      btnPause.innerHTML = isPaused
        ? `${Icons.play} 继续 (F9)`
        : `${Icons.pause} 暂停 (F9)`;
    }

    statusDot.className = "status-indicator-dot";
    if (isRunning) {
      statusDot.classList.add("running");
      statusStateText.innerText = "运行中";
      statusStateText.style.color = "var(--color-cyan)";
    } else if (isPaused) {
      statusDot.classList.add("paused");
      statusStateText.innerText = "已暂停";
      statusStateText.style.color = "var(--color-warning)";
    } else if (state === "error") {
      statusDot.classList.add("error");
      statusStateText.innerText = "执行异常";
      statusStateText.style.color = "var(--color-danger)";
    } else {
      statusStateText.innerText = "就绪";
      statusStateText.style.color = "var(--color-success)";
    }
  }

  updateLoopProgress(current, total) {
    const el = document.getElementById("statusLoopText");
    if (el) {
      const totStr = total > 0 ? total : "∞";
      el.innerText = `${current}/${totStr}`;
    }
  }

  onExecutionFinished(success, message) {
    if (success) {
      this.showToast("🎉 工作流执行完成！", "success");
    } else {
      this.showToast(`⚠️ 执行终止: ${message || "失败"}`, "warning");
    }
  }

  updateCursorPos(x, y) {
    const el = document.getElementById("statusCursorPos");
    if (el) el.innerText = `X: ${x}, Y: ${y}`;
  }

  onSnipCaptured(data) {
    if (this.selectedStepIndex >= 0 && this.selectedStepIndex < this.workflow.steps.length) {
      const step = this.workflow.steps[this.selectedStepIndex];
      step.image_base64 = data.image_base64;
      step.x = data.x;
      step.y = data.y;
      this.showToast(`✂️ 截图已应用: (${data.x}, ${data.y}) 尺寸: ${data.width}x${data.height}`, "success");
      this.renderStepList();
      this.renderInspector();
      this.syncWorkflowToBackend();
    }
  }

  // ==================== Step List & Natural Language Rendering ====================
  renderStepList() {
    const container = document.getElementById("stepListContainer");
    const countBadge = document.getElementById("stepCountBadge");
    const steps = this.workflow.steps || [];

    countBadge.innerText = `${steps.length} 步`;

    if (steps.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚀</div>
          <div class="empty-title">欢迎使用 PixelMimic 自动化大师</div>
          <div class="empty-desc">当前还没有添加任何操作步骤。您可以点击上方【➕ 常用操作】快速添加，或者直接载入新手示例：</div>
          
          <div class="onboarding-guide-box">
            <div class="guide-step">
              <div class="guide-num">1</div>
              <div>点击上方 <b>【🎯 找图点击】</b> 或 <b>【🖱️ 坐标点击】</b></div>
            </div>
            <div class="guide-step">
              <div class="guide-num">2</div>
              <div>按 <b>F7</b> 框选您想自动点击的目标图标或按钮</div>
            </div>
            <div class="guide-step">
              <div class="guide-num">3</div>
              <div>点击右上角 <b>【▶ 启动运行】</b> (F8) 即可全自动执行！</div>
            </div>
          </div>

          <button class="btn btn-primary" onclick="PixelMimicApp.loadSampleTemplate()" style="padding: 9px 20px; font-size: 13px;">
            🌟 载入新手示例流程体验
          </button>
        </div>
      `;
      return;
    }

    let html = "";
    steps.forEach((step, idx) => {
      const isSelected = idx === this.selectedStepIndex;
      const isDisabled = step.enabled === false;
      const statusInfo = this.stepExecutionStatus[idx] || {};
      const statusState = statusInfo.state || "";

      let cardClass = "step-card";
      if (isSelected) cardClass += " selected";
      if (isDisabled) cardClass += " disabled";
      if (statusState === "running") cardClass += " running";
      if (statusState === "success") cardClass += " success-border";
      if (statusState === "error") cardClass += " error-border";

      const icon = this.getActionIcon(step.action_type);
      const naturalDesc = this.generateNaturalDescription(step);

      html += `
        <div id="step-card-${idx}" class="${cardClass}" draggable="true"
             ondragstart="PixelMimicApp.onDragStart(event, ${idx})"
             ondragover="PixelMimicApp.onDragOver(event, ${idx})"
             ondrop="PixelMimicApp.onDrop(event, ${idx})"
             onclick="PixelMimicApp.selectStep(${idx})">
          <div class="step-drag-handle" title="按住拖拽调整顺序">${Icons.dragHandle}</div>
          <div class="step-index-badge">${String(idx + 1).padStart(2, "0")}</div>
          <div class="step-icon-badge">${icon}</div>
          
          <div class="step-main-info">
            <div class="step-title-row">
              <span class="step-name">${this.escapeHtml(step.name || "未命名步骤")}</span>
              ${step.enabled === false ? '<span style="font-size: 10px; color: var(--text-muted); background: var(--bg-surface); padding: 1px 4px; border-radius: 3px;">已禁用</span>' : ""}
              ${statusState === "success" ? Icons.checkCircle : ""}
              ${statusState === "error" ? Icons.xCircle : ""}
            </div>
            <div class="step-natural-desc">${naturalDesc}</div>
          </div>

          <div class="step-actions" onclick="event.stopPropagation()">
            <button class="step-action-btn" title="单步即时测试" onclick="PixelMimicApp.testSingleStep(${idx}, event)">
              ${Icons.play}
            </button>
            <button class="step-action-btn" title="复制副本" onclick="PixelMimicApp.duplicateStep(${idx}, event)">
              ${Icons.copy}
            </button>
            <button class="step-action-btn" title="上移" onclick="PixelMimicApp.moveStep(${idx}, -1, event)">
              ${Icons.chevronUp}
            </button>
            <button class="step-action-btn" title="下移" onclick="PixelMimicApp.moveStep(${idx}, 1, event)">
              ${Icons.chevronDown}
            </button>
            <button class="step-action-btn delete" title="删除步骤" onclick="PixelMimicApp.deleteStep(${idx}, event)">
              ${Icons.trash}
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  getActionIcon(actionType) {
    const map = {
      image_click: "🎯",
      mouse_click: "🖱️",
      mouse_longpress: "⏳",
      mouse_drag: "↔️",
      mouse_scroll: "📜",
      type_text: "⌨️",
      hotkey: "⚡",
      key_press: "🔘",
      wait_time: "⏱️",
      image_wait: "👁️",
    };
    return map[actionType] || "📌";
  }

  generateNaturalDescription(step) {
    const act = step.action_type || "mouse_click";
    const btnMap = { left: "左键", right: "右键", middle: "中键" };
    const clickMap = { single: "单击", double: "双击", triple: "三击", down: "按下", up: "释放" };
    const btnText = `${clickMap[step.click_type || "single"] || "单击"}${btnMap[step.mouse_button || "left"] || "左键"}`;

    switch (act) {
      case "image_click": {
        let imgTag = step.image_base64
          ? `<img src="data:image/png;base64,${step.image_base64}" class="step-thumb-mini" alt="目标图片" />`
          : `<span style="color: var(--color-warning);">[未设置图片]</span>`;
        let offsetStr = (step.offset_x || step.offset_y) ? ` (偏移 X:${step.offset_x || 0}, Y:${step.offset_y || 0})` : "";
        return `在屏幕上找到 ${imgTag} 并 <b>${btnText}</b>${offsetStr}`;
      }
      case "mouse_click":
        return `在坐标 <b>(X: ${step.x || 0}, Y: ${step.y || 0})</b> ${btnText}`;
      case "mouse_longpress":
        return `在坐标 <b>(X: ${step.x || 0}, Y: ${step.y || 0})</b> 长按 ${btnMap[step.mouse_button || "left"] || "左键"} <b>${step.press_duration || 1.0} 秒</b>`;
      case "mouse_drag":
        return `从 <b>(${step.x || 0}, ${step.y || 0})</b> 平滑拖拽至 <b>(${step.drag_to_x || 0}, ${step.drag_to_y || 0})</b> (${step.drag_duration || 0.5}s)`;
      case "mouse_scroll": {
        const amt = step.scroll_amount || 0;
        const dir = amt >= 0 ? `向上滚动 ${amt} 格` : `向下滚动 ${Math.abs(amt)} 格`;
        return `滚轮 <b>${dir}</b>`;
      }
      case "type_text": {
        const txt = step.text_to_type || "";
        const preview = txt.length > 20 ? txt.slice(0, 20) + "..." : txt;
        const clipTag = step.use_clipboard ? `<span style="color: var(--color-cyan);">[剪贴板]</span>` : "";
        return `输入文字 <b>"${this.escapeHtml(preview)}"</b> ${clipTag}`;
      }
      case "hotkey": {
        const keys = (step.hotkeys && step.hotkeys.length > 0) ? step.hotkeys.join(" + ") : (step.key_press_key || "无");
        return `按下快捷键 <b>[ ${this.escapeHtml(keys.toUpperCase())} ]</b>`;
      }
      case "key_press":
        return `按下单键 <b>[ ${this.escapeHtml((step.key_press_key || "Enter").toUpperCase())} ]</b>`;
      case "wait_time":
        return `等待 <b>${step.pre_delay || 1.0} 秒</b>`;
      case "image_wait": {
        let imgTag = step.image_base64
          ? `<img src="data:image/png;base64,${step.image_base64}" class="step-thumb-mini" alt="目标图片" />`
          : `<span style="color: var(--color-warning);">[未设置图片]</span>`;
        const mode = step.wait_for_disappear ? "消失" : "出现";
        return `等待目标图像 ${imgTag} <b>${mode}</b> (超时: ${step.wait_timeout || 5}s)`;
      }
      default:
        return `执行动作: ${act}`;
    }
  }

  // ==================== Step Selection & Inspector ====================
  selectStep(index) {
    if (index < 0 || index >= (this.workflow.steps || []).length) {
      this.selectedStepIndex = -1;
    } else {
      this.selectedStepIndex = index;
    }
    this.renderStepList();
    this.renderInspector();
  }

  renderInspector() {
    const container = document.getElementById("inspectorContainer");
    const badge = document.getElementById("selectedStepBadge");

    if (this.selectedStepIndex < 0 || this.selectedStepIndex >= (this.workflow.steps || []).length) {
      badge.innerText = "未选中";
      container.innerHTML = `
        <div class="inspector-empty">
          <span style="font-size: 32px;">👈</span>
          <span>请在左侧选择或添加一个操作步骤以配置属性</span>
        </div>
      `;
      return;
    }

    const step = this.workflow.steps[this.selectedStepIndex];
    badge.innerText = `步骤 #${this.selectedStepIndex + 1}`;

    const isImageAction = ["image_click", "image_wait", "image_drag"].includes(step.action_type);
    const isMouseClick = ["mouse_click", "mouse_longpress"].includes(step.action_type);
    const isDrag = step.action_type === "mouse_drag" || step.action_type === "image_drag";
    const isText = step.action_type === "type_text";
    const isHotkey = step.action_type === "hotkey";
    const isKeyPress = step.action_type === "key_press";
    const isWait = step.action_type === "wait_time";

    let html = `
      <!-- 1. 基础信息 Section -->
      <div class="prop-section-card">
        <div class="section-title">📌 步骤基础信息</div>
        <div class="form-group">
          <label class="form-label">步骤名称</label>
          <input type="text" class="form-input" value="${this.escapeHtml(step.name || "")}" 
                 oninput="PixelMimicApp.updateCurrentStep('name', this.value)" placeholder="如: 点击确认按钮" />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">操作类型</label>
            <select class="form-select" onchange="PixelMimicApp.changeStepActionType(this.value)">
              <option value="image_click" ${step.action_type === "image_click" ? "selected" : ""}>🎯 找图点击</option>
              <option value="mouse_click" ${step.action_type === "mouse_click" ? "selected" : ""}>🖱️ 坐标点击</option>
              <option value="type_text" ${step.action_type === "type_text" ? "selected" : ""}>⌨️ 输入文字</option>
              <option value="hotkey" ${step.action_type === "hotkey" ? "selected" : ""}>⚡ 组合快捷键</option>
              <option value="wait_time" ${step.action_type === "wait_time" ? "selected" : ""}>⏱️ 等待延时</option>
              <option value="mouse_drag" ${step.action_type === "mouse_drag" ? "selected" : ""}>↔️ 鼠标拖拽</option>
              <option value="mouse_longpress" ${step.action_type === "mouse_longpress" ? "selected" : ""}>⏳ 鼠标长按</option>
              <option value="image_wait" ${step.action_type === "image_wait" ? "selected" : ""}>👁️ 等待图像</option>
            </select>
          </div>
          <div class="form-group" style="justify-content: flex-end;">
            <label class="toggle-switch-label">
              <input type="checkbox" ${step.enabled !== false ? "checked" : ""} 
                     onchange="PixelMimicApp.updateCurrentStep('enabled', this.checked)" />
              <span>启用此步骤</span>
            </label>
          </div>
        </div>
      </div>
    `;

    // 2. 图像配置 Section (if image-based)
    if (isImageAction) {
      html += `
        <div class="prop-section-card">
          <div class="section-title">🎯 目标图像配置</div>
          
          <div class="image-target-preview-box">
            ${step.image_base64
              ? `<img src="data:image/png;base64,${step.image_base64}" class="target-img-display" alt="目标图片" />`
              : `<div class="target-img-placeholder"><span>🖼️ 尚未设置目标图片</span><span>点击下方按钮截屏或选择图片</span></div>`
            }
          </div>

          <div class="image-buttons-row">
            <button class="btn btn-primary" style="flex: 2;" onclick="PixelMimicApp.startSnipForCurrentStep()">
              ${Icons.scissors} 截取目标图片 (F7)
            </button>
            <button class="btn btn-secondary" style="flex: 1.5;" onclick="PixelMimicApp.testMatchForCurrentStep()" ${!step.image_base64 ? "disabled" : ""}>
              ${Icons.search} 测试匹配
            </button>
          </div>

          ${step.action_type === "image_click" ? `
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">点击偏移 X (像素)</label>
                <input type="number" class="form-input" value="${step.offset_x || 0}" 
                       oninput="PixelMimicApp.updateCurrentStep('offset_x', parseInt(this.value) || 0)" />
              </div>
              <div class="form-group">
                <label class="form-label">点击偏移 Y (像素)</label>
                <input type="number" class="form-input" value="${step.offset_y || 0}" 
                       oninput="PixelMimicApp.updateCurrentStep('offset_y', parseInt(this.value) || 0)" />
              </div>
            </div>
          ` : ""}

          ${step.action_type === "image_wait" ? `
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">最长等待超时 (秒)</label>
                <input type="number" class="form-input" min="0.5" step="0.5" value="${step.wait_timeout || 5.0}" 
                       oninput="PixelMimicApp.updateCurrentStep('wait_timeout', parseFloat(this.value) || 5.0)" />
              </div>
              <div class="form-group" style="justify-content: flex-end;">
                <label class="toggle-switch-label">
                  <input type="checkbox" ${step.wait_for_disappear ? "checked" : ""} 
                         onchange="PixelMimicApp.updateCurrentStep('wait_for_disappear', this.checked)" />
                  <span>等待图像消失</span>
                </label>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    }

    // 3. 鼠标与坐标配置 Section
    if (isMouseClick || step.action_type === "image_click") {
      html += `
        <div class="prop-section-card">
          <div class="section-title">🖱️ 鼠标点击行为</div>
          
          ${isMouseClick ? `
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">目标坐标 X</label>
                <input type="number" class="form-input" value="${step.x || 0}" 
                       oninput="PixelMimicApp.updateCurrentStep('x', parseInt(this.value) || 0)" />
              </div>
              <div class="form-group">
                <label class="form-label">目标坐标 Y</label>
                <input type="number" class="form-input" value="${step.y || 0}" 
                       oninput="PixelMimicApp.updateCurrentStep('y', parseInt(this.value) || 0)" />
              </div>
            </div>
            <button class="btn btn-secondary" style="width: 100%;" onclick="PixelMimicApp.pickMousePosForCurrentStep()">
              📍 拾取当前鼠标位置
            </button>
          ` : ""}

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">鼠标按键</label>
              <select class="form-select" onchange="PixelMimicApp.updateCurrentStep('mouse_button', this.value)">
                <option value="left" ${step.mouse_button === "left" ? "selected" : ""}>鼠标左键</option>
                <option value="right" ${step.mouse_button === "right" ? "selected" : ""}>鼠标右键</option>
                <option value="middle" ${step.mouse_button === "middle" ? "selected" : ""}>鼠标中键/滚轮</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">点击方式</label>
              <select class="form-select" onchange="PixelMimicApp.updateCurrentStep('click_type', this.value)">
                <option value="single" ${step.click_type === "single" ? "selected" : ""}>单击</option>
                <option value="double" ${step.click_type === "double" ? "selected" : ""}>双击</option>
                <option value="triple" ${step.click_type === "triple" ? "selected" : ""}>三击</option>
                <option value="down" ${step.click_type === "down" ? "selected" : ""}>按下 (保持)</option>
                <option value="up" ${step.click_type === "up" ? "selected" : ""}>释放</option>
              </select>
            </div>
          </div>

          ${step.action_type === "mouse_longpress" ? `
            <div class="form-group">
              <label class="form-label">长按持续时间 (秒)</label>
              <input type="number" class="form-input" min="0.1" step="0.1" value="${step.press_duration || 1.0}" 
                     oninput="PixelMimicApp.updateCurrentStep('press_duration', parseFloat(this.value) || 1.0)" />
            </div>
          ` : ""}
        </div>
      `;
    }

    // 4. 拖拽配置 Section
    if (isDrag) {
      html += `
        <div class="prop-section-card">
          <div class="section-title">↔️ 拖拽起点与终点</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">起点 X: <span style="color:var(--color-primary);">${step.x || 0}</span></label>
              <input type="number" class="form-input" value="${step.x || 0}" 
                     oninput="PixelMimicApp.updateCurrentStep('x', parseInt(this.value) || 0)" />
            </div>
            <div class="form-group">
              <label class="form-label">起点 Y: <span style="color:var(--color-primary);">${step.y || 0}</span></label>
              <input type="number" class="form-input" value="${step.y || 0}" 
                     oninput="PixelMimicApp.updateCurrentStep('y', parseInt(this.value) || 0)" />
            </div>
          </div>
          <button class="btn btn-secondary" style="width: 100%;" onclick="PixelMimicApp.pickMousePosForCurrentStep()">
            📍 拾取当前鼠标为起点
          </button>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">终点 X: <span style="color:var(--color-cyan);">${step.drag_to_x || 0}</span></label>
              <input type="number" class="form-input" value="${step.drag_to_x || 0}" 
                     oninput="PixelMimicApp.updateCurrentStep('drag_to_x', parseInt(this.value) || 0)" />
            </div>
            <div class="form-group">
              <label class="form-label">终点 Y: <span style="color:var(--color-cyan);">${step.drag_to_y || 0}</span></label>
              <input type="number" class="form-input" value="${step.drag_to_y || 0}" 
                     oninput="PixelMimicApp.updateCurrentStep('drag_to_y', parseInt(this.value) || 0)" />
            </div>
          </div>
          <button class="btn btn-secondary" style="width: 100%;" onclick="PixelMimicApp.pickDragEndPos()">
            📍 拾取当前鼠标为终点
          </button>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">拖拽耗时 (秒)</label>
              <input type="number" class="form-input" min="0.1" step="0.1" value="${step.drag_duration || 0.5}" 
                     oninput="PixelMimicApp.updateCurrentStep('drag_duration', parseFloat(this.value) || 0.5)" />
            </div>
            <div class="form-group" style="justify-content: flex-end;">
              <label class="toggle-switch-label">
                <input type="checkbox" ${step.smooth_drag !== false ? "checked" : ""} 
                       onchange="PixelMimicApp.updateCurrentStep('smooth_drag', this.checked)" />
                <span>平滑贝塞尔缓动</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }

    // 5. 键盘与文本输入 Section
    if (isText) {
      html += `
        <div class="prop-section-card">
          <div class="section-title">⌨️ 文本输入内容</div>
          <div class="form-group">
            <label class="form-label">待输入文本 (支持中文与特殊字符)</label>
            <textarea class="form-textarea" rows="3" placeholder="请输入想要自动键入的文本..."
                      oninput="PixelMimicApp.updateCurrentStep('text_to_type', this.value)">${this.escapeHtml(step.text_to_type || "")}</textarea>
          </div>
          <div class="form-group">
            <label class="toggle-switch-label">
              <input type="checkbox" ${step.use_clipboard !== false ? "checked" : ""} 
                     onchange="PixelMimicApp.updateCurrentStep('use_clipboard', this.checked)" />
              <span>使用剪贴板快速粘贴 (推荐，完美支持中文/长文本)</span>
            </label>
          </div>
        </div>
      `;
    }

    // 6. 快捷键 Section
    if (isHotkey || isKeyPress) {
      const currentKeys = (step.hotkeys && step.hotkeys.length > 0) ? step.hotkeys.join("+") : (step.key_press_key || "");
      html += `
        <div class="prop-section-card">
          <div class="section-title">⚡ 快捷键配置</div>
          <div class="form-group">
            <label class="form-label">组合按键 (如 ctrl+c, alt+f4, enter)</label>
            <input type="text" class="form-input" value="${this.escapeHtml(currentKeys)}" 
                   placeholder="例如: ctrl+c 或 enter"
                   oninput="PixelMimicApp.setHotkeyString(this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">快速选择常用快捷键:</label>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px;" onclick="PixelMimicApp.setHotkeyString('ctrl+c')">Ctrl+C 复制</button>
              <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px;" onclick="PixelMimicApp.setHotkeyString('ctrl+v')">Ctrl+V 粘贴</button>
              <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px;" onclick="PixelMimicApp.setHotkeyString('ctrl+a')">Ctrl+A 全选</button>
              <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px;" onclick="PixelMimicApp.setHotkeyString('enter')">Enter 回车</button>
              <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px;" onclick="PixelMimicApp.setHotkeyString('esc')">Esc 取消</button>
              <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px;" onclick="PixelMimicApp.setHotkeyString('tab')">Tab 切换</button>
            </div>
          </div>
        </div>
      `;
    }

    // 7. 等待延时 Section
    if (isWait) {
      html += `
        <div class="prop-section-card">
          <div class="section-title">⏱️ 延时等待设置</div>
          <div class="form-group">
            <label class="form-label">等待时长 (秒)</label>
            <input type="number" class="form-input" min="0.1" step="0.1" value="${step.pre_delay || 1.0}" 
                   oninput="PixelMimicApp.updateCurrentStep('pre_delay', parseFloat(this.value) || 1.0)" />
          </div>
        </div>
      `;
    }

    // 8. 渐进式折叠：⚙️ 高级参数（选填）
    const confidencePct = Math.round((step.confidence !== undefined ? step.confidence : 0.8) * 100);
    html += `
      <div class="advanced-accordion">
        <button class="advanced-toggle-btn" onclick="PixelMimicApp.toggleAdvancedAccordion(this)">
          <span>⚙️ 高级参数设置 (选填，小白可直接使用默认值)</span>
          <span class="icon-toggle">${Icons.chevronDown}</span>
        </button>
        <div class="advanced-content" id="advancedContent">
          ${isImageAction ? `
            <div class="form-group">
              <label class="form-label">
                <span>识别相似度阈值</span>
                <span id="sliderConfidenceVal" class="slider-val-badge">${confidencePct}%</span>
              </label>
              <div class="slider-wrapper">
                <input type="range" class="form-range" min="10" max="100" value="${confidencePct}" 
                       oninput="PixelMimicApp.onConfidenceSlider(this.value)" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="toggle-switch-label">
                  <input type="checkbox" ${step.use_grayscale !== false ? "checked" : ""} 
                         onchange="PixelMimicApp.updateCurrentStep('use_grayscale', this.checked)" />
                  <span>灰度模式 (速度更快)</span>
                </label>
              </div>
              <div class="form-group">
                <label class="toggle-switch-label">
                  <input type="checkbox" ${step.multi_scale ? "checked" : ""} 
                         onchange="PixelMimicApp.updateCurrentStep('multi_scale', this.checked)" />
                  <span>多尺度自适应 (高分屏DPI)</span>
                </label>
              </div>
            </div>
          ` : ""}

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">执行前延时 (秒)</label>
              <input type="number" class="form-input" min="0" step="0.1" value="${step.pre_delay || 0}" 
                     oninput="PixelMimicApp.updateCurrentStep('pre_delay', parseFloat(this.value) || 0)" />
            </div>
            <div class="form-group">
              <label class="form-label">执行后延时 (秒)</label>
              <input type="number" class="form-input" min="0" step="0.1" value="${step.post_delay !== undefined ? step.post_delay : 0.2}" 
                     oninput="PixelMimicApp.updateCurrentStep('post_delay', parseFloat(this.value) || 0)" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">失败重试次数</label>
              <input type="number" class="form-input" min="1" max="10" value="${step.retry_count || 1}" 
                     oninput="PixelMimicApp.updateCurrentStep('retry_count', parseInt(this.value) || 1)" />
            </div>
            <div class="form-group">
              <label class="form-label">失败后策略</label>
              <select class="form-select" onchange="PixelMimicApp.updateCurrentStep('on_failure', this.value)">
                <option value="stop" ${step.on_failure === "stop" ? "selected" : ""}>终止流程 (推荐)</option>
                <option value="continue" ${step.on_failure === "continue" ? "selected" : ""}>忽略并继续下一步</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">步骤备注 / 说明</label>
            <input type="text" class="form-input" value="${this.escapeHtml(step.comment || "")}" 
                   placeholder="选填，记录此步骤的目的或提示"
                   oninput="PixelMimicApp.updateCurrentStep('comment', this.value)" />
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  toggleAdvancedAccordion(btn) {
    const content = document.getElementById("advancedContent");
    if (content) {
      content.classList.toggle("open");
      const icon = btn.querySelector(".icon-toggle");
      if (icon) {
        icon.innerHTML = content.classList.contains("open") ? Icons.chevronUp : Icons.chevronDown;
      }
    }
  }

  onConfidenceSlider(val) {
    const badge = document.getElementById("sliderConfidenceVal");
    if (badge) badge.innerText = `${val}%`;
    this.updateCurrentStep("confidence", parseFloat(val) / 100);
  }

  // ==================== Step Operations ====================
  quickAddStep(actionType) {
    const defaultNames = {
      image_click: "🎯 找图点击",
      mouse_click: "🖱️ 坐标点击",
      type_text: "⌨️ 输入文字",
      hotkey: "⚡ 组合快捷键",
      wait_time: "⏱️ 等待延时",
      mouse_drag: "↔️ 鼠标拖拽",
      mouse_longpress: "⏳ 鼠标长按",
      image_wait: "👁️ 等待图像出现",
    };

    const newStep = {
      id: "step-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      name: defaultNames[actionType] || "新步骤",
      action_type: actionType,
      enabled: true,
      target_type: ["image_click", "image_wait", "image_drag"].includes(actionType) ? "image" : "coordinate",
      x: 500,
      y: 300,
      offset_x: 0,
      offset_y: 0,
      drag_to_x: 700,
      drag_to_y: 300,
      drag_duration: 0.5,
      smooth_drag: true,
      mouse_button: "left",
      click_type: "single",
      press_duration: 1.0,
      scroll_amount: -3,
      text_to_type: actionType === "type_text" ? "你好世界" : "",
      use_clipboard: true,
      hotkeys: actionType === "hotkey" ? ["ctrl", "c"] : [],
      key_press_key: actionType === "key_press" ? "enter" : "",
      image_base64: null,
      confidence: 0.8,
      match_method: "TM_CCOEFF_NORMED",
      use_grayscale: true,
      multi_scale: false,
      wait_timeout: 5.0,
      wait_for_disappear: false,
      pre_delay: actionType === "wait_time" ? 1.0 : 0.0,
      post_delay: 0.2,
      retry_count: 1,
      retry_interval: 0.5,
      on_failure: "stop",
      comment: "",
    };

    if (!this.workflow.steps) this.workflow.steps = [];
    this.workflow.steps.push(newStep);
    this.selectStep(this.workflow.steps.length - 1);
    this.syncWorkflowToBackend();

    // Auto-prompt to snip if image action added
    if (actionType === "image_click" || actionType === "image_wait") {
      this.showToast("👉 点击【✂️ 截取目标图片】即可框选要识别的目标", "info");
    }
  }

  updateCurrentStep(key, value) {
    if (this.selectedStepIndex < 0 || this.selectedStepIndex >= this.workflow.steps.length) return;
    this.workflow.steps[this.selectedStepIndex][key] = value;
    this.renderStepList();
    this.syncWorkflowToBackend();
  }

  changeStepActionType(newType) {
    if (this.selectedStepIndex < 0 || this.selectedStepIndex >= this.workflow.steps.length) return;
    const step = this.workflow.steps[this.selectedStepIndex];
    step.action_type = newType;
    step.target_type = ["image_click", "image_wait", "image_drag"].includes(newType) ? "image" : "coordinate";
    this.renderStepList();
    this.renderInspector();
    this.syncWorkflowToBackend();
  }

  setHotkeyString(str) {
    if (this.selectedStepIndex < 0) return;
    const keys = str.split("+").map(k => k.trim().toLowerCase()).filter(Boolean);
    const step = this.workflow.steps[this.selectedStepIndex];
    step.hotkeys = keys;
    step.key_press_key = keys.length === 1 ? keys[0] : "";
    this.renderStepList();
    this.syncWorkflowToBackend();
  }

  deleteStep(index, event) {
    if (event) event.stopPropagation();
    this.workflow.steps.splice(index, 1);
    if (this.selectedStepIndex >= this.workflow.steps.length) {
      this.selectedStepIndex = this.workflow.steps.length - 1;
    }
    this.renderStepList();
    this.renderInspector();
    this.syncWorkflowToBackend();
  }

  duplicateStep(index, event) {
    if (event) event.stopPropagation();
    const orig = this.workflow.steps[index];
    const clone = JSON.parse(JSON.stringify(orig));
    clone.id = "step-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    clone.name = clone.name + " (副本)";
    this.workflow.steps.splice(index + 1, 0, clone);
    this.selectStep(index + 1);
    this.syncWorkflowToBackend();
  }

  moveStep(index, direction, event) {
    if (event) event.stopPropagation();
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= this.workflow.steps.length) return;
    const [moved] = this.workflow.steps.splice(index, 1);
    this.workflow.steps.splice(newIdx, 0, moved);
    this.selectStep(newIdx);
    this.syncWorkflowToBackend();
  }

  // ==================== Drag & Drop Reordering ====================
  onDragStart(event, index) {
    this.draggedIndex = index;
    event.dataTransfer.effectAllowed = "move";
  }

  onDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  onDrop(event, index) {
    event.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === index) return;
    const [moved] = this.workflow.steps.splice(this.draggedIndex, 1);
    this.workflow.steps.splice(index, 0, moved);
    this.selectStep(index);
    this.draggedIndex = null;
    this.syncWorkflowToBackend();
  }

  // ==================== Snip & Match Testing ====================
  async startSnipForCurrentStep() {
    if (!this.api) return;
    try {
      this.showToast("✂️ 全屏截屏已启动：鼠标框选目标，按 Enter 确认，Esc 取消", "info");
      await this.api.start_snip();
    } catch (e) {
      this.showToast("截屏调起失败: " + e, "error");
    }
  }

  async testMatchForCurrentStep() {
    if (!this.api || this.selectedStepIndex < 0) return;
    const step = this.workflow.steps[this.selectedStepIndex];
    try {
      const res = await this.api.test_match(step);
      if (res.found) {
        this.showToast(`🎯 ${res.message}`, "success");
      } else {
        this.showToast(`🔍 ${res.message}`, "warning");
      }
    } catch (e) {
      this.showToast("匹配测试发生异常: " + e, "error");
    }
  }

  async pickMousePosForCurrentStep() {
    if (!this.api || this.selectedStepIndex < 0) return;
    try {
      const res = await this.api.pick_mouse_position();
      if (res && res.success) {
        this.updateCurrentStep("x", res.x);
        this.updateCurrentStep("y", res.y);
        this.showToast(`📍 已拾取当前鼠标坐标: (${res.x}, ${res.y})`, "success");
        this.renderInspector();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async pickDragEndPos() {
    if (!this.api || this.selectedStepIndex < 0) return;
    try {
      const res = await this.api.pick_mouse_position();
      if (res && res.success) {
        this.updateCurrentStep("drag_to_x", res.x);
        this.updateCurrentStep("drag_to_y", res.y);
        this.showToast(`📍 已拾取终点坐标: (${res.x}, ${res.y})`, "success");
        this.renderInspector();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async testSingleStep(index, event) {
    if (event) event.stopPropagation();
    if (!this.api) return;
    const step = this.workflow.steps[index];
    try {
      this.showToast(`▶ 开始测试单步: [${step.name}]`, "info");
      const res = await this.api.test_single_step(step, index);
      if (res.success) {
        this.showToast(`✅ 单步测试成功: ${res.message || "完成"} (${res.executionTime}s)`, "success");
      } else {
        this.showToast(`❌ 单步测试失败: ${res.message || "未成功"}`, "error");
      }
    } catch (e) {
      this.showToast("测试执行异常: " + e, "error");
    }
  }

  // ==================== Workflow Save / Open / Run ====================
  async syncWorkflowToBackend() {
    if (!this.api) return;
    try {
      await this.api.update_workflow(this.workflow);
    } catch (e) {
      console.error("Sync workflow error:", e);
    }
  }

  async newWorkflow() {
    if (!this.api) return;
    try {
      const res = await this.api.new_workflow();
      if (res && res.success) {
        this.workflow = res.workflow;
        this.filePath = null;
        this.selectedStepIndex = -1;
        this.stepExecutionStatus = {};
        this.updateWorkflowHeader();
        this.renderStepList();
        this.renderInspector();
        this.showToast("📄 已创建新工作流", "info");
      }
    } catch (e) {
      this.showToast("创建失败: " + e, "error");
    }
  }

  async openWorkflow() {
    if (!this.api) return;
    try {
      const res = await this.api.open_workflow();
      if (res && res.success) {
        this.workflow = res.workflow;
        this.filePath = res.filePath;
        this.selectedStepIndex = this.workflow.steps.length > 0 ? 0 : -1;
        this.stepExecutionStatus = {};
        this.updateWorkflowHeader();
        this.renderStepList();
        this.renderInspector();
        this.showToast(`📂 成功打开工作流: ${res.fileName}`, "success");
      } else if (res && res.message) {
        this.showToast(res.message, "error");
      }
    } catch (e) {
      this.showToast("打开文件异常: " + e, "error");
    }
  }

  async saveWorkflow() {
    if (!this.api) return;
    try {
      const res = await this.api.save_workflow(this.workflow, this.filePath);
      if (res && res.success) {
        this.filePath = res.filePath;
        this.updateWorkflowHeader();
        this.showToast(`💾 成功保存至: ${res.fileName}`, "success");
      } else if (res && res.message) {
        this.showToast(res.message, "error");
      }
    } catch (e) {
      this.showToast("保存文件异常: " + e, "error");
    }
  }

  async startWorkflow() {
    if (!this.api) return;
    if (!this.workflow.steps || this.workflow.steps.length === 0) {
      this.showToast("工作流中没有步骤，请先添加操作步骤！", "warning");
      return;
    }
    this.stepExecutionStatus = {};
    this.renderStepList();
    try {
      const res = await this.api.start_workflow(this.workflow, this.settings);
      if (!res.success) {
        this.showToast(res.message || "启动失败", "error");
      }
    } catch (e) {
      this.showToast("启动异常: " + e, "error");
    }
  }

  async togglePause() {
    if (!this.api) return;
    try {
      await this.api.toggle_pause();
    } catch (e) {
      console.error(e);
    }
  }

  async stopWorkflow() {
    if (!this.api) return;
    try {
      await this.api.stop_workflow();
      this.showToast("⏹️ 工作流已强制停止", "warning");
    } catch (e) {
      console.error(e);
    }
  }

  async loadSampleTemplate() {
    if (!this.api) return;
    try {
      const res = await this.api.load_sample_template("basic");
      if (res && res.success) {
        this.workflow = res.workflow;
        this.filePath = null;
        this.selectedStepIndex = 0;
        this.stepExecutionStatus = {};
        this.updateWorkflowHeader();
        this.renderStepList();
        this.renderInspector();
        this.showToast("🌟 已载入新手示例工作流，点击【▶ 启动运行】即可体验！", "success");
      }
    } catch (e) {
      this.showToast("载入示例失败: " + e, "error");
    }
  }

  updateWorkflowHeader() {
    const input = document.getElementById("workflowTitleInput");
    const badge = document.getElementById("fileStatusBadge");
    if (input) input.value = this.workflow.name || "新工作流";
    if (badge) {
      badge.innerText = this.filePath ? this.filePath.split(/[\\/]/).pop() : "未保存";
    }
  }

  // ==================== Modals & Settings ====================
  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add("active");
    if (modalId === "settingsModal") {
      document.getElementById("settingLoopCount").value = this.settings.loop_count || 1;
      document.getElementById("settingLoopInterval").value = this.settings.loop_interval || 1.0;
      document.getElementById("settingMinimizeOnRun").checked = this.settings.minimize_on_run !== false;
      document.getElementById("settingFailsafe").checked = this.settings.failsafe !== false;
    }
  }

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove("active");
  }

  async saveGlobalSettings() {
    this.settings.loop_count = parseInt(document.getElementById("settingLoopCount").value) || 1;
    this.settings.loop_interval = parseFloat(document.getElementById("settingLoopInterval").value) || 1.0;
    this.settings.minimize_on_run = document.getElementById("settingMinimizeOnRun").checked;
    this.settings.failsafe = document.getElementById("settingFailsafe").checked;

    if (this.api) {
      await this.api.save_settings(this.settings);
    }
    this.closeModal("settingsModal");
    this.showToast("⚙️ 设置已保存", "success");
  }

  // ==================== Logging & Toasts ====================
  appendLog(level, message, timeStr) {
    const consoleEl = document.getElementById("logConsole");
    if (!consoleEl) return;

    const time = timeStr || new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-badge ${level}">${level}</span>
      <span class="log-text">${this.escapeHtml(message)}</span>
    `;
    consoleEl.appendChild(entry);

    const autoScroll = document.getElementById("autoScrollCheck");
    if (autoScroll && autoScroll.checked) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  clearLogs() {
    const consoleEl = document.getElementById("logConsole");
    if (consoleEl) consoleEl.innerHTML = "";
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==================== Event Listeners Binding ====================
  bindGlobalEvents() {
    // Toolbar buttons
    document.getElementById("btnNew").onclick = () => this.newWorkflow();
    document.getElementById("btnOpen").onclick = () => this.openWorkflow();
    document.getElementById("btnSave").onclick = () => this.saveWorkflow();
    document.getElementById("btnRun").onclick = () => this.startWorkflow();
    document.getElementById("btnPause").onclick = () => this.togglePause();
    document.getElementById("btnStop").onclick = () => this.stopWorkflow();
    document.getElementById("btnSnipGlobal").onclick = () => this.startSnipForCurrentStep();
    document.getElementById("btnSettings").onclick = () => this.openModal("settingsModal");
    document.getElementById("btnHelp").onclick = () => this.openModal("aboutModal");
    document.getElementById("btnClearLogs").onclick = () => this.clearLogs();
    document.getElementById("btnClearSteps").onclick = () => {
      if (confirm("确定要清空当前所有操作步骤吗？")) {
        this.workflow.steps = [];
        this.selectedStepIndex = -1;
        this.renderStepList();
        this.renderInspector();
        this.syncWorkflowToBackend();
      }
    };

    // Title edit
    const titleInput = document.getElementById("workflowTitleInput");
    if (titleInput) {
      titleInput.oninput = (e) => {
        this.workflow.name = e.target.value;
        this.syncWorkflowToBackend();
      };
    }

    // Keyboard shortcuts inside webview
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        this.saveWorkflow();
      } else if (e.ctrlKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        this.openWorkflow();
      } else if (e.ctrlKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        this.newWorkflow();
      } else if (e.key === "F8") {
        e.preventDefault();
        this.startWorkflow();
      } else if (e.key === "F9") {
        e.preventDefault();
        this.togglePause();
      } else if (e.key === "F10") {
        e.preventDefault();
        this.stopWorkflow();
      } else if (e.key === "F7") {
        e.preventDefault();
        this.startSnipForCurrentStep();
      }
    });

    // Native mouse position tracker in frontend
    window.addEventListener("mousemove", (e) => {
      this.updateCursorPos(e.screenX, e.screenY);
    });
  }
}

// Global App Instance
const PixelMimicApp = new PixelMimicController();
window.PixelMimic = PixelMimicApp;
