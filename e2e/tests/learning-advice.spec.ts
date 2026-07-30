import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { LearningAdvicePage } from './pages/learning-advice.page';
import { TEST_STUDENT } from './helpers/test-data';

test.describe('学习建议', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.loginAsStudent(TEST_STUDENT.id, TEST_STUDENT.password);
    await page.waitForURL('**/student/scores');
  });

  test('Tab切换 - 显示两个Tab并切换到学习建议', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    await expect(advicePage.scoresTab).toBeVisible();
    await expect(advicePage.adviceTab).toBeVisible();
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    await expect(advicePage.adviceCard).toBeVisible();
  });

  test('需求1 - 各科分数趋势折线图 - 显示标题和图表', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    await expect(advicePage.scoreTrendTitle).toContainText('各科分数趋势');
    await advicePage.waitForChartsRendered();
  });

  test('需求2 - 总排名趋势折线图 - 显示标题和图表', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    await expect(advicePage.rankTrendTitle).toContainText('总排名趋势');
    await expect(advicePage.rankTrendChart.locator('canvas').first()).toBeVisible();
  });

  test('需求3 - 各科实力雷达图 - 显示标题和图表', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    await expect(advicePage.radarTitle).toContainText('各科实力分布');
    await expect(advicePage.radarChart.locator('canvas').first()).toBeVisible();
  });

  test('需求4 - 结构化建议渲染 - 显示建议列表', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    await expect(advicePage.adviceCard).toBeVisible();

    const count = await advicePage.getAdviceCount();
    expect(count).toBeGreaterThanOrEqual(1);

    // 每条建议有图标
    const icons = await advicePage.getAdviceIcons();
    expect(icons.length).toBe(count);
    for (const icon of icons) {
      expect(icon.length).toBeGreaterThan(0);
    }
    // 每条建议有文字
    const texts = await advicePage.getAdviceTexts();
    expect(texts.length).toBe(count);
    for (const text of texts) {
      expect(text.length).toBeGreaterThan(5);
    }
  });

  test('需求4a - 科目标签 - 部分建议带 subject-tag', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    // 至少有一些建议带科目标签
    const tagCount = await advicePage.subjectTaggedItems.count();
    expect(tagCount).toBeGreaterThanOrEqual(1);
    // 科目标签内容为科目名（语文/数学/英语/物理/化学/政治）
    const validSubjects = ['语文', '数学', '英语', '物理', '化学', '政治'];
    for (const tag of await advicePage.subjectTaggedItems.all()) {
      const text = await tag.textContent();
      expect(validSubjects).toContain(text);
    }
  });

  test('需求4b - 总建议高亮 - 有 summary 类名和蓝色左边框', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    // 至少有一条总建议
    const summaryCount = await advicePage.getSummaryCount();
    expect(summaryCount).toBeGreaterThanOrEqual(1);
    // 总建议有蓝色左边框样式
    const summaryItem = advicePage.summaryItems.first();
    await expect(summaryItem).toHaveCSS('border-left-style', 'solid');
    await expect(summaryItem).toHaveCSS('border-left-color', 'rgb(25, 118, 210)');
    // 总建议文本加粗
    const summaryText = summaryItem.locator('.advice-text');
    await expect(summaryText).toHaveCSS('font-weight', '700');
    // 总建议以 📋 开头
    const text = await summaryText.textContent();
    expect(text).toContain('📋');
  });

  test('API数据 - 返回结构化advice对象', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    const apiResponse = page.waitForResponse(
      resp => resp.url().includes('/api/scores/learning-advice') && resp.status() === 200
    );
    await advicePage.switchToAdviceTab();
    const response = await apiResponse;
    const json = await response.json();

    // 验证基本结构
    expect(json).toHaveProperty('exam_labels');
    expect(json).toHaveProperty('subject_trends');
    expect(json).toHaveProperty('rank_trend');
    expect(json).toHaveProperty('total_trend');
    expect(json).toHaveProperty('percentiles');
    expect(json).toHaveProperty('advice');

    // exam_labels: 至少4次考试（月考1, 月考2, 期中, 期末）
    expect(Array.isArray(json.exam_labels)).toBeTruthy();
    expect(json.exam_labels.length).toBeGreaterThanOrEqual(4);
    // 包含4种考试类型（去重）
    const uniqueTypes = new Set(json.exam_labels);
    expect(uniqueTypes.has('月考1')).toBeTruthy();
    expect(uniqueTypes.has('月考2')).toBeTruthy();
    expect(uniqueTypes.has('期中')).toBeTruthy();
    expect(uniqueTypes.has('期末')).toBeTruthy();

    // subject_trends: 6个科目，每个至少4个值
    const subjects = ['语文', '数学', '英语', '物理', '化学', '政治'];
    for (const subj of subjects) {
      expect(json.subject_trends).toHaveProperty(subj);
      expect(Array.isArray(json.subject_trends[subj])).toBeTruthy();
      expect(json.subject_trends[subj].length).toBeGreaterThanOrEqual(4);
    }

    // rank_trend: 至少4次排名
    expect(Array.isArray(json.rank_trend)).toBeTruthy();
    expect(json.rank_trend.length).toBeGreaterThanOrEqual(4);

    // total_trend: 至少4次总分
    expect(Array.isArray(json.total_trend)).toBeTruthy();
    expect(json.total_trend.length).toBeGreaterThanOrEqual(4);

    // percentiles: 6个科目的百分位
    for (const subj of subjects) {
      expect(json.percentiles).toHaveProperty(subj);
      expect(typeof json.percentiles[subj]).toBe('number');
    }

    // advice: 结构化对象数组
    expect(Array.isArray(json.advice)).toBeTruthy();
    expect(json.advice.length).toBeGreaterThanOrEqual(1);

    // 每条 advice 有 subject/text/is_summary 三个字段
    for (const item of json.advice) {
      expect(item).toHaveProperty('subject');
      expect(item).toHaveProperty('text');
      expect(item).toHaveProperty('is_summary');
      expect(typeof item.text).toBe('string');
      expect(item.text.length).toBeGreaterThan(5);
      expect(typeof item.is_summary).toBe('boolean');
    }

    // 至少有一条总建议
    const summaries = json.advice.filter((a: any) => a.is_summary === true);
    expect(summaries.length).toBeGreaterThanOrEqual(1);
    // 总建议的 subject 为 null
    for (const s of summaries) {
      expect(s.subject).toBeNull();
      expect(s.text).toContain('📋');
    }

    // 至少有一条带科目标签的建议
    const subjectAdvice = json.advice.filter((a: any) => a.subject !== null);
    expect(subjectAdvice.length).toBeGreaterThanOrEqual(1);
    for (const a of subjectAdvice) {
      expect(subjects).toContain(a.subject);
    }
  });

  test('Tab切换 - 成绩查询和学习建议之间来回切换', async ({ page }) => {
    const advicePage = new LearningAdvicePage(page);
    // 切换到学习建议
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    await expect(advicePage.adviceCard).toBeVisible();
    // 切回成绩查询
    await advicePage.switchToScoresTab();
    await expect(advicePage.scoresTab).toBeVisible();
    // 再切回学习建议
    await advicePage.switchToAdviceTab();
    await advicePage.waitForLoaded();
    await expect(advicePage.adviceCard).toBeVisible();
  });
});