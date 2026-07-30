import { Page, expect } from '@playwright/test';

// 学情分析分类颜色映射
const CLASSIF_COLORS: Record<string, string> = {
  '天才型': '#4caf50',
  '潜力型': '#ff9800',
  '上进型': '#2196f3',
  '下滑型': '#f44336',
  '摆烂型': '#9e9e9e',
};

export class TeacherScoresPage {
  constructor(private page: Page) {}

  get header() {
    return this.page.locator('.header h2');
  }

  get tabGroup() {
    return this.page.locator('mat-tab-group');
  }

  // ── Tab 1: 成绩管理 ──────────────────────────────────

  get scoreTable() {
    return this.page.locator('.scores-table');
  }

  get scoreRows() {
    return this.scoreTable.locator('tr[mat-row]');
  }

  get emptyMsg() {
    return this.page.locator('.empty-msg');
  }

  get classSelect() {
    return this.page.locator('.filter-card mat-select');
  }

  get addScoreCard() {
    return this.page.locator('.add-card');
  }

  get importCard() {
    return this.page.locator('.import-card');
  }

  get importResult() {
    return this.page.locator('.import-result');
  }

  get fileInput() {
    return this.importCard.locator('input[type="file"]');
  }

  /** Tab 标签页点击 */
  async clickTab(label: string) {
    await this.page.locator(`.mat-mdc-tab:has-text("${label}")`).click();
  }

  /** 下拉选择班级 */
  async selectClass(className: string) {
    await this.classSelect.click();
    await this.page.locator(`mat-option:has-text("${className}")`).click();
  }

  /** 填写添加成绩表单 */
  async fillAddScore(studentId: string, subject: string, type: string, score: number) {
    const card = this.addScoreCard;
    // 学号
    await card.locator('input[matInput]').first().fill(studentId);
    // 科目 — 通过 label 定位 mat-form-field
    await card.locator('mat-form-field:has(mat-label:text("科目")) mat-select').click();
    await this.page.locator(`mat-option:has-text("${subject}")`).click();
    // 类型
    await card.locator('mat-form-field:has(mat-label:text("考试类型")) mat-select').click();
    await this.page.locator(`mat-option:has-text("${type}")`).click();
    // 分数
    await card.locator('mat-form-field:has(mat-label:text("分数")) input').fill(score.toString());
  }

  /** 点击添加按钮 */
  async clickAddButton() {
    await this.addScoreCard.locator('button:has-text("添加")').click();
  }

  /** 删除指定行的成绩（默认第 1 行） */
  async deleteScore(rowIndex = 0) {
    const row = this.scoreRows.nth(rowIndex);
    await row.locator('button:has-text("删除")').click();
  }

  /**
   * 行内编辑分数：双击分数格 → 清空 → 输入新值 → 回车
   * index 列顺序: studentId, name, subject, type, score, actions → score 是第 5 列（0-based）
   */
  async inlineEditScore(rowIndex: number, newScore: number) {
    const scoreCell = this.scoreRows.nth(rowIndex).locator('mat-cell').nth(4);
    await scoreCell.dblclick();
    await this.page.waitForTimeout(300);
    const input = scoreCell.locator('input.score-input, input.inline-edit');
    await input.fill(newScore.toString());
    await input.press('Enter');
  }

  /** 行内编辑科目 */
  async inlineEditSubject(rowIndex: number, newSubject: string) {
    const subjectCell = this.scoreRows.nth(rowIndex).locator('mat-cell').nth(2);
    await subjectCell.dblclick();
    await this.page.waitForTimeout(300);
    const input = subjectCell.locator('input.inline-edit');
    await input.fill(newSubject);
    await input.press('Enter');
  }

  /** 上传 xlsx 文件并点击导入 */
  async uploadXlsx(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.importCard.locator('button:has-text("上传导入")').click();
  }

  /** 获取导入结果文本 */
  async getImportResultText(): Promise<string> {
    await expect(this.importResult).toBeVisible({ timeout: 10000 });
    return this.importResult.textContent() ?? '';
  }

  // ── Tab 2: 班级统计 ──────────────────────────────────

  get chartCards() {
    return this.page.locator('.chart-card');
  }

  get verticalBarChart() {
    return this.page.locator('.vertical-bar-chart');
  }

  get histogram() {
    return this.page.locator('.histogram');
  }

  get topGrid() {
    return this.page.locator('.top-grid');
  }

  /** 统计页的考试类型下拉（Tab2 的 filter-card 中第一个 mat-select） */
  get statExamTypeSelect() {
    return this.page.locator('app-teacher-scores .filter-card mat-select').first();
  }

  /** 统计页的班级下拉（Tab2 的 filter-card 中第二个 mat-select） */
  get statClassSelect() {
    return this.page.locator('app-teacher-scores .filter-card mat-select').nth(1);
  }

  /** 在统计 Tab 中选考试类型 */
  async selectStatExamType(type: string) {
    await this.statExamTypeSelect.click();
    await this.page.locator(`mat-option:has-text("${type}")`).click();
  }

  /** 在统计 Tab 中选班级 */
  async selectStatClass(className: string) {
    await this.statClassSelect.click();
    await this.page.locator(`mat-option:has-text("${className}")`).click();
  }

  // ── Tab 3: 同科对比 ──────────────────────────────────

  get horizontalBarChart() {
    return this.page.locator('.horizontal-bar-chart');
  }

  /** 当前老师的高亮柱子 */
  get highlightedBar() {
    return this.page.locator('.h-bar-name.current');
  }

  // ── Tab 4: 学情分析 ──────────────────────────────────

  get summaryCards() {
    return this.page.locator('.summary-cards');
  }

  get scatterPlot() {
    return this.page.locator('.scatter-plot');
  }

  get scatterDots() {
    return this.scatterPlot.locator('.dot');
  }

  get scatterLegend() {
    return this.page.locator('.scatter-legend');
  }

  get analysisTable() {
    return this.page.locator('.analysis-table');
  }

  get analysisTableRows() {
    return this.analysisTable.locator('tbody tr');
  }

  get analysisClassSelect() {
    return this.page.locator('app-teacher-scores .tab-content .filter-card mat-select').first();
  }

  get analysisFilterSelect() {
    return this.page.locator('app-teacher-scores .tab-content .filter-card mat-select').nth(1);
  }

  get trajectoryCard() {
    return this.page.locator('.trajectory-card');
  }

  get trajectoryItems() {
    return this.trajectoryCard.locator('.traj-item');
  }

  /** 在学情分析Tab中选班级 */
  async selectAnalysisClass(className: string) {
    await this.analysisClassSelect.click();
    await this.page.locator(`mat-option:has-text("${className}")`).click();
  }

  /** 点击分类概况卡片 */
  async clickSummaryCard(label: string) {
    await this.page.locator(`.summary-card.${label}`).click();
  }

  /** 点击散点图上的学生点 */
  async clickScatterDot(studentName: string) {
    await this.scatterDots.filter({ hasText: studentName }).click();
  }

  /** 点击分析表格中的学生行 */
  async clickAnalysisRow(rowIndex: number) {
    await this.analysisTableRows.nth(rowIndex).click();
  }

  /** 获取分类颜色 */
  getClassificationColor(classification: string): string {
    return CLASSIF_COLORS[classification] || '#9e9e9e';
  }

  // ── 通用 ─────────────────────────────────────────────

  async goTo() {
    await this.page.goto('/teacher/scores');
  }

  async isLoaded() {
    await expect(this.header).toBeVisible();
    await expect(this.tabGroup).toBeVisible();
  }

  async logout() {
    await this.page.locator('button:has-text("登出")').click();
  }
}