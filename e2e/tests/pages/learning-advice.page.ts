import { Page, expect } from '@playwright/test';

export class LearningAdvicePage {
  constructor(private page: Page) {}

  // ---- Tab ----
  get scoresTab() {
    return this.page.getByRole('tab', { name: /成绩查询/ });
  }

  get adviceTab() {
    return this.page.getByRole('tab', { name: /学习建议/ });
  }

  // ---- Loading ----
  get loadingSpinner() {
    return this.page.locator('app-student-learning-advice .loading');
  }

  // ---- Charts ----
  get scoreTrendChart() {
    return this.page.locator('app-student-learning-advice .section').nth(0);
  }

  get rankTrendChart() {
    return this.page.locator('app-student-learning-advice .section').nth(1);
  }

  get radarChart() {
    return this.page.locator('app-student-learning-advice .section').nth(2);
  }

  get chartTitles() {
    return this.page.locator('app-student-learning-advice mat-card-title');
  }

  get scoreTrendTitle() {
    return this.page.locator('app-student-learning-advice .section').nth(0).locator('mat-card-title');
  }

  get rankTrendTitle() {
    return this.page.locator('app-student-learning-advice .section').nth(1).locator('mat-card-title');
  }

  get radarTitle() {
    return this.page.locator('app-student-learning-advice .section').nth(2).locator('mat-card-title');
  }

  // ---- ECharts divs ----
  get echartsDivs() {
    return this.page.locator('app-student-learning-advice [echarts]');
  }

  // ---- Advice ----
  get adviceCard() {
    return this.page.locator('app-student-learning-advice .advice-card');
  }

  get adviceItems() {
    return this.page.locator('app-student-learning-advice .advice-item');
  }

  /** 总建议（is_summary=true，有蓝色左边框高亮） */
  get summaryItems() {
    return this.page.locator('app-student-learning-advice .advice-item.summary');
  }

  /** 普通建议（非 summary） */
  get normalAdviceItems() {
    return this.page.locator('app-student-learning-advice .advice-item:not(.summary)');
  }

  get adviceTexts() {
    return this.page.locator('app-student-learning-advice .advice-text');
  }

  get adviceIcons() {
    return this.page.locator('app-student-learning-advice .advice-icon');
  }

  /** 有科目标签的建议项（带 <strong class="subject-tag">） */
  get subjectTaggedItems() {
    return this.page.locator('app-student-learning-advice .advice-item .subject-tag');
  }

  /** 总建议的文本（加粗） */
  get summaryText() {
    return this.page.locator('app-student-learning-advice .advice-item.summary .advice-text');
  }

  // ---- Actions ----
  async switchToAdviceTab() {
    await this.adviceTab.click();
    // 等待加载完成（spinner 消失，内容出现）
    await this.page.waitForTimeout(500);
  }

  async switchToScoresTab() {
    await this.scoresTab.click();
    await this.page.waitForTimeout(500);
  }

  async waitForLoaded() {
    // 等待 loading spinner 消失
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
    // 等待第一个图表出现
    await expect(this.scoreTrendChart).toBeVisible({ timeout: 10000 });
  }

  async waitForChartsRendered() {
    // ECharts 渲染后 echarts div 里会有 canvas 元素
    for (const div of await this.echartsDivs.all()) {
      await expect(div.locator('canvas').first()).toBeVisible({ timeout: 10000 });
    }
  }

  async getAdviceTexts(): Promise<string[]> {
    return this.adviceTexts.allTextContents();
  }

  async getAdviceIcons(): Promise<string[]> {
    return this.adviceIcons.allTextContents();
  }

  /** 获取有科目标签的建议文本列表 */
  async getSubjectTaggedTexts(): Promise<string[]> {
    const items = await this.subjectTaggedItems.all();
    const texts: string[] = [];
    for (const item of items) {
      texts.push(await item.textContent() || '');
    }
    return texts;
  }

  /** 获取总建议条数 */
  async getSummaryCount(): Promise<number> {
    return this.summaryItems.count();
  }

  /** 获取总建议文本 */
  async getSummaryText(): Promise<string> {
    return (await this.summaryText.textContent()) || '';
  }

  /** 获取建议总条数 */
  async getAdviceCount(): Promise<number> {
    return this.adviceItems.count();
  }
}