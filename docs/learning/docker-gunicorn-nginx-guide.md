# 从你的 6 个容器学懂 Gunicorn + Nginx + Docker 部署

> 这份文档**完全基于你 ubsrv 上的真实配置**，不是泛泛的网上教程。
> 读完之后，你 `docker ps` 看到的每一行，你都能说出"它是干嘛的、为什么这么配"。

---

## 第一部分：核心概念（白话版）

### 1.1 先搞清楚一个问题：Flask 自己能跑，为什么还要 Gunicorn？

```python
# run.py —— 你开发时用的
from app import create_app
app = create_app()
app.run(host="0.0.0.0", port=5000, debug=True)
```

`app.run()` 启动的是 Flask **自带的开发服务器**。它的特点：

| | Flask 自带服务器 | Gunicorn |
|---|---|---|
| 进程数 | **1 个** | 你开几个 worker 就几个（你配了 2） |
| 同时处理请求 | 排队，一个一个来 | 2 个 worker 并行处理 |
| 崩了怎么办 | 整个服务挂了 | 经理自动重启那个 worker |
| 适合场景 | 你一个人开发调试 | 多人同时访问 |

**白话比喻：**

- Flask 自带服务器 = **路边摊**：老板一个人炒菜，来 10 个客人就排队等
- Gunicorn = **餐厅经理**：他不炒菜，但他管着 2 个厨师（worker），客人来了分配给空闲的厨师，某个厨师生病了（崩溃）他马上再叫一个来

**所以 Gunicorn 不是编译器，不是框架，它是一个"进程管理器"**——它负责：
1. 启动 N 个 worker 进程
2. 每个 worker 里跑着你的 Flask app
3. 请求来了，分给空闲的 worker
4. worker 崩了，自动补一个

> 🎯 **先记住结论**：开发用 `python run.py`（方便热重载），上线用 Gunicorn（稳定 + 并发）。

---

### 1.2 WSGI 是什么？（30 秒版）

你的 Gunicorn 命令是：

```bash
gunicorn --bind 0.0.0.0:5000 --workers 2 run:app
```

最后那个 `run:app` 是什么意思？

- `run` = `run.py` 文件
- `app` = 里面的 `app` 变量（你的 Flask 实例）

**WSGI 就是一个约定**：Python Web 世界规定，"你给我一个文件里叫 `app` 的东西，我就能调用它处理请求"。Gunicorn 不管你是 Flask 还是 Django，只要你符合这个约定就行。

> 🎯 **先记住结论**：WSGI = "Python Web 应用的 USB 接口标准"。Gunicorn 是插座，Flask app 是插头，`run:app` 就是告诉插座"插头在 run.py 里，名字叫 app"。现在不用深究协议细节。

---

### 1.3 Nginx 是什么？它和 Gunicorn 什么关系？

看你的 `nginx.conf`：

```nginx
location /api {
    proxy_pass http://api:5000;   # ← 转发给 Gunicorn
}

location / {
    try_files $uri $uri/ /index.html;   # ← 自己处理静态文件
}
```

**白话比喻：**

- Nginx = **公司前台**
- Gunicorn = **后厨经理**
- Flask workers = **厨师**

前台（Nginx）做的事：
1. 客人来了（HTTP 请求到达 :80）
2. 如果是"看菜单"（访问 `/`、`.js`、`.css` 静态文件）→ 前台自己从文件柜里拿给你，不用进后厨
3. 如果是"点菜"（访问 `/api/xxx`）→ 前台把单子递给后厨经理（Gunicorn :5000）

**谁在前谁在后？**

```
浏览器 → Nginx(:80) → Gunicorn(:5000) → Flask 代码 → MySQL
          前台            经理              厨师         仓库
```

**能不能只用一个？**

