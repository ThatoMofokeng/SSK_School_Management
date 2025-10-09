# Use Node.js as the base image, we use node:18 as the base image to run the application
FROM node:18  

# Set the working directory inside the container, our application runs on the app directory
WORKDIR /app

# Copy package.json and package-lock.json files, packet json is gonna install our dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Database
RUN npx prisma migrate dev --name init

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]