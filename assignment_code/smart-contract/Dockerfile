# Use Node.js LTS alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency definition
COPY package*.json ./

# Install chaincode dependencies
RUN npm install --omit=dev

# Copy contract source code
COPY . .

# Expose the CCAAS server port
EXPOSE 9999

# Run as a CCAAS server using npm start
# CHAINCODE_SERVER_ADDRESS and CHAINCODE_ID are injected by the deployCCAAS script at runtime
CMD ["npm", "start"]
