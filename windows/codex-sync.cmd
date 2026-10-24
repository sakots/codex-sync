@echo off
pwsh.exe -NoProfile -File "%~dp0codex-sync.ps1"
exit /b %ERRORLEVEL%