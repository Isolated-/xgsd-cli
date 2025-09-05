FROM node:24-alpine

# Working directory inside container
WORKDIR /app

# Install xGSD CLI globally inside container
#RUN npm install -g xgsd-cli@0.3.3

COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build

# Default working directory where workflow will be mounted
WORKDIR /app/workflow

# Entrypoint runs xgsd CLI
ENTRYPOINT ["./bin/run.js"]
