module.exports = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
        console.log(`[AUTH] ❌ Rejected ${req.method} ${req.originalUrl} — bad/missing API key`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log(`[AUTH] ✅ Passed ${req.method} ${req.originalUrl}`);
    next();
};
