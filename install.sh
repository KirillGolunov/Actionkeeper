#!/bin/bash

REPO_URL="https://github.com/KirillGolunov/TimeTracker.git"
TARGET_DIR="TimeTracker"

echo "Cloning TimeTracker repository from $REPO_URL..."

if [ -d "$TARGET_DIR" ]; then
  echo "Directory $TARGET_DIR already exists. Skipping clone."
else
  git clone "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR" || exit 1

echo "Installing server dependencies..."
npm install

if [ -d "client" ]; then
  echo "Installing client dependencies..."
  cd client
  npm install
  cd ..
fi

echo "Setup complete!"