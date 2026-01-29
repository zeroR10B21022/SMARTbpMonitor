@echo off
echo 正在啟動血壓紅黃綠燈系統...
echo Starting Blood Pressure Traffic Light System...
echo.

REM Try to start with Python 3
python -m http.server 8000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start http://localhost:8000
    echo 應用程式已在 http://localhost:8000 啟動
    echo Application started at http://localhost:8000
    echo.
    echo 按 Ctrl+C 關閉伺服器
    echo Press Ctrl+C to stop the server
    python -m http.server 8000
) else (
    REM If Python not available, just open the HTML file
    echo Python 未安裝，直接開啟 HTML 檔案...
    echo Python not found, opening HTML file directly...
    start index.html
)
