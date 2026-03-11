const dashService = require('../services/dashService');

const runReport = async (req, res) => {
    const { license, onBehalfOf } = req.body;

    if (!license) {
        return res.status(400).json({ error: 'Missing license number' });
    }

    try {
        const pdfBuffer = await dashService.runDashOntarioWorkflow(license, onBehalfOf);

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
