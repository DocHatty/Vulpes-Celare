@echo off
:: ═══════════════════════════════════════════════════════════════════════════════
:: VULPES CORTEX - COMPLETE API INTEGRATION INSTALLER
:: ═══════════════════════════════════════════════════════════════════════════════
:: This script:
:: 1. Patches tools.js to use async API
:: 2. Starts the API server
:: 3. Verifies everything works
:: ═══════════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  VULPES CORTEX - API INTEGRATION INSTALLER                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Step 1: Check if patch was already applied
echo [1/4] Checking if patch is already applied...
findstr /C:"runTestsViaAPI" mcp\tools.js >nul 2>&1
if !errorlevel! equ 0 (
    echo       ✓ Patch already applied
    goto :check_api
)

:: Step 2: Apply patch
echo [2/4] Applying patch to tools.js...
node mcp\patch-tools.js
if !errorlevel! neq 0 (
    echo       ✗ Patch failed!
    echo       Please check mcp\patch-tools.js for errors
    pause
    exit /b 1
)
echo       ✓ Patch applied successfully

:check_api
:: Step 3: Check if API server is running
echo [3/4] Checking if API server is running...
curl -s http://localhost:3101/health >nul 2>&1
if !errorlevel! equ 0 (
    echo       ✓ API server is already running
    goto :verify
)

:: Start API server in new window
echo [3/4] Starting API server...
start "Vulpes Cortex API Server" cmd /c "node api\server.js"
timeout /t 3 /nobreak >nul

:: Wait for API to be ready
echo       Waiting for API server to start...
set /a attempts=0
:wait_loop
set /a attempts+=1
if !attempts! gtr 10 (
    echo       ✗ API server failed to start after 10 seconds
    echo       Check if port 3101 is available
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
curl -s http://localhost:3101/health >nul 2>&1
if !errorlevel! neq 0 goto :wait_loop

echo       ✓ API server started successfully

:verify
:: Step 4: Verify integration
echo [4/4] Verifying integration...

curl -s http://localhost:3101/health >nul 2>&1
if !errorlevel! neq 0 (
    echo       ✗ API health check failed
    pause
    exit /b 1
)
echo       ✓ API health check passed

findstr /C:"runTestsViaAPI" mcp\tools.js >nul 2>&1
if !errorlevel! neq 0 (
    echo       ✗ tools.js not patched correctly
    pause
    exit /b 1
)
echo       ✓ tools.js properly patched

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ✓ INSTALLATION COMPLETE                                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Integration Status:
echo   ✓ tools.js patched with async API execution
echo   ✓ API server running on port 3101
echo   ✓ All systems operational
echo.
echo Next Steps:
echo   1. Restart Claude Desktop (or your MCP client)
echo   2. Run a test: "Can you run a quick test?"
echo   3. Check API-INTEGRATION-GUIDE.md for details
echo.
echo API Server is running in separate window.
echo Close that window to stop the API server.
echo.
pause