| 方案 | 能不能跑 | 问题 |
|---|---|---|
| 只用 Nginx，不用 Gunicorn | ❌ | Nginx 不会执行 Python 代码 |
| 只用 Gunicorn，不用 Nginx | ✅ 能跑 | 但静态文件（Angular 编译产物）要 Gunicorn 来发，慢且浪费 |
| 两个都用（你的 test 环境） | ✅ 最佳 | 各干各的擅长的事 |

> 🎯 **先记住结论**：Nginx 发静态文件 + 转发 API 请求；Gunicorn 跑 Python 逻辑。两人搭档，各司其职。

---

### 1.4 完整链路（一句话版）

> 浏览器输入 `http://172.30.114.64:4201` → 到达 Nginx 容器（:80）→ 如果是页面/JS/CSS，Nginx 直接返回编译好的 Angular 文件 → 如果是 `/api/...`，Nginx 转发给 Gunicorn 容器（:5000）→ Gunicorn 把请求交给某个空闲的 Flask worker → worker 执行你的 Python 视图函数 → 查 MySQL → 返回 JSON → 原路回到浏览器。

---

## 第二部分：你的 6 个容器分工

### 2.1 你的真实容器（不是假设的）

```bash
$ docker ps -a   # 你在 ubsrv 上看到的
NAMES            IMAGE            PORTS
mfs-dev-web      node:22-alpine   4200→4200    ← Angular 热重载开发服务器
mfs-dev-api      mfs-dev-api      5000→5000    ← Flask 开发服务器 (python run.py)
mfs-dev-mysql    mysql:8.0        3306→3306    ← 开发数据库

mfs-test-web     mfs-test-web     4201→80      ← Nginx + 编译好的 Angular
mfs-test-api     mfs-test-api     5001→5000    ← Gunicorn + Flask
mfs-test-mysql   mysql:8.0        3307→3306    ← 测试数据库
```

### 2.2 生活化比喻

把整个系统想象成**一家连锁餐厅**，你有两家分店：

| 容器 | 比喻 | 职责 |
|---|---|---|
| **mfs-dev-web** | 研发厨房的试菜台 | 你改一行代码，它立刻刷新给你看（热重载） |
| **mfs-dev-api** | 研发厨师一个人炒菜 | 单进程、带 debug，报错直接给你看堆栈 |
| **mfs-dev-mysql** | 研发用的食材冰箱 | 随便造、随便改数据 |
| **mfs-test-web** | 正式营业的大堂（Nginx 前台） | 接待客人、发菜单（静态文件）、传单子给后厨 |
| **mfs-test-api** | 正式后厨（Gunicorn 经理 + 2 厨师） | 稳定出菜，一个厨师倒了另一个顶上 |
| **mfs-test-mysql** | 正式营业的食材仓库 | 和研发冰箱隔离，不会被你调试时搞脏 |

### 2.3 架构图（你的真实链路）

**Dev 环境（你开发时用）：**

```
你的浏览器
  │
  ├──→ http://172.30.114.64:4200
  │       │
  │       └──→ [mfs-dev-web] ng serve（Angular 热重载）
  │               │
  │               └──→ 代理 /api → [mfs-dev-api] python run.py（Flask 单进程）
  │                                      │
  │                                      └──→ [mfs-dev-mysql] MySQL :3306
  │
  （没有 Nginx，没有 Gunicorn，一切从简）
```

**Test 环境（模拟生产）：**

```
你的浏览器
  │
  └──→ http://172.30.114.64:4201
          │
          └──→ [mfs-test-web] Nginx :80
                  │
                  ├── /（静态文件）→ 直接返回 Angular 编译产物（HTML/JS/CSS）
                  │
                  └── /api/*（反向代理）→ [mfs-test-api] Gunicorn :5000
                                              │
                                              ├── worker 1 → Flask app → [mfs-test-mysql] :3306
                                              └── worker 2 → Flask app → [mfs-test-mysql] :3306
```

### 2.4 Dev vs Test：什么共用、什么隔离？

