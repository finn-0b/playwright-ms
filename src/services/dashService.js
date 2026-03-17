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
        const page1Promise = page.waitForEvent('popup');
        await page.getByRole('button', { name: 'Open PDF' }).click();

        const page1 = await page1Promise;
        await page1.waitForLoadState('networkidle', { timeout: 30000 });
        await page1.locator('iframe[name="72F6486158A966F80B1688DB4A7BB7B3"]').contentFrame().getByRole('button', { name: 'Download' }).click();
        const downloadPromise = page1.waitForEvent('download');

        await page1.locator('iframe[name="72F6486158A966F80B1688DB4A7BB7B3"]').contentFrame().getByRole('button', { name: 'Download' }).click();
        const download = await downloadPromise;

        const downloadPath = await download.path();
        const buffer = fs.readFileSync(downloadPath);
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


