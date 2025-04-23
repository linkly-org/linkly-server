# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.10.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /usr/src/app

################################################################################
# Create a stage for installing production dependencies.
FROM base as deps

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage bind mounts to package.json and package-lock.json to avoid having to copy them
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps as build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Copy the rest of the source files into the image.
COPY . .
# Run the build script.
RUN npm run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base as final

# Use production node environment by default.
ENV NODE_ENV production

# Copy package.json and prisma schema
COPY package.json .
COPY prisma/schema.prisma ./prisma/schema.prisma

# Copy production dependencies and built application
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
# Create logs directory and fix permissions
RUN mkdir -p /usr/src/app/logs && \
    # Fix permissions for node_modules and especially prisma directory
    chown -R node:node /usr/src/app && \
    # Ensure write permissions for prisma specifically
    chmod -R 755 /usr/src/app/node_modules && \
    mkdir -p /usr/src/app/node_modules/.prisma && \
    chmod -R 777 /usr/src/app/node_modules/.prisma && \
    # Make sure the prisma directory is writable
    mkdir -p /usr/src/app/node_modules/prisma && \
    chmod -R 777 /usr/src/app/node_modules/prisma

# Run the application as a non-root user.
USER node

# Expose the port that the application listens on.
EXPOSE 4000

# Run the application.
CMD npm run db:deploy && npm run start