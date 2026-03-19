const dashService = require('../services/dashService');

const runReport = async (_, res) => {
    try {
        const pdfBuffer = await dashService.runDashOntarioWorkflow();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="dash_report.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('DASH Automation failed:', error);
        res.status(500).json({
            error: 'Automation failed',
            details: error.message
        });
    }
};

module.exports = { runReport };
