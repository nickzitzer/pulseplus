# Use an official Node runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Create an uploads directory
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 3001

# The command will be overridden by docker-compose.yml
CMD ["npm", "run", "dev"]