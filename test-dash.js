require('dotenv').config();
const dashService = require('./src/services/dashService');

(async () => {
    // --- ⚙️ TEST CONFIGURATION ---
    const license = 'C3587-18889-50425'; // Example license from your screenshot
    // -----------------------------

    console.log(`🚀 Starting local Playwright test for DASH Report...`);

    try {
        const pdfBuffer = await dashService.runDashOntarioWorkflow(license);
        console.log('✅ Success! PDF received. Buffer size:', pdfBuffer.length);

        // Save locally for verification
        const fs = require('fs');
        fs.writeFileSync('dash_test_report.pdf', pdfBuffer);
        console.log('Saved to dash_test_report.pdf');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
})();
