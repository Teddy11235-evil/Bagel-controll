@echo off
title Render Farm Worker Installer
echo [🤖] Render Farm Worker Installation
echo [🔐] Using your custom SHA256 hash
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [❌] Python is not installed or not in PATH
    echo [ℹ️] Please install Python from python.org
    pause
    exit /b 1
)

:: Install required packages
echo [📦] Installing required packages...
pip install requests psutil >nul 2>&1

if errorlevel 1 (
    echo [❌] Failed to install packages
    echo [ℹ️] Try running: pip install requests psutil
    pause
    exit /b 1
)

:: Create worker directory
set WORKER_DIR=%USERPROFILE%\render_farm_worker
if not exist "%WORKER_DIR%" mkdir "%WORKER_DIR%"

:: Copy worker script
if exist "worker.py" (
    copy "worker.py" "%WORKER_DIR%\worker.pyw" >nul
    echo [✅] Worker script copied
) else (
    echo [❌] worker.py not found in current directory
    pause
    exit /b 1
)

:: Create startup batch file
echo @echo off > "%USERPROFILE%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\render_worker.bat"
echo cd /d "%WORKER_DIR%" >> "%USERPROFILE%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\render_worker.bat"
echo start /min pythonw.exe worker.pyw >> "%USERPROFILE%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\render_worker.bat"

echo [✅] Installation complete!
echo.
echo [🔑] IMPORTANT CONFIGURATION STEPS:
echo [1] Update controller URL in worker.pyw:
echo     Find: self.controller_url = "https://your-app-name.netlify.app"
echo     Change to your actual Netlify app URL
echo.
echo [2] Set the correct password in worker.pyw:
echo     Find: self.password = "your_password_here"
echo     Change to the password that hashes to:
echo     ff3d52d9c823d32f76d86ffd3fb473c62b61ba0b67a63e6074ceda5ab19b9e3a
echo.
echo [🌐] The worker will auto-start on next boot
echo [🤫] Runs completely invisibly in background
echo [💻] Very low CPU usage when idle
echo.
pause
