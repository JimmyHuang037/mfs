# Angular 前端编码规范

本文件定义 `web/` 目录下的编码标准，所有新增和修改的代码必须遵循这些规范。

## 项目结构

```
web/src/app/
├── auth/                   # 认证模块
│   ├── auth.service.ts     # 认证业务逻辑
│   └── login.component.ts  # 登录页面组件
├── core/
│   └── services/
│       └── api.service.ts  # HTTP 请求封装（唯一与后端通信的入口）
├── models/                 # TypeScript 接口/类型定义
│   ├── index.ts            # 统一导出
│   ├── student.model.ts
│   └── score.model.ts
├── shared/
│   └── material/           # Angular Material 模块聚合
├── student/                # 学生业务模块
│   └── student-list.component.ts
├── app-routing.module.ts   # 路由配置
└── app.component.ts        # 根组件（仅包含 router-outlet）
```

## 新增模块的标准流程

1. 在 `app/` 下按功能创建模块目录（如 `score/`、`upload/`）
2. 创建 standalone 组件文件
3. 在 `models/` 中添加对应的接口定义
4. 在 `app-routing.module.ts` 中注册路由
5. 如需新 API 调用，在 `api.service.ts` 中添加方法

## 组件规范

### Standalone 组件
- 所有新组件使用 `standalone: true`
- 在 `imports` 中直接导入所需模块，不依赖 NgModule

```typescript
@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule],
  template: `...`,
  styles: [`...`]
})
```

### 组件命名
- 文件名：`kebab-case.component.ts`（如 `student-list.component.ts`）
- 类名：`PascalCase` + `Component`（如 `StudentListComponent`）
- selector：`app-` 前缀 + `kebab-case`（如 `app-student-list`）

### 组件职责
- 组件只负责 UI 展示和用户交互
- 业务逻辑放在 Service 中
- 数据获取通过 Service 调用，不在组件中直接写 HTTP 请求

## 模板规范

### Angular Material 优先
- 表单使用 `MatFormField` + `MatInput`
- 表格使用 `MatTable`
- 按钮使用 `mat-raised-button` / `mat-button`
- 卡片使用 `MatCard`
- 分页使用 `MatPaginator`

### 响应式表单
- 使用 `ReactiveFormsModule`（`FormGroup` + `FormBuilder`）
- **不使用**模板驱动表单（`ngModel`）
- 所有表单字段必须添加 `Validators`

```typescript
this.loginForm = this.fb.group({
  username: ['', Validators.required],
  password: ['', Validators.required]
});
```

### 模板内联 vs 外部文件
- 模板 < 30 行：内联 `template`
- 模板 > 30 行：外部 `templateUrl` 文件

## Service 规范

### 命名
- 文件名：`kebab-case.service.ts`
- 类名：`PascalCase` + `Service`
- 使用 `@Injectable({ providedIn: 'root' })` 提供全局单例

