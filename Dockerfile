
# Use Node.js base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN npm install

# Run Playwright install for required browsers
RUN npx playwright install --with-deps

# Start Wiremock
docker run -it --rm -p 8080:8080 wiremock/wiremock:latest

# Set environment variables (optional, or use Docker secrets/.env)
ENV NODE_ENV=dev

# Default command
CMD ["npm", "build"]
