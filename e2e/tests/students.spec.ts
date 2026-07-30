import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { ScoresPage } from './pages/scores.page';
import { TEST_STUDENT, EXAM_TYPES } from './helpers/test-data';

test.describe('学生成绩查询系统', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.loginAsStudent(TEST_STUDENT.id, TEST_STUDENT.password);
    await page.waitForURL('**/student/scores');
  });

  test('成绩页 - 加载 - 显示标题和学生姓名', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    await expect(scoresPage.header).toContainText(TEST_STUDENT.name);
  });

  test('成绩页 - 考试类型选择器 - 显示4种类型', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    await expect(scoresPage.examTypeSelect).toBeVisible();
    await scoresPage.examTypeSelect.locator('mat-select').click();
    const options = await page.locator('mat-option');
    await expect(options).toHaveCount(4);
    // 检查选项文字
    for (const et of EXAM_TYPES) {
      await expect(page.locator('mat-option').filter({ hasText: et.label })).toBeVisible();
    }
    // 关闭下拉
    await page.keyboard.press('Escape');
  });

  test('成绩页 - 默认选中第一个类型 - 显示考试日期', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    await expect(scoresPage.examDateLabel).toBeVisible();
    await expect(scoresPage.examDateLabel).toContainText('2026');
  });

  test('需求2+3 - 选择考试类型 - 概览数据更新', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    // 默认有概览
    await scoresPage.isOverviewVisible();
    await expect(scoresPage.totalScore).toBeVisible();
    await expect(scoresPage.classRank).toBeVisible();
    await expect(scoresPage.gradeRank).toBeVisible();
    await expect(scoresPage.levelBadge).toBeVisible();

    // 切换类型
    await scoresPage.selectExamType('期中');
    await scoresPage.isOverviewVisible();
    await expect(scoresPage.totalScore).toBeVisible();
  });

  test('需求4 - 成绩明细 - 表格显示6科', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    await scoresPage.isDetailsTableVisible();
    const rowCount = await scoresPage.getDetailRowCount();
    expect(rowCount).toBe(6);
  });

  test('需求5 - 分数段直方图 - 显示并切换维度', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    await scoresPage.isHistogramVisible();
    // 默认班级维度
    await expect(scoresPage.segmentLegend).toBeVisible();
    // 切换年级维度
    await scoresPage.switchDimension('年级');
    await expect(scoresPage.segmentLegend).toBeVisible();
  });

  test('需求6 - 年级排名 - 单科前三和总分前十', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    await scoresPage.isTopStudentsVisible();
    // 6个科目的前三
    const subjectSections = await scoresPage.subjectTopSections;
    await expect(subjectSections).toHaveCount(6);
    // 总分前十表格
    await expect(scoresPage.overallTop10Table).toBeVisible();
    const top10Count = await scoresPage.getOverallTop10Count();
    expect(top10Count).toBe(10);
  });

  test('登出 - 点击登出 - 跳转登录页', async ({ page }) => {
    const scoresPage = new ScoresPage(page);
    await scoresPage.logout();
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/login/);
  });
});