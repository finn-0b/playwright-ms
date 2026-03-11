require('dotenv').config();
const cgiService = require('./src/services/cgiService');

(async () => {
    // --- ⚙️ TEST CONFIGURATION ---
    // -----------------------------

    console.log(`🚀 Starting local Playwright test for CGI Ontario...`);

    try {
        const pdfBuffer = await cgiService.runMvrOntarioWorkflow("C3587-18889-50425");
        console.log('✅ Success! PDF received. Buffer size:', pdfBuffer.length);
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
})();

// 19680328wW)&