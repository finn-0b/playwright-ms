const { chromium } = require('playwright');

const launchBrowser = async () => {
    const headless = process.env.HEADLESS !== 'false';
    const browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Critical for Docker
    });
    return browser;
};

module.exports = { launchBrowser };
