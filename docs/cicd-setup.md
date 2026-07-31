# Jenkins CI/CD 部署文档

> 创建日期：2026-07-31

## 架构概览

```
开发者 git push → GitHub → Jenkins (jimmyuser1:8888) 触发流水线
                              │
                              ├─ 1. Checkout 代码
                              ├─ 2. E2E 测试 (Playwright → test 环境 localhost:4201)
                              ├─ 3. Docker 构建 (api + web 镜像)
                              ├─ 4. DB 迁移 (db/migrations/*.sql)
                              └─ 5. SSH 部署到 jimmyuser2 (docker save/load + compose up)
```

## VM 角色分工

| VM | User | IP | 角色 |
|----|------|----|------|
| ubuntuserver | jimmy | 172.30.120.19 | 博客 + Qwen Code（不做 MFS 开发） |
| ubsrv | jimmyuser1 | 172.30.114.64 | **开发 + 测试 + Jenkins CI/CD** |
| jimmyuser2 | jimmyuser2 | **172.30.115.33** | **生产环境**（Docker 3容器 + cpolar 公网穿透） |

> ⚠️ jimmyuser2 IP 已从 172.30.115.241 变更为 172.30.115.33（DHCP），2026-07-31 确认。

## 文件清单

| 文件 | 用途 |
|------|------|
| `Jenkinsfile` | 声明式流水线定义（5 个 stage） |
| `jenkins/Dockerfile` | 自定义 Jenkins 镜像（含 Docker CLI + Compose + 预装插件） |
| `jenkins/docker-compose.yml` | Jenkins 容器编排（端口 8888:8080，挂载 docker.sock） |
| `scripts/deploy-prod.sh` | 手动部署脚本（支持 `--skip-tests` / `--skip-build`） |
| `db/migrations/` | 数据库迁移 SQL 文件目录（流水线自动执行） |
| `e2e/playwright.config.ts` | 已修改：支持 `BASE_URL` 环境变量 |

## Jenkins 安装步骤（jimmyuser1）

```bash
cd /home/jimmyuser1/mfs/jenkins
docker compose up -d --build
```

- Web UI: `http://172.30.114.64:8888`
- 初始密码: `docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword`
- 预装插件: Git, Pipeline, SSH Agent, Docker Workflow, Pipeline Stage View

## Jenkins Job 配置

1. 新建 Pipeline 任务
2. 定义选择 "Pipeline script from SCM"
3. SCM: Git，仓库 URL: `git@github.com:JimmyHuang037/mfs.git`
4. 凭据: 添加 SSH Username with private key（jimmyuser1 的 id_ed25519）
5. 分支: `*/main`
6. Script Path: `Jenkinsfile`

## Jenkins 凭据配置

需要添加以下凭据（Manage Jenkins → Credentials）：

| ID | 类型 | 用途 |
|----|------|------|
| `jimmyuser2-ssh` | SSH Username with private key | SSH 部署到 jimmyuser2（用户: jimmyuser2，密钥: jimmyuser1 的 id_ed25519） |
| `github-ssh` | SSH Username with private key | 克隆 GitHub 仓库（用户: git，密钥: jimmyuser1 的 id_ed25519） |

## 流水线各阶段说明

### Stage 1: Checkout
从 GitHub 克隆代码。

### Stage 2: E2E Tests
在 Playwright Docker 容器中运行 E2E 测试，指向 jimmyuser1 的 test 环境（localhost:4201）。
使用 `--network host` 让容器直接访问宿主机网络。

### Stage 3: Build Images
使用 `docker-compose.prod.yml` 构建 `mfs-prod-api` 和 `mfs-prod-web` 镜像。

### Stage 4: DB Migration
扫描 `db/migrations/*.sql`，如有文件则 SCP 到 jimmyuser2 并通过 `docker exec` 执行。
MySQL 密码从 jimmyuser2 的 `~/mfs-prod/.env` 读取，不硬编码。

### Stage 5: Deploy to Production
1. `docker save` 导出镜像 → SSH 管道 → `docker load` 导入到 jimmyuser2
2. SSH 到 jimmyuser2 执行 `docker compose up -d`
3. 等待 10 秒后检查服务状态

## 生产环境（jimmyuser2）现状

- 项目目录: `/home/jimmyuser2/mfs-prod/`
- Compose 文件: `docker-compose.yml`（使用 `image:` 而非 `build:`）
- 容器: mfs-prod-web(:80) + mfs-prod-api(:5002) + mfs-prod-mysql(:3308)
- 公网: cpolar v3.3.12（隧道 mfs-web → 端口 80）
- `.env`: 含 `MYSQL_ROOT_PASSWORD`

## 手动部署

```bash
# 完整部署（测试 + 构建 + 部署）
./scripts/deploy-prod.sh

# 跳过测试
./scripts/deploy-prod.sh --skip-tests

# 跳过测试和构建（仅传输已有镜像并重启）
./scripts/deploy-prod.sh --skip-tests --skip-build
```

## 待完成

- [ ] jimmyuser1 的 GitHub SSH key 注册（需手动在 GitHub Settings → SSH Keys 添加）
- [ ] jimmyuser1 git 仓库初始化（`/home/jimmyuser1/mfs/` 目前无 .git）
- [ ] Jenkins 容器启动 + Job 配置
- [ ] GitHub Webhook 配置（push 触发 Jenkins）
- [ ] 端到端验证

## 端口规划

| 环境 | MySQL | API | Web |
|------|-------|-----|-----|
| dev (jimmyuser1) | 3306 | 5000 | 4200 |
| test (jimmyuser1) | 3307 | 5001 | 4201 (实际运行在 8080) |
| prod (jimmyuser2) | 3308 | 5002 | 80 |
| Jenkins (jimmyuser1) | — | — | 8888 |
