require('dotenv').config();
const express = require('express');
const apiRoutes = require('./src/routes/api');

const app = express();
app.use(express.json());

// Mount central API router
app.use('/api', apiRoutes);

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