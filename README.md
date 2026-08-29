<div align="center">

<img src="icon/pixelmimic.png" alt="PixelMimic" width="96" height="96" />

# PixelMimic（像素拟人）

**所见即达，一触即成**

基于 Python + Vue 3 + PyWebView + OpenCV 的 Windows 桌面端可视化自动化操作软件

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Vue](https://img.shields.io/badge/Frontend-Vue%203-42b883.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Tooling-Vite-646cff.svg)](https://vitejs.dev/)
[![PyWebView](https://img.shields.io/badge/GUI-PyWebView-2a9d8f.svg)](https://pywebview.flowrl.com/)
[![OpenCV](https://img.shields.io/badge/Vision-OpenCV-ff6f00.svg)](https://opencv.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078d6.svg)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

</div>

---

## 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [环境要求](#环境要求)
- [安装与运行](#安装与运行)
- [快速上手](#快速上手)
- [动作类型清单](#动作类型清单)
- [全局热键](#全局热键)
- [画布操作手册](#画布操作手册)
- [项目结构](#项目结构)
- [架构设计](#架构设计)
- [开发指南](#开发指南)
- [打包发布](#打包发布)
- [工作流文件格式](#工作流文件格式)
- [全局设置](#全局设置)
- [常见问题](#常见问题)
- [路线图](#路线图)
- [开源许可](#开源许可)

---

## 项目简介

PixelMimic 是一款面向 Windows 的**可视化桌面自动化编排工具**。不需要写一行代码，用「截图取样 → 识别定位 → 键鼠执行」的积木式流程，就能把重复的电脑操作固化成一条可复用、可分享的自动化流水线。

它的定位介于「按键精灵」与「n8n」之间：**既有图像识别驱动的桌面操作能力，也有节点连线式的流程编排体验**。

典型适用场景：

- 每日重复的办公软件操作（报表导出、数据搬运、批量录入）
- 客户端软件的自动化回归测试与冒烟测试
- 游戏 / 应用中的周期性点击任务
- 需要「等某个画面出现再操作」的条件化流程

---

## 核心特性

### 1. n8n 风格可视化编排画布

- **节点化编辑**：每个步骤是一张可自由拖拽的卡片，支持缩放、平移、自适应居中、一键智能排版（基于拓扑图自动分层对齐）。
- **端口连线**：**每张卡片都自带 True / False 双出口**，从端口拖出即自动按网格正交路由折线，分支能力内建于节点本身，无需额外的判断节点。
- **连线可编辑**：拖动折点调整走线，右键菜单支持自定义路由与重置。
- **右键菜单**：节点测试 / 复制 / 删除，连线分支解绑。
- **网格吸附**：拖拽与走线均按网格对齐，画布整洁。

### 2. 图像识别与屏幕匹配引擎

- **F7 全屏取样器**：多显示器虚拟桌面全覆盖、半透明遮罩、十字准星，配 4x 实时像素放大镜（显示光标绝对坐标与 RGB 值），框选即取样。
- **OpenCV 模板匹配**：三种匹配算法（`TM_CCOEFF_NORMED` / `TM_CCORR_NORMED` / `TM_SQDIFF_NORMED`），可设置信度阈值、灰度模式、多尺度自适应（应对 Windows 高分屏 DPI 缩放）、限定搜索区域 ROI。
- **即时匹配测试**：一键检测当前屏幕是否存在目标，命中区域以**闪烁红框**高亮并显示置信度。
- **坐标拾取器**：直接抓取当前鼠标位置填入坐标字段。

### 3. 积木式流程编排

- 13 类动作一键添加，语义化命名（如「找图点击」「输入文字 '你好'」）。
- 步骤卡片支持启用/禁用开关、单步即时测试、复制。
- 新手示例流程一键载入（等待 → 点击 → 输入 → 回车）。
- 空画布配 3 步新手引导。

### 4. 渐进式属性配置（Progressive Disclosure）

核心配置直观呈现，高级算法参数（相似度阈值、多尺度、灰度模式、失败策略、前后延时、重试次数与间隔）默认折叠并预置最佳实践值。新手不被参数淹没，高手随时下钻调参。

### 5. 流程控制与容错

**分支能力内建于每张卡片**：每个节点右侧都自带一绿一黄两个输出端口，直接拖线即可分支，无需额外的「if 节点」。**端口标签随节点类型自动切换**，语义不会混淆：

| 节点类型 | 上出口（绿） | 下出口（黄） | 判定时机 |
| --- | --- | --- | --- |
| 普通动作 | **成功** | **失败** | 事后判定（做完才知道） |
| 条件探查 | **True**（成立） | **False**（不成立） | 事前探查（不产生副作用） |

由此可以直接搭出这些常见结构：

- **失败重试**：把某步骤的「失败」端口连回它自己，失败即自动重来（连线标签显示「失败重试」）。
- **容错跳过**：「失败」端口连到后面的步骤，识别不到就跳过这段继续跑（标签显示「失败跳至 #N」）。
- **循环体**：「成功」端口回连到前面某步，构成循环（标签显示「跳至 #N」）。
- **流程终止**：删掉某步骤的「成功」连线，流程执行到此处即结束。

此外还支持：

- **条件探查节点**：只做探查、不改状态 —— 判断目标图像「存在 / 不存在」，两分支分别执行继续、跳转、跳过 N 步或停止。它与普通动作共用同一套模板匹配参数（相似度、灰度、多尺度、ROI）。
- **失败策略**：未连「失败」端口时，按全局策略处理 —— 失败即停 / 忽略继续。
- **循环调度**：指定循环次数（0 为无限循环）与轮次间隔。

### 6. 安全与调度控制

- **全局后台热键**（详见 [全局热键](#全局热键)）：F7 取样 / F8 启动 / F9 暂停·继续 / F10 紧急终止。
- **FailSafe 急停**：鼠标甩到屏幕四角立即中止执行（可在设置中关闭）。
- **运行时最小化**：启动执行后自动最小化窗口，避免干扰被操作界面。

### 7. 便携工作流与会话恢复

- 工作流保存为 `.pmflow`（JSON 格式），目标截图自动压缩内嵌为 Base64，**单文件跨电脑即开即用**。
- **编辑会话自动保存**（类 Word 恢复体验）：编辑状态节流写入本地缓存，异常退出或重启后自动还原上次编辑中的流程与文件路径。

### 8. 现代化前端工程

- Vue 3 Composition API（`<script setup>`）+ Vite 6，响应式数据流。
- 统一 **Lucide 矢量图标**体系（替代各系统渲染不一致的 Emoji）。
- 渲染引擎为 Windows 原生 **Edge WebView2**，体积轻、性能佳。

---

## 环境要求

| 项目 | 要求 | 说明 |
| --- | --- | --- |
| 操作系统 | Windows 10 / 11 | 依赖 Win32 API 做高 DPI 感知与窗口控制 |
| Python | **3.10 及以上**（强制） | 源码使用 `X \| None` 类型联合语法 |
| Node.js | 18 及以上 | **仅在需要自行构建前端时**需要 |
| WebView2 运行时 | Windows 10/11 通常已内置 | 安装包内置引导程序，缺失时自动安装 |
| Inno Setup 6 | 可选 | **仅在需要编译安装包时**需要 |

> 若你直接使用发布版安装包 / 免安装版，则无需安装 Python 与 Node.js。

---

## 安装与运行

### 方式一：源码运行（推荐开发使用）

```bash
# 1. 安装 Python 依赖
pip install -r requirements.txt

# 2. 启动应用（前端已预构建产物，可直接运行）
python main.py
```

也可以直接双击根目录的 **`start.bat`** —— 它会自动检测 Python 环境、静默安装依赖并启动应用。

### 方式二：免安装版

运行 `build_installer.bat` 后，取 `dist\PixelMimic\PixelMimic.exe`，拷贝整个 `PixelMimic` 文件夹即可在任意机器运行。

### 方式三：安装包

运行 `build_installer.bat` 后，取 `dist\installer\PixelMimicSetup-1.0.0.exe`，双击安装，自动创建开始菜单与桌面快捷方式。

---

## 快速上手

1. **添加步骤**：从左侧动作面板点击需要的操作（如「找图点击」），画布上出现一张节点卡片。
2. **截取目标**：选中节点，在右侧属性面板点击 **「截取目标图片 (F7)」**，拖拽框选屏幕上要点击的按钮，释放即完成取样。
3. **测试匹配**：点击 **「测试匹配」**，屏幕上会闪烁红框标出识别到的位置与相似度。识别不到就调低相似度阈值或开启多尺度。
4. **编排连线**（可选）：从节点右侧端口拖出连线到下一步节点。需要容错时，把该节点的**「失败」端口**（黄色）连到别处 —— 失败重试就连回自身，识别不到就跳过则连到后面的步骤。点击工具栏「一键智能排版」自动对齐。
5. **运行流程**：点击顶部 **「启动运行 (F8)」**，或直接按 F8。执行中可用 F9 暂停、F10 紧急终止。
6. **保存分享**：点击 **「保存」** 导出 `.pmflow` 文件，发给同事即可原样复现。

---

## 动作类型清单

`ActionType` 共定义 **16** 类动作，其中 **14** 类已实现处理器并注册，动作面板开放 **13** 类可直接新建（`ocr_click` 虽已注册，但属未接入引擎的插件骨架，故未开放）。

**分支不是某一种节点的专利** —— 每张卡片都自带 True / False 双出口，详见 [流程控制与容错](#5-流程控制与容错)。下表列出的是「做什么」，而「做完往哪走」由连线决定。

### 图像识别

| 动作 | 标识 | 说明 |
| --- | --- | --- |
| 找图点击 | `image_click` | 屏幕识别目标图像并自动点击 |
| 等待图像 | `image_wait` | 持续检测直到目标图像出现或消失（可设超时） |
| 图像拖拽 | `image_drag` | 识别目标图像后平滑拖拽至指定位置 |

### 鼠标操作

| 动作 | 标识 | 说明 |
| --- | --- | --- |
| 坐标点击 | `mouse_click` | 在指定坐标单击 / 双击 / 三击 / 右键 / 按下 / 抬起 |
| 鼠标滚轮 | `mouse_scroll` | 模拟滚轮向上或向下滚动指定格数 |
| 鼠标拖拽 | `mouse_drag` | 从起点坐标平滑拖拽至终点坐标 |
| 鼠标长按 | `mouse_longpress` | 在指定坐标按住鼠标保持指定秒数 |
| 鼠标移动 | `mouse_move` | 平滑移动光标至指定屏幕坐标 |

### 键盘操作

| 动作 | 标识 | 说明 |
| --- | --- | --- |
| 输入文字 | `type_text` | 逐字键入文本，或切换为剪贴板快速粘贴（兼容中文与特殊字符） |
| 组合快捷键 | `hotkey` | 触发 `Ctrl+C`、`Alt+F4` 等系统快捷键 |
| 单个按键 | `key_press` | 模拟按下 Enter / Esc / Tab / 空格等按键 |

### 流程控制

| 动作 | 标识 | 说明 |
| --- | --- | --- |
| 等待延时 | `wait_time` | 暂停执行指定秒数，或随机等待一个区间时长 |
| 条件探查 | `condition` | 只做探查、不产生副作用：判断目标图像在屏幕中「存在 / 不存在」，再决定走 True / False 哪个出口 |

### 扩展预留

| 动作 | 标识 | 状态 |
| --- | --- | --- |
| OCR 文字识别点击 | `ocr_click` | 处理器已注册，但为插件骨架 —— 需自行安装 OCR 引擎（如 RapidOCR / Tesseract）后接入生效，未开放到动作面板 |
| 窗口激活 / 前置 | `window_activate` | 仅枚举定义，无处理器实现 |
| 循环块 | `loop` | 仅枚举定义，无处理器实现。循环需求请用「成功端口回连」或工作流级循环次数表达 |

---

## 全局热键

热键由 `pynput` 全局监听，**应用最小化或失去焦点时依然生效**。

| 热键 | 功能 |
| --- | --- |
| `F7` | 唤起全屏截图取样器（框选目标区域） |
| `F8` | 启动执行当前工作流 |
| `F9` | 暂停 / 继续执行 |
| `F10` | 紧急强制终止 |
| 鼠标移至屏幕四角 | FailSafe 急停（可在设置中关闭） |

---

## 画布操作手册

| 操作 | 方式 |
| --- | --- |
| 平移画布 | 在空白处按住拖拽 |
| 缩放 | `Ctrl` + 滚轮，或工具栏放大 / 缩小 / 重置 100% |
| 自适应居中 | 工具栏「自适应居中」按钮 |
| 一键智能排版 | 工具栏高亮按钮，按拓扑层级自动分层对齐 |
| 移动节点 | 直接拖拽节点卡片 |
| 连接节点 | 从节点右侧端口拖出 → 依次点击网格点规划折线 → 点击目标节点的输入端口完成 |
| 分支连线 | **每张卡片都有一绿一黄两个输出端口**（上绿下黄），分别连到不同后继节点。标签随类型切换：普通节点显示「成功 / 失败」，条件探查节点显示「True / False」 |
| 失败重试 | 将某步骤的「失败」端口连回它自身，失败即自动重来（连线显示「失败重试」） |
| 流程终止 | 右键 True 连线选择断开，该步骤执行后流程即终止 |
| 编辑连线 | 拖动连线上的折点调整走线；右键连线可自定义路由或重置 |
| 节点菜单 | 右键节点：单步测试 / 复制 / 删除 |
| 连线解绑 | 右键连线，选择断开分支 |
| 清空画布 | 工具栏「清空」（带二次确认） |

---

## 项目结构

```
PixelMimic/
├── main.py                      # 应用启动入口（PyWebView 窗口 + 关闭时刷写会话缓存）
├── start.bat                    # Windows 一键启动脚本（检测环境 → 装依赖 → 启动）
├── build_installer.bat          # 一键打包：测试 → 前端构建 → PyInstaller → Inno Setup
├── requirements.txt             # Python 依赖清单
├── icon/                        # 图标源文件（SVG 矢量源 + PNG 位图）
├── packaging/                   # 打包发布配置
│   ├── pixelmimic.spec          # PyInstaller 打包规格
│   ├── pixelmimic.iss           # Inno Setup 安装脚本
│   ├── make_icon.py             # SVG/PNG → .ico 图标生成
│   ├── pixelmimic.ico           # 应用图标（构建期生成）
│   └── MicrosoftEdgeWebview2Setup.exe  # WebView2 运行时引导程序
├── frontend/                    # Vue 3 前端源码
│   ├── package.json             # 依赖：Vue 3.5 + lucide-vue-next + Vite 6
│   ├── vite.config.js           # 构建产物直出到 pixelmimic/gui/web/dist
│   └── src/
│       ├── main.js              # 前端入口
│       ├── devMock.js           # ?mock=1 时注入示例流程，纯浏览器调试画布
│       ├── App.vue              # 根组件（三栏布局）
│       ├── components/
│       │   ├── HeaderBar.vue        # 顶栏：运行控制 / 文件操作 / 设置 / 关于
│       │   ├── ActionPalette.vue    # 左侧动作面板（按分类）
│       │   ├── WorkflowCanvas.vue   # 中央编排画布（拖拽/连线/缩放）
│       │   ├── CanvasNode.vue       # 节点卡片
│       │   ├── Inspector.vue        # 右侧属性面板
│       │   ├── ConsoleLogs.vue      # 底部执行日志控制台
│       │   ├── StatusBar.vue        # 状态栏（运行状态 / 实时光标坐标）
│       │   ├── SettingsModal.vue    # 全局设置
│       │   ├── AboutModal.vue       # 关于
│       │   ├── ConfirmDialog.vue    # 全局确认弹窗
│       │   ├── ToastContainer.vue   # 全局轻提示
│       │   ├── canvas/              # 画布子组件
│       │   │   ├── CanvasEdges.vue      # 连线渲染层
│       │   │   ├── CanvasToolbar.vue    # 缩放 / 自适应 / 一键排版 / 清空
│       │   │   ├── CanvasOnboarding.vue # 空画布新手引导
│       │   │   ├── NodeContextMenu.vue  # 节点右键菜单
│       │   │   └── EdgeContextMenu.vue  # 连线右键菜单
│       │   └── inspector/           # 按动作类型拆分的属性分区（一区一件）
│       ├── composables/
│       │   ├── useWorkflow.js       # 工作流状态门面
│       │   ├── useExecution.js      # 执行状态与后端事件订阅
│       │   ├── usePyWebView.js      # 后端 API 桥接（含降级处理）
│       │   ├── useSettings.js       # 全局设置
│       │   ├── useTheme.js          # 主题
│       │   ├── useToast.js / useConfirm.js / useInspectorStep.js
│       │   ├── useCanvasViewport.js # 画布缩放与平移
│       │   ├── useNodeHeights.js    # 动态节点高度测量（端口对齐用）
│       │   └── workflow/            # store / stepFactory / stepCrud / IO / tools
│       └── utils/
│           ├── actionCatalog.js     # 动作元数据单一数据源（分类/名称/图标/描述）
│           ├── canvasPorts.js       # 端口坐标计算（含 True/False 双出口）
│           ├── graphLayout.js       # 拓扑自动排版
│           └── edgeRouting/         # 正交网格连线路由、折点编辑与标签
├── pixelmimic/                  # Python 后端
│   ├── core/
│   │   ├── models.py            # StepNode / Workflow / 各类枚举与序列化
│   │   ├── engine.py            # 多线程执行引擎（跳转 / 条件 / 失败分支 / 循环）
│   │   ├── matcher.py           # OpenCV 多尺度模板匹配引擎
│   │   ├── mouse_keyboard.py    # PyAutoGUI 键鼠驱动 + 剪贴板 + 平滑移动
│   │   ├── hotkeys.py           # pynput 全局热键管理
│   │   ├── sample_workflow.py   # 内置新手示例流程
│   │   └── actions/             # 13 个动作处理器 + 注册表（支持自定义注册）
│   ├── gui/
│   │   ├── api/                 # Python↔JS 桥接层（base + 文件IO/执行/视觉 Mixin）
│   │   ├── screen_snipper.py    # F7 全屏取样器（十字线 + 4x 放大镜）
│   │   ├── match_highlighter.py # 匹配结果红框闪烁高亮
│   │   └── web/dist/            # 前端构建产物（运行时直接加载）
│   └── utils/
│       ├── image_utils.py       # PIL / OpenCV / Base64 图像转换
│       ├── dpi_utils.py         # Windows 高 DPI 感知与坐标换算
│       ├── serializer.py        # .pmflow 序列化与反序列化
│       └── session_cache.py     # 编辑会话自动保存与恢复
└── tests/                       # pytest 单元测试（6 个模块 / 22 个用例）
    ├── test_models.py           # 数据模型与序列化
    ├── test_matcher.py          # 图像匹配
    ├── test_engine.py           # 执行引擎
    ├── test_serializer.py       # 工作流序列化
    ├── test_session_cache.py    # 会话缓存
    └── test_api.py              # 前后端桥接 API
```

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│  Vue 3 前端 (WebView2)                                       │
│  ActionPalette │ WorkflowCanvas │ Inspector │ ConsoleLogs    │
└───────────────┬─────────────────────────────────────────────┘
                │  window.pywebview.api.*     调用（Promise）
                │  window.PixelMimic.onBackendEvent()  事件回调
┌───────────────┴─────────────────────────────────────────────┐
│  PyWebViewApi（Mixin 组合）                                  │
│  ├─ WorkflowFilesMixin   new/open/save/save_as/update/sample │
│  ├─ ExecutionMixin       start/toggle_pause/stop/test_step   │
│  └─ VisionMixin          start_snip/test_match/pick_position │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────┐
│  ExecutionEngine（独立线程）                                 │
│  ├─ ActionRegistry → 14 类动作处理器                          │
│  ├─ ImageMatcher（OpenCV） / InputDriver（PyAutoGUI）         │
│  └─ 事件广播：log / step_start / step_end / state / finished  │
└─────────────────────────────────────────────────────────────┘
```

**前后端通信要点**

- 前端通过 `window.pywebview.api.<method>()` 调用 Python 方法，返回 Promise。
- 后端通过 `window.evaluate_js()` 推送 `window.PixelMimic.onBackendEvent(name, payload)` 异步事件（执行日志、步骤状态、截图完成、执行结束等）。
- `PyWebViewApi` 中所有内部状态属性**必须以下划线 `_` 开头**，否则 PyWebView 的 JS 反射引擎会递归遍历并在 COM/.NET 对象上卡死。

---

## 开发指南

### 前端开发

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物输出到 pixelmimic/gui/web/dist
```

**纯浏览器调试模式**：访问 `http://localhost:5173/?mock=1` 会注入一份示例流程（含条件探查节点与分支连线），无需启动 Python 后端即可调试画布、连线与标签渲染。

> 注意：`npm run dev` 时后端 API 不可用，仅用于 UI 调试；完整功能需 `npm run build` 后通过 `python main.py` 运行。

### 运行测试

```bash
pytest tests -q
```

当前覆盖：数据模型、图像匹配、执行引擎、序列化、会话缓存、桥接 API，共 6 个模块 22 个用例。

### 新增一个动作类型

1. 在 `pixelmimic/core/models.py` 的 `ActionType` 枚举中新增标识。
2. 在 `pixelmimic/core/actions/` 下新建处理器，继承 `BaseAction` 并实现 `execute_core()`。
3. 在 `pixelmimic/core/actions/__init__.py` 的 `ActionRegistry._registry` 中注册。
4. 在 `frontend/src/utils/actionCatalog.js` 中补充元数据（分类、名称、图标、描述）—— 该文件是动作元数据的**单一数据源**，动作面板、节点卡片与属性面板均从此派生。
5. 如需专属配置项，在 `frontend/src/components/inspector/` 新增分区组件并挂到 `Inspector.vue`。
6. 补齐 `tests/` 中对应的单元测试。

---

## 打包发布

```bash
build_installer.bat
```

脚本共 7 步，全自动化：

| 步骤 | 内容 |
| --- | --- |
| 0/7 | 前置检查：Python、Node.js、Inno Setup 6 |
| 1/7 | 准备隔离构建虚拟环境 `.venv-build` |
| 2/7 | 安装依赖与 PyInstaller |
| 3/7 | **跑单元测试，失败即中止构建** |
| 4/7 | 构建前端（`npm run build`） |
| 5/7 | 精简依赖后 PyInstaller 冻结（见下方说明） |
| 6/7 | 下载 WebView2 运行时引导程序（约 2 MB，仅首次） |
| 7/7 | Inno Setup 编译安装包 |

产出：

- **免安装版**：`dist\PixelMimic\PixelMimic.exe`
- **安装包**：`dist\installer\PixelMimicSetup-1.0.0.exe`

**打包中的两个关键处理（改动前请先读注释）**

- 打包前会卸载 `opencv-python` 并换装 `opencv-python-headless`，剔除用不到的 Qt GUI DLL 以缩减体积。因两者共享 `cv2/` 目录，必须使用 `--force-reinstall --no-deps`，否则普通安装会是空操作。
- `PyInstaller` **不要加 `--clean`**：冷重建会丢失 `pixelmimic/gui/web/dist` 的打包数据文件。保留 workpath 缓存既能保证数据完整，也能加快重建。

---

## 工作流文件格式

`.pmflow` 是纯 JSON 文件，UTF-8 编码，结构如下：

```json
{
  "id": "工作流 UUID",
  "name": "新工作流",
  "description": "流程描述",
  "version": "1.0.0",
  "loop_count": 1,
  "loop_interval": 1.0,
  "stop_on_error": true,
  "steps": [
    {
      "id": "步骤 UUID",
      "name": "找图点击",
      "action_type": "image_click",
      "enabled": true,
      "image_base64": "iVBORw0KGgoAAA...",
      "confidence": 0.8,
      "match_method": "TM_CCOEFF_NORMED",
      "use_grayscale": true,
      "multi_scale": false,
      "pre_delay": 0.0,
      "post_delay": 0.2,
      "retry_count": 1,
      "on_failure": "stop",
      "next_action": "continue",
      "node_x": 100,
      "node_y": 160
    }
  ]
}
```

**关键字段说明**

| 字段 | 说明 |
| --- | --- |
| `loop_count` | `1` 执行一次，`0` 无限循环，`N` 执行 N 次 |
| `image_base64` | 目标截图以 Base64 内嵌，单文件自包含，无需附带图片 |
| `confidence` | 匹配置信度阈值，识别不到可适当调低 |
| `multi_scale` | 多尺度匹配，高 DPI 缩放或跨分辨率场景下开启 |
| `search_roi` | 限定搜索区域 `[x, y, w, h]`，缩小范围可提速并减少误匹配 |
| `next_action` | `continue` 顺序执行 / `jump` 跳转到 `next_jump_step`（1-based）/ `stop` 结束 |
| `fail_action` | 失败分支，`jump` 时跳到 `fail_jump_step`（1-based） |
| `node_x` / `node_y` | 画布中的节点坐标，仅影响可视化布局 |

---

## 全局设置

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| `loop_count` | `1` | 循环次数，`0` 为无限 |
| `loop_interval` | `1.0` | 每轮循环之间的间隔秒数 |
| `minimize_on_run` | `true` | 启动执行时自动最小化窗口 |
| `failsafe` | `true` | 鼠标移至屏幕四角紧急中止 |

---

## 常见问题

**Q：按 F7 没有反应 / 热键失效？**

全局热键由 `pynput` 监听，需要应用主窗口已启动。若以管理员身份运行了目标程序而 PixelMimic 是普通权限，热键与模拟操作都会被 UAC 隔离 —— 请以相同权限级别运行两者（要么都普通，要么都管理员）。

**Q：识别不到目标图片？**

按以下顺序排查：

1. 点击「测试匹配」观察实际置信度，把阈值调到实测值以下（如 0.7）。
2. 开启「多尺度匹配」—— 目标程序 DPI 缩放与取样时不一致时必开。
3. 重新取样，框选区域尽量选**特征明显且唯一**的部分，避免大片纯色。
4. 取消勾选灰度模式（颜色是区分特征时）。
5. 设置 `search_roi` 缩小搜索范围，减少相似干扰。

**Q：跨分辨率 / 换电脑后匹配失败？**

开启多尺度匹配，并在目标机器上重新取样保存一份工作流。模板匹配对分辨率变化敏感是原理性限制。

**Q：中文输入乱码或漏字？**

将「输入文字」步骤的 `use_clipboard` 设为 `true`，走剪贴板粘贴路径，可正确处理中文与特殊字符。

**Q：启动报 `ModuleNotFoundError`？**

确认在项目根目录执行 `pip install -r requirements.txt`，且未被其他 Python 环境干扰（可用 `python -m pip` 指定解释器）。

**Q：窗口空白或界面加载不出来？**

缺少 WebView2 运行时。安装包会自动引导安装；手动可运行 `packaging\MicrosoftEdgeWebview2Setup.exe`。

**Q：编辑中的流程丢失了？**

编辑状态会自动缓存到本地（默认 `cache/session.json`，可用环境变量 `PIXELMIMIC_CACHE_DIR` 覆盖目录），重启后自动恢复。缩流写入有 2 秒节流间隔，窗口关闭时会强制刷写。

---

## 路线图

- [ ] 接入 OCR 引擎（RapidOCR / Tesseract），激活 `ocr_click`
- [ ] 窗口激活 / 前置动作 `window_activate`
- [ ] 步骤分组与子流程复用
- [ ] 执行录像与可视化回放
- [ ] 变量系统（步骤间传递识别到的文本与坐标）

---

## 开源许可

本项目基于 **MIT License** 开源，详见 [LICENSE](LICENSE)。

---

<div align="center">

**PixelMimic** · 所见即达，一触即成

</div>
