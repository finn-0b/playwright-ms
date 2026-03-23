require('dotenv').config();
const dashController = require('./src/controllers/dashController');

(async () => {
    console.log(`🚀 Starting local Playwright test for DASH Report...`);

    try {
        let capturedBuffer;
        const mockRes = {
            setHeader: (key, value) => console.log(`[Mock] setHeader: ${key} = ${value}`),
            send: (buffer) => { capturedBuffer = buffer; },
            status: function (code) {
                console.log(`[Mock] status: ${code}`);
                return this;
            },
            json: (data) => console.log(`[Mock] json:`, data)
        };

        const req = {};
        req.body = {
            license: '123456789',
            onBehalfOf: '25 Years - Intact - All'
        };
        await dashController.runReport(req, mockRes);

        console.log('✅ Success! PDF received. Buffer size:', capturedBuffer ? capturedBuffer.length : 'undefined');
        console.log('Saved to dash_test_report.pdf');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
})();
