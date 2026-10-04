@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>&1
title PixelMimic

echo ===================================================
echo     PixelMimic - Desktop Visual Automation Master
echo ===================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo [错误] 未检测到 Python 环境，请先安装 Python 3.10+ 并添加至 PATH 环境变量。
    pause
    exit /b 1
)

:: Check and install requirements
echo [1/2] 正在检查与配置依赖环境 (Checking dependencies)...
pip install -r requirements.txt --quiet --disable-pip-version-check

:: Launch application
echo [2/2] 正在启动 PixelMimic 应用程序 (Starting application)...
python main.py

if %errorlevel% neq 0 (
    echo.
    echo [提示] 应用程序异常退出，错误代码: %errorlevel%
    pause
)
