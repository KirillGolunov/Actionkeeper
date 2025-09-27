#!/bin/bash

set -e

echo "=== TimeTracker Installation ==="

default_url="https://actionlog.ru"
read -p "Enter the public URL for your frontend (e.g., https://actionlog.ru): " APP_BASE_URL
APP_BASE_URL=${APP_BASE_URL:-$default_url}
if [[ ! "$APP_BASE_URL" =~ ^https?:// ]]; then
  APP_BASE_URL="https://$APP_BASE_URL"
fi

default_acme_email="admin@actionlog.ru"
read -p "Enter email for Let's Encrypt notifications [$default_acme_email]: " ACME_EMAIL
ACME_EMAIL=${ACME_EMAIL:-$default_acme_email}

read -p "Enter SMTP host: " SMTP_HOST
read -p "Enter SMTP port (e.g., 587): " SMTP_PORT
read -p "Enter SMTP user: " SMTP_USER
read -s -p "Enter SMTP password: " SMTP_PASS
echo
read -p "Enter SMTP from email: " SMTP_FROM
read -p "Use secure SMTP? (true/false): " SMTP_SECURE
echo

echo "The MAGIC_LINK_SECRET is used to securely generate and validate magic login links sent to users by email."
echo "It is critical for the security of your authentication system."
echo "Please provide a strong, random value at least 10 characters long."
read -p "Enter a secret for magic links: " MAGIC_LINK_SECRET

DB_PATH="/app/data/time_tracker.db"

cat > .env <<EOF
NODE_ENV=production
APP_BASE_URL=$APP_BASE_URL
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=$SMTP_FROM
SMTP_SECURE=$SMTP_SECURE
MAGIC_LINK_SECRET=$MAGIC_LINK_SECRET
DB_PATH=$DB_PATH
ACME_EMAIL=$ACME_EMAIL
EOF

echo ".env file created!"

echo
read -p "Do you want to pull and start the app now? (y/n): " START_NOW
if [[ "$START_NOW" == "y" || "$START_NOW" == "Y" ]]; then
  docker compose pull
  docker compose up -d --remove-orphans
  echo "App started! Visit $APP_BASE_URL in your browser once DNS is pointing to this server."
else
  echo "You can start the app later with: docker compose pull && docker compose up -d --remove-orphans"
fi
