FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variable
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the development server
CMD ["npm", "run", "dev"]

