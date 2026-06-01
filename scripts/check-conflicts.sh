#!/bin/bash
# A utility script to quickly detect if there are any leftover git conflict markers in the repository.

echo "🔍 Scanning for merge conflict markers (<<<<<<<, =======, >>>>>>>)..."

# Use grep to recursively search for markers, ignoring common large/build directories
CONFLICT_FILES=$(grep -rl -E '^<<<<<<< HEAD|^=======|^>>>>>>> ' --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=venv --exclude-dir=dist --exclude-dir=__pycache__ .)

if [ -n "$CONFLICT_FILES" ]; then
    echo "❌ ERROR: Merge conflict markers found in the following files:"
    echo "$CONFLICT_FILES"
    echo "Please resolve these conflicts, save the files, and run this script again."
    exit 1
else
    echo "✅ Success: No merge conflict markers found! Your branch is clean."
    exit 0
fi
