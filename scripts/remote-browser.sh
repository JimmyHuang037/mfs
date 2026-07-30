#!/bin/bash
# noVNC + Chromium 远程测试环境
# 在无桌面 Linux 上启动虚拟显示器 + VNC + Web 界面
#
# 用法:
#   ./scripts/remote-browser.sh start    # 启动
#   ./scripts/remote-browser.sh stop     # 停止
#   ./scripts/remote-browser.sh status   # 查看状态

CHROMIUM="$HOME/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"
DISPLAY_NUM=99
VNC_PORT=5900
NOVNC_PORT=6080
LOG_DIR="$HOME/.remote-browser"

start() {
    mkdir -p "$LOG_DIR"

    echo "=== 1. 启动 Xvfb (虚拟显示器 :$DISPLAY_NUM) ==="
    nohup Xvfb ":$DISPLAY_NUM" -screen 0 1920x1080x24 > "$LOG_DIR/xvfb.log" 2>&1 &
    XVFB_PID=$!
    disown "$XVFB_PID"
    echo "$XVFB_PID" > "$LOG_DIR/xvfb.pid"
    echo "   PID: $XVFB_PID"

    # 等待 Xvfb 就绪
    sleep 1

    echo "=== 2. 启动 x11vnc (VNC 服务 :$VNC_PORT) ==="
    nohup x11vnc -display ":$DISPLAY_NUM" -forever -nopw -quiet > "$LOG_DIR/x11vnc.log" 2>&1 &
    X11VNC_PID=$!
    disown "$X11VNC_PID"
    echo "$X11VNC_PID" > "$LOG_DIR/x11vnc.pid"
    echo "   PID: $X11VNC_PID"

    echo "=== 3. 启动 noVNC (Web 界面 :$NOVNC_PORT) ==="
    nohup /usr/share/novnc/utils/novnc_proxy \
        --vnc "localhost:$VNC_PORT" \
        --listen "$NOVNC_PORT" \
        > "$LOG_DIR/novnc.log" 2>&1 &
    NOVNC_PID=$!
    disown "$NOVNC_PID"
    echo "$NOVNC_PID" > "$LOG_DIR/novnc.pid"
    echo "   PID: $NOVNC_PID"

    # 等待 noVNC 就绪
    sleep 2

    echo "=== 4. 启动 Chromium ==="
    nohup env DISPLAY=":$DISPLAY_NUM" "$CHROMIUM" \
        --no-sandbox \
        --disable-gpu \
        --disable-dev-shm-usage \
        --window-size=1920,1080 \
        --start-maximized \
        --disable-notifications \
        --no-first-run \
        "http://localhost:4200" \
        > "$LOG_DIR/chromium.log" 2>&1 &
    CHROME_PID=$!
    disown "$CHROME_PID"
    echo "$CHROME_PID" > "$LOG_DIR/chrome.pid"
    echo "   PID: $CHROME_PID"

    echo ""
    echo "=========================================="
    echo "  noVNC 远程浏览器已启动!"
    echo "  访问: http://$(hostname -I | awk '{print $1}'):$NOVNC_PORT/vnc.html"
    echo "  本地: http://localhost:$NOVNC_PORT/vnc.html"
    echo "=========================================="
}

stop() {
    echo "=== 停止所有进程 ==="
    for pid_file in "$LOG_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            pname=$(basename "$pid_file" .pid)
            kill "$pid" 2>/dev/null && echo "  已停止 $pname (PID: $pid)" || echo "  $pname (PID: $pid) 未运行"
            rm -f "$pid_file"
        fi
    done
    echo "=== 已全部停止 ==="
}

status() {
    echo "=== 状态检查 ==="
    for pid_file in "$LOG_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            pname=$(basename "$pid_file" .pid)
            if kill -0 "$pid" 2>/dev/null; then
                echo "  ✅ $pname (PID: $pid) 运行中"
            else
                echo "  ❌ $pname (PID: $pid) 已停止"
                rm -f "$pid_file"
            fi
        fi
    done
    echo ""
    echo "端口检查:"
    ss -tlnp 2>/dev/null | grep -E ":${VNC_PORT}|:${NOVNC_PORT}|:4200" || echo "  无服务在监听"
}

case "${1:-start}" in
    start)  start ;;
    stop)   stop ;;
    status) status ;;
    restart) stop; sleep 1; start ;;
    *)      echo "用法: $0 {start|stop|status|restart}" ;;
esac