import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { TEST_STUDENT, INVALID_CREDENTIALS } from './helpers/test-data';

test.describe('登录', () => {

  test('登录页 - 加载 - 显示登录表单和标签页', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.isLoginFormVisible();
  });

  test('登录 - 学生正确凭证 - 跳转到成绩页', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.loginAsStudent(TEST_STUDENT.id, TEST_STUDENT.password);
    await page.waitForURL('**/student/scores');
    await expect(page).toHaveURL(/student\/scores/);
  });

  test('登录 - 学生错误密码 - 显示错误提示', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('登录失败');
      await dialog.accept();
    });

    await loginPage.loginAsStudent(TEST_STUDENT.id, 'wrongpassword');
  });

  test('登录 - 不存在用户 - 显示错误提示', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('登录失败');
      await dialog.accept();
    });

    await loginPage.loginAsStudent(INVALID_CREDENTIALS.id, INVALID_CREDENTIALS.password);
  });

  test('登录 - 空表单 - 登录按钮禁用', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await expect(loginPage.studentLoginButton).toBeDisabled();
  });
});