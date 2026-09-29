#!/bin/bash

# Compile the website
echo "Running npm build..."
npm run build

# Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Build successful. Moving files..."

    # Copy contents of dist to the root directory. Not mv: it refuses to
    # replace a non-empty directory (projects/ from the last publish).
    cp -r dist/. .
    rm -rf dist

    echo "Files moved to the root directory successfully."
else
    echo "Build failed. Please check the error messages above."
fi
