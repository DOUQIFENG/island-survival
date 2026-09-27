@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 20 或更新版本，然后再次双击此文件。
  pause
  exit /b 1
)
if not exist "node_modules\ws" (
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络。
    pause
    exit /b 1
  )
)
echo 雾海余生正在启动。关闭此窗口会停止房间服务器。
echo 打开页面后点击“自己开房”，即可单人开始，随后邀请朋友加入。
start "" "http://localhost:3000"
call npm start
pause
