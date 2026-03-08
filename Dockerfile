# Use official Playwright image
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Create app directory
WORKDIR /app

# Install dependencies separately to leverage cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Ensure environment file is handled by volume at runtime, not build time
# but we can provide a default for safety
ENV PORT=8080
ENV HEADLESS=true

EXPOSE 8080

CMD ["npm", "start"]
