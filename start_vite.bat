@echo off
cd /d "C:\Users\ouane\app"

:: Lancer Vite avec npx en arrière-plan
start /b cmd /c "npm run dev > vite_output.log 2>&1"

:: Attendre que Vite démarre (ajuste si besoin)
timeout /t 5 /nobreak >nul

:: Ouvrir l'URL de Vite dans le navigateur
start http://localhost:5174
