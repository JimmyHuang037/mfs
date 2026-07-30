---
id: 001
title: 学生管理系统基础功能
status: active
created: 2026-07-05
updated: 2026-07-05
---

# 学生管理系统基础功能

## 概述

学生信息管理系统（MFS），支持学生查看成绩、老师管理成绩、管理员管理全局。
技术栈：**Flask (Python) + Angular 20 + MySQL 8.0**

## 用户角色

| 角色 | 描述 | 账号存储 |
|------|------|----------|
| **学生 (student)** | 登录查看自己的成绩 | `students` 表 |
| **老师 (teacher)** | 登录管理自己班级和科目的成绩 | `teachers` 表（需加 username + password） |
| **管理员 (admin)** | 管理学生、老师、班级、成绩等一切 | `admins` 表（新建） |

## 功能点

### 认证
- [ ] 学生登录 `POST /api/auth/login/student`
- [ ] 老师登录 `POST /api/auth/login/teacher`
- [ ] 管理员登录 `POST /api/auth/login/admin`

### 学生管理（管理员）
- [ ] 获取所有学生 `GET /api/students`
- [ ] 获取单个学生 `GET /api/students/<student_id>`
- [ ] 新增学生 `POST /api/students`
- [ ] 修改学生 `PUT /api/students/<student_id>`
- [ ] 删除学生 `DELETE /api/students/<student_id>`

### 学生查看自己（学生）
- [ ] 获取当前登录学生信息 `GET /api/students/me`

### 成绩管理（老师 + 管理员）
- [ ] 获取某学生成绩 `GET /api/students/<student_id>/scores`
- [ ] 添加成绩 `POST /api/students/<student_id>/scores`
- [ ] 修改成绩 `PUT /api/scores/<score_id>`
- [ ] 删除成绩 `DELETE /api/scores/<score_id>`

### 老师管理（管理员）
- [ ] 获取所有老师 `GET /api/teachers`
- [ ] 新增老师 `POST /api/teachers`
- [ ] 修改老师 `PUT /api/teachers/<teacher_id>`
- [ ] 删除老师 `DELETE /api/teachers/<teacher_id>`
- [ ] 获取老师教的班级 `GET /api/teachers/<teacher_id>/classes`

### 班级管理（管理员）
- [ ] 获取所有班级 `GET /api/classes`
- [ ] 新增班级 `POST /api/classes`
- [ ] 修改班级 `PUT /api/classes/<class_id>`
- [ ] 删除班级 `DELETE /api/classes/<class_id>`

### 前端页面
- [ ] 学生登录页 `/login`
- [ ] 学生成绩页 `/scores`
- [ ] 老师登录页 `/teacher/login`
- [ ] 老师成绩管理页 `/teacher/scores`
- [ ] 管理员登录页 `/admin/login`
- [ ] 管理员学生管理页 `/admin/students`
- [ ] 管理员老师管理页 `/admin/teachers`
- [ ] 管理员班级管理页 `/admin/classes`
- [ ] 管理员成绩管理页 `/admin/scores`

## 功能权限矩阵

| 功能 | 学生 | 老师 | 管理员 |
|------|:----:|:----:|:------:|
| 查看自己的成绩 | ✅ | ✅ | ✅ |
| 录入/修改成绩 | ❌ | ✅（自己科目和班级） | ✅（所有） |
| 管理学生信息 | ❌ | ❌ | ✅ |
| 管理老师账号 | ❌ | ❌ | ✅ |
| 管理班级 | ❌ | ❌ | ✅ |

## 数据库变更

### students 表（现有，不变）
| 字段 | 类型 | 约束 |
|------|------|------|
| id | INT | 主键，自增 |
| student_id | VARCHAR(50) | 唯一，非空 |
| name | VARCHAR(100) | 非空 |
| password | VARCHAR(100) | 非空 |
| class_id | INT | 关联 classes 表 |

### scores 表（现有，不变）
| 字段 | 类型 | 约束 |
|------|------|------|
| id | INT | 主键，自增 |
| student_id | VARCHAR(50) | 非空 |
| subject | VARCHAR(100) | 非空 |
| type | VARCHAR(50) | 非空 |
| score | DECIMAL(5,2) | 非空 |

### classes 表（现有，不变）
| 字段 | 类型 | 约束 |
|------|------|------|
| class_id | INT | 主键，自增 |
| class_name | VARCHAR(50) | 非空 |

### teachers 表（需改造）
| 字段 | 类型 | 约束 | 备注 |
|------|------|------|------|
| teacher_id | INT | 主键，自增 | 现有 |
| teacher_name | VARCHAR(100) | | 现有 |
| subject | VARCHAR(100) | | 现有 |
| username | VARCHAR(50) | 非空，唯一 | **新增** |
| password | VARCHAR(100) | 非空 | **新增** |

### admins 表（新建）
| 字段 | 类型 | 约束 |
|------|------|------|
| id | INT | 主键，自增 |
| username | VARCHAR(50) | 唯一，非空 |
| password | VARCHAR(100) | 非空 |
| name | VARCHAR(100) | 非空 |

### 现有数据
- 120 个学生，4 个班级
- 6 个老师（语文/数学/英语各 2 个）
- 360 条成绩
- 5 个班级

## 不做（明确排除）

- JWT / token 认证（保持简单登录）
- 密码哈希（保持明文）
- 路由守卫
- 外键约束 / 级联删除
- Excel 导入
- 后端死代码清理
- 错误提示优化（保持 alert）

## 技术约束

- 后端：Python / Flask / mysql-connector-python / Pandas
- 前端：Angular 20 / TypeScript / Angular Material
- 数据库：MySQL 8.0（现有数据保留）
- 测试：Playwright (E2E)
- 部署：localhost (API :5000, Web :4200)

## 变更记录

| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本，从 requirements.md 迁移 | 需求文件夹化 |
