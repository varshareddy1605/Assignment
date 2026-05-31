# Hyperledger Fabric Asset Management System

This repository implements a secure, transparent, and immutable blockchain-based Asset Management System for a financial institution. The system tracks account assets with specific attributes and logs their audit trail/history in a distributed ledger.

---

## 📁 Repository Structure
```text
assignment/                      # Main Workspace Folder
├── fabric-samples/              # Hyperledger Fabric standard samples and test network
└── assignment_code/             # Custom implementation folder
    ├── smart-contract/          # Smart Contract (Chaincode) in JavaScript
    │   ├── lib/
    │   │   └── assetContract.js # Core Smart Contract logic
    │   ├── index.js             # Contract entrypoint
    │   └── package.json         # Chaincode dependencies
    ├── rest-api/                # Express REST API in JavaScript
    │   ├── controllers/
    │   │   └── assetController.js # API Controller (methods wrapper)
    │   ├── routes/
    │   │   └── assetRoutes.js   # API Endpoint routes
    │   ├── utils/
    │   │   └── gateway.js       # Fabric Gateway Connection utility
    │   ├── app.js               # Express application entrypoint
    │   ├── Dockerfile           # Docker configuration for containerization
    │   └── package.json         # API dependencies
    └── README.md                # This file (Detailed Documentation)
```

---

## 🔧 Prerequisites

Verify that the following tools are installed on your Linux system:
* **Docker** (version 20.10+ recommended)
* **Docker Compose** (V2, command `docker compose`)
* **Node.js** (version 18 is required/recommended)
* **Git** and **curl**

If Node.js is not installed, install it using **NVM (Node Version Manager)**:
```bash
# Download and install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node.js v18
nvm install 18
nvm use 18
```

---

## 🚀 Step-by-Step Setup Guide

### Level-1: Setup Hyperledger Fabric Test Network
We download the Hyperledger Fabric binaries, Docker images, and configuration files, and launch the network using the `couchdb` state database.

1. **Bootstrap Hyperledger Fabric**:
   Run the following command from the `assignment` (main) folder to clone `fabric-samples` and download Fabric binaries (v2.5.4) and CA (v1.5.8):
   ```bash
   curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.5.4 1.5.8
   ```

2. **Start the Network and Create Channel with CouchDB**:
   Change directory to the `test-network` folder and launch the nodes:
   ```bash
   cd fabric-samples/test-network
   ./network.sh up createChannel -c mychannel -ca -s couchdb
   ```
   *Note: The `-s couchdb` flag launches CouchDB containers mapped to the peers, replacing the default LevelDB world state DB.*

---

### Level-2: Package and Deploy the Smart Contract
Deploy the custom smart contract to the newly created channel.

1. **Deploy the Chaincode**:
   From the `fabric-samples/test-network` directory, run the deployment script targeting our JavaScript smart contract:
   ```bash
   ./network.sh deployCC -ccn asset-transfer -ccp /home/varsha/assignment/assignment_code/smart-contract -ccl javascript
   ```
   This script:
   - Packages the smart contract located in `assignment_code/smart-contract`.
   - Installs the chaincode package on the peer nodes.
   - Approves and commits the chaincode definition on `mychannel`.

---

### Level-3: Run and Dockerize the REST API

The REST API utilizes the modern `@hyperledger/fabric-gateway` client SDK to connect to the peer's gateway.

#### Option A: Running the REST API Locally (On Host Machine)

1. **Export the Connection Environment Variables**:
   Open a terminal in `/home/varsha/assignment/assignment_code/rest-api` and export the variables containing the cryptographic material paths:
   ```bash
   # Set the path to the fabric-samples root directory
   export FABRIC_SAMPLES_DIR=/home/varsha/assignment/fabric-samples
   
   # Set environment variables for the gateway connection
   export PEER_ENDPOINT=localhost:7051
   export PEER_HOST_ALIAS=peer0.org1.example.com
   export MSP_ID=Org1MSP
   export CHANNEL_NAME=mychannel
   export CHAINCODE_NAME=asset-transfer
   export CERT_PATH=${FABRIC_SAMPLES_DIR}/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem
   export KEY_PATH=${FABRIC_SAMPLES_DIR}/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore
   export TLS_CERT_PATH=${FABRIC_SAMPLES_DIR}/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
   ```

