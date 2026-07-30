# E2E 测试标准

> 核心原则：所有功能都要有 E2E 测试覆盖，测试要能独立运行，不依赖人工操作。

## 1. 文件结构

```
e2e/
├── tests/
│   ├── helpers/
│   │   └── test-data.ts        # 测试数据常量
│   ├── pages/
│   │   ├── login.page.ts       # 登录页 Page Object
│   │   └── students.page.ts    # 学生列表页 Page Object
│   ├── login.spec.ts           # 登录测试
│   ├── students.spec.ts        # 学生 CRUD 测试
│   └── scores.spec.ts          # 成绩操作测试
├── playwright.config.ts
└── package.json
```

## 2. 命名规范

| 类型 | 命名规则 | 例子 |
|------|---------|------|
| 测试文件 | `功能.spec.ts` | `login.spec.ts` |
| 测试用例 | `test('动词 + 对象 + 场景')` | `test('登录 - 正确用户名密码应成功')` |
| Page Object | `功能.page.ts` | `login.page.ts` |
| Page 类名 | `功能Page` | `LoginPage` |

### 测试用例命名格式

```
test('功能 - 操作 - 预期结果', async () => { ... })
```

例子：
- `test('登录 - 正确凭证 - 跳转到学生列表')`
- `test('登录 - 错误密码 - 显示错误提示')`
- `test('学生 - 新增 - 列表出现新记录')`
- `test('学生 - 删除 - 列表移除该记录')`
- `test('成绩 - 添加 - 表格显示新成绩')`

## 3. Page Object 模式

每个页面对应一个 Page Object 类，封装页面操作：

```typescript
// pages/login.page.ts
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  // 定位器
  get usernameInput() { return this.page.locator('input[formControlName=username]'); }
  get passwordInput() { return this.page.locator('input[formControlName=password]'); }
  get loginButton() { return this.page.locator('button[type=submit]'); }
  get errorMessage() { return this.page.locator('.error-message'); }

  // 操作
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async goTo() {
    await this.page.goto('/login');
  }
}
```

### 规则

- 定位器用 getter，不要硬编码在测试里
- 优先用 `formControlName`、`data-testid`、`role` 定位，少用 CSS 类名
- 一个 Page Object 对应一个路由/页面

## 4. 测试数据

```typescript
// helpers/test-data.ts
export const TEST_STUDENT = {
  id: '2024001',
  name: '测试学生',
  password: 'test123456',
  age: 20,
  gender: '男',
  major: '计算机科学与技术',
};

export const TEST_SCORE = {
  subject: '数学',
  score: 95,
  semester: '2024-2025-1',
};
```

### 规则

- 测试数据集中在 `helpers/test-data.ts`
- 不要在各 spec 文件里硬编码数据
- 每个测试用例结束要清理数据（删除测试创建的学生/成绩）

## 5. 测试用例清单

### 登录（login.spec.ts）

| 用例 | 操作 | 预期 |
|------|------|------|
| 正确登录 | 输入正确学号密码，点击登录 | 跳转到 /students |
| 错误密码 | 输入正确学号 + 错误密码 | 显示错误提示 |
| 空用户名 | 不填用户名，点击登录 | 表单验证提示 |
| 空密码 | 不填密码，点击登录 | 表单验证提示 |
| 不存在用户 | 输入不存在的学号 | 显示"用户不存在" |

### 学生 CRUD（students.spec.ts）

| 用例 | 操作 | 预期 |
|------|------|------|
| 查看列表 | 登录后访问 /students | 显示学生表格 |
| 新增学生 | 填写表单，提交 | 列表出现新学生 |
| 编辑学生 | 修改某学生信息，提交 | 列表信息更新 |
| 删除学生 | 点击删除，确认 | 列表移除该学生 |
| 查看详情 | 点击某学生 | 显示学生详情和成绩 |
| 搜索学生 | 输入关键字搜索 | 表格过滤显示匹配结果 |

### 成绩操作（scores.spec.ts）

| 用例 | 操作 | 预期 |
|------|------|------|
| 查看成绩 | 进入学生详情 | 显示成绩列表 |
| 添加成绩 | 填写科目和分数，提交 | 成绩表新增一条 |
| 编辑成绩 | 修改某科成绩 | 成绩更新 |
| 删除成绩 | 点击删除，确认 | 成绩移除 |
| 无效分数 | 输入负数/超100的分数 | 表单验证提示 |

## 6. 测试结构模板

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { TEST_STUDENT } from './helpers/test-data';

test.describe('学生管理', () => {

  test.beforeEach(async ({ page }) => {
    // 每个测试前先登录
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.login(TEST_STUDENT.id, TEST_STUDENT.password);
    await page.waitForURL('**/students');
  });

  test('查看列表 - 应显示学生表格', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });

  test('新增学生 - 列表出现新记录', async ({ page }) => {
    // ... 操作 + 断言
  });

  test.afterEach(async ({ page }) => {
    // 清理：删除测试创建的数据
  });
});
```

## 7. Playwright 配置要求

```typescript
// playwright.config.ts 必须包含：
use: {
  baseURL: 'http://localhost:4200',
  screenshot: 'only-on-failure',  // 失败时截图
  video: 'retain-on-failure',     // 失败时保留视频
  trace: 'on-first-retry',        // 重试时收集 trace
},
reporter: [
  ['html', { outputFolder: 'test-results/report' }],  // HTML 报告
  ['list'],                                            // 终端列表
],
```

## 8. 运行测试

```bash
# 运行所有测试
cd e2e && npx playwright test

# 运行单个文件
npx playwright test login.spec.ts

# 带 UI 模式（可视化调试）
npx playwright test --ui

# 查看报告
npx playwright show-report test-results/report
```

### 前置条件

- Flask API 运行在 `localhost:5000`
- Angular dev server 运行在 `localhost:4200`
- 数据库有测试数据

## 9. 测试覆盖范围

> 所有用户角色和数据都要有测试覆盖。

| 维度 | 要求 | 例子 |
|------|------|------|
| **数据全覆盖** | 每个学生都要被测到（至少登录冒烟） | 480 个学生逐个测试登录 |
| **角色全覆盖** | 学生、老师、管理员都要测 | 各角色登录、权限验证 |
| **功能全覆盖** | 每个 API + 页面功能都要有对应测试 | CRUD、查询、统计、权限 |
| **边界全覆盖** | 空值、错误值、边界值、不存在数据 | 空密码、无效学号、超范围分数 |

### 数据驱动测试

批量数据用 `test.each` 参数化：

```typescript
const ALL_STUDENTS = [
  { id: '0101', name: '钱洋', password: '123456' },
  // ... 全部 480 个
];

test.describe('全部学生登录', () => {
  for (const s of ALL_STUDENTS) {
    test(`${s.id} ${s.name} - 登录成功`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goTo();
      await loginPage.loginAsStudent(s.id, s.password);
      await expect(page).toHaveURL(/student\/scores/);
    });
  }
});
```

### 规则

- 新增功能必须同时新增测试
- 修改功能必须确保已有测试通过
- 数据量大的场景用数据驱动（`test.each`），不要手工复制粘贴
- 数据库里所有人都要有测试覆盖，不能只测一个账号

## 变更记录

| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本 | — |
| 2026-07-06 | 新增「测试覆盖范围」章节，要求数据全覆盖 | 480 个学生只测了一个，覆盖面不足 |
