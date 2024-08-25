# Use an official Node runtime as the base image
FROM node:18

# Declare build arguments
ARG BACKEND_PORT
ARG JWT_SECRET
ARG SESSION_SECRET
ARG NODE_ENV
ARG POSTGRES_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG REBUILD_DB
ARG FRONTEND_PORT
ARG NEXT_PUBLIC_BACKEND_PORT

# Set environment variables from build arguments
ENV BACKEND_PORT=$BACKEND_PORT
ENV JWT_SECRET=$JWT_SECRET
ENV SESSION_SECRET=$SESSION_SECRET
ENV NODE_ENV=$NODE_ENV
ENV POSTGRES_URL=$POSTGRES_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV REBUILD_DB=$REBUILD_DB
ENV FRONTEND_PORT=$FRONTEND_PORT
ENV BACKEND_PORT=$BACKEND_PORT

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install || (sleep 5 && npm install)

# Copy the rest of the backend code
COPY . .

# Load environment variables from .env file
RUN npm install dotenv

# Create an uploads directory
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the app
CMD ["sh", "-c", "if [ \"$REBUILD_DB\" = \"true\" ]; then node database/rebuildDatabase.js; fi && npm start"]