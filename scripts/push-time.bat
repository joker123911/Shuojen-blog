:: deploy_date_support.bat (Recommended Version)

@echo off
setlocal enabledelayedexpansion

echo.
echo ===================================
echo    Auto Deploy Script (Date Support)
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

:CHOOSE_WHEN
echo.
echo Please select a deployment option:
echo   [1] Deploy Now
echo   [2] Schedule for Today
echo   [3] Schedule for Tomorrow
echo   [4] Schedule for the Day After Tomorrow
echo   [5] Cancel
echo.
choice /c 12345 /m "Enter your choice: "

if errorlevel 5 goto CANCEL
if errorlevel 4 goto SET_DAY_AFTER
if errorlevel 3 goto SET_TOMORROW
if errorlevel 2 goto SET_TODAY
if errorlevel 1 goto DEPLOY_NOW

:SET_TODAY
set dayOffset=0
set "dayName=Today"
goto PROMPT_FOR_TIME

:SET_TOMORROW
set dayOffset=86400
set "dayName=Tomorrow"
goto PROMPT_FOR_TIME

:SET_DAY_AFTER
set dayOffset=172800
set "dayName=the Day After Tomorrow"
goto PROMPT_FOR_TIME

:PROMPT_FOR_TIME
echo.
set /p scheduleTime="Enter deployment time for %dayName% (HH:MM in 24-hour format): "

:: A simple validation to check for the colon ":"
echo %scheduleTime% | find ":" > nul
if errorlevel 1 (
    echo.
    echo Error: Invalid time format. Please use HH:MM.
    goto PROMPT_FOR_TIME
)

:: --- Time Calculation Logic ---
:: Parse target time
set targetHH=%scheduleTime:~0,2%
set targetMM=%scheduleTime:~3,2%

:: Parse current time
set currentHH=%TIME:~0,2%
set currentMM=%TIME:~3,2%
set currentSS=%TIME:~6,2%

:: Convert all times to seconds from midnight
:: The "1" prefix is a trick to avoid issues with numbers like 08, 09 in batch
set /a targetSec = (1%targetHH% - 100) * 3600 + (1%targetMM% - 100) * 60
set /a currentSec = (1%currentHH% - 100) * 3600 + (1%currentMM% - 100) * 60 + (1%currentSS% - 100)

:: Calculate the time difference as if it were all on the same day
set /a timeDelay = targetSec - currentSec

:: Add the offset for the chosen day (0 for today, 86400 for tomorrow, etc.)
set /a totalDelay = timeDelay + dayOffset

:: Check if the calculated final time has already passed
if %totalDelay% lss 0 (
    echo.
    echo Error: The scheduled time has already passed! Please try again.
    pause
    goto CHOOSE_WHEN
)

:: --- Wait for the calculated duration ---
echo.
echo -----------------------------------
echo Scheduled for %dayName% at %scheduleTime%.
echo Waiting for %totalDelay% seconds...
echo DO NOT close this window!
echo -----------------------------------
echo.
timeout /t %totalDelay%
goto DEPLOY_NOW

:DEPLOY_NOW
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
echo     Operation complete!
echo ===================================
echo.
pause
goto END

:CANCEL
echo.
echo Operation cancelled by user.
echo.
pause

:END