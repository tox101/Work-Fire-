# 일정열정 실행 스크립트
$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "               일정열정 (Personal Work OS)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$workDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workDir

# 1. Docker 상태 확인
Write-Host "[1/3] Docker 엔진 상태 확인 중..." -ForegroundColor Yellow
$dockerOk = $false
try {
    $ver = & docker info --format '{{.ServerVersion}}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $ver) { $dockerOk = $true }
} catch {}

if (-not $dockerOk) {
    Write-Host "[*] Docker Desktop이 실행되어 있지 않습니다. 시작 중..." -ForegroundColor DarkYellow
    Start-Process "C:\Users\tox10\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
    
    $timeout = 60
    while ($timeout -gt 0) {
        Start-Sleep -Seconds 3
        try {
            $ver = & docker info --format '{{.ServerVersion}}' 2>$null
            if ($LASTEXITCODE -eq 0 -and $ver) {
                $dockerOk = $true
                break
            }
        } catch {}
        $timeout -= 3
        Write-Host "    ... Docker 엔진 준비 대기 중 ($timeout 초 남음)" -ForegroundColor Gray
    }
}

if (-not $dockerOk) {
    Write-Host "[!] Docker 엔진을 실행할 수 없습니다. Docker Desktop 창을 확인해주세요." -ForegroundColor Red
    Start-Sleep -Seconds 5
    exit 1
}

Write-Host "[V] Docker 엔진 정상 작동 확인" -ForegroundColor Green
Write-Host ""

# 2. Docker Compose 구동
Write-Host "[2/3] 서비스 컨테이너 구동 중 (MySQL + 일정열정)..." -ForegroundColor Yellow
& docker compose --env-file selfhost/.env -f selfhost/docker-compose.yml up -d

Write-Host "[V] 컨테이너 구동 완료" -ForegroundColor Green
Write-Host ""

# 3. 브라우저 오픈
Write-Host "[3/3] 브라우저 열기 (http://127.0.0.1:3000)..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Start-Process "http://127.0.0.1:3000"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  접속 주소 : http://127.0.0.1:3000" -ForegroundColor White
Write-Host "  관리자 비밀번호 : b1fa985b5f9db7c41da7ca236889e09d0c8fb0fd" -ForegroundColor DarkCyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Start-Sleep -Seconds 3
