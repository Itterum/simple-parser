FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose worker port
EXPOSE 3000

# Start the worker
CMD ["npm", "start"]
