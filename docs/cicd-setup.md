# Jenkins CI/CD 部署文档

> 创建日期：2026-07-31 | 最后验证：Build #7 通过（UNSTABLE — E2E 跳过，其余全通过）

## 架构概览

```
开发者 git push → GitHub
                    ↑ SCM 轮询 (每2分钟)
              Jenkins (jimmyuser1:8888)
                    │
                    ├─ 1. Checkout 代码 (SSH clone)
                    ├─ 2. E2E 测试 (Playwright, 镜像不存在则跳过)
                    ├─ 3. Docker 构建 (api + web 镜像)
                    ├─ 4. DB 迁移 (db/migrations/*.sql, 无则跳过)
                    └─ 5. SSH 部署到 jimmyuser2 (docker save/load + compose up)
```

> 注：Jenkins 在内网，GitHub Webhook 无法回调，使用 SCM 轮询替代（最多 2 分钟延迟）。

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
| `jenkins/Dockerfile` | 自定义 Jenkins 镜像（Docker CLI + Compose + 阿里云镜像加速 + docker 组 GID 109） |
| `jenkins/docker-compose.yml` | Jenkins 容器编排（host 网络模式，httpPort=8888，挂载 docker.sock） |
| `scripts/deploy-prod.sh` | 手动部署脚本（支持 `--skip-tests` / `--skip-build`） |
| `db/migrations/` | 数据库迁移 SQL 文件目录（流水线自动执行） |
| `e2e/playwright.config.ts` | 已修改：支持 `BASE_URL` 环境变量 |

## Jenkins 访问信息

- **Web UI**: `http://172.30.114.64:8888`
- **管理员**: admin / admin123
- **运行模式**: host 网络 + Docker 容器
- **触发方式**: SCM 轮询 `H/2 * * * *`（每 2 分钟）+ 手动 Build Now
- **Job 名称**: mfs-pipeline

## Jenkins 凭据（已配置）

| ID | 类型 | 用途 |
|----|------|------|
| `jimmyuser2-ssh` | SSH Username with private key | SSH 部署到 jimmyuser2（用户: jimmyuser2） |
| `github-ssh` | SSH Username with private key | 克隆 GitHub 仓库（用户: git） |

两个凭据都使用 jimmyuser1 的 `~/.ssh/id_ed25519` 密钥。

## 流水线各阶段说明

### Stage 1: Checkout
从 GitHub SSH 克隆代码（`git@github.com:JimmyHuang037/mfs.git`）。

### Stage 2: E2E Tests（可跳过）
- 先检查 Playwright 镜像是否存在（`docker image inspect`）
- 镜像不存在 → 跳过，标记 UNSTABLE（不阻塞后续阶段）
- 镜像存在 → 在 Playwright Docker 容器中运行测试，`BASE_URL=http://localhost:4201`
- 使用 `--network host` 让容器访问宿主机上的
- 使用 `catchError` 包裹，测试失败不阻塞部署

### Stage 3: Build Images
使用 `docker-compose.prod.yml` 构建 `mfs-prod-api` 和 `mfs-prod-web` 镜像。

### Stage 4: DB Migration
扫描 `db/migrations/*.sql`，如有文件则 SCP 到 jimmyuser2 并通过 `docker exec` 执行。
MySQL 密码从 jimmyuser2 的 `~/mfs-prod/.env` 读取，不硬编码。

### Stage 5: Deploy to Production
1. `docker save` 导出镜像 → SSH 管道 → `docker load` 导入到 jimmyuser2
2. SSH 到 jimmyuser2 执行 `cd ~/mfs-prod && docker compose up -d`
3. 等待 10 秒后检查服务状态

## 生产环境（jimmyuser2）

- 项目目录: `/home/jimmyuser2/mfs-prod/`（无 git repo）
- Compose 文件: `docker-compose.yml`（使用 `image:` 而非 `build:`，镜像从外部加载）
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

## 从零重建 Jenkins（灾难恢复）

```bash
# 1. 在 jimmyuser1 上
cd /home/jimmyuser1/mfs/jenkins
docker compose up -d --build

# 2. 等待启动，创建 admin 用户（init 脚本自动执行）
# 管理员: admin / admin123

# 3. 安装插件
docker exec jenkins jenkins-plugin-cli --plugins git workflow-aggregator ssh-agent docker-workflow pipeline-stage-view
docker restart jenkins

# 4. 添加 GitHub host key
docker exec jenkins bash -c "mkdir -p /var/jenkins_home/.ssh && ssh-keyscan github.com >> /var/jenkins_home/.ssh/known_hosts"

# 5. 通过 Web UI 或 API 添加凭据（jimmyuser2-ssh + github-ssh）
# 6. 创建 Pipeline Job（SCM: git@github.com:JimmyHuang037/mfs.git, Script Path: Jenkinsfile）
```

## 已知问题

- **Playwright 镜像**：`mcr.microsoft.com/playwright:v1.52.0-noble`（~1.5GB）在国内下载极慢，E2E 测试暂时跳过。镜像拉完后自动启用。
- **jimmyuser2 IP**：DHCP 分配，可能变化。如变化需更新 Jenkinsfile 中的 `PROD_HOST` 和 jimmyuser1 的 SSH config。
- **jimmyuser1 → GitHub**：仅 SSH 协议可用，HTTPS 不通。

## 端口规划

| 环境 | MySQL | API | Web |
|------|-------|-----|-----|
| dev (jimmyuser1) | 3306 | 5000 | 4200 |
| test (jimmyuser1) | 3307 | 5001 | 4201 |
| prod (jimmyuser2) | 3308 | 5002 | 80 |
| Jenkins (jimmyuser1) | — | — | 8888 |
