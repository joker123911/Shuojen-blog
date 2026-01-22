#!/bin/bash

echo ""
echo "==================================="
echo "      Auto Deploy Script"
echo "==================================="
echo ""

# 提示使用者輸入 Commit 訊息
read -p "Enter your commit message: " commitMessage

# 檢查訊息是否為空
if [ -z "$commitMessage" ]; then
    echo ""
    echo "Error: Commit message cannot be empty!"
    echo "Operation cancelled."
    read -n 1 -s -r -p "Press any key to continue..."
    echo ""
    exit 1
fi

echo ""
echo "--- Staging all changes (git add .) ---"
git add .

echo ""
echo "--- Committing changes (git commit) ---"
git commit -m "$commitMessage"

echo ""
echo "--- Pushing changes to GitHub (git push) ---"
git push

echo ""
echo "==================================="
echo "      Operation complete!"
echo "==================================="
echo ""

read -n 1 -s -r -p "Press any key to continue..."
echo ""
