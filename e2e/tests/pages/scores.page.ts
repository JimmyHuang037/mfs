import { Page, expect } from '@playwright/test';

export class ScoresPage {
  constructor(private page: Page) {}

  // ---- Header (Shell 组件) ----
  get header() {
    return this.page.locator('.shell-header h2');
  }

  get logoutButton() {
    return this.page.locator('.shell-header button:has-text("登出")');
  }

  // ---- Exam Type Selector ----
  get examTypeSelect() {
    return this.page.locator('.type-select');
  }

  get examTypeOptions() {
    return this.page.locator('mat-option');
  }

  get examDateLabel() {
    return this.page.locator('.exam-date-label');
  }

  // ---- Overview ----
  get overviewCard() {
    return this.page.locator('.overview');
  }

  get totalScore() {
    return this.page.locator('.overview .highlight');
  }

  get classRank() {
    return this.page.locator('.overview-item').nth(1).locator('.value');
  }

  get gradeRank() {
    return this.page.locator('.overview-item').nth(2).locator('.value');
  }

  get levelBadge() {
    return this.page.locator('.badge');
  }

  // ---- Details Table ----
  get detailsTable() {
    return this.page.locator('.details table');
  }

  get detailRows() {
    return this.page.locator('.details table tbody tr');
  }

  // ---- Histogram ----
  get histogramCard() {
    return this.page.locator('.histogram-card');
  }

  get histogramBars() {
    return this.page.locator('.bar-fill');
  }

  get dimensionToggle() {
    return this.page.locator('.dimension-toggle');
  }

  get segmentLegend() {
    return this.page.locator('.segment-legend');
  }

  // ---- Top Students ----
  get topStudentsCard() {
    return this.page.locator('.top-students');
  }

  get subjectTopSections() {
    return this.page.locator('.top-subject');
  }

  get overallTop10Table() {
    return this.page.locator('.overall-top table');
  }

  get overallTop10Rows() {
    return this.page.locator('.overall-top table tbody tr');
  }

  // ---- Actions ----
  async goTo() {
    await this.page.goto('/student/scores');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async selectExamType(type: string) {
    await this.examTypeSelect.locator('mat-select').click();
    await this.page.locator('mat-option').filter({ hasText: type }).click();
    // Wait for data to reload
    await this.page.waitForTimeout(500);
  }

  async switchDimension(dimension: '班级' | '年级') {
    await this.dimensionToggle.locator(`mat-button-toggle[value="${dimension === '班级' ? 'class' : 'grade'}"]`).click();
    await this.page.waitForTimeout(500);
  }

  async isOverviewVisible() {
    await expect(this.overviewCard).toBeVisible();
  }

  async isDetailsTableVisible() {
    await expect(this.detailsTable).toBeVisible();
  }

  async isHistogramVisible() {
    await expect(this.histogramCard).toBeVisible();
  }

  async isTopStudentsVisible() {
    await expect(this.topStudentsCard).toBeVisible();
  }

  async getDetailRowCount() {
    return this.detailRows.count();
  }

  async getOverallTop10Count() {
    return this.overallTop10Rows.count();
  }
}