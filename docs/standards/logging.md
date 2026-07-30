# 日志驱动开发标准

> 核心原则：代码里要有足够的日志，让 AI 出问题时能直接看日志自己排查，不需要问用户。

## 1. 开发日志（dev-log.md）

每次修改代码时，在 `docs/dev-log.md` 末尾追加一条记录：

```markdown
## 2026-07-05 — 修复登录 401 问题

**改了什么**: `api/app/services/auth_service.py` 的密码比对逻辑
**为什么改**: 前端传的密码是明文，数据库存的也是明文，但比对时多了 trim()
**Bug 记录**: 前端 input 会带尾随空格，后端没处理 → 登录失败
**怎么修的**: 后端对 password 做 strip() 再比对
```

### 规则

- 每次改代码**必须**写一条，不管多小
- 格式固定：日期 + 标题 + 改了什么 + 为什么 + Bug（如果有）+ 怎么修的
- Bug 记录要写清楚**原因**，不只是现象
- AI 改的代码也要记录，AI 自己写

## 2. API 日志规范（Flask / Python）

### 日志级别

| 级别 | 什么时候用 | 例子 |
|------|-----------|------|
| `DEBUG` | 开发调试信息 | 函数入参、SQL 语句、中间变量 |
| `INFO` | 正常操作记录 | 请求进来、数据库操作成功、用户登录 |
| `WARNING` | 异常但能继续 | 数据库连接重试、缺少非必填字段 |
| `ERROR` | 出错但能恢复 | 数据库连接失败、文件上传格式不对 |
| `CRITICAL` | 系统崩溃 | 数据库完全不可用、配置缺失 |

### 代码里怎么写

**Service 层**（每个方法入口 + 出口 + 异常）：

```python
import logging
logger = logging.getLogger(__name__)

def get_student_by_id(student_id):
    logger.info(f"查询学生: id={student_id}")
    try:
        # ... 数据库操作 ...
        logger.info(f"查询成功: {student['name']}")
        return student
    except Exception as e:
        logger.error(f"查询学生失败 id={student_id}: {e}", exc_info=True)
        return None
```

**Route 层**（记录请求和响应）：

```python
logger.info(f"POST /api/login username={username}")
# ... 处理逻辑 ...
logger.info(f"登录成功: {student['name']}")
```

### 规则

- 每个 service 方法：**入口**记参数，**出口**记结果，**异常**记完整错误
- 每个 route：**入口**记方法和路径，**异常**记堆栈
- 用 `logging.getLogger(__name__)` 不要用 `print()`
- 异常必须加 `exc_info=True` 记录完整堆栈
- 不要记录密码、token 等敏感信息

## 3. Web 日志规范（Angular / TypeScript）

### 代码里怎么写

**Service 层**：

```typescript
// api.service.ts
login(username: string, password: string) {
  console.log(`[API] POST /api/login username=${username}`);
  return this.http.post(...).pipe(
    tap(res => console.log(`[API] 登录成功:`, res)),
    catchError(err => {
      console.error(`[API] 登录失败:`, err);
      throw err;
    })
  );
}
```

**组件层**：

```typescript
// login.component.ts
async onLogin() {
  console.log(`[Login] 用户点击登录`);
  const success = await this.authService.login(...);
  if (success) {
    console.log(`[Login] 登录成功，跳转 /students`);
  } else {
    console.warn(`[Login] 登录失败`);
  }
}
```

### 规则

- 日志格式：`[模块名] 描述`，如 `[API]`、`[Login]`、`[StudentList]`
- HTTP 请求：发之前记一次，回来后记一次（成功/失败）
- 用户操作：点击按钮、路由跳转等关键操作要记
- 错误必须用 `console.error`，不要用 `console.log` 记错误
- 不要记录密码等敏感信息

## 4. E2E 日志规范（Playwright）

### 代码里怎么写

```typescript
test('登录流程', async ({ page }) => {
  console.log('[E2E] 开始登录测试');

  // 监听浏览器控制台日志
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[Browser Error] ${err.message}`));

  await test.step('输入用户名密码', async () => {
    console.log('[E2E] 填写登录表单');
    await page.fill('#username', 'test');
    await page.fill('#password', '123456');
  });

  await test.step('点击登录', async () => {
    console.log('[E2E] 点击登录按钮');
    await page.click('button[type=submit]');
    await page.waitForURL('**/students');
    console.log('[E2E] 登录成功，跳转到学生列表');
  });
});
```

### 规则

- 每个 `test.step` 里要有 `console.log` 说明在做什么
- 监听 `page.on('console')` 和 `page.on('pageerror')`
- 失败时截图：`await page.screenshot({ path: 'error.png' })`
- 测试名称要清楚说明在测什么

## 5. AI 排查指南

当 AI 遇到问题时，按这个顺序排查：

1. **看 `docs/dev-log.md`** — 最近改了什么、有没有已知 bug
2. **看 API 日志** — 终端输出 / Flask 日志，找 ERROR 级别
3. **看浏览器控制台** — 前端有没有报错
4. **看 E2E 报告** — Playwright HTML 报告 + 截图 + trace
5. **看网络请求** — API 请求状态码、响应内容

### 日志关键词速查

| 看到什么 | 说明什么 |
|---------|---------|
| `ERROR` / `error` | 出错了，看后面的详情 |
| `Traceback` | Python 异常堆栈，从下往上看 |
| `500` | 服务器内部错误 |
| `404` | 接口/资源不存在 |
| `401` | 认证失败 |
| `CORS` | 跨域问题 |
| `ECONNREFUSED` | 服务没启动或端口不对 |

## 变更记录

| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本 | — |
