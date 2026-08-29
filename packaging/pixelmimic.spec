# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for PixelMimic (Windows, onedir).
# Run from the project root:  pyinstaller packaging\pixelmimic.spec

import os

from PyInstaller.utils.hooks import collect_all

PROJECT_ROOT = os.path.abspath(os.path.join(SPECPATH, ".."))

block_cipher = None

# ---- Data files -----------------------------------------------------------
datas = [
    # Built Vue 3 frontend, bundled at its original relative layout
    # (main.py resolves <root>/pixelmimic/gui/web/dist/index.html).
    (
        os.path.join(PROJECT_ROOT, "pixelmimic", "gui", "web", "dist"),
        os.path.join("pixelmimic", "gui", "web", "dist"),
    ),
]

# pywebview (WinForms/WebView2 interop DLLs + js), pythonnet and clr_loader
# ship non-Python runtime assets that static analysis cannot see.
binaries = []
extra_hidden = []
for _pkg in ("webview", "pythonnet", "clr_loader"):
    _d, _b, _h = collect_all(_pkg)
    datas += _d
    binaries += _b
    extra_hidden += _h

# ---- Hidden imports -------------------------------------------------------
hiddenimports = [
    "pyperclip",
    "PIL.ImageTk",                      # tkinter snipping tool
    "PIL.ImageGrab",
    "webview.platforms.winforms",
    "webview.platforms.edgechromium",
    "pynput.keyboard._win32",
    "pynput.mouse._win32",
    "pyautogui",
    "pygetwindow",
    "pyscreeze",
    "pymsgbox",
    "pytweening",
    "mouseinfo",
] + extra_hidden

# ---- Excludes (not needed at runtime, keeps the bundle small) -------------
excludes = [
    "pytest",
    "pyyaml",
    "matplotlib",
    "IPython",
    "PyQt5",
    "PyQt6",
    "PySide2",
    "PySide6",
    "numpy.tests",
    "numpy.f2py",
    "numpy.distutils",
]

a = Analysis(
    [os.path.join(PROJECT_ROOT, "main.py")],
    pathex=[PROJECT_ROOT],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="PixelMimic",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPX corrupts some cv2/numpy DLLs; Inno Setup LZMA2 does the compressing
    console=False,
    icon=os.path.join(PROJECT_ROOT, "packaging", "pixelmimic.ico"),
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="PixelMimic",
)
