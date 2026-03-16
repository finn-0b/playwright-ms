const { launchBrowser } = require('./baseBrowser');
const fs = require('fs');

const runDashOntarioWorkflow = async (license, onBehalfOf = "25 Years - Intact - All") => {
    const browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://dash.ibc.ca/login');

        // Login
        await page.getByTestId('username').fill(process.env.DASH_USERNAME);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.locator('#i0118').fill(process.env.DASH_PASSWORD);
        await page.locator('#i0118').press('Enter');
        await page.getByRole('button', { name: 'No' }).click();
        await page.getByTestId('menuTile-driverReport').click();
        await page.getByTestId('driverLicenceNumber').fill(`${license}`);
        await page.getByRole('textbox', { name: 'All provinces' }).click();
        await page.getByRole('option', { name: 'Ontario' }).click();


        await page.locator('#numberOfYears').click();
        await page.getByRole('option', { name: `${onBehalfOf}` }).click();


        await page.getByTestId('btnSearch').click();
        await page.getByTestId('getReportBtn').click();



        // Prepare to handle the PDF either as a native file download (headless) or a fetchable new tab (headful)
        const downloadPromise = new Promise((resolve, reject) => {
            const handleDownload = async (download) => {
                try {
                    const path = await download.path();
                    const buffer = await fs.promises.readFile(path);
                    resolve(buffer);
                } catch (e) {
                    reject(e);
                }
            };
            page.on('download', handleDownload);
            context.on('page', newPage => newPage.on('download', handleDownload));
            setTimeout(() => reject(new Error('Download timeout')), 30000);
        });

        const page1Promise = page.waitForEvent('popup');
        await page.getByRole('button', { name: 'Open PDF' }).click();

        const page1 = await page1Promise;
        await page1.waitForLoadState('networkidle', { timeout: 30000 });
        const url = page1.url();
        if (!url || url === 'about:blank' || url.startsWith('chrome-error:')) {
            throw new Error('Invalid URL (likely intercepted as a download natively)');
        }
        const response = await context.request.get(url);
        const buffer = await response.body();
        return buffer;

    } catch (error) {
        // Save a screenshot so you can see exactly what the page looked like on failure
        try {
            await page.screenshot({ path: '/tmp/dash-debug.png', fullPage: true });
            console.error('dash debug screenshot saved to /tmp/dash-debug.png');
        } catch (screenshotErr) {
            console.error('Could not save debug screenshot:', screenshotErr.message);
        }
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
};

module.exports = { runDashOntarioWorkflow };


