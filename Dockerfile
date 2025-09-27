# Use official Node.js LTS image
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make gcc g++ sqlite-dev

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the backend code
COPY . .

# Expose the backend port (default 3001)
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
