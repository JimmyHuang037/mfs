# 数据库设计文档

> 数据库: `student_db` | MySQL 8.0 | 字符集: utf8mb4

---

## ER 关系图（文字版）

```
students ──< scores        (scores.student_id → students.student_id, 外键)
students ──> classes        (students.class_id → classes.class_id, 外键)
teachers ──< teacher_class >── classes  (多对多，两个外键)
admins     (独立表，无关联)
```

---

## 表结构 (2026-07-06 更新)

### students 表

> 学生信息 + 登录账号

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | 主键，自增 | 内部 ID |
| student_id | VARCHAR(50) | 唯一，非空 | 学号，登录用 |
| name | VARCHAR(100) | 非空 | 姓名（中文） |
| password | VARCHAR(100) | 非空 | 密码（明文） |
| class_id | INT | 非空→classes.class_id | 关联班级 |

**现有数据**: 480 个学生（40人/班 × 12班）

**索引**:
- PRIMARY KEY (`id`)
- UNIQUE (`student_id`)
- INDEX (`class_id`)

---

### scores 表

> 学生成绩（新：含考试日期）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | 主键，自增 | 内部 ID |
| student_id | VARCHAR(50) | 非空 | 学号（关联 students.student_id） |
| subject | VARCHAR(100) | 非空 | 科目（语文/数学/英语/物理/化学/政治） |
| type | VARCHAR(50) | 非空 | 考试类型：`monthly1` `monthly2` `midterm` `final` |
| score | DECIMAL(5,1) | 非空 | 分数（0.0 ~ 100.0） |
| exam_date | DATE | 非空 | 考试日期，用于区分同类型的多次考试 |

**现有数据**: 11520 条（480人 × 4类型 × 6科）

**索引**:
- PRIMARY KEY (`id`)
- INDEX (`student_id`)
- INDEX `type_date` (`student_id`, `type`, `exam_date`)

---

## 待修复的约束（需求 001）

以下字段需要加 NOT NULL 约束，但需要先确保现有数据都有值：

```sql
-- 先检查是否有 NULL 值
SELECT COUNT(*) FROM students WHERE student_id IS NULL;
SELECT COUNT(*) FROM students WHERE name IS NULL;
SELECT COUNT(*) FROM students WHERE password IS NULL;
SELECT COUNT(*) FROM teachers WHERE teacher_name IS NULL;
SELECT COUNT(*) FROM teachers WHERE subject IS NULL;
SELECT COUNT(*) FROM teachers WHERE username IS NULL;

-- 如果没有 NULL 值，执行：
ALTER TABLE students MODIFY student_id VARCHAR(50) NOT NULL;
ALTER TABLE students MODIFY name VARCHAR(100) NOT NULL;
ALTER TABLE students MODIFY password VARCHAR(100) NOT NULL;
ALTER TABLE teachers MODIFY teacher_name VARCHAR(100) NOT NULL;
ALTER TABLE teachers MODIFY subject VARCHAR(100) NOT NULL;
ALTER TABLE teachers MODIFY username VARCHAR(50) NOT NULL;
ALTER TABLE teachers MODIFY password VARCHAR(100) NOT NULL;
```

---

## 其他表

### classes 表

> 班级信息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| class_id | INT | 主键，自增 | 班级 ID |
| class_name | VARCHAR(50) | 非空 | 班级名称 |

**现有数据**: 5 个班级

---

### teachers 表

> 老师信息 + 登录账号

| 字段 | 类型 | 约束 | 说明 | 状态 |
|------|------|------|------|------|
| teacher_id | INT | 主键，自增 | 老师 ID | 现有 |
| teacher_name | VARCHAR(100) | **⚠️ 允许 NULL** | 姓名 | 现有 |
| subject | VARCHAR(100) | **⚠️ 允许 NULL** | 科目 | 现有 |
| username | VARCHAR(50) | 唯一，**⚠️ 允许 NULL** | 登录用户名 | 现有 |
| password | VARCHAR(100) | 默认空字符串 | 登录密码（明文） | 现有 |

**现有数据**: 18 个老师（每科 3 人，每人教 4 个班）

