---
name: wms-frontend
description: 按本仓库的页面结构、PageManager、公共组件、字段类型、CommonOptions、样式复用和 Git 提交约定开发或修改 WMS Web 前端。处理本项目 HTML、CSS、JavaScript 页面，新建或重构 WMS 页面，以及审查页面规范时使用。
---

# WMS 前端页面开发规范

在改动前先检查同类页面与公共实现。用户明确要求与本规范冲突时，服从用户要求并在交付说明中指出偏差。

## 页面结构

- 使用 `<!DOCTYPE html>`、`lang="zh-CN"`、UTF-8 和 viewport。
- 标题使用 `冷丰WMS - 页面名称`。
- 引入 `css/common.css`、`css/components.css`；页面专有且复杂的样式拆到独立 CSS。
- 保留 `sidebar-container`、`header-container`、`.container > main.main-content`。
- 按顺序引入 `js/common.js`、`js/pagination.js`、`js/form-utils.js`、`js/modal-manager.js`、`js/page-manager.js`。
- 不要在 HTML 中手写仓库选择、Toast、删除确认、新增或编辑模态框；使用公共脚本或 `PageManager` 注入。

## PageManager

- 用 `fields` 驱动新增/编辑模态框；按需配置 `entityName`、`statusColumnIndex`、`customSelects`、`addModal`、`editModal`、`deleteModal`。
- 将行操作逻辑放入 `onSave`、`mapRowToForm` 等相关回调。
- 支持的字段类型包括 `text`、`number`、`select`、`textarea`、`radio`、`triple-input`、`raw`；谨慎使用 `raw`。
- `editDisabled` 只禁用编辑态，`disabled` 同时禁用新增和编辑态。
- 优先复用 `CommonOptions.warehouse`、`isEnabled`、`lpnStatus`、`lpnType`、`manageMode`、`sourceTrigger`、`company`、`profile`；通用新选项补入 `CommonOptions`，不要散落硬编码。
- 新增通过 `addModal.triggerBtnId` 关联；编辑、删除优先使用 PageManager 内置行为。

## 复用与样式

- 公共逻辑留在公共脚本，页面特定逻辑留在页面脚本。
- 先复用现有 class、表单校验、模态框和 Toast；多页面重复逻辑抽成公共函数。
- 保持标签宽度、间距、字号与既有页面一致。

## 验证

完成页面后至少检查：

1. 标准容器与公共脚本完整且顺序正确。
2. 新增、编辑、删除、搜索、分页链路可用。
3. 没有重复手写共享组件。
4. 字段类型、必填、禁用语义正确。
5. 样式和逻辑已尽量复用公共实现。

## Git 提交

- 提交前查看 `git status` 与 `git diff --staged`，基于真实暂存内容编写说明。
- 标题写 `<type>: <业务同事能看懂的中文概述>`，type 使用 `feat`、`fix`、`refactor`、`style`、`docs` 或 `chore`。
- 改动页面时，正文每页一行：`- <页面中文名>: <用户可感知变化>`；弹窗、抽屉、Tab 的变化也必须写。全局改动可写 `- 通用: ...`。
- 合并到 `main` 并推送后，用中文说明来源分支、1～3 个核心变化和关键文件；无差异也说明原因。