2. **Install dependencies and Start the API**:
   ```bash
   cd /home/varsha/assignment/assignment_code/rest-api
   npm install
   node app.js
   ```
   The server will start listening at `http://127.0.0.1:8000`.

---

#### Option B: Running the REST API in Docker (Containerized)

To let the REST API container talk to the Fabric nodes, we run it on the same Docker network (`fabric_test`) and mount the peer crypto credentials as volumes.

1. **Build the REST API Docker Image**:
   ```bash
   cd /home/varsha/assignment/assignment_code/rest-api
   docker build -t asset-rest-api:latest .
   ```

2. **Run the REST API Container**:
   Map the cryptographical assets into the container and connect it to the `fabric_test` network:
   ```bash
   docker run -d \
     --name asset-api \
     --network fabric_test \
     -p 8000:8000 \
     -e PORT=8000 \
     -e PEER_ENDPOINT=peer0.org1.example.com:7051 \
     -e PEER_HOST_ALIAS=peer0.org1.example.com \
     -e MSP_ID=Org1MSP \
     -e CHANNEL_NAME=mychannel \
     -e CHAINCODE_NAME=asset-transfer \
     -e CERT_PATH=/app/crypto/User1@org1.example.com-cert.pem \
     -e KEY_PATH=/app/crypto/keystore \
     -e TLS_CERT_PATH=/app/crypto/ca.crt \
     -v /home/varsha/assignment/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem:/app/crypto/User1@org1.example.com-cert.pem \
     -v /home/varsha/assignment/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore:/app/crypto/keystore \
     -v /home/varsha/assignment/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt:/app/crypto/ca.crt \
     asset-rest-api:latest
   ```

---

## 🔍 End-to-End Verification Flows

Open a new terminal window to execute the test `curl` queries. Detailed API structures are documented in [api.md](file:///home/varsha/assignment/assignment_code/api.md).

### 1. Create a New Asset Account
Creates dealer ID `DEALER101` with an initial balance of `15000`:
```bash
curl -X POST http://127.0.0.1:8000/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "dealerId": "DEALER101",
    "msisdn": "919999999999",
    "mpin": "1234",
    "balance": 15000.00,
    "status": "ACTIVE",
    "transAmount": 15000.00,
    "transType": "INITIAL",
    "remarks": "Initial load"
  }'
```

### 2. Read current Asset Account values
Verify that the account details were correctly saved:
```bash
curl -X GET http://127.0.0.1:8000/api/assets/DEALER101
```

### 3. Update the Asset Account values (Transaction Modification)
Change the balance and record a debit transaction of `2500`:
```bash
curl -X PUT http://127.0.0.1:8000/api/assets/DEALER101 \
  -H "Content-Type: application/json" \
  -d '{
    "balance": 12500.00,
    "transAmount": 2500.00,
    "transType": "DEBIT",
    "remarks": "Debit transaction for inventory purchase"
  }'
```

### 4. Read the Asset again to confirm the update
Verify that the state reflects the new balance:
```bash
curl -X GET http://127.0.0.1:8000/api/assets/DEALER101
```

### 5. Query CouchDB directly (Optional verification)
Open a web browser and navigate to the CouchDB dashboard:
`http://127.0.0.1:5984/_utils`
Use credentials `admin` / `adminpw`. You can see the database named `mychannel_asset-transfer` containing the `DEALER101` document in JSON format.

### 6. Retrieve Asset Transaction history (Audit trail)
Retrieve the immutable ledger history of `DEALER101` showing both the creation and update transactions:
```bash
curl -X GET http://127.0.0.1:8000/api/assets/DEALER101/history
```
