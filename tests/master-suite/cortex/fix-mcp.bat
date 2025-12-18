@echo off
echo ═══════════════════════════════════════════════════════════════
echo   VULPES CORTEX MCP SERVER - QUICK FIX
echo ═══════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo Step 1: Cleaning up stale files...
if exist "storage\.cortex-status.json" (
    del "storage\.cortex-status.json" 2>nul
    echo   Removed stale status file
) else (
    echo   No stale status file found
)

echo.
echo Step 2: Archiving large knowledge files...

:: Create archive directory
if not exist "storage\archive" mkdir "storage\archive"

:: Check file sizes and archive if needed
for %%f in (storage\knowledge\*.json) do (
    for %%A in ("%%f") do (
        if %%~zA GTR 100000 (
            echo   Archiving %%~nxf [%%~zA bytes]...
            copy "%%f" "storage\archive\%%~nf-%date:~-4,4%%date:~-10,2%%date:~-7,2%.json" >nul
            
            :: Truncate to empty but valid JSON
            echo {} > "%%f"
        ) else (
            echo   OK: %%~nxf [%%~zA bytes]
        )
    )
)

echo.
echo Step 3: Running optimization script...
node optimize-startup.js

echo.
echo ═══════════════════════════════════════════════════════════════
echo   DONE! Now restart Claude Desktop.
echo ═══════════════════════════════════════════════════════════════
echo.
echo Press any key to exit...
pause >nul
