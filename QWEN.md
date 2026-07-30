# MFS - Student Management System

A monorepo for a student information management system.

## Project Structure

```
mfs/
├── api/          # Flask REST API backend (Python)
├── web/          # Angular 20 frontend (TypeScript)
├── e2e/          # Playwright end-to-end tests
└── db/           # MySQL database scripts
```

## Tech Stack

- **Backend**: Python/Flask, MySQL (mysql-connector-python), Pandas
- **Frontend**: Angular 20, Angular Material, TypeScript
- **Testing**: Playwright (E2E)
- **Database**: MySQL 8.0

## Commands

### API
- Run: `cd api && python run.py` (port 5000)
- Install deps: `cd api && pip install -r requirements.txt`

### Web
- Run: `cd web && ng serve` (port 4200)
- Install deps: `cd web && npm install`
- Build: `cd web && ng build`
- Add component: `cd web && ng generate component <name>`

### E2E
- Run tests: `cd e2e && npx playwright test`
- UI mode: `cd e2e && npx playwright test --ui`

### Database
- Import: `mysql -u root -p < db/students_db.sql`

## Git

- Default branch: `main`
- SSH remote: `git@github.com:JimmyHuang037/mfs.git`
- GitHub: https://github.com/JimmyHuang037/mfs

## Conventions

- Use `api/` for backend changes, `web/` for frontend, `e2e/` for tests
- Commit messages in English or Chinese
- .env file contains credentials, never commit it

## Coding Standards

All code changes MUST follow the standards defined in:

- **Flask API**: `docs/standards/api.md` — Blueprint structure, service layer, response format, error handling, database patterns
- **Angular Frontend**: `docs/standards/web.md` — standalone components, service patterns, model conventions, Material usage, routing

When adding new modules, follow the standard flow described in these files.

## 日志驱动开发

本项目采用日志驱动开发风格 — 代码里要有足够的日志，让 AI 出问题时能自己排查。

- **标准文档**: `docs/standards/logging.md` — 日志级别、格式、位置规范
- **开发日志**: 每次改代码必须在 `docs/dev-log.md` 追加记录（改了什么、为什么、bug 记录）

## 测试标准

所有功能必须有 E2E 测试覆盖，按标准编写：

- **标准文档**: `docs/standards/testing.md` — 命名规范、Page Object 模式、测试用例清单
- **覆盖范围**: 登录 + 学生 CRUD + 成绩操作

## 需求文档

需求按编号管理，每个需求一个文件：

- **需求索引**: `docs/requirements/README.md` — 所有需求列表 + 标准模板
- **需求标准**: `docs/standards/requirements.md` — 需求文件怎么写、命名、状态管理
- **当前需求**: `docs/requirements/001-student-mgmt-system.md` — 学生管理系统基础功能
- 新增需求时按编号递增创建文件，格式遵循 README.md 中的模板

## 数据库设计

- **设计标准**: `docs/standards/db-design.md` — DB 设计文档怎么写、命名规范、ER 图画法
- **设计文档**: `docs/db-design.md` — 当前表结构、ER 关系、已知问题、DDL 变更脚本
- 修改数据库前必须先更新设计文档，再写 SQL

## 标准自动进化

`docs/standards/` 下的所有标准文档是**活的**，必须随开发持续改进：

### AI 必须自动更新标准的情况

1. **发现新 pattern** — 开发中用了某种好的写法，标准里没覆盖 → 加进去
2. **发现坑** — 遇到 bug 是因为标准没写清楚 → 补充规则避免再犯
3. **讨论出新约定** — 和用户讨论后确定了更好的做法 → 更新标准
4. **标准过时** — 代码已经不用某种写法了 → 删掉或修改

### 更新流程

1. 改代码的同时，检查 `docs/standards/` 里对应的标准文件
2. 如果发现需要优化，**直接改标准文件**，不需要问用户
3. 在标准文件末尾的「变更记录」追加一行，说明改了什么、为什么改
4. 在 `docs/dev-log.md` 也记一条，标注「标准更新」

### 变更记录格式

每个标准文件末尾必须有：

```markdown
## 变更记录
| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本 | — |
| 2026-07-06 | 新增「禁止在 route 层写 SQL」规则 | 发现 route 层直接写 SQL 导致重复代码 |
```