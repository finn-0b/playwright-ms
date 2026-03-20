FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV PORT=8080
ENV HEADLESS=true
EXPOSE 8080
CMD ["npm", "start"]