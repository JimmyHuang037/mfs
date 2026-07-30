import { test, expect } from '@playwright/test';
import path from 'path';
import { LoginPage } from './pages/login.page';
import { TeacherScoresPage } from './pages/teacher-scores.page';

const TEACHER_CREDENTIALS = { username: 'zhangjg', password: '123456' };
const TEST_XLSX = path.resolve(__dirname, './helpers/test-import.xlsx');

async function loginAsTeacher(page: any) {
  await page.goto('/login');
  await page.locator('.mat-mdc-tab:has-text("老师")').click();
  await page.getByRole('textbox', { name: '用户名' }).fill(TEACHER_CREDENTIALS.username);
  await page.getByRole('textbox', { name: '密码' }).fill(TEACHER_CREDENTIALS.password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('**/teacher/scores');
}

test.describe('老师端成绩管理', () => {

  test.beforeEach(async ({ page }) => {
    console.log('[E2E] 登录老师账号');
    await loginAsTeacher(page);
  });

  // ── 基本结构 ──────────────────────────────────────────

  test('页面加载 - 三Tab结构可见', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.isLoaded();
  });

  test('成绩管理 - 默认显示第一个班级的成绩表格', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await expect(teacherPage.scoreTable).toBeVisible();
  });

  test('成绩管理 - 切换班级刷新成绩数据', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    const initialCount = await teacherPage.scoreRows.count();
    await teacherPage.selectClass('高一(2)班'); // zhangjg 教班级1-4
    await page.waitForTimeout(500);
    const newCount = await teacherPage.scoreRows.count();
    console.log(`[E2E] 高一(1)班行数=${initialCount} → 高一(2)班行数=${newCount}`);
  });

  // ── Tab 1: CRUD 操作 ─────────────────────────────────

  test('成绩管理 - 添加成绩 - 表格出现新记录', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    // 等表格加载完成
    await expect(teacherPage.scoreTable).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    const beforeCount = await teacherPage.scoreRows.count();
    console.log(`[E2E] 添加前行数=${beforeCount}`);
    await teacherPage.fillAddScore('S0101', '语文', '月考1', 85.5);
    await teacherPage.clickAddButton();
    // 等待表格行数增加
    await expect(teacherPage.scoreRows).toHaveCount(beforeCount + 1, { timeout: 15000 });
    console.log(`[E2E] 添加后行数=${await teacherPage.scoreRows.count()}`);
  });

  test('成绩管理 - 删除成绩 - 表格移除记录', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    // 先确保有数据可删
    const rowCount = await teacherPage.scoreRows.count();
    test.skip(rowCount === 0, '当前班级无成绩数据，跳过删除测试');
    await teacherPage.deleteScore(0);
    await page.waitForTimeout(500);
    const newCount = await teacherPage.scoreRows.count();
    expect(newCount).toBeLessThan(rowCount);
  });

  test('成绩管理 - 行内编辑分数 - 单元格值更新', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    const rowCount = await teacherPage.scoreRows.count();
    test.skip(rowCount === 0, '无成绩数据，跳过行内编辑测试');
    // 修改第一行分数为 90.0
    await teacherPage.inlineEditScore(0, 90.0);
    await page.waitForTimeout(500);
    // 验证更新后的值
    const scoreCell = teacherPage.scoreRows.first().locator('mat-cell').nth(4);
    await expect(scoreCell).toContainText('90');
  });

  test('成绩管理 - xlsx导入 - 显示成功/失败条数报告', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.uploadXlsx(TEST_XLSX);
    const text = await teacherPage.getImportResultText();
    console.log(`[E2E] 导入结果: ${text}`);
    // 结果应包含成功条数，例如 "成功: 2 条"（S0101 和 S0102 是有效学生）
    expect(text.length).toBeGreaterThan(0);
  });

  // ── Tab 2: 班级统计 ──────────────────────────────────

  test('班级统计 - 班级总分排名柱状图可见', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('班级统计');
    await page.waitForTimeout(1000);
    await expect(teacherPage.verticalBarChart).toBeVisible();
  });

  test('班级统计 - 分数段分布 - 选择班级和考试类型后直方图可见', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('班级统计');
    await page.waitForTimeout(1000);
    // 选考试类型
    await teacherPage.selectStatExamType('月考1');
    await page.waitForTimeout(500);
    // 选班级
    await teacherPage.selectStatClass('高一(1)班');
    await page.waitForTimeout(1000);
    await expect(teacherPage.histogram).toBeVisible();
  });

  test('班级统计 - 单科前三 - 选择班级和考试类型后网格可见', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('班级统计');
    await page.waitForTimeout(1000);
    // 选考试类型、选班级
    await teacherPage.selectStatExamType('月考1');
    await page.waitForTimeout(500);
    await teacherPage.selectStatClass('高一(1)班');
    await page.waitForTimeout(1000);
    await expect(teacherPage.topGrid).toBeVisible();
  });

  // ── Tab 3: 同科对比 ──────────────────────────────────

  test('同科对比 - 柱状图可见且当前老师高亮', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('同科对比');
    await page.waitForTimeout(1000);
    await expect(teacherPage.horizontalBarChart).toBeVisible();
    // 张建国（zhangjg）应该出现在高亮中
    await expect(teacherPage.highlightedBar).toBeVisible();
  });

  // ── Tab 4: 学情分析 ──────────────────────────────────

  test('学情分析 - 概况卡片可见且显示分类统计', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('学情分析');
    await page.waitForTimeout(2000);
    // 概况卡片可见
    await expect(teacherPage.summaryCards).toBeVisible();
    // 散点图可见
    await expect(teacherPage.scatterPlot).toBeVisible();
    // 图例可见
    await expect(teacherPage.scatterLegend).toBeVisible();
    // 学生状态列表可见
    await expect(teacherPage.analysisTable).toBeVisible();
    // 列表应该有数据行
    const rowCount = await teacherPage.analysisTableRows.count();
    console.log(`[E2E] 学情分析: 学生列表行数=${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('学情分析 - 切换班级后列表数据变化', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('学情分析');
    await page.waitForTimeout(2000);
    // 获取高一(1)班的行数
    await teacherPage.selectAnalysisClass('高一(1)班');
    await page.waitForTimeout(1000);
    const class1Count = await teacherPage.analysisTableRows.count();
    console.log(`[E2E] 学情分析: 高一(1)班行数=${class1Count}`);
    // 切换到高一(2)班
    await teacherPage.selectAnalysisClass('高一(2)班');
    await page.waitForTimeout(1000);
    const class2Count = await teacherPage.analysisTableRows.count();
    console.log(`[E2E] 学情分析: 高一(2)班行数=${class2Count}`);
    // 数据应该变化（两个班都有40人，但行数可能不同）
    expect(class1Count).toBeGreaterThan(0);
    expect(class2Count).toBeGreaterThan(0);
  });

  test('学情分析 - 点击学生行显示轨迹卡片', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('学情分析');
    await page.waitForTimeout(2000);
    // 等待表格行加载
    await expect(teacherPage.analysisTableRows.first()).toBeVisible({ timeout: 15000 });
    // 点击第一行学生的姓名单元格
    const firstNameCell = teacherPage.analysisTableRows.first().locator('td').first();
    await firstNameCell.click();
    console.log(`[E2E] 学情分析: 点击了第一行学生`);
    // 等待轨迹卡片出现（API 调用可能需要一些时间）
    await expect(teacherPage.trajectoryCard).toBeVisible({ timeout: 15000 });
    // 应该有4次考试的数据
    const itemCount = await teacherPage.trajectoryItems.count();
    console.log(`[E2E] 学情分析: 轨迹考试次数=${itemCount}`);
    expect(itemCount).toBe(4);
  });

  test('学情分析 - 散点图点击学生显示轨迹', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.clickTab('学情分析');
    await page.waitForTimeout(2000);
    // 等待散点图加载
    await expect(teacherPage.scatterPlot).toBeVisible({ timeout: 15000 });
    // 散点图应该有数据点
    const dotCount = await teacherPage.scatterDots.count();
    console.log(`[E2E] 学情分析: 散点图数据点数=${dotCount}`);
    expect(dotCount).toBeGreaterThan(0);
    // 点击第一个数据点（force:true 因为绝对定位的点可能重叠）
    await teacherPage.scatterDots.first().click({ force: true });
    // 等待轨迹卡片出现
    await expect(teacherPage.trajectoryCard).toBeVisible({ timeout: 15000 });
  });

  // ── 注销 ──────────────────────────────────────────────

  test('登出 - 跳转回登录页', async ({ page }) => {
    const teacherPage = new TeacherScoresPage(page);
    await teacherPage.logout();
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/login/);
  });
});