const cgiService = require('../services/cgiService');

const mvrOntario = async (req, res) => {
    const { onBehalfOf } = req.body;

    if (!onBehalfOf) {
        return res.status(400).json({ error: 'Missing onBehalfOf' });
    }

    try {
        const pdfBuffer = await cgiService.runMvrOntarioWorkflow(onBehalfOf);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('CGI Automation failed:', error);
        res.status(500).json({
            error: 'Automation failed',
            details: error.message
        });
    }
};

module.exports = { mvrOntario };
