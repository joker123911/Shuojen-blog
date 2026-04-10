:: deploy.bat (Recommended Interactive Version)

@echo off
echo.
echo ===================================
echo      Auto Deploy Script
echo ===================================
echo.

:: Prompt user for a commit message
set /p commitMessage="Enter your commit message: "

:: Check if the user entered a message
if "%commitMessage%"=="" (
    echo.
    echo Error: Commit message cannot be empty!
    echo Operation cancelled.
    pause
    exit /b
)

echo.
echo --- Staging all changes (git add .) ---
git add .

echo.
echo --- Committing changes (git commit) ---
git commit -m "%commitMessage%"

echo.
echo --- Pushing changes to GitHub (git push) ---
git push

echo.
echo ===================================
echo      Operation complete!
echo ===================================
echo.
pause