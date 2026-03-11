require('dotenv').config();
const cgiService = require('./src/services/cgiService');

(async () => {
    // --- ⚙️ TEST CONFIGURATION ---
    const username = 'olehb@kmibrokers.com';
    const password = 'YOUR_PASSWORD'; // Replace with actual for local test
    const onBehalfOf = '5';           // Change this to '1', '2', '8', etc.
    // -----------------------------

    console.log(`🚀 Starting local Playwright test for On Behalf Of: ${onBehalfOf}...`);

    try {
        const pdfBuffer = await cgiService.runMvrOntarioWorkflow(username, password, onBehalfOf);
        console.log('✅ Success! PDF received. Buffer size:', pdfBuffer.length);
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
})();