### ApiService（HTTP 层）
- 所有后端请求必须通过 `ApiService`
- 方法返回 `Observable<T>`，使用具体类型而非 `any`
- 基础 URL 定义为类属性

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.apiUrl}/api/students`);
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/login`, { username, password });
  }
}
```

### 业务 Service
- 调用 `ApiService` 获取数据
- 管理应用状态（如当前登录用户）
- 使用 `lastValueFrom()` 将 Observable 转为 Promise（在 async 方法中）

## Model 规范

### 接口定义
- 每个实体一个文件：`student.model.ts`、`score.model.ts`
- 在 `models/index.ts` 中统一导出
- 字段命名使用 `camelCase`
- 可选字段用 `?` 标注

```typescript
export interface Student {
  name: string;
  studentId: string;
  scores?: Score[];
}
```

### 命名映射
后端 snake_case → 前端 camelCase：
| 后端 | 前端 |
|------|------|
| `student_id` | `studentId` |
| `score` | `score` |
| `subject` | `subject` |

## 路由规范

- 路由配置集中在 `app-routing.module.ts`
- 默认路由重定向到 `/login`
- 通配路由 `**` 也重定向到 `/login`
- 懒加载暂未使用，模块较少时直接引用组件

```typescript
const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'students', component: StudentListComponent },
  { path: '**', redirectTo: '/login' }
];
```

## 样式规范

- 组件样式内联在 `styles` 中（< 20 行时）
- 全局样式写在 `styles.css`
- 使用 Angular Material 主题变量，避免硬编码颜色值
- Flexbox 布局优先

## 错误处理

- HTTP 请求在 Service 层统一处理错误
- 组件层使用 `try/catch` 或 `.catch()` 处理 Service 返回的错误
- 用户可见的错误使用 `alert()` 或后续替换为 Material Snackbar

## 日志规范（IMPORTANT — 尽可能详细）

日志是调试和 AI 自动修复的核心。前端必须记录足够详细的信息。

### 基本原则
- **多写日志，宁多勿少** — 每个关键操作都要有 console 日志
- 使用 `console.log` / `console.warn` / `console.error` 分级记录
- 不在日志中暴露密码等敏感信息
- 日志内容必须包含上下文（组件名、操作、数据）

### 日志级别使用
| 级别 | 场景 | 示例 |
|------|------|------|
| `console.log` | 关键操作（登录、数据加载、导航） | `[LoginComponent] login success, navigating to /scores` |
| `console.debug` | 组件生命周期、数据变化 | `[StudentListComponent] ngOnInit, scores count: 3` |
| `console.warn` | 异常但可恢复的情况 | `[AuthService] no logged-in student found, redirecting to login` |
| `console.error` | HTTP 错误、未预期异常 | `[ApiService] GET /api/students failed: 500 Internal Server Error` |

### 必须记录日志的位置
1. **组件生命周期** — `ngOnInit`、`ngOnDestroy` 中记录关键状态
2. **Service 方法调用** — 记录方法名、入参、返回结果
3. **HTTP 请求** — 在 `ApiService` 中记录每个请求的 URL、状态码、耗时
4. **用户操作** — 登录、登出、表单提交、导航
5. **错误处理** — 记录完整错误信息和上下文
6. **数据变化** — 数据加载完成、列表更新、状态变更

### 日志格式
```typescript
// 组件生命周期
console.log(`[${this.constructor.name}] ngOnInit initialized`);

// Service 方法
console.log(`[ApiService] GET /api/students - requesting all students`);
console.log(`[ApiService] GET /api/students - response: ${students.length} records`);

// 用户操作
console.log(`[LoginComponent] login attempt: studentId=${studentId}`);
console.log(`[LoginComponent] login success, navigating to /scores`);

// 错误
console.error(`[ApiService] POST /api/login failed:`, error);
console.warn(`[AuthService] no logged-in student, redirecting to /login`);
```

### 日志标签约定
使用 `[Tag]` 前缀方便浏览器控制台过滤：
- `[ComponentName]` — 组件（如 `[LoginComponent]`、`[StudentListComponent]`）
- `[ApiService]` — HTTP 请求层
- `[AuthService]` — 认证相关
- `[Router]` — 路由导航

### HTTP 拦截器日志（推荐）
在 `ApiService` 或 HTTP 拦截器中统一记录所有请求：
```typescript
// 请求发出
console.log(`[ApiService] ${method} ${url} - sending`);
// 响应返回
console.log(`[ApiService] ${method} ${url} - ${status} (${time}ms)`);
// 错误
console.error(`[ApiService] ${method} ${url} - FAILED: ${error.message}`);
```

## 禁止事项

- **禁止**在组件中直接使用 `HttpClient`（必须通过 `ApiService`）
- **禁止**在模板中使用复杂逻辑表达式（提取为组件方法或 getter）
- **禁止**硬编码 API 地址（使用 `ApiService.apiUrl`）
- **禁止**使用 `any` 类型（定义具体接口）
- **禁止**在组件中存储敏感数据（密码等）

## 变更记录

| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本 | — |
