#!/bin/bash
# MySQL 数据库备份与恢复（通过 SSH 在 ubsrv 上执行 docker 命令）
# 支持 dev / test 两套环境（prod 暂未部署）
#
# 用法:
#   ./scripts/db-backup.sh backup [env]          # 备份指定环境（默认全部）
#   ./scripts/db-backup.sh restore <env> <file>  # 恢复指定环境
#   ./scripts/db-backup.sh list [env]            # 查看备份文件
#   ./scripts/db-backup.sh cron                  # 安装每日自动备份 (crontab)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/db/backups"
REMOTE_HOST="ubsrv"

declare -A CONTAINERS=(
    [dev]="mfs-dev-mysql"
    [test]="mfs-test-mysql"
)

declare -A PASSWORDS=(
    [dev]="dev123"
    [test]="test123"
)

DB_NAME="student_db"
RETENTION_DAYS=7

cleanup_old() {
    local count
    count=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
        echo "  🧹 已清理 $count 个超过 ${RETENTION_DAYS} 天的旧备份"
    fi
}

backup_one() {
    local env="$1"
    local container="${CONTAINERS[$env]}"
    local password="${PASSWORDS[$env]}"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local filename="${env}_${timestamp}.sql.gz"

    if ! ssh "$REMOTE_HOST" "docker ps --format '{{.Names}}'" 2>/dev/null | grep -q "^${container}$"; then
        echo "  ⚠️  $env: 容器 $container 未运行，跳过"
        return 1
    fi

    mkdir -p "$BACKUP_DIR"
    echo "  📦 $env: 备份中..."
    if ssh "$REMOTE_HOST" "docker exec $container mysqldump -uroot -p$password --single-transaction --routines --triggers $DB_NAME" 2>/dev/null \
        | gzip > "$BACKUP_DIR/$filename"; then
        local size
        size=$(du -h "$BACKUP_DIR/$filename" | cut -f1)
        echo "  ✅ $env: $filename ($size)"
    else
        rm -f "$BACKUP_DIR/$filename"
        echo "  ❌ $env: 备份失败"
        return 1
    fi
}

restore_one() {
    local env="$1"
    local file="$2"
    local container="${CONTAINERS[$env]}"
    local password="${PASSWORDS[$env]}"

    if [ ! -f "$file" ]; then
        echo "  ❌ 文件不存在: $file"
        return 1
    fi

    if ! ssh "$REMOTE_HOST" "docker ps --format '{{.Names}}'" 2>/dev/null | grep -q "^${container}$"; then
        echo "  ❌ 容器 $container 未运行"
        return 1
    fi

    echo "  ⚠️  即将恢复 $env 数据库，当前数据将被覆盖！"
    read -rp "  确认恢复? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "  已取消"
        return 0
    fi

    echo "  🔄 $env: 恢复中..."
    if [[ "$file" == *.gz ]]; then
        gunzip -c "$file" | ssh "$REMOTE_HOST" "docker exec -i $container mysql -uroot -p$password $DB_NAME" 2>/dev/null
    else
        ssh "$REMOTE_HOST" "docker exec -i $container mysql -uroot -p$password $DB_NAME" 2>/dev/null < "$file"
    fi

    if [ $? -eq 0 ]; then
        echo "  ✅ $env: 恢复完成"
    else
        echo "  ❌ $env: 恢复失败"
        return 1
    fi
}

list_backups() {
    local env="${1:-}"
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "  暂无备份"
        return
    fi
    if [ -n "$env" ]; then
        ls -lht "$BACKUP_DIR"/${env}_*.sql.gz 2>/dev/null || echo "  $env 暂无备份"
    else
        ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  暂无备份"
    fi
}

install_cron() {
    local cron_cmd="0 3 * * * $SCRIPT_DIR/db-backup.sh backup >> $BACKUP_DIR/cron.log 2>&1"
    if crontab -l 2>/dev/null | grep -qF "db-backup.sh"; then
        echo "  已存在定时备份任务:"
        crontab -l | grep "db-backup.sh"
        return
    fi
    (crontab -l 2>/dev/null; echo "$cron_cmd") | crontab -
    echo "  ✅ 已安装: 每天凌晨 3:00 自动备份全部环境"
    echo "  日志: $BACKUP_DIR/cron.log"
}

case "${1:-}" in
    backup)
        echo "=== 数据库备份 ==="
        if [ -n "${2:-}" ]; then
            [ -z "${CONTAINERS[${2}]:-}" ] && echo "❌ 未知环境: $2 (可选: dev/test)" && exit 1
            backup_one "$2"
        else
            for env in dev test; do
                backup_one "$env"
            done
        fi
        cleanup_old
        ;;
    restore)
        [ -z "${2:-}" ] || [ -z "${3:-}" ] && echo "用法: $0 restore <env> <file>" && exit 1
        [ -z "${CONTAINERS[${2}]:-}" ] && echo "❌ 未知环境: $2 (可选: dev/test)" && exit 1
        echo "=== 数据库恢复 ==="
        restore_one "$2" "$3"
        ;;
    list)
        echo "=== 备份列表 ==="
        list_backups "${2:-}"
        ;;
    cron)
        echo "=== 定时备份 ==="
        install_cron
        ;;
    *)
        echo "用法: $0 {backup [env]|restore <env> <file>|list [env]|cron}"
        exit 1
        ;;
esac
