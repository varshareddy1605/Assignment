# Use LTS Node.js alpine image
FROM node:18-alpine

# Set container working directory
WORKDIR /app

# Copy dependency descriptors
COPY package*.json ./

# Install dependencies (only production)
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose port 8000 (requested by user)
EXPOSE 8000

# Set environment variables with defaults
ENV PORT=8000
ENV PEER_ENDPOINT=peer0.org1.example.com:7051
ENV PEER_HOST_ALIAS=peer0.org1.example.com
ENV MSP_ID=Org1MSP
ENV CHANNEL_NAME=mychannel
ENV CHAINCODE_NAME=asset-transfer

# Paths inside container where Fabric crypto credentials will be mapped
ENV CERT_PATH=/app/crypto/cert.pem
ENV KEY_PATH=/app/crypto/keystore
ENV TLS_CERT_PATH=/app/crypto/ca.crt

# Start command
CMD ["node", "app.js"]
