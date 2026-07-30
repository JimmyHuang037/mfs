# Flask API 编码规范

本文件定义 `api/` 目录下的编码标准，所有新增和修改的代码必须遵循这些规范。

## 项目结构

```
api/
├── app/
│   ├── <module>/          # 每个业务模块一个目录
│   │   ├── __init__.py
│   │   └── routes.py      # Blueprint 路由定义
│   ├── services/           # 业务逻辑层（不含 HTTP 概念）
│   │   └── <module>_service.py
│   └── utility/            # 公共工具（db连接、通用函数）
├── config.py               # 配置类（从环境变量读取）
├── factory.py              # 应用工厂函数 create_app()
└── run.py                  # 入口文件（仅启动服务器）
```

## 新增模块的标准流程

1. 在 `app/` 下创建模块目录，包含 `__init__.py` 和 `routes.py`
2. 在 `routes.py` 中定义 Blueprint
3. 在 `app/services/` 下创建对应的 service 文件
4. 在 `factory.py` 的 `create_app()` 中注册 Blueprint

## 路由规范

### Blueprint 命名
- Blueprint 名称与模块目录名一致：`students_bp`、`score_bp`、`login_bp`
- URL 前缀统一使用 `/api/<module>` 格式

### 路由函数命名
- 使用动词+名词：`list_students`、`get_student`、`add_student`、`edit_student`、`remove_student`
- 或加 `_route` 后缀区分：`get_scores_route`

### HTTP 方法映射
| 操作 | 方法 | 成功状态码 | 示例 |
|------|------|-----------|------|
| 获取列表 | GET | 200 | `GET /api/students/` |
| 获取单个 | GET | 200 | `GET /api/students/<id>` |
| 创建 | POST | 201 | `POST /api/students/` |
| 更新 | PUT | 200 | `PUT /api/students/<id>` |
| 删除 | DELETE | 200 | `DELETE /api/students/<id>` |

### 路由函数模板
```python
@students_bp.route('/', methods=['GET'])
def list_students():
    """获取所有学生信息"""
    students = get_all_students()
    if students is None:
        return jsonify({'error': 'Failed to fetch students'}), 500
    return jsonify(students)
```

## Service 层规范

- Service 函数只处理业务逻辑和数据库操作，**不接触** Flask request/response 对象
- 使用 `get_db_connection()` 获取连接，配合 `with` 语句管理生命周期
- 出错时返回 `None` 或 `False`，由路由层决定 HTTP 响应
- 所有数据库操作必须包裹在 `try/except` 中，异常时记录日志

```python
from app.utility.db_connection import get_db_connection
from flask import current_app

def get_all_students():
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT * FROM students")
            return cursor.fetchall()
    except Exception as e:
        current_app.logger.error(f"Database error: {str(e)}")
        return None
```

## 响应格式规范

### 成功响应
```json
// 单个资源
{"student_id": "1001", "name": "张三", ...}

// 列表
[{"student_id": "1001", ...}, {"student_id": "1002", ...}]

// 创建成功
{"message": "Student created successfully", "student_id": 1}
```

### 错误响应
```json
{"error": "描述性错误信息"}
```

### 状态码使用
| 状态码 | 场景 |
|--------|------|
| 200 | 成功获取/更新/删除 |
| 201 | 成功创建 |
| 400 | 请求参数缺失或格式错误 |
| 401 | 认证失败 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 输入验证

- 路由层负责验证请求数据完整性（必填字段、格式）
- 验证失败返回 400 + 描述性错误信息
- 使用 `request.get_json()` 获取 JSON 数据
- 检查 `data` 是否为 `None`，再检查必填字段

```python
data = request.get_json()
if not data or not all(key in data for key in ['student_id', 'name', 'password']):
    return jsonify({'error': 'Missing required fields'}), 400
```

## 数据库规范

- 使用参数化查询 `%s` 占位符，**禁止**字符串拼接 SQL
- 写操作后必须 `conn.commit()`
- 连接使用 `with` 语句自动关闭
- 配置从环境变量读取（通过 `config.py` 的 `Config` 类）

## 日志规范（IMPORTANT — 尽可能详细）

日志是调试和 AI 自动修复的核心。必须记录足够详细的信息，让 AI 能通过日志定位和修复问题。

### 基本原则
- **多写日志，宁多勿少** — 每个关键操作都要有日志
- 使用 `current_app.logger` 记录
- 不在日志中暴露密码等敏感信息
- 日志内容必须包含上下文（ID、参数、操作结果）

### 日志级别使用
| 级别 | 场景 | 示例 |
|------|------|------|
| `INFO` | 关键业务操作（登录、创建、删除、导入） | `[LOGIN] student_id=1001 login success` |
| `DEBUG` | 函数入参、返回值、中间状态 | `[GET_STUDENT] querying student_id=1001, result: found` |
| `WARNING` | 异常但可恢复的情况（数据不存在、重复操作） | `[DELETE_SCORE] score_id=999 not found, skipping` |
| `ERROR` | 数据库错误、未预期异常 | `[DB_ERROR] failed to insert score: Duplicate entry` |

### 必须记录日志的位置
1. **路由入口** — 记录请求方法、路径、关键参数
2. **Service 函数入口** — 记录函数名和入参
3. **Service 函数返回** — 记录操作结果（成功/失败）
4. **数据库操作** — 记录 SQL 操作类型和影响的记录
5. **异常捕获** — 记录完整异常信息和上下文
6. **认证操作** — 记录登录成功/失败（不记录密码）

### 日志格式
```python
# 路由入口
current_app.logger.info(f"[ROUTE] {request.method} {request.path} - params: student_id={student_id}")

# Service 入口
current_app.logger.debug(f"[SERVICE] get_student_by_id called with student_id={student_id}")

# 数据库操作结果
current_app.logger.info(f"[DB] INSERT student student_id={student_id}, auto_id={cursor.lastrowid}")

# 异常
current_app.logger.error(f"[DB_ERROR] get_all_students failed: {str(e)}")

# 认证
current_app.logger.info(f"[AUTH] login attempt: student_id={student_id}, result=success")
current_app.logger.warning(f"[AUTH] login failed: student_id={student_id}, reason=invalid_password")
```

### 日志标签约定
使用 `[TAG]` 前缀方便搜索和过滤：
- `[ROUTE]` — 路由层
- `[SERVICE]` — 业务逻辑层
- `[DB]` — 数据库操作
- `[AUTH]` — 认证相关
- `[DB_ERROR]` — 数据库错误
- `[VALIDATION]` — 输入验证

## 文件上传规范（Excel 导入）

- 使用 `werkzeug.utils.secure_filename` 处理文件名
- 限制允许的文件扩展名（`xlsx`, `xls`）
- 导入完成后删除临时文件
- 使用 pandas 读取 Excel 数据

## 变更记录

| 日期 | 改了什么 | 为什么 |
|------|---------|--------|
| 2026-07-05 | 初始版本 | — |
