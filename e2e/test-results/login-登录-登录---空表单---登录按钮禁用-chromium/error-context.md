# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> 登录 >> 登录 - 空表单 - 登录按钮禁用
- Location: tests/login.spec.ts:45:7

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: locator('mat-tab-body.active button[type=submit]')
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for locator('mat-tab-body.active button[type=submit]')

```

```yaml
- text: 学生管理系统
- tablist:
  - tab "学生登录" [selected]
  - tab "老师登录"
  - tab "管理员登录"
- tabpanel "学生登录":
  - text: 学号
  - textbox "学号"
  - text: 密码
  - textbox "密码"
  - button "登录" [disabled]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { LoginPage } from './pages/login.page';
  3  | import { TEST_STUDENT, INVALID_CREDENTIALS } from './helpers/test-data';
  4  | 
  5  | test.describe('登录', () => {
  6  | 
  7  |   test('登录页 - 加载 - 显示登录表单和标签页', async ({ page }) => {
  8  |     const loginPage = new LoginPage(page);
  9  |     await loginPage.goTo();
  10 |     await loginPage.isLoginFormVisible();
  11 |   });
  12 | 
  13 |   test('登录 - 学生正确凭证 - 跳转到成绩页', async ({ page }) => {
  14 |     const loginPage = new LoginPage(page);
  15 |     await loginPage.goTo();
  16 |     await loginPage.loginAsStudent(TEST_STUDENT.id, TEST_STUDENT.password);
  17 |     await page.waitForURL('**/student/scores');
  18 |     await expect(page).toHaveURL(/student\/scores/);
  19 |   });
  20 | 
  21 |   test('登录 - 学生错误密码 - 显示错误提示', async ({ page }) => {
  22 |     const loginPage = new LoginPage(page);
  23 |     await loginPage.goTo();
  24 | 
  25 |     page.on('dialog', async dialog => {
  26 |       expect(dialog.message()).toContain('登录失败');
  27 |       await dialog.accept();
  28 |     });
  29 | 
  30 |     await loginPage.loginAsStudent(TEST_STUDENT.id, 'wrongpassword');
  31 |   });
  32 | 
  33 |   test('登录 - 不存在用户 - 显示错误提示', async ({ page }) => {
  34 |     const loginPage = new LoginPage(page);
  35 |     await loginPage.goTo();
  36 | 
  37 |     page.on('dialog', async dialog => {
  38 |       expect(dialog.message()).toContain('登录失败');
  39 |       await dialog.accept();
  40 |     });
  41 | 
  42 |     await loginPage.loginAsStudent(INVALID_CREDENTIALS.id, INVALID_CREDENTIALS.password);
  43 |   });
  44 | 
  45 |   test('登录 - 空表单 - 登录按钮禁用', async ({ page }) => {
  46 |     const loginPage = new LoginPage(page);
  47 |     await loginPage.goTo();
> 48 |     await expect(loginPage.loginButton).toBeDisabled();
     |                                         ^ Error: expect(locator).toBeDisabled() failed
  49 |   });
  50 | });
  51 | 
```