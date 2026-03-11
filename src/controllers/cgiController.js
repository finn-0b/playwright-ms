const cgiService = require('../services/cgiService');

const mvrOntario = async (req, res) => {
    const { username, password, onBehalfOf } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
    }

    try {
        const pdfBuffer = await cgiService.runMvrOntarioWorkflow(username, password, onBehalfOf);

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
