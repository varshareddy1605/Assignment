/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Environment variables with default configurations for local test-network running
const PEER_ENDPOINT = process.env.PEER_ENDPOINT || 'localhost:7051';
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com';
const MSP_ID = process.env.MSP_ID || 'Org1MSP';

const CERT_PATH = process.env.CERT_PATH;
const KEY_PATH = process.env.KEY_PATH;
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;

const CHANNEL_NAME = process.env.CHANNEL_NAME || 'mychannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'asset-transfer';

let gatewayConnection = null;
let client = null;
let network = null;
let contract = null;

// Dynamic private key reader helper
function readPrivateKey(keyPath) {
    if (!keyPath || !fs.existsSync(keyPath)) {
        throw new Error(`Private key path not found or empty: "${keyPath}"`);
    }
    
    const stats = fs.statSync(keyPath);
    if (stats.isDirectory()) {
        console.log(`[Gateway] Key path "${keyPath}" is a directory. Searching for private key...`);
        const files = fs.readdirSync(keyPath);
        const keyFile = files.find(file => file.endsWith('_sk'));
        if (!keyFile) {
            throw new Error(`No private key file (*_sk) found inside directory: ${keyPath}`);
        }
        const resolvedPath = path.join(keyPath, keyFile);
        console.log(`[Gateway] Dynamically resolved private key file: ${resolvedPath}`);
        return fs.readFileSync(resolvedPath);
    }
    
    return fs.readFileSync(keyPath);
}

async function getContract() {
    if (contract) {
        return contract;
    }

    console.log(`[Gateway] Attempting connection initialization:`);
    console.log(` - Peer Endpoint: ${PEER_ENDPOINT}`);
    console.log(` - Host Override: ${PEER_HOST_ALIAS}`);
    console.log(` - MSP ID: ${MSP_ID}`);
    console.log(` - Channel: ${CHANNEL_NAME}`);
    console.log(` - Chaincode: ${CHAINCODE_NAME}`);

    try {
        // Validate and read TLS Certificate
        if (!TLS_CERT_PATH || !fs.existsSync(TLS_CERT_PATH)) {
            throw new Error(`TLS root CA certificate not found at: "${TLS_CERT_PATH}"`);
        }
        const tlsCert = fs.readFileSync(TLS_CERT_PATH);

        // Validate and read User Certificate
        if (!CERT_PATH || !fs.existsSync(CERT_PATH)) {
            throw new Error(`Client certificate not found at: "${CERT_PATH}"`);
        }
        const credentials = fs.readFileSync(CERT_PATH);

        // Validate and read User Private Key
        const privateKeyPEM = readPrivateKey(KEY_PATH);

        // Create Private Key and Signer
        const privateKey = crypto.createPrivateKey(privateKeyPEM);
        const signer = signers.newPrivateKeySigner(privateKey);

        // Configure TLS Credentials for gRPC connection
        const tlsCredentials = grpc.credentials.createSsl(tlsCert);
        
        // Establish gRPC connection to peer
        client = new grpc.Client(PEER_ENDPOINT, tlsCredentials, {
            'grpc.ssl_target_name_override': PEER_HOST_ALIAS,
            'grpc.default_authority': PEER_HOST_ALIAS
        });

        // Initialize connection to gateway
        gatewayConnection = connect({
            client,
            identity: { mspId: MSP_ID, credentials },
            signer,
            // 5 second evaluation / submit timeouts
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
            submitOptions: () => ({ deadline: Date.now() + 5000 }),
            commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
        });

        console.log(`[Gateway] Successfully established Hyperledger Fabric gateway connection.`);

        // Get network channel and contract reference
        network = gatewayConnection.getNetwork(CHANNEL_NAME);
        contract = network.getContract(CHAINCODE_NAME);

        return contract;
    } catch (error) {
        console.error(`[Gateway Error] Initialization failed: ${error.stack}`);
        cleanup();
        throw error;
    }
}

function cleanup() {
    console.log(`[Gateway] Cleaning up resources and closing connection...`);
    if (gatewayConnection) {
        try {
            gatewayConnection.close();
        } catch (e) {
            console.error(`[Gateway] Error closing gateway connection: ${e.message}`);
        }
        gatewayConnection = null;
    }
    if (client) {
        try {
            client.close();
        } catch (e) {
            console.error(`[Gateway] Error closing gRPC client: ${e.message}`);
        }
        client = null;
    }
    network = null;
    contract = null;
    console.log(`[Gateway] Clean up completed.`);
}

module.exports = {
    getContract,
    cleanup
};
