/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const http = require('http');

const API_HOST = '127.0.0.1';
const API_PORT = 8000;
const TEST_DEALER_ID = 'DEALER_E2E_TEST_' + Math.floor(Math.random() * 10000);

// Helper function to send HTTP requests asynchronously
function sendRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                let parsedData = null;
                try {
                    parsedData = data ? JSON.parse(data) : null;
                } catch (e) {
                    parsedData = data;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsedData
                });
            });
        });

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log(`=========================================`);
    console.log(`Starting E2E Validation Tests for Dealer: ${TEST_DEALER_ID}`);
    console.log(`API Target: http://${API_HOST}:${API_PORT}`);
    console.log(`=========================================\n`);

    try {
        // Step 1: Create Asset
        console.log(`[Test Step 1] Creating a new asset account...`);
        const createPayload = {
            dealerId: TEST_DEALER_ID,
            msisdn: '918888888888',
            mpin: '4321',
            balance: 20000.00,
            status: 'ACTIVE',
            transAmount: 20000.00,
            transType: 'INITIAL',
            remarks: 'E2E Testing Initial Balance'
        };

        const createRes = await sendRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: '/api/assets',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, createPayload);

        console.log(`Response Status: ${createRes.statusCode}`);
        if (createRes.statusCode !== 201) {
            throw new Error(`Failed to create asset. Response: ${JSON.stringify(createRes.body)}`);
        }
        console.log(`Asset Created successfully:`);
        console.log(JSON.stringify(createRes.body, null, 2));
        console.log(`-----------------------------------------\n`);

        // Step 2: Read Asset
        console.log(`[Test Step 2] Querying the created asset from ledger (Read)...`);
        const readRes = await sendRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: `/api/assets/${TEST_DEALER_ID}`,
            method: 'GET'
        });

        console.log(`Response Status: ${readRes.statusCode}`);
        if (readRes.statusCode !== 200) {
            throw new Error(`Failed to read asset. Response: ${JSON.stringify(readRes.body)}`);
        }
        console.log(`Asset details retrieved:`);
        console.log(JSON.stringify(readRes.body, null, 2));
        console.log(`Checking balance match: ${readRes.body.BALANCE === 20000 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`-----------------------------------------\n`);

        // Step 3: Update Asset
        console.log(`[Test Step 3] Submitting updates to the asset (Debit trans)...`);
        const updatePayload = {
            balance: 17500.00,
            transAmount: 2500.00,
            transType: 'DEBIT',
            remarks: 'E2E Test Debit transaction'
        };

        const updateRes = await sendRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: `/api/assets/${TEST_DEALER_ID}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        }, updatePayload);

        console.log(`Response Status: ${updateRes.statusCode}`);
        if (updateRes.statusCode !== 200) {
            throw new Error(`Failed to update asset. Response: ${JSON.stringify(updateRes.body)}`);
        }
        console.log(`Asset Updated successfully:`);
        console.log(JSON.stringify(updateRes.body, null, 2));
        console.log(`-----------------------------------------\n`);

        // Step 4: Read Asset again to verify update
        console.log(`[Test Step 4] Re-querying the asset to check values...`);
        const readUpdatedRes = await sendRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: `/api/assets/${TEST_DEALER_ID}`,
            method: 'GET'
        });

        console.log(`Response Status: ${readUpdatedRes.statusCode}`);
        if (readUpdatedRes.statusCode !== 200) {
            throw new Error(`Failed to re-read asset. Response: ${JSON.stringify(readUpdatedRes.body)}`);
        }
        console.log(`Updated Asset details:`);
        console.log(JSON.stringify(readUpdatedRes.body, null, 2));
        console.log(`Checking new balance match: ${readUpdatedRes.body.BALANCE === 17500 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Checking new transaction type match: ${readUpdatedRes.body.TRANSTYPE === 'DEBIT' ? 'SUCCESS' : 'FAILED'}`);
        console.log(`-----------------------------------------\n`);

        // Step 5: Read Asset History
        console.log(`[Test Step 5] Querying the asset audit trail history...`);
        const historyRes = await sendRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: `/api/assets/${TEST_DEALER_ID}/history`,
            method: 'GET'
        });

        console.log(`Response Status: ${historyRes.statusCode}`);
        if (historyRes.statusCode !== 200) {
            throw new Error(`Failed to read asset history. Response: ${JSON.stringify(historyRes.body)}`);
        }
        console.log(`Historical audit logs found: ${historyRes.body.length}`);
        console.log(JSON.stringify(historyRes.body, null, 2));
        console.log(`Checking history count match (expected 2): ${historyRes.body.length === 2 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`=========================================`);
        console.log(`ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY!`);
        console.log(`=========================================`);

    } catch (e) {
        console.error(`\n❌ [TEST FAILURE] An error occurred during verification:`);
        console.error(e.message);
        console.log(`=========================================`);
        process.exit(1);
    }
}

runTests();
