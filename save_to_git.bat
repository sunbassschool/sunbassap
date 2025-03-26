@echo off
cd /d C:\Users\ouane\app
setlocal

:: Vérifie si des changements existent
git diff --quiet && git diff --cached --quiet
IF %ERRORLEVEL% EQU 0 (
    echo Rien à commit.
    pause
    exit /b
)

:: Génère un message de commit auto
for /f "tokens=1-4 delims=/ " %%a in ("%date%") do (
    set jour=%%a
    set mois=%%b
    set an=%%c
)
for /f "tokens=1-3 delims=: " %%a in ("%time%") do (
    set heure=%%a
    set minute=%%b
)

set commitMessage=auto update %an%-%mois%-%jour% %heure%h%minute%

git add .
git commit -m "%commitMessage%"
git push

endlocal
pause
