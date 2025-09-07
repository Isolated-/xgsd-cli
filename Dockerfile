FROM node:24-alpine

# Working directory inside container
WORKDIR /app

# Install xGSD CLI globally inside container
RUN npm install -g @xgsd/cli@0.4.0


# Default working directory where workflow will be mounted
WORKDIR /app/workflow

# Entrypoint runs xgsd CLI
ENTRYPOINT ["xgsd"]
