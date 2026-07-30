---
id: 002
title: E2E 自动化测试环境搭建
status: active
created: 2026-07-05
updated: 2026-07-05
---

# E2E 自动化测试环境搭建

## 概述

搭建 Playwright E2E 测试环境，确保所有依赖安装完毕、测试能独立运行、符合 `docs/standards/testing.md` 规范。

## 前置条件

| 依赖 | 要求 | 检查命令 |
|------|------|---------|
| Node.js | >= 18 | `node --version` |
| npm | >= 9 | `npm --version` |
| Flask API | 运行在 localhost:5000 | `curl http://localhost:5000/routes` |
| Angular Dev Server | 运行在 localhost:4200 | `curl http://localhost:4200` |
| MySQL | 运行中，student_db 存在 | `mysql -u root -p -e "USE student_db; SHOW TABLES;"` |

## 功能点

### 环境安装
- [x] 安装 e2e 依赖：`cd e2e && npm install`
- [x] 安装 Playwright 浏览器：`npx playwright install chromium`
- [ ] 安装系统依赖（如需要）：`npx playwright install-deps`（需要 sudo 密码，暂未执行）
- [x] 验证 Playwright 版本：`npx playwright --version`

### 目录结构（按 testing.md 标准）
- [x] 创建 `e2e/tests/helpers/` 目录
- [x] 创建 `e2e/tests/helpers/test-data.ts` — 集中测试数据
- [x] 创建 `e2e/tests/pages/` 目录
- [x] 创建 `e2e/tests/pages/login.page.ts` — 登录页 Page Object
- [x] 创建 `e2e/tests/pages/scores.page.ts` — 学生成绩页 Page Object

### Playwright 配置更新
- [x] 更新 `playwright.config.ts`：添加 screenshot/video/trace 配置
- [x] 更新 `playwright.config.ts`：添加 HTML reporter
- [x] 确认 baseURL 和 apiURL 正确

### 测试用例（基础冒烟测试）
- [x] `login.spec.ts` — 登录页加载
- [x] `login.spec.ts` — 正确凭证登录成功
- [x] `login.spec.ts` — 错误凭证显示提示
- [x] `login.spec.ts` — 不存在用户显示提示
- [x] `login.spec.ts` — 空表单按钮禁用
- [x] `students.spec.ts` — 成绩页加载显示学生姓名
- [x] `students.spec.ts` — 表格显示成绩行
- [x] `students.spec.ts` — 搜索过滤科目
- [x] `students.spec.ts` — 登出跳转登录页

### 测试数据准备
- [x] 数据库有测试学生账号（S1001/pass123）
- [x] 该学生有 3 条成绩记录
- [x] `test-data.ts` 中定义测试数据常量

### 验证
- [x] 所有 9 个测试通过：`cd e2e && npx playwright test`（14.3s）
- [x] HTML 报告正常生成
- [x] 失败用例有截图、视频和 trace

## 不做（明确排除）

- 不写老师/管理员相关 E2E（001 还没做完）
- 不做 CI/CD 集成（先本地跑通）
- 不做性能/压力测试
- 不测试 Excel 导入功能

## 技术约束

- 浏览器：仅 Chromium（`playwright.config.ts` 已配置）
- 测试命令：`cd e2e && npx playwright test`
- UI 调试：`cd e2e && npx playwright test --ui`
- 遵循 `docs/standards/testing.md` 中的 Page Object 模式和命名规范

## 变更记录

| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本 | 搭建 E2E 测试环境需求 |
