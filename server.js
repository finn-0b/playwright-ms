require('dotenv').config();
const express = require('express');
const apiRoutes = require('./src/routes/api');

const app = express();
app.use(express.json());

// Log every incoming request (before auth, before routing)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] --> ${req.method} ${req.originalUrl}`);
    next();
});

// Mount central API router
app.use('/api', apiRoutes);

// Catch-all for unmatched routes
app.use((req, res) => {
    console.log(`[${new Date().toISOString()}] 404 - No route matched: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Not Found', path: req.originalUrl, method: req.method });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Playwright microservice running on port ${PORT}`);
});

// Prevent unhandled Playwright errors from crashing the process
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});