# 开发日志

## 2026-07-06

### 学生成绩查询系统（需求003）完整实现

**改了什么：**
- 数据库：`scores` 表加 `exam_date` 字段，`students` 表加 `class_id` 字段，标准化 type 值
- 数据库：创建 `db/generate_data.py` 生成 480人×12班×4类型×6科 = 11520 条成绩
- 后端：新增 5 个统计接口（exam-types, overview, details, segment-stats, top-students）
- 前端：重写 `StudentScoresComponent`，支持考试类型选择、成绩总览、明细表格、分数段直方图、年级前十
- 测试：更新测试数据，新增 7 个 E2E 测试用例覆盖全部新功能

**为什么：** 需求003，学生需要完整的成绩查询和分析功能

**标准更新：** 同步更新 `docs/db-design.md` 表结构定义

## 2026-07-07

### 老师端成绩管理与统计分析（需求004）完整实现

**改了什么**:
- 后端：新建 `api/app/services/statistics_service.py`（4个统计函数：班级排名、分数段分布、单科前三、同科对比）
- 后端：`score_service.py` 新增 `import_scores_xlsx()` xlsx 批量导入，非0.5倍数行跳过
- 后端：新建 `api/app/statistics/` 模块（routes.py + __init__.py），注册 statistics_bp
- 后端：`classes/routes.py` 补充 `GET /<class_id>/students` 和 `GET /<class_id>/scores`
- 后端：`scores/routes.py` 补充 `POST /import-xlsx`
- 前端：`api.service.ts` 新增 7 个 API 方法
- 前端：重写 `TeacherScoresComponent` 为三 Tab 结构（成绩管理/班级统计/同科对比）
- E2E：新建 `teacher-scores.spec.ts` + `teacher-scores.page.ts`

**为什么:** 需求004，老师需要管理任教班级成绩并查看统计分析