FROM node:20-slim

# Instalacja Chromium, xvfb, xauth, PHP CLI
RUN apt-get update && apt-get install -y \
  chromium \
  xvfb \
  xauth \
  php-cli \
  curl \
  cron \
  libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 \
  libxtst6 libnss3 libxrandr2 libasound2 libpangocairo-1.0-0 \
  libatk-bridge2.0-0 libgtk-3-0 libdrm2 libgbm1 \
  --no-install-recommends && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj package.json, zainstaluj Puppeteer
COPY package*.json ./
RUN npm install

# Skopiuj pozostałe pliki (JS, PHP, SH itd.)
COPY . .

# Domyślne wejście: bash (do testowania interaktywnego)
CMD ["bash"]