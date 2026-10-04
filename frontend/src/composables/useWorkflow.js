/**
 * useWorkflow.js
 * 工作流状态与操作的统一门面（Facade）。
 *
 * 内部实现按职责拆分于 ./workflow/ 目录：
 * - workflowStore  核心状态单例（workflow / 选中步骤 / 边样式 / 防抖同步）
 * - stepFactory    新建节点的默认值工厂与智能摆放
 * - useStepCrud    步骤增删改 / 画布连线 / 节点排版
 * - useWorkflowIO  文件生命周期（新建 / 打开 / 保存 / 示例模板）
 * - useStepTools   截屏取样 / 匹配测试 / 坐标拾取 / 单步测试
 */
import { useWorkflowStore } from './workflow/workflowStore'
import { useStepCrud } from './workflow/useStepCrud'
import { useWorkflowIO } from './workflow/useWorkflowIO'
import { useStepTools } from './workflow/useStepTools'

// 模块级单例工作流（导出仅供 devMock 在纯浏览器调试时注入数据）
export { workflow } from './workflow/workflowStore'

export function useWorkflow() {
  return {
    ...useWorkflowStore(),
    ...useStepCrud(),
    ...useWorkflowIO(),
    ...useStepTools(),
  }
}
