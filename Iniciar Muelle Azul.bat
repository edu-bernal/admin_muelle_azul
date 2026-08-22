@echo off
title Muelle Azul - Servidor de desarrollo
cd /d "%~dp0"

echo ============================================
echo   Muelle Azul - Iniciando servidor local
echo ============================================
echo.
echo Carpeta: %cd%
echo.

start "" cmd /c "timeout /t 5 >nul && start http://localhost:3000"

call npm run dev

echo.
echo ============================================
echo El servidor se detuvo o hubo un error arriba.
echo ============================================
pause
