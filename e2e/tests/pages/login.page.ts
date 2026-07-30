import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  get loginCard() {
    return this.page.locator('mat-card');
  }

  get tabGroup() {
    return this.page.locator('mat-tab-group');
  }

  get studentIdInput() {
    return this.page.locator('input[formControlName=studentId]');
  }

  get studentPasswordInput() {
    return this.page.locator('input[formControlName=password]').first();
  }

  get studentLoginButton() {
    return this.page.locator('button[type=submit]').first();
  }

  async goTo() {
    await this.page.goto('/login');
  }

  async loginAsStudent(studentId: string, password: string) {
    await this.studentIdInput.fill(studentId);
    await this.studentPasswordInput.fill(password);
    await this.studentLoginButton.click();
  }

  async isLoginFormVisible() {
    await expect(this.loginCard).toBeVisible();
    await expect(this.tabGroup).toBeVisible();
    await expect(this.studentIdInput).toBeVisible();
  }
}