| | 共用 | 隔离 |
|---|---|---|
| 源代码 | ✅ 同一份 `./api`、`./web`、`./db` | — |
| 数据库数据 | — | ✅ 不同 volume（`mysql-dev-data` vs `mysql-test-data`） |
| 端口 | — | ✅ 错开（3306/3307、5000/5001、4200/4201） |
| 运行方式 | — | ✅ dev 用热重载，test 用编译+Gunicorn |
| 密码 | — | ✅ dev123 vs test123 |

**一句话原则：代码共用一份，运行环境完全隔离。**

---

## 第三部分：为什么 Dev + Test 共用一个项目目录

### 3.1 好处

```bash
# 启动开发环境
docker compose -f docker-compose.dev.yml up -d

# 启动测试环境
docker compose -f docker-compose.test.yml up -d

# 同时跑（端口不冲突，所以可以并存）
docker compose -f docker-compose.dev.yml -f docker-compose.test.yml up -d
```

- **一份代码，两种运行模式**：你改了 `api/views.py`，dev 立刻热重载看到效果；确认没问题后，rebuild test 镜像验证"生产模式下也能跑"
- **切换成本为零**：不需要复制代码到另一个目录
- **CI/CD 的雏形**：以后上线就是再加一个 `docker-compose.prod.yml`，模式一样

### 3.2 可能的坑（以及你已经规避了的）

| 坑 | 后果 | 你的配置怎么规避的 |
|---|---|---|
| 端口冲突 | 两个 MySQL 都绑 3306 → 第二个起不来 | ✅ dev 3306 / test 3307 |
| 数据污染 | 调试时 DELETE 全表，test 数据也没了 | ✅ 不同 named volume |
| 状态残留 | dev 的 `__pycache__` 被 test 镜像打包进去 | ✅ test 是 `build` 新镜像，不挂 volume |
| 密码混用 | 不小心 dev 连了 test 的库 | ✅ 不同密码 + 不同容器名 |

### 3.3 最小实践原则

> **三条铁律：**
> 1. 端口永远错开（host 端口不同，容器内端口可以一样）
> 2. 数据卷永远命名隔离（`mysql-dev-data` ≠ `mysql-test-data`）
> 3. dev 挂 volume（为了热重载），test 不挂（为了模拟真实构建）

---

## 第四部分：你的真实配置（逐行注释版）

### 4.1 `docker-compose.test.yml`（test 环境 = 类生产）

```yaml
name: mfs-test                    # 项目名，docker 用它做资源隔离前缀

services:
  mysql:
    image: mysql:8.0              # 直接用官方镜像，不需要自己 build
    container_name: mfs-test-mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci
                                  # ↑ 让 MySQL 支持中文（utf8mb4）
    environment:
      MYSQL_ROOT_PASSWORD: test123    # 【test-only】和 dev 的 dev123 隔离
      MYSQL_DATABASE: student_db
    ports:
      - "3307:3306"               # 【关键】宿主机 3307 → 容器内 3306
                                  # 这样 dev(3306) 和 test(3307) 不冲突
    volumes:
      - mysql-test-data:/var/lib/mysql
                                  # ↑ 命名卷：数据持久化，容器删了数据还在
      - ./db/students_db.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./db/seed_data.sql:/docker-entrypoint-initdb.d/02-data.sql:ro
                                  # ↑ 首次启动自动执行建表 + 种子数据
                                  # :ro = 只读，容器不能改你宿主机的文件
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10                 # ↑ 最多等 50 秒让 MySQL 就绪

  api:
    build: ./api                  # 用 api/Dockerfile 构建镜像
    container_name: mfs-test-api
    command: ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2",
              "--access-logfile", "-", "--error-logfile", "-", "run:app"]
                                  # ↑ 【test-only 核心区别】
                                  # dev 用 "python run.py"（单进程 + 热重载）
                                  # test 用 gunicorn（2 worker + 稳定）
                                  # --access-logfile - → 日志打到 stdout（docker logs 能看）
                                  # run:app → WSGI 入口：run.py 里的 app 变量
    environment:
      DB_HOST: mysql              # Docker 内部 DNS：容器名 = 主机名
      DB_USER: root
      DB_PASSWORD: test123
      DB_NAME: student_db
      # 注意：没有 FLASK_DEBUG！test 环境不开 debug
    ports:
      - "5001:5000"               # 宿主机 5001 → 容器 5000（避开 dev 的 5000）
    depends_on:
      mysql:
        condition: service_healthy    # ↑ 等 MySQL healthcheck 通过才启动 api

  web:
    build: ./web                  # 用 web/Dockerfile（多阶段构建）
    container_name: mfs-test-web
    ports:
      - "4201:80"                 # 宿主机 4201 → 容器内 Nginx 的 80
    depends_on:
      - api

volumes:
  mysql-test-data:                # 声明命名卷（和 dev 的 mysql-dev-data 隔离）
```

