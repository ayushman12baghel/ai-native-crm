@echo off
echo ====================================================
echo Starting Xeno Backend (Spring Boot)
echo ====================================================

echo [1/3] Setting JAVA_HOME...
set JAVA_HOME=C:\Program Files\Java\jdk-23

echo [2/3] Checking for existing process on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    echo Found process %%a listening on port 8080. Killing it...
    taskkill /f /pid %%a /t >nul 2>&1
)

echo [3/3] Starting Spring Boot...
call .\mvnw.cmd spring-boot:run
