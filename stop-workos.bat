@echo off
chcp 65001 > nul
title 일정열정 (Personal Work OS) 종료기

echo ========================================================
echo               일정열정 (Personal Work OS) 종료
echo ========================================================
echo.

cd /d "%~dp0"

echo [*] 서비스 컨테이너를 안전하게 중지합니다...
docker compose --env-file selfhost/.env -f selfhost/docker-compose.yml down

echo.
echo [V] 모든 서비스가 종료되었습니다.
echo.
pause
