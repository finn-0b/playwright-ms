const { launchBrowser } = require('./baseBrowser');
const fs = require('fs');

let queue = Promise.resolve();

const runMvrOntarioWorkflow = async (license, onBehalfOf = 5) => {
    console.log('[CGI] Queuing request...');
    const result = queue.then(() => {
        console.log('[CGI] Starting fresh workflow from queue...');
        return _runWorkflow(license, onBehalfOf);
    });
    queue = result.catch(() => {});
    return result;
};

const _runWorkflow = async (license, onBehalfOf) => {
    const browser = await launchBrowser();
    const context = await browser.newContext();

    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();

    // Block images, fonts, media to speed up page loads
    await context.route('**/*', route => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    try {
        console.log('[CGI] Navigating to login...');
        await page.goto('https://iis.cgi.com/rapidweb/public/login.aspx?ReturnUrl=%2fRapidWeb%2fMVR%2fMVRMenu.aspx%3fsId%3dMVR_ON');

        await page.getByRole('textbox', { name: 'john.smith@cgi.com' }).fill(process.env.CGI_USERNAME);
        await page.getByRole('textbox', { name: 'Enter your password' }).fill(process.env.CGI_PASSWORD);

        // Register navigation listener BEFORE the click that triggers it
        const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Login' }).click();
        await navigationPromise;
        console.log('[CGI] Logged in successfully');

        await page.waitForSelector('label:has-text("On Behalf of:")', { state: 'visible' });
        await page.getByLabel('On Behalf of:').selectOption(`${onBehalfOf}`);

        // Wait for postback to settle by waiting for a known post-reload element
        await page.getByText('Auto Risks').waitFor({ state: 'visible', timeout: 10000 });
        console.log('[CGI] Session settled after onBehalfOf selection');

        await page.getByText('Auto Risks').click();
        await page.getByRole('link', { name: 'MVR Ontario' }).click();
        await page.getByRole('link', { name: 'New Request' }).click();
        console.log('[CGI] Navigated to new request form');

        await page.getByRole('textbox', { name: 'License' }).fill(`${license}`);
        await page.locator('#ctl00_MainContentPlaceHolder_ddReferencePurpose').selectOption('New Business');
        await page.getByRole('textbox', { name: 'Reference' }).click();
        await page.getByRole('textbox', { name: 'Reference' }).fill('-');
        await page.getByLabel('Disclose').selectOption('Unknown');

        await page.getByRole('button', { name: 'Get Report' }).click();
        console.log('[CGI] Report requested, waiting for download...');

        // Register download listener BEFORE clicking download
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        const downloadBtn = page.locator('figure > span, a[href*="download"], button:has-text("Download"), a:has-text("Download PDF")').first();
        await downloadBtn.click();

        const download = await downloadPromise;
        console.log('[CGI] Download started:', download.suggestedFilename());

        const downloadPath = await download.path();
        const buffer = fs.readFileSync(downloadPath);
        fs.unlinkSync(downloadPath); // Clean up temp file
        console.log(`[CGI] PDF buffer size: ${buffer.length}`);
        return buffer;

    } catch (error) {
        console.error('[CGI] Saving trace to /tmp/cgi-trace-error.zip');
        await context.tracing.stop({ path: '/tmp/cgi-trace-error.zip' });

        try {
            console.error(`[CGI] Failed on URL: ${page.url()}`);
            await page.screenshot({ path: '/tmp/cgi-debug.png', fullPage: true });
            console.error('[CGI] Debug screenshot saved to /tmp/cgi-debug.png');
        } catch (screenshotErr) {
            console.error('[CGI] Could not save debug screenshot:', screenshotErr.message);
        }
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
};

module.exports = { runMvrOntarioWorkflow };