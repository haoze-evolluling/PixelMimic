# PixelMimic (像素拟人)

> 所见即达，一触即成 —— 基于 Python、Vue 3、PyWebView 与 OpenCV 的现代化极简易用桌面端可视化自动化操作软件。

![PixelMimic](https://img.shields.io/badge/Python-3.10%2B-blue.svg)
![Vue](https://img.shields.io/badge/Frontend-Vue%203-42b883.svg)
![Vite](https://img.shields.io/badge/Tooling-Vite-646cff.svg)
![PyWebView](https://img.shields.io/badge/GUI-PyWebView-green.svg)
![OpenCV](https://img.shields.io/badge/Vision-OpenCV-orange.svg)
![License](https://img.shields.io/badge/License-MIT-purple.svg)

---

## 🌟 核心特性

1. **现代化 Vue 3 组件化架构与专业图标体系**
   - 前端采用 **Vue 3 (Composition API `<script setup>`) + Vite** 现代化工程化架构，响应式双向数据流。
   - 全面引入统一的 **Lucide 专业矢量图标体系**（彻底替代各系统不一致的 Emoji），界面精致、质感专业。

2. **零门槛极简易懂 · 积木式流程编排**
   - 语义化自然语言描述每一步操作（如“在屏幕上找到 [目标图片] 并 单击鼠标左键”、“输入文字 '你好'”）。
   - 常用操作一键添加（找图点击、坐标点击、输入文字、组合快捷键、等待延时、鼠标拖拽、鼠标长按、等待图像等）。
   - 步骤卡片支持鼠标直接上下拖拽调序、启用/禁用开关、单步即时测试与复制。
   - 新建空白流程时配备 3 步新手向导与一键新手示例载入。

3. **渐进式属性配置 (Progressive Disclosure)**
   - 核心配置清晰直观（如按 F7 截取目标图片），高级算法参数（相似度阈值、多尺度自适应、灰度模式、失败策略、前后延时等）默认折叠并配置最佳默认值。

4. **图像识别与屏幕匹配引擎**
   - **轻量全屏截屏取样器 (F7)**：多显示器虚拟桌面覆盖、半透明遮罩、十字准星与 4x 像素放大镜（实时查看光标坐标与 RGB 颜色）。
   - **OpenCV 模板匹配**：支持置信度阈值微调、多尺度自适应（应对 Windows 高分屏 DPI 缩放）。
   - **即时屏幕匹配测试**：在面板一键测试当前屏幕是否存在目标，并在屏幕上闪烁红框高亮显示匹配区域与置信度。

5. **安全与调度控制**
   - **全局后台热键**：
     - `F8`: 启动执行工作流
     - `F9`: 暂停 / 继续执行
     - `F10`: 紧急强制终止
     - `F7`: 快速唤起全屏截屏取样
   - **循环调度与安全保护**：支持指定循环次数或无限循环，支持 PyAutoGUI 鼠标移至屏幕四角急停 (FailSafe)。

6. **便携工作流与前后端解耦架构**
   - 工作流保存为 `.pmflow`（JSON 格式），目标截图自动压缩嵌入为 Base64，跨电脑即开即用。
   - 前后端通过 `window.pywebview.api` 和异步事件流通信，渲染引擎采用 Windows 原生 Edge WebView2，性能轻快、颜值出众。

---

## 🛠️ 安装与运行

### 1. 安装 Python 依赖
确保已安装 Python 3.10+ 环境，在项目根目录下运行：

```bash
pip install -r requirements.txt
```

### 2. 前端开发与构建（可选）
前端位于 `frontend/` 目录：

```bash
cd frontend
npm install      # 安装依赖
npm run build    # 编译打包至 pixelmimic/gui/web/dist
```

### 3. 启动应用
- **方式一（推荐，一键启动）**：双击运行项目根目录下的 `start.bat`
- **方式二（命令行启动）**：
  ```bash
  python main.py
  ```

---

## 📂 项目结构

```
PixelMimic/
├── start.bat                # Windows 一键启动脚本
├── main.py                  # 应用程序启动入口 (PyWebView)
├── requirements.txt         # Python 核心依赖清单
├── README.md                # 项目文档
├── frontend/                # Vue 3 现代化前端源码
│   ├── package.json         # 前端依赖配置 (Vue 3, Lucide, Vite)
│   ├── vite.config.js       # Vite 配置文件
│   ├── index.html           # 前端 SPA 页面模板
│   └── src/                 # 前端源码
│       ├── main.js          # Vue 入口文件
│       ├── App.vue          # 根组件
│       ├── components/      # SFC 业务组件 (HeaderBar, ActionPalette, ConsoleLogs 等)
│       │   ├── canvas/      # 画布子组件 (连线层 CanvasEdges / 工具栏 / 引导页)
│       │   └── inspector/   # 步骤属性面板分区组件 (按动作类型一区一件)
│       ├── composables/     # 组合式状态服务 (useWorkflow 门面, useCanvasViewport 等)
│       │   └── workflow/    # 工作流状态模块 (store / stepFactory / stepCrud / IO / tools)
│       ├── utils/           # 纯逻辑工具 (edgeRouting/ 连线路由, actionCatalog 动作元数据)
│       └── assets/          # 样式与主题变量
├── pixelmimic/
│   ├── core/                # 核心引擎与数据模型
│   │   ├── models.py        # StepNode, Workflow, ActionType 等数据模型
│   │   ├── matcher.py       # OpenCV 图像识别与多尺度匹配引擎
│   │   ├── mouse_keyboard.py# 键鼠底层驱动 (PyAutoGUI / 剪贴板 / 平滑移动)
│   │   ├── engine.py        # 多线程执行引擎与事件回调系统
│   │   ├── hotkeys.py       # pynput 全局热键监听器 (F7/F8/F9/F10)
│   │   └── actions/         # 模块化动作处理器 (Mouse, Image, Keyboard, Flow)
│   ├── gui/                 # PyWebView 桌面界面
│   │   ├── api/             # Python-JS 通信桥梁控制器 (base + 文件IO/执行/视觉 Mixin)
│   │   ├── screen_snipper.py# 独立全屏截图取样器 (十字线+4x放大镜)
│   │   ├── match_highlighter.py # 屏幕匹配红框闪烁高亮器
│   │   └── web/             # 前端运行时与分发资源
│   │       └── dist/        # Vue 3 编译输出产物 (生产环境直接加载)
│   └── utils/
│       ├── image_utils.py   # PIL / OpenCV / Base64 图像转换工具
│       ├── dpi_utils.py     # Windows 高 DPI 坐标转换
│       └── serializer.py    # JSON / .pmflow 序列化
└── tests/                   # 自动化单元测试
    ├── test_models.py
    ├── test_matcher.py
    ├── test_engine.py
    ├── test_serializer.py
    └── test_api.py
```

---

## 🚀 快速上手

1. **新建步骤**：点击上方常用操作按钮（如“找图点击”）。
2. **截取目标**：点击右侧面板的 **“截取目标图片 (F7)”**，拖拽框选要点击的按钮，释放即可完成取样。
3. **测试匹配**：点击 **“测试匹配”**，屏幕上将闪烁红框提示识别到的位置与相似度。
4. **运行流程**：点击顶部绿色 **“启动运行 (F8)”**，即可全自动执行。
5. **保存分享**：点击 **“保存”**，导出为 `.pmflow` 文件。

---

## 📄 开源许可
MIT License.
