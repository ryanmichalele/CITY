@echo off
REM ---------------------------------------------------------------------
REM  Citi dashboard - local preview
REM  Double-click this file. It starts a local server with the demo
REM  customer session already seeded and opens the dashboard in your
REM  browser. Close this window (or press Ctrl+C) to stop the server.
REM ---------------------------------------------------------------------
title Citi Dashboard - Local Preview
cd /d "%~dp0"

echo.
echo   Starting local preview server...
echo   The dashboard will open automatically at http://localhost:3111/dashboard/
echo.
echo   Press Ctrl+C in this window to stop the server.
echo.

node preview-dashboard.js

if errorlevel 1 (
  echo.
  echo   Could not start. Is Node.js installed? Try:  node preview-dashboard.js
  pause
)
