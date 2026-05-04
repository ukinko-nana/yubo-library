@echo off
cd /d "%~dp0"
set PORT=8081
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:8081/editor.html'"
node server.js
