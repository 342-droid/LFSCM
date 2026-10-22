# 项目规则

以下规则适用于本仓库（冷丰供应链 · 主数据独立原型）。用户在当前任务中的明确要求优先。

## 编辑与配置页布局

新增或改造编辑页、配置页（包括新增、编辑、规则配置和说明编辑）时：

- 内容区使用 `width: 100%` 随屏宽自适应，不设置 760/820/960/1100 等较窄的固定 `max-width`。
- 取消、保存、重置等按钮放在固定于视口底部的操作栏；侧栏展开或收起时同步调整 `left`，内容区预留底部内边距避免遮挡。
- 引入 `css/lf-mdm-edit-page.css`，给 `main.main-content` 增加 class `mdm-edit-page`，底栏使用既有 footer class 或 `mdm-edit-page__footer`。
- 整页编辑字段行对齐与高度：使用 `pts-rule-card` / `pts-rule-field` / `erp-input` / `erp-select`（引入 `css/lf-mdm-points-rule.css`）。标签 168px 右对齐、`line-height: 36px`，输入框/下拉高度 36px。
- 仅当用户明确要求弹窗编辑、窄版表单或底栏随内容滚动时例外。
- 权威文档：`docs/team-rules/编辑页布局规范.md`

## B 端业务提示文案

页面级 / 区块级业务提示：引入 `css/lf-mdm-biz-tip.css`，容器使用 `class="mdm-biz-tip"`，强调词用 `<strong>`。权威文档：`docs/team-rules/B端业务提示文案样式规范.md`

## Git 提交与更新日志

- 每次提交标题使用 `<type>: <一句业务同事能看懂的中文概述>`；type 使用 `feat`、`fix`、`refactor`、`style`、`docs` 或 `chore`，描述业务变化而非技术实现。
- 改动涉及页面时，commit body 每个页面写一行：`- <页面中文名>: <这个页面上发生了什么变化，一句人话>`。
- 页面名取 `<title>` 中 ` - ` 后的名称；弹窗、抽屉和 Tab 内变化也必须写。同一页面多处变化用分号连接，不换行续写。
- 与具体页面无关的内容使用 `- 通用: <说明>` 或省略。
- 提交前必须查看 `git status` 和 `git diff --staged`，说明必须来自真实暂存差异。
- 详细权威规范见 `docs/team-rules/提交信息与更新日志规范.md`

## 供应链页面

- 本仓库仅含顶部「供应链」菜单：商品分类、商品品牌、配料类别、基础商品库、供应商档案、供货关系。
- 页面须保留 `sidebar-container`、`header-container`、`.container > main.main-content`；侧栏使用 `js/master-data-sidebar.js`。
- 单位枚举与一级分类「商品单位」配置见 `js/master-data-units.js` 与商品分类 PRD。
- 业务 PRD 在 `docs/`；团队协作规范在 `docs/team-rules/`；Cursor 自动执行镜像在 `.cursor/rules/`。

## 供应链 / 页面开发 Skill

开发或修改本仓库 HTML/CSS/JavaScript 页面时，遵循供应链前端规范（结构、PageManager、公共组件、样式复用与 Git 提交约定）：

- Cursor Skill：`.cursor/skills/SCM/SKILL.md`（可用 `$scm-frontend` / SCM skill）
- Agents Skill：`.agents/skills/scm-frontend/SKILL.md`

说明：本仓侧栏为供应链专用 `master-data-sidebar.js`，脚本栈以现有供应链页面为准；新建偏列表/CRUD 页时仍按 Skill 中的 PageManager 与公共组件原则对齐。可选启用提交钩子：`git config core.hooksPath .githooks`。
