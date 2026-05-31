/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { getContract } = require('../utils/gateway');

// Helper to decode transaction response bytes to UTF-8 string
function decodeResponse(bytes) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}

// 1. Create Asset Account (POST /api/assets)
async function createAsset(req, res) {
    const { dealerId, msisdn, mpin, balance, status, transAmount, transType, remarks } = req.body;
    console.log(`[REST API] Handler: createAsset triggered for DEALERID: "${dealerId}"`);

    // Strict Input Validation
    if (!dealerId || typeof dealerId !== 'string' || dealerId.trim() === '') {
        console.warn('[REST API Validation Warning] Invalid DEALERID provided');
        return res.status(400).json({ error: 'DEALERID is required and must be a non-empty string' });
    }
    if (!msisdn || typeof msisdn !== 'string' || msisdn.trim() === '') {
        console.warn('[REST API Validation Warning] Invalid MSISDN provided');
        return res.status(400).json({ error: 'MSISDN is required and must be a non-empty string' });
    }
    if (!mpin || typeof mpin !== 'string' || mpin.trim() === '') {
        console.warn('[REST API Validation Warning] Invalid MPIN provided');
        return res.status(400).json({ error: 'MPIN is required and must be a non-empty string' });
    }
    if (balance === undefined || isNaN(parseFloat(balance))) {
        console.warn('[REST API Validation Warning] Invalid BALANCE provided');
        return res.status(400).json({ error: 'BALANCE is required and must be a valid number' });
    }
    if (!status || typeof status !== 'string' || status.trim() === '') {
        console.warn('[REST API Validation Warning] Invalid STATUS provided');
        return res.status(400).json({ error: 'STATUS is required and must be a non-empty string' });
    }
    if (transAmount === undefined || isNaN(parseFloat(transAmount))) {
        console.warn('[REST API Validation Warning] Invalid TRANSAMOUNT provided');
        return res.status(400).json({ error: 'TRANSAMOUNT is required and must be a valid number' });
    }
    if (!transType || typeof transType !== 'string' || transType.trim() === '') {
        console.warn('[REST API Validation Warning] Invalid TRANSTYPE provided');
        return res.status(400).json({ error: 'TRANSTYPE is required and must be a non-empty string' });
    }
    if (!remarks || typeof remarks !== 'string' || remarks.trim() === '') {
        console.warn('[REST API Validation Warning] Invalid REMARKS provided');
        return res.status(400).json({ error: 'REMARKS is required and must be a non-empty string' });
    }

    try {
        const contract = await getContract();
        console.log(`[REST API] Submitting CreateAsset to smart contract...`);

        // Submit transaction (requires consensus and commits block)
        const resultBytes = await contract.submitTransaction(
            'CreateAsset',
            dealerId.trim(),
            msisdn.trim(),
            mpin.trim(),
            balance.toString(),
            status.trim(),
            transAmount.toString(),
            transType.trim(),
            remarks.trim()
        );

        const resultStr = decodeResponse(resultBytes);
        console.log(`[REST API] CreateAsset successfully committed. Ledger Response: ${resultStr}`);
        
        const createdAsset = JSON.parse(resultStr);
        return res.status(201).json(createdAsset);
    } catch (error) {
        console.error(`[REST API Error] CreateAsset execution failed: ${error.stack}`);
        return res.status(500).json({ error: `Failed to create asset: ${error.message}` });
    }
}

