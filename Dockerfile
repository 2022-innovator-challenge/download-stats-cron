FROM node:18

# Create app directory

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/google-chrome

RUN useradd cron -U -d /home/cron
RUN mkdir /home/cron
RUN chown -R cron:cron /home/cron

# RUN apt-get update && apt-get install \
#   libnss3 \
#   libxss1 \
#   libasound2 \
#   libatk-bridge2.0-0 \
#   libgtk-3-0 \
#   libdrm2 \
#   libgbm-dev \
#   -y

RUN apt-get update && apt-get install curl gnupg -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

# Bundle app source
COPY . .
RUN npx tsc

USER cron

# EXPOSE 8080
CMD [ "node", "index.js" ]