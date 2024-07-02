#!/bin/bash

# Compile the website
echo "Running npm build..."
npm run build

# Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Build successful. Moving files..."

    # Move contents of dist to the root directory
    mv dist/* .

    # Remove the now empty dst directory
    rmdir dist

    echo "Files moved to the root directory successfully."
else
    echo "Build failed. Please check the error messages above."
fi
