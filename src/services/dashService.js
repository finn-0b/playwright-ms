const { launchBrowser } = require('./baseBrowser');
const fs = require('fs');

const runDashOntarioWorkflow = async (license, BehalfOf = "25 Years - Intact - All") => {
    const browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://dash.ibc.ca/login');

        // Login
        await page.getByTestId('username').fill(process.env.DASH_USERNAME);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.locator('#i0118').fill(process.env.DASH_PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.getByRole('button', { name: 'No' }).click();
        await page.getByTestId('menuTile-driverReport').click();
        await page.getByTestId('driverLicenceNumber').fill(`${license}`);
        await page.getByRole('textbox', { name: 'All provinces' }).click();
        await page.getByRole('option', { name: 'Ontario' }).click();


        await page.locator('#numberOfYears').click();
        await page.getByRole('option', { name: `${BehalfOf}` }).click();


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

        const fetchUrlPromise = (async () => {
            const page1 = await page1Promise;
            await page1.waitForLoadState('networkidle', { timeout: 30000 });
            const url = page1.url();
            if (!url || url === 'about:blank' || url.startsWith('chrome-error:')) {
                throw new Error('Invalid URL (likely intercepted as a download natively)');
            }
            const response = await context.request.get(url);
            return await response.body();
        })();

        // Promise.any resolves with the first successful value
        const buffer = await Promise.any([
            downloadPromise,
            fetchUrlPromise
        ]).catch(err => {
            throw new Error(`Failed to get PDF: ${err.message || 'Both fetch and download failed'}`);
        });

        return buffer;

    } catch (error) {
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
};

module.exports = { runDashOntarioWorkflow };


