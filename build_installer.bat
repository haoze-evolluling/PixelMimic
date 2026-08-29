@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "APP_VERSION=2.0.0"
set "VPY=%CD%\.venv-build\Scripts\python.exe"

echo ============================================================
echo  PixelMimic installer build
echo ============================================================

rem ---- [0/7] Prerequisites ----------------------------------------------
echo [0/7] Checking prerequisites...
where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python was not found on PATH. Python 3.10+ is required.
    exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found on PATH. Node 18+ is required to build the frontend.
    exit /b 1
)

set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%LocalAppData%\Programs\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" (
    echo ERROR: Inno Setup 6 was not found. Install it with:
    echo     winget install JRSoftware.InnoSetup
    exit /b 1
)

rem ---- [1/7] Build virtualenv -------------------------------------------
echo [1/7] Preparing build virtualenv (.venv-build)...
if not exist "%VPY%" (
    python -m venv .venv-build
    if errorlevel 1 exit /b 1
)
"%VPY%" -m pip install --upgrade pip -q

rem ---- [2/7] Dependencies ------------------------------------------------
echo [2/7] Installing dependencies...
"%VPY%" -m pip install -r requirements.txt -q
if errorlevel 1 exit /b 1
"%VPY%" -m pip install pyinstaller -q
if errorlevel 1 exit /b 1

rem ---- [3/7] Tests --------------------------------------------------------
echo [3/7] Running unit tests...
"%VPY%" -m pytest tests -q
if errorlevel 1 (
    echo ERROR: tests failed, aborting build.
    exit /b 1
)

rem ---- [4/7] Frontend -----------------------------------------------------
echo [4/7] Building frontend...
pushd frontend
if not exist node_modules (
    call npm install
    if errorlevel 1 (popd & exit /b 1)
)
call npm run build
if errorlevel 1 (popd & exit /b 1)
popd

rem ---- [5/7] Freeze with PyInstaller -------------------------------------
echo [5/7] Freezing application with PyInstaller...
rem pytest/pyyaml are dev-only, and opencv-python-headless drops the unused
rem Qt GUI DLLs (the app has no cv2.imshow calls) for a smaller bundle.
"%VPY%" -m pip uninstall -y opencv-python pytest pyyaml -q
rem --force-reinstall is required: opencv-python's uninstall removes the shared
rem cv2/ files while headless' dist-info survives, so a plain install is a no-op.
"%VPY%" -m pip install --force-reinstall --no-deps opencv-python-headless -q
if errorlevel 1 exit /b 1

if not exist "%CD%\packaging\pixelmimic.ico" (
    "%VPY%" packaging\make_icon.py
    if errorlevel 1 exit /b 1
)

rem NOTE: do not pass --clean here; a cold rebuild drops the bundled
rem pixelmimic/gui/web/dist data files (PyInstaller quirk). The workpath
rem cache keeps the datas intact and makes rebuilds faster.
"%VPY%" -m PyInstaller packaging\pixelmimic.spec --noconfirm --distpath dist --workpath build\work
if errorlevel 1 (
    echo ERROR: PyInstaller failed.
    exit /b 1
)

rem ---- [6/7] WebView2 bootstrapper (downloaded once, ~2 MB) ---------------
echo [6/7] Checking WebView2 bootstrapper...
if not exist "packaging\MicrosoftEdgeWebview2Setup.exe" (
    curl -L -f -o "packaging\MicrosoftEdgeWebview2Setup.exe" "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
    if errorlevel 1 (
        echo ERROR: failed to download the WebView2 bootstrapper.
        exit /b 1
    )
)

rem ---- [7/7] Installer -----------------------------------------------------
echo [7/7] Compiling installer with Inno Setup...
"%ISCC%" "packaging\pixelmimic.iss"
if errorlevel 1 (
    echo ERROR: Inno Setup compilation failed.
    exit /b 1
)

echo.
echo ============================================================
echo  Build OK:
echo    - Portable App: dist\PixelMimic\PixelMimic.exe
echo    - Installer:    dist\installer\PixelMimicSetup-%APP_VERSION%.exe
echo ============================================================
endlocal
