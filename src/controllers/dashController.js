const dashService = require('../services/dashService');

const runReport = async (req, res) => {
    console.log(`[DASH] ✅ runReport handler reached at ${new Date().toISOString()}`);
    try {
        console.log('[DASH] Starting DASH Ontario workflow...');
        const pdfBuffer = await dashService.runDashOntarioWorkflow();

        console.log(`[DASH] Workflow complete. PDF buffer size: ${pdfBuffer.length}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="dash_report.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('[DASH] ❌ Automation failed:', error);
        res.status(500).json({
            error: 'Automation failed',
            details: error.message
        });
    }
};

module.exports = { runReport };
