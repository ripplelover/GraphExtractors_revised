@echo off
chcp 65001 >nul
echo ========================================
echo 새 브랜치 생성 및 GitHub 푸시
echo ========================================
echo.

REM 현재 디렉토리로 이동
cd /d "%~dp0"

REM Git이 설치되어 있는지 확인
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Git이 설치되어 있지 않거나 PATH에 없습니다.
    echo Git을 설치하거나 PATH에 추가해주세요.
    pause
    exit /b 1
)

REM Git 저장소가 초기화되어 있는지 확인
if not exist ".git" (
    echo Git 저장소가 초기화되지 않았습니다. 초기화를 진행합니다...
    git init
    if %errorlevel% neq 0 (
        echo [오류] Git 초기화에 실패했습니다.
        pause
        exit /b 1
    )
)

REM 리모트 저장소 확인 및 추가
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo 리모트 저장소를 추가합니다...
    git remote add origin https://github.com/ripplelover/GraphExtractors_revised.git
)

REM 현재 브랜치 확인
echo.
echo 현재 브랜치 확인 중...
git branch --show-current
echo.

REM 새 브랜치 이름 입력 받기
set /p BRANCH_NAME="새 브랜치 이름을 입력하세요 (기본값: feature/create-page-updates): "
if "%BRANCH_NAME%"=="" set BRANCH_NAME=feature/create-page-updates

echo.
echo 브랜치 '%BRANCH_NAME%' 생성 중...
git checkout -b %BRANCH_NAME%
if %errorlevel% neq 0 (
    echo [경고] 브랜치 생성에 실패했습니다. 이미 존재하는 브랜치일 수 있습니다.
    echo 기존 브랜치로 전환합니다...
    git checkout %BRANCH_NAME%
)

REM 변경사항 확인
echo.
echo 변경사항 확인 중...
git status

REM 변경사항이 있으면 추가 및 커밋
git add . >nul 2>&1
git diff --cached --quiet
if %errorlevel% neq 0 (
    echo.
    echo 변경사항을 커밋합니다...
    git commit -m "Update CreatePage component and related features"
    if %errorlevel% neq 0 (
        echo [경고] 커밋에 실패했습니다.
    )
) else (
    echo 변경사항이 없습니다.
)

REM GitHub에 푸시
echo.
echo GitHub에 푸시 중...
git push -u origin %BRANCH_NAME%
if %errorlevel% neq 0 (
    echo.
    echo [오류] 푸시에 실패했습니다.
    echo 다음을 확인해주세요:
    echo 1. GitHub 인증이 되어 있는지
    echo 2. 리모트 저장소 URL이 올바른지
    echo 3. 네트워크 연결 상태
    pause
    exit /b 1
)

echo.
echo ========================================
echo 완료! 브랜치 '%BRANCH_NAME%'가 GitHub에 푸시되었습니다.
echo ========================================
echo.
pause