// 2. Update Asset Account (PUT /api/assets/:id)
async function updateAsset(req, res) {
    const dealerId = req.params.id;
    const { msisdn, mpin, balance, status, transAmount, transType, remarks } = req.body;
    console.log(`[REST API] Handler: updateAsset triggered for DEALERID: "${dealerId}"`);

    if (!dealerId || dealerId.trim() === '') {
        console.warn('[REST API Validation Warning] Empty DEALERID in URL path');
        return res.status(400).json({ error: 'DEALERID in path cannot be empty' });
    }

    try {
        const contract = await getContract();
        console.log(`[REST API] Submitting UpdateAsset to smart contract...`);

        // Submit transaction (requires consensus and commits block)
        const resultBytes = await contract.submitTransaction(
            'UpdateAsset',
            dealerId.trim(),
            msisdn !== undefined ? msisdn.toString().trim() : '',
            mpin !== undefined ? mpin.toString().trim() : '',
            balance !== undefined ? balance.toString() : '',
            status !== undefined ? status.toString().trim() : '',
            transAmount !== undefined ? transAmount.toString() : '',
            transType !== undefined ? transType.toString().trim() : '',
            remarks !== undefined ? remarks.toString().trim() : ''
        );

        const resultStr = decodeResponse(resultBytes);
        console.log(`[REST API] UpdateAsset successfully committed. Ledger Response: ${resultStr}`);
        
        const updatedAsset = JSON.parse(resultStr);
        return res.status(200).json(updatedAsset);
    } catch (error) {
        console.error(`[REST API Error] UpdateAsset execution failed: ${error.stack}`);
        return res.status(500).json({ error: `Failed to update asset: ${error.message}` });
    }
}

// 3. Read Asset Account (GET /api/assets/:id)
async function readAsset(req, res) {
    const dealerId = req.params.id;
    console.log(`[REST API] Handler: readAsset triggered for DEALERID: "${dealerId}"`);

    if (!dealerId || dealerId.trim() === '') {
        console.warn('[REST API Validation Warning] Empty DEALERID in URL path');
        return res.status(400).json({ error: 'DEALERID in path cannot be empty' });
    }

    try {
        const contract = await getContract();
        console.log(`[REST API] Evaluating ReadAsset (querying world state)...`);

        // Evaluate transaction (local peer read only, fast, no block submission)
        const resultBytes = await contract.evaluateTransaction('ReadAsset', dealerId.trim());
        const resultStr = decodeResponse(resultBytes);

        console.log(`[REST API] ReadAsset query successful. Ledger Response: ${resultStr}`);
        const asset = JSON.parse(resultStr);
        return res.status(200).json(asset);
    } catch (error) {
        console.error(`[REST API Error] ReadAsset execution failed: ${error.stack}`);
        if (error.message.includes('does not exist')) {
            return res.status(404).json({ error: `Asset with DEALERID "${dealerId}" does not exist` });
        }
        return res.status(500).json({ error: `Failed to query asset: ${error.message}` });
    }
}

// 4. Get Asset Transaction History (GET /api/assets/:id/history)
async function getAssetHistory(req, res) {
    const dealerId = req.params.id;
    console.log(`[REST API] Handler: getAssetHistory triggered for DEALERID: "${dealerId}"`);

    if (!dealerId || dealerId.trim() === '') {
        console.warn('[REST API Validation Warning] Empty DEALERID in URL path');
        return res.status(400).json({ error: 'DEALERID in path cannot be empty' });
    }

    try {
        const contract = await getContract();
        console.log(`[REST API] Evaluating GetAssetHistory (querying history chain)...`);

        // Evaluate transaction (local peer query, returns asset modifications history)
        const resultBytes = await contract.evaluateTransaction('GetAssetHistory', dealerId.trim());
        const resultStr = decodeResponse(resultBytes);

        console.log(`[REST API] GetAssetHistory query successful. History Length: ${JSON.parse(resultStr).length}`);
        const history = JSON.parse(resultStr);
        return res.status(200).json(history);
    } catch (error) {
        console.error(`[REST API Error] GetAssetHistory execution failed: ${error.stack}`);
        if (error.message.includes('does not exist')) {
            return res.status(404).json({ error: `Asset with DEALERID "${dealerId}" does not exist` });
        }
        return res.status(500).json({ error: `Failed to retrieve history: ${error.message}` });
    }
}

module.exports = {
    createAsset,
    updateAsset,
    readAsset,
    getAssetHistory
};
