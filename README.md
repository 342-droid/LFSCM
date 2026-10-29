# 冷丰供应链 · 主数据原型

从 [LFerp](../LF) 拆出的**供应链菜单独立项目**，仅包含顶部「供应链」下的页面、脚本、样式与 PRD 文档。

## 菜单

| 分组 | 页面 | 原型 |
|------|------|------|
| 商品主数据 | 商品分类 | `SCM/master_data_product_category.html` |
| 商品主数据 | 商品品牌 | `SCM/master_data_product_brand.html` |
| 商品主数据 | 配料类别 | `SCM/master_data_ingredient_category.html` |
| 商品主数据 | 基础商品库 | `SCM/master_data_product_library.html` |
| 供应链管理 | 供应商档案 | `SCM/master_data_supplier.html` |
| 供应链管理 | 合规模板 | `SCM/master_data_compliance_template.html` |
| 供应链管理 | 新建/编辑合规模板 | `SCM/master_data_compliance_template_form.html` |
| 供应链管理 | 产品合规档案 | `SCM/master_data_compliance_dossier.html` |
| 供应链管理 | 新建/编辑合规档案 | `SCM/master_data_compliance_dossier_form.html` |
| 供应链管理 | 供货关系 | `SCM/master_data_supply.html` |

入口：根目录 `index.html` → 商品分类。

## 文档（PRD）

见 `docs/`：

- 商品分类 / 商品品牌 / 配料类别 / 基础商品库 / 供应商档案 / 供货关系 / [产品合规档案](docs/产品合规档案.md)

## 团队规范

- 给人看的权威文档：`docs/team-rules/`（编辑页布局、B 端业务提示、提交信息与更新日志等）
- Cursor Agent 自动执行镜像：`.cursor/rules/`（`.mdc`）
- 供应链 / 页面开发 Skill：`.cursor/skills/SCM/SKILL.md`、`.agents/skills/scm-frontend/`
- 仓库级摘要：`AGENTS.md`
- 可选：`git config core.hooksPath .githooks`（提交时追加暂存区 diff 统计）

## 本地预览

默认端口 **5174**（避免与主仓 LFerp 的 5173 冲突）。

```bash
npm run preview
```

打开示例：

- http://localhost:5174/
- http://localhost:5174/SCM/master_data_product_category
- http://localhost:5174/SCM/master_data_product_library.html

## 目录结构

```
SCM/          页面 HTML
js/           业务脚本 + 公共 common / path-prefix
css/          公共与页面样式
image/        顶栏 / 侧栏图标
user-app/     分类与商品演示图
docs/         PRD
tools/        静态预览服务
```

## 说明

- 顶栏仅保留「供应链」；侧栏仍为「商品主数据 / 供应链管理」两组。
- 与主仓 LFerp **不共享运行时**；后续若主仓有改动，需自行对照同步。
- 本仓库从 LFerp `342-test` / `main` 上供应链相关提交拆出，便于单独评审与交付。
