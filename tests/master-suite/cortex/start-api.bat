@echo off
echo ============================================================
echo Starting Vulpes Cortex API Server
echo ============================================================
cd /d "%~dp0"
node api/server.js
