#!/bin/bash

# Configuration
VPS_USER="YOUR_VPS_USERNAME"
VPS_IP="YOUR_VPS_IP"
DEPLOY_PATH="/var/www/time-tracker"

# Build the React app
echo "Building React app..."
cd client
npm run build
cd ..

# Create deployment package
echo "Creating deployment package..."
tar -czf deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='deploy.tar.gz' \
    --exclude='client/node_modules' \
    .

# Copy to server
echo "Copying files to server..."
scp deploy.tar.gz $VPS_USER@$VPS_IP:$DEPLOY_PATH/

# Execute deployment on server
echo "Executing deployment on server..."
ssh $VPS_USER@$VPS_IP << EOF
    cd $DEPLOY_PATH
    tar -xzf deploy.tar.gz
    rm deploy.tar.gz
    npm install --production
    pm2 reload ecosystem.config.js --env production
EOF

# Clean up
rm deploy.tar.gz

echo "Deployment complete!" 