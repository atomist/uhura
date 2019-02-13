FROM atomist/sdm-base:0.0.5

RUN npm install --global yarn

RUN apt-get update && apt-get install -y \
        libfontconfig \
        dnsutils \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci \
    && npm cache clean --force

COPY . .

# Declaring a volume will instruct kaniko to skip the directory when snapshotting
VOLUME /opt/app