| 学科 | 班级1-4 | 班级5-8 | 班级9-12 |
|:----:|:-------:|:-------:|:--------:|
| 语文 | 张建国 (zhangjg) | 林志文 (linzw) | 吴淑敏 (wusm) |
| 数学 | 李秀英 (lixy) | 周伟强 (zhouwq) | 孙晓梅 (sunxm) |
| 英语 | 王芳 (wangf) | 陈丽华 (chenlh) | 黄明辉 (huangmh) |
| 物理 | 刘志强 (liuzq) | 赵志远 (zhaozy) | 何艳萍 (heyp) |
| 化学 | 陈慧敏 (chenhm) | 马建华 (majh) | 杨秀兰 (yangxl) |
| 政治 | 赵明 (zhaom) | 徐志明 (xuzm) | 刘玉婷 (liuyt) |

---

### admins 表

> 管理员账号

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | 主键，自增 | 内部 ID |
| username | VARCHAR(50) | 唯一，非空 | 登录用户名 |
| password | VARCHAR(100) | 非空 | 登录密码（明文） |
| name | VARCHAR(100) | 非空 | 管理员姓名 |

**现有数据**: 1 个管理员

---

### teacher_class 表

> 老师-班级 多对多关系（一个老师教多个班级，一个班级有多个老师）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| teacher_id | INT | 联合主键 | 关联 teachers.teacher_id |
| class_id | INT | 联合主键 | 关联 classes.class_id |

---

## 表关系总结

```
┌──────────┐     1:N     ┌──────────┐
│ students │────────────>│  scores  │
│          │             │          │
│ student_id│            │student_id│
│ class_id │──┐          └──────────┘
└──────────┘  │
              │ N:1
         ┌────┘
         │
    ┌──────────┐
    │ classes  │
    │          │
    │ class_id │
    └──────────┘
         │
         │ M:N (via teacher_class)
         │
    ┌──────────────┐     ┌──────────┐
    │teacher_class │────>│ teachers │
    │              │     │          │
    │ teacher_id   │     │teacher_id│
    │ class_id     │     │ username │
    └──────────────┘     │ password │
                         └──────────┘

    ┌──────────┐
    │  admins  │  (独立，无关联)
    │          │
    │ username │
    │ password │
    │ name     │
    └──────────┘
```

---

## 已知问题

| 问题 | 影响 | 计划 |
|------|------|------|
| students.student_id 允许 NULL | 可以插入没有学号的学生 | 需要加 NOT NULL |
| students.name 允许 NULL | 可以插入没有姓名的学生 | 需要加 NOT NULL |
| students.password 允许 NULL | 可以插入没有密码的学生 | 需要加 NOT NULL |
| teachers.teacher_name 允许 NULL | 可以插入没有姓名的老师 | 需要加 NOT NULL |
| teachers.subject 允许 NULL | 可以插入没有科目的老师 | 需要加 NOT NULL |
| teachers.username 允许 NULL | 可以插入没有用户名的老师 | 需要加 NOT NULL |
| teachers.password 默认空字符串 | 空密码可以登录 | 需要改 NOT NULL 无默认 |
| 密码明文存储 | 安全风险 | 暂不处理（需求 001 排除） |

---

## SQL 变更脚本

> 需求 001 需要执行的修复，按顺序执行：

```sql
-- 1. 检查 students 表是否有 NULL 值
SELECT COUNT(*) FROM students WHERE student_id IS NULL;
SELECT COUNT(*) FROM students WHERE name IS NULL;
SELECT COUNT(*) FROM students WHERE password IS NULL;

-- 2. 检查 teachers 表是否有 NULL 值
SELECT COUNT(*) FROM teachers WHERE teacher_name IS NULL;
SELECT COUNT(*) FROM teachers WHERE subject IS NULL;
SELECT COUNT(*) FROM teachers WHERE username IS NULL;

-- 3. 如果上面都是 0，修复 NOT NULL 约束
ALTER TABLE students MODIFY student_id VARCHAR(50) NOT NULL;
ALTER TABLE students MODIFY name VARCHAR(100) NOT NULL;
ALTER TABLE students MODIFY password VARCHAR(100) NOT NULL;
ALTER TABLE teachers MODIFY teacher_name VARCHAR(100) NOT NULL;
ALTER TABLE teachers MODIFY subject VARCHAR(100) NOT NULL;
ALTER TABLE teachers MODIFY username VARCHAR(50) NOT NULL;
ALTER TABLE teachers MODIFY password VARCHAR(100) NOT NULL;
```

---

## 变更记录

| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本 | 从 SQL dump 和需求文档整理 |
| 2026-07-05 | 对照 DB 标准审计，修正实际状态 | 发现 7 个 NOT NULL 约束缺失，外键和索引已有 |
| 2026-07-07 | 老师从 6 人拆分为 18 人（每科 3 人），每人教 4 个班 | 老师端同科对比排名功能需要多个老师同科
