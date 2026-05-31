/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class AssetContract extends Contract {

    // Helper to check if asset exists
    async AssetExists(ctx, dealerId) {
        console.log(`[AssetContract] AssetExists called for DEALERID: ${dealerId}`);
        const assetJSON = await ctx.stub.getState(dealerId);
        return assetJSON && assetJSON.length > 0;
    }

    // Create a new asset account
    async CreateAsset(ctx, dealerId, msisdn, mpin, balance, status, transAmount, transType, remarks) {
        console.log(`[AssetContract] CreateAsset started for DEALERID: ${dealerId}`);

        // Validate inputs
        if (!dealerId || dealerId.trim() === '') {
            throw new Error('DEALERID must be a non-empty string');
        }

        const exists = await this.AssetExists(ctx, dealerId);
        if (exists) {
            throw new Error(`Asset with DEALERID ${dealerId} already exists`);
        }

        const numericBalance = parseFloat(balance);
        if (isNaN(numericBalance)) {
            throw new Error('BALANCE must be a valid number');
        }

        const numericTransAmount = parseFloat(transAmount);
        if (isNaN(numericTransAmount)) {
            throw new Error('TRANSAMOUNT must be a valid number');
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const milliseconds = (txTimestamp.seconds.low * 1000) + Math.floor(txTimestamp.nanos / 1000000);
        const updatedAt = new Date(milliseconds).toISOString();

        const asset = {
            docType: 'account',
            DEALERID: dealerId,
            MSISDN: msisdn,
            MPIN: mpin,
            BALANCE: numericBalance,
            STATUS: status,
            TRANSAMOUNT: numericTransAmount,
            TRANSTYPE: transType,
            REMARKS: remarks,
            UpdatedAt: updatedAt
        };

        const assetBuffer = Buffer.from(JSON.stringify(asset));
        await ctx.stub.putState(dealerId, assetBuffer);
        
        console.log(`[AssetContract] CreateAsset successfully completed for DEALERID: ${dealerId}`);
        return JSON.stringify(asset);
    }

    // Update existing asset values
    async UpdateAsset(ctx, dealerId, msisdn, mpin, balance, status, transAmount, transType, remarks) {
        console.log(`[AssetContract] UpdateAsset started for DEALERID: ${dealerId}`);

        const exists = await this.AssetExists(ctx, dealerId);
        if (!exists) {
            throw new Error(`Asset with DEALERID ${dealerId} does not exist`);
        }

        // Fetch current state
        const assetBytes = await ctx.stub.getState(dealerId);
        const currentAsset = JSON.parse(assetBytes.toString());

        // Update fields if provided, otherwise keep existing values
        if (msisdn !== undefined && msisdn !== null && msisdn.trim() !== '') {
            currentAsset.MSISDN = msisdn;
        }
        if (mpin !== undefined && mpin !== null && mpin.trim() !== '') {
            currentAsset.MPIN = mpin;
        }
        if (balance !== undefined && balance !== null) {
            const numericBalance = parseFloat(balance);
            if (isNaN(numericBalance)) {
                throw new Error('BALANCE must be a valid number');
            }
            currentAsset.BALANCE = numericBalance;
        }
        if (status !== undefined && status !== null && status.trim() !== '') {
            currentAsset.STATUS = status;
        }
        if (transAmount !== undefined && transAmount !== null) {
            const numericTransAmount = parseFloat(transAmount);
            if (isNaN(numericTransAmount)) {
                throw new Error('TRANSAMOUNT must be a valid number');
            }
            currentAsset.TRANSAMOUNT = numericTransAmount;
        }
        if (transType !== undefined && transType !== null && transType.trim() !== '') {
            currentAsset.TRANSTYPE = transType;
        }
        if (remarks !== undefined && remarks !== null && remarks.trim() !== '') {
            currentAsset.REMARKS = remarks;
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const milliseconds = (txTimestamp.seconds.low * 1000) + Math.floor(txTimestamp.nanos / 1000000);
        currentAsset.UpdatedAt = new Date(milliseconds).toISOString();

        const assetBuffer = Buffer.from(JSON.stringify(currentAsset));
        await ctx.stub.putState(dealerId, assetBuffer);

        console.log(`[AssetContract] UpdateAsset successfully completed for DEALERID: ${dealerId}`);
        return JSON.stringify(currentAsset);
    }

    // Query world state to read a single asset
    async ReadAsset(ctx, dealerId) {
        console.log(`[AssetContract] ReadAsset called for DEALERID: ${dealerId}`);
        
        const assetBytes = await ctx.stub.getState(dealerId);
        if (!assetBytes || assetBytes.length === 0) {
            throw new Error(`Asset with DEALERID ${dealerId} does not exist`);
        }

        const assetString = assetBytes.toString();
        console.log(`[AssetContract] ReadAsset retrieved: ${assetString}`);
        return assetString;
    }

    // Retrieve asset transaction history
    async GetAssetHistory(ctx, dealerId) {
        console.log(`[AssetContract] GetAssetHistory called for DEALERID: ${dealerId}`);

        const exists = await this.AssetExists(ctx, dealerId);
        if (!exists) {
            throw new Error(`Asset with DEALERID ${dealerId} does not exist`);
        }

        const resultsIterator = await ctx.stub.getHistoryForKey(dealerId);
        const history = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const historyRecord = {};
            if (result.value.value && result.value.value.length > 0) {
                try {
                    historyRecord.value = JSON.parse(result.value.value.toString('utf8'));
                } catch (err) {
                    console.log(`[AssetContract] Error parsing history state: ${err.message}`);
                    historyRecord.value = result.value.value.toString('utf8');
                }
            } else {
                historyRecord.value = null; // deleted state
            }
            
            historyRecord.txId = result.value.txId;
            historyRecord.isDelete =   result.value.isDelete;
            
            // Format timestamp
            if (result.value.timestamp) {
                const ts = result.value.timestamp;
                let seconds = 0;
                if (ts.seconds) {
                    if (typeof ts.seconds.low === 'number') {
                        seconds = ts.seconds.low;
                    } else if (typeof ts.seconds.toNumber === 'function') {
                        seconds = ts.seconds.toNumber();
                    } else {
                        seconds = Number(ts.seconds);
                    }
                }
                const nanos = ts.nanos || 0;
                const milliseconds = (seconds * 1000) + Math.floor(nanos / 1000000);
                historyRecord.timestamp = new Date(milliseconds).toISOString();
            }

            history.push(historyRecord);
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        console.log(`[AssetContract] GetAssetHistory found ${history.length} transactions for DEALERID: ${dealerId}`);
        return JSON.stringify(history);
    }
}

module.exports = AssetContract;