### 4.2 `api/Dockerfile`（后端镜像）

```dockerfile
FROM python:3.12-slim             # 基础镜像：精简版 Python（~150MB）

WORKDIR /app                      # 容器内的工作目录

COPY requirements.txt .           # 先只复制依赖清单（利用 Docker 缓存层）
RUN pip install --no-cache-dir -r requirements.txt
                                  # ↑ 装依赖。--no-cache-dir 减小镜像体积
                                  # 为什么先 COPY requirements.txt 再 COPY .？
                                  # 因为只要 requirements.txt 没变，这层就缓存
                                  # 不用每次都重新 pip install（省几分钟）

COPY . .                          # 复制所有源代码到 /app

EXPOSE 5000                       # 声明"我要监听 5000"（文档作用，不实际开端口）

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", \
     "--access-logfile", "-", "--error-logfile", "-", "run:app"]
                                  # ↑ 默认启动命令
                                  # 注意：dev compose 里用 command: 覆盖了它
                                  # dev 覆盖成 "python run.py"（热重载）
                                  # test 不覆盖，所以用这个 gunicorn
```

### 4.3 `web/Dockerfile`（前端镜像 = 多阶段构建）

```dockerfile
# ===== 第一阶段：编译 Angular =====
FROM node:22-alpine AS build      # "AS build" = 给这阶段起个名字

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps     # npm ci = 严格按 lock 文件装（可复现）

COPY . .
RUN npm run build                 # 编译 Angular → 产出 dist/ 目录（纯 HTML/JS/CSS）

# ===== 第二阶段：用 Nginx 托管编译产物 =====
FROM nginx:alpine                 # 全新的小镜像（~25MB），不含 Node.js

COPY --from=build /app/dist/studentscore/browser /usr/share/nginx/html
                                  # ↑ 从第一阶段"偷"编译产物到 Nginx 默认目录
                                  # 最终镜像里没有 Node.js、没有源码、没有 node_modules
                                  # 只有 Nginx + 编译好的静态文件 → 又小又快

COPY nginx.conf /etc/nginx/conf.d/default.conf
                                  # ↑ 用你的自定义 Nginx 配置替换默认的

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
                                  # daemon off = 前台运行（Docker 要求主进程不能后台）
```

**为什么要多阶段？**

| 如果只用一个阶段 | 多阶段构建 |
|---|---|
| 最终镜像包含 Node.js + 源码 + node_modules ≈ **1.5GB** | 最终镜像只有 Nginx + 编译产物 ≈ **50MB** |
| 攻击面大（Node.js 漏洞） | 攻击面小 |

> 🎯 类比：第一阶段是"工厂生产产品"，第二阶段是"商店只摆成品"。顾客（Docker）不需要看到工厂。

### 4.4 `nginx.conf`（反向代理配置）

