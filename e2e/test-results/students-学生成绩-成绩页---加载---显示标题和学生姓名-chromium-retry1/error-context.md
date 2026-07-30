# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: students.spec.ts >> 学生成绩 >> 成绩页 - 加载 - 显示标题和学生姓名
- Location: tests/students.spec.ts:15:7

# Error details

```
Error: page.goto: Target page, context or browser has been closed
Call log:
  - navigating to "http://localhost:4200/login", waiting until "load"

```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | export class LoginPage {
  4  |   constructor(private page: Page) {}
  5  | 
  6  |   get loginCard() {
  7  |     return this.page.locator('mat-card');
  8  |   }
  9  | 
  10 |   get tabGroup() {
  11 |     return this.page.locator('mat-tab-group');
  12 |   }
  13 | 
  14 |   get studentTab() {
  15 |     return this.page.locator('.mat-mdc-tab').first();
  16 |   }
  17 | 
  18 |   get teacherTab() {
  19 |     return this.page.locator('.mat-mdc-tab').nth(1);
  20 |   }
  21 | 
  22 |   get adminTab() {
  23 |     return this.page.locator('.mat-mdc-tab').nth(2);
  24 |   }
  25 | 
  26 |   get studentIdInput() {
  27 |     return this.page.locator('input[formControlName=studentId]');
  28 |   }
  29 | 
  30 |   get passwordInput() {
  31 |     return this.page.locator('mat-tab-body.active input[formControlName=password]');
  32 |   }
  33 | 
  34 |   get loginButton() {
  35 |     return this.page.locator('mat-tab-body.active button[type=submit]');
  36 |   }
  37 | 
  38 |   async goTo() {
> 39 |     await this.page.goto('/login');
     |                     ^ Error: page.goto: Target page, context or browser has been closed
  40 |   }
  41 | 
  42 |   async loginAsStudent(studentId: string, password: string) {
  43 |     await this.studentIdInput.fill(studentId);
  44 |     await this.passwordInput.fill(password);
  45 |     await this.loginButton.click();
  46 |   }
  47 | 
  48 |   async isLoginFormVisible() {
  49 |     await expect(this.loginCard).toBeVisible();
  50 |     await expect(this.tabGroup).toBeVisible();
  51 |     await expect(this.studentIdInput).toBeVisible();
  52 |   }
  53 | }
  54 | 
```