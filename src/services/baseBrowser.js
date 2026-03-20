const { chromium, firefox } = require('playwright');

const launchBrowser = async () => {
    const headless = process.env.HEADLESS !== 'false';
    const browser = await firefox.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Use /tmp instead of /dev/shm — fixes crashes in Docker
            '--disable-gpu',           // No GPU in Docker, saves memory
        ]
    });
    return browser;
};

module.exports = { launchBrowser };