```nginx
server {
    listen 80;                    # 容器内监听 80（映射到宿主机 4201）
    server_name localhost;
    root /usr/share/nginx/html;   # 静态文件根目录（Angular 编译产物）
    index index.html;

    location /api {               # 匹配所有 /api 开头的请求
        proxy_pass http://api:5000;
                                  # ↑ 【反向代理核心】
                                  # "api" 是 docker-compose 里的服务名
                                  # Docker 内部 DNS 会解析成 test-api 容器的 IP
                                  # :5000 是 Gunicorn 监听的端口
                                  # 效果：/api/students → http://172.18.0.3:5000/api/students

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                                  # ↑ 把真实客户端信息传给后端
                                  # 不然 Flask 看到的 IP 永远是 Nginx 容器的 IP
    }

    location / {                  # 其他所有请求（/、/login、/students...）
        try_files $uri $uri/ /index.html;
                                  # ↑ 【SPA 核心配置】
                                  # 先找有没有这个文件（$uri）
                                  # 再找有没有这个目录（$uri/）
                                  # 都没有 → 返回 index.html（让 Angular 路由处理）
                                  # 没有这行，刷新 /students 页面会 404
    }
}
```

### 4.5 Dev vs Test 关键差异对照

| 配置项 | Dev（`docker-compose.dev.yml`） | Test（`docker-compose.test.yml`） |
|---|---|---|
| API 启动 | `python run.py`（Flask 开发服务器） | `gunicorn --workers 2 run:app` |
| 前端 | `ng serve --poll 1000`（实时编译） | Nginx 托管 `npm run build` 产物 |
| 热重载 | ✅ 改代码立刻生效 | ❌ 需要重新 `docker compose build` |
| Debug | `FLASK_DEBUG=1` | 无（关掉） |
| Volume 挂载 | `./api:/app`（源码映射进去） | 不挂（代码打包在镜像里） |
| 镜像来源 | web 直接用 `node:22-alpine` | web 用多阶段 build |

---

## 第五部分：5 个自检问题

如果你能不查资料答对这 5 题，说明你真的懂了：

### Q1：为什么 test 的 nginx.conf 里写 `proxy_pass http://api:5000` 而不是 `http://localhost:5000`？

<details>
<summary>👉 点这里看答案</summary>

因为每个容器有自己的网络命名空间。在 `mfs-test-web` 容器里，`localhost` 是它自己（Nginx 容器），不是 API 容器。

Docker Compose 会创建一个内部网络，容器名/服务名就是 DNS 主机名。`api` 会被解析成 `mfs-test-api` 容器的内部 IP（比如 172.18.0.3）。

**验证方法**：`docker exec mfs-test-web ping api` → 能 ping 通。
</details>

### Q2：如果你把 test-api 的 Gunicorn workers 从 2 改成 1，用户会感知到什么区别？

<details>
<summary>👉 点这里看答案</summary>

功能完全一样，但**并发能力减半**。

- 2 workers = 同时处理 2 个请求
- 1 worker = 一个请求处理完才轮到下一个

如果某个 API 要查数据库花 2 秒，那 2 workers 时第二个用户不用等；1 worker 时第二个用户要等 2 秒。

对你的 MFS（十几个用户）来说感知不到。但原理就是这样。
</details>

### Q3：Dev 环境为什么不需要 Nginx？Angular 的 `ng serve` 做了什么？

<details>
<summary>👉 点这里看答案</summary>

`ng serve` 本身就是一个开发用的 HTTP 服务器（基于 webpack-dev-server）。它：
1. 实时编译 TypeScript → JavaScript
2. 监听文件变化，自动刷新浏览器
3. 通过 `proxy.docker.conf.json` 把 `/api` 请求代理到 Flask

所以在 dev 里，`ng serve` 同时扮演了"Nginx 发静态文件"和"Nginx 反向代理"两个角色。只不过它是为开发优化的（热重载），不是为性能优化的。

Test/生产环境不需要热重载，需要的是"快速发文件"，所以换成 Nginx。
</details>

