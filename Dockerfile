# Use official Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY Backend/package*.json ./Backend/
RUN cd Backend && npm install

# Copy rest of project
COPY Backend ./Backend
COPY public ./public

# Expose port
EXPOSE 3000

# Start server
WORKDIR /app/Backend
CMD ["node", "app.js"]
