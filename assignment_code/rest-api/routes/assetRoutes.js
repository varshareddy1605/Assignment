/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

// Define API routes for Asset management
router.post('/assets', assetController.createAsset);
router.put('/assets/:id', assetController.updateAsset);
router.get('/assets/:id', assetController.readAsset);
router.get('/assets/:id/history', assetController.getAssetHistory);

module.exports = router;
