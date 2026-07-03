# 项目目录结构

My App Structure
```
.
├── src/
│   ├── app/
│   │   ├── auth/                    # 认证相关组件和服务
│   │   │   ├── auth.module.ts         # 认证模块
│   │   │   ├── auth.service.ts        # 认证服务，使用 Student 接口
│   │   │   └── login.component.ts     # 登录组件
│   │   │
│   │   ├── core/                    # 核心模块
│   │   │   └── services/
│   │   │       └── student.service.ts # 学生服务，使用 Student 接口
│   │   │
│   │   ├── models/                  # 数据模型
│   │   │   ├── index.ts               # 导出所有模型接口
│   │   │   ├── score.model.ts         # 定义 Student 和 Score 接口
│   │   │   └── student.model.ts       # 定义 Student 接口（保留）
│   │   │
│   │   ├── shared/                  # 共享模块
│   │   │   └── material/              # Angular Material 模块
│   │   │       └── material.module.ts
│   │   │
│   │   ├── student/                 # 学生相关组件
│   │   │   ├── mock-scores.ts         # 模拟成绩数据，使用 Score 接口
│   │   │   ├── mock-students.ts       # 模拟学生数据，使用 Student 接口
│   │   │   └── student-list.component.ts # 学生列表组件，使用 Student 接口
│   │   │
│   │   ├── test/                    # 测试组件
│   │   │   └── test.component.ts      # 测试页面
│   │   │
│   │   ├── app-routing.module.ts    # 路由配置
│   │   └── app.component.ts         # 根组件，使用 StudentListComponent, AuthService, Router
│   │
│   ├── environments/                # 环境配置
│   │   └── environment.ts           # 环境变量
│   │
│   ├── index.html                   # 主 HTML 文件
│   ├── main.ts                      # 主入口文件
│   └── styles.css                   # 全局样式
│
├── README.md                        # 项目说明文档
├── angular.json                     # Angular 配置文件
├── package-lock.json                # 包版本锁定文件
├── package.json                     # 项目配置文件
├── tsconfig.app.json                # TypeScript 配置文件（应用）
└── tsconfig.json                    # TypeScript 配置文件（根）
```

## 目录说明

- `src/app/auth`: 包含认证相关的组件和服务。
- `src/app/core`: 包含核心服务，如学生服务。
- `src/app/models`: 集中存放所有的数据模型定义。
- `src/app/shared`: 存放共享模块，如 Angular Material 模块。
- `src/app/student`: 学生功能模块，包含学生列表组件和模拟数据。
- `src/app/test`: 测试组件目录。
- `src/environments`: 不同环境的配置文件。
- `src/index.html`: 应用的主 HTML 文件。
- `src/main.ts`: 应用的入口点。
- `src/styles.css`: 全局样式表。
- `angular.json`: Angular 项目的配置文件。
- `package.json`: 项目依赖和脚本配置。
- `tsconfig.json` 和 `tsconfig.app.json`: TypeScript 编译配置。
