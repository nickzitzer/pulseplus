# Use an official Node runtime as the base image
FROM node:18

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