### Q4：`docker compose -f docker-compose.test.yml down` 之后，MySQL 数据还在吗？

<details>
<summary>👉 点这里看答案</summary>

**在。** 因为你用了命名卷 `mysql-test-data`。

- `down` 删除容器和网络，但**不删除命名卷**
- 下次 `up` 时，MySQL 发现 `/var/lib/mysql` 已有数据，不会再执行 `initdb.d` 里的 SQL
- 想彻底清数据：`docker compose -f docker-compose.test.yml down -v`（`-v` = 连卷一起删）

**对比**：dev 也一样的逻辑。`mysql-dev-data` 和 `mysql-test-data` 互不影响。
</details>

### Q5：如果 test 环境的 `/api/students` 返回 502 Bad Gateway，你的排查思路是什么？

<details>
<summary>👉 点这里看答案</summary>

502 = Nginx 把请求转出去了，但**后端没回应**。排查顺序：

1. **Gunicorn 活着吗？**
   `docker ps | grep test-api` → 状态是 Up 还是 Restarting？

2. **看 Gunicorn 日志：**
   `docker logs mfs-test-api --tail 50`
   → 有没有 ImportError / SyntaxError / 端口被占？

3. **Nginx 能连到 api 吗？**
   `docker exec mfs-test-web wget -qO- http://api:5000/api/students`
   → 如果超时：网络问题或 api 容器挂了
   → 如果拒绝连接：Gunicorn 没起来或没绑 5000

4. **MySQL 活着吗？**
   Gunicorn 起来了但 Flask 连不上数据库也会 500（不是 502）
   `docker ps | grep test-mysql` → 是否 healthy？

**关键认知**：502 是 Nginx 报的错，问题一定在 Nginx 的"下游"（Gunicorn 或更后面）。
</details>

---

## 附录：常用命令速查

```bash
# 在 ubsrv 上操作（ssh ubsrv）

# 看所有容器状态
docker ps -a

# 看某个容器的日志
docker logs mfs-test-api --tail 100 -f

# 进入容器内部（调试用）
docker exec -it mfs-test-api sh
docker exec -it mfs-test-mysql mysql -uroot -ptest123

# 重启某个服务
docker compose -f docker-compose.test.yml restart api

# 重新构建（改了代码后 test 环境需要）
docker compose -f docker-compose.test.yml build api
docker compose -f docker-compose.test.yml up -d api

# 彻底清除 test 环境（包括数据）
docker compose -f docker-compose.test.yml down -v

# 看容器间网络
docker network ls
docker network inspect mfs-test_default
```

---

## 总结：一张图记住所有

```
┌─────────────────── 你的 Windows 浏览器 ───────────────────┐
│                                                           │
│   http://172.30.114.64:4200        http://172.30.114.64:4201  │
│         (开发)                           (测试)           │
└────────┬──────────────────────────────────┬───────────────┘
         │                                  │
         ▼                                  ▼
┌─── Dev 容器组 ───┐              ┌─── Test 容器组 ───┐
│                  │              │                    │
│  ng serve :4200  │              │  Nginx :80         │
│  (热重载+代理)    │              │  (静态文件+反代)    │
│       │          │              │       │            │
│       ▼          │              │       ▼            │
│  Flask :5000     │              │  Gunicorn :5000    │
│  (单进程debug)   │              │  (2 workers)       │
│       │          │              │       │            │
│       ▼          │              │       ▼            │
│  MySQL :3306     │              │  MySQL :3306       │
│  (dev123)        │              │  (test123)         │
│                  │              │                    │
│  卷: mysql-dev   │              │  卷: mysql-test    │
└──────────────────┘              └────────────────────┘
         │                                  │
         └──── 共用同一份源代码 ─────────────┘
              (./api  ./web  ./db)
```

> 记住：**Dev 是为了让你写得爽，Test 是为了让用户用得稳。**
> 同一份代码，两种运行姿态。这就是 Docker Compose 的价值。
