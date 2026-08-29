/**
 * actionCatalog.js
 * 动作类型的单一数据源（Single Source of Truth）。
 *
 * 动作元数据（分类、名称、图标、描述）此前散落在 ActionPalette、CanvasNode、
 * useWorkflow 与 Inspector 四处重复维护；现统一收敛于此，各消费方按需派生。
 */
import {
  Crosshair,
  Eye,
  Move,
  MousePointer,
  Sliders,
  Timer,
  Navigation,
  Type,
  Zap,
  Command,
  Clock,
  Keyboard,
  GitBranch,
  Workflow as WorkflowIcon,
} from 'lucide-vue-next'

export const ACTION_CATEGORIES = [
  {
    id: 'image',
    name: '图像识别',
    icon: Crosshair,
    color: 'var(--cat-image)',
    actions: [
      { type: 'image_click', label: '找图点击', icon: Crosshair, desc: '屏幕识别目标图像并自动点击' },
      { type: 'image_wait', label: '等待图像', icon: Eye, desc: '持续检测直到目标图像出现或消失' },
      { type: 'image_drag', label: '图像拖拽', icon: Move, desc: '识别目标图像并平滑拖拽至指定位置' },
    ],
  },
  {
    id: 'mouse',
    name: '鼠标操作',
    icon: MousePointer,
    color: 'var(--cat-mouse)',
    actions: [
      { type: 'mouse_click', label: '坐标点击', icon: MousePointer, desc: '在指定屏幕坐标单击、双击或右键' },
      { type: 'mouse_scroll', label: '鼠标滚轮', icon: Sliders, desc: '模拟鼠标滚轮向上或向下滚动指定格数' },
      { type: 'mouse_drag', label: '鼠标拖拽', icon: Move, desc: '从起点坐标平滑拖拽至终点坐标' },
      { type: 'mouse_longpress', label: '鼠标长按', icon: Timer, desc: '在指定坐标按住鼠标保持指定秒数' },
      { type: 'mouse_move', label: '鼠标移动', icon: Navigation, desc: '平滑移动鼠标光标至指定屏幕坐标' },
    ],
  },
  {
    id: 'keyboard',
    name: '键盘操作',
    icon: Keyboard,
    color: 'var(--cat-keyboard)',
    actions: [
      { type: 'type_text', label: '输入文字', icon: Type, desc: '自动键入文本内容或通过剪贴板快速粘贴' },
      { type: 'hotkey', label: '组合快捷键', icon: Zap, desc: '触发 Ctrl+C、Alt+F4 等常用系统快捷键' },
      { type: 'key_press', label: '单个按键', icon: Command, desc: '模拟按下 Enter、Esc、Tab、空格等按键' },
    ],
  },
  {
    id: 'flow',
    name: '流程控制',
    icon: WorkflowIcon,
    color: 'var(--cat-flow)',
    actions: [
      { type: 'wait_time', label: '等待延时', icon: Clock, desc: '暂停执行指定秒数或随机等待时长' },
      // 条件节点在画布上固定用 --cat-condition（见 CanvasNode 的 categoryColor），
      // 面板图标色同步覆盖，避免"面板绿色、画布琥珀色"的割裂
      { type: 'condition', label: '条件探查', icon: GitBranch, color: 'var(--cat-condition)', desc: '判断目标图像在屏幕中是否存在，只探查不操作，再按结果分流' },
    ],
  },
]

const ACTION_MAP = new Map(
  ACTION_CATEGORIES.flatMap((cat) =>
    cat.actions.map((action) => [
      action.type,
      { ...action, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color },
    ])
  )
)

/**
 * 需要「目标图片 + 模板匹配参数」的动作类型。
 * condition 虽不是"找图并操作"，但条件判定走的也是同一套模板匹配
 * （引擎 ConditionAction 读 image_base64 / confidence / use_grayscale / multi_scale），
 * 因此一并归入。此数组同时决定三件事：
 *   1. 新建步骤时的 target_type 默认值（image vs coordinate）
 *   2. 属性面板「目标图像配置」区是否显示
 *   3. 属性面板高级区中「相似度 / 灰度 / 多尺度」匹配参数是否显示
 */
export const IMAGE_ACTION_TYPES = ['image_click', 'image_wait', 'image_drag', 'condition']

export const isImageActionType = (type) => IMAGE_ACTION_TYPES.includes(type)

export function getActionLabel(type) {
  return ACTION_MAP.get(type)?.label || '新步骤'
}

export function getActionIcon(type) {
  return ACTION_MAP.get(type)?.icon || null
}

export function getActionCategoryColor(type) {
  return ACTION_MAP.get(type)?.categoryColor || 'var(--cat-flow)'
}
