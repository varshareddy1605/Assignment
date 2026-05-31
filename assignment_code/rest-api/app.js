/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const express = require('express');
const assetRoutes = require('./routes/assetRoutes');
const { cleanup } = require('./utils/gateway');

const app = express();
const PORT = process.env.PORT || 8000;

// Request parsing middleware
app.use(express.json());

// Logger middleware to log all requests for troubleshooting/security
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url} - Client IP: ${req.ip} - Timestamp: ${new Date().toISOString()}`);
    next();
});

// Routes
app.use('/api', assetRoutes);

// 404 Endpoint Not Found Handler
app.use((req, res) => {
    console.warn(`[HTTP Warning] Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware to catch unhandled exceptions securely
app.use((err, req, res, next) => {
    console.error(`[HTTP Error] Unhandled exception occurred: ${err.message}\nStack: ${err.stack}`);
    res.status(500).json({ error: 'Internal server error occurred' });
});

// Start listening (listening on 127.0.0.1 for local testing per security guidelines)
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Server] Asset Management REST API is running on http://127.0.0.1:${PORT}`);
});

// Capture termination signals for graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
    console.log('[Server] Shutdown signal received. Closing HTTP server connections...');
    server.close(() => {
        console.log('[Server] HTTP server successfully closed.');
        cleanup();
        process.exit(0);
    });
}
