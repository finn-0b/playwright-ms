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



        const page1Promise = page.waitForEvent('popup');
        await page.getByRole('button', { name: 'Open PDF' }).click();
        const page1 = await page1Promise;

        // Wait for PDF to load in the background
        await page1.waitForLoadState('networkidle');

        // Instead of clicking the download button in the PDF viewer
        // (which is hard to reach in Shadow DOM), we fetch the body directly.
        const response = await context.request.get(page1.url());
        const buffer = await response.body();
        return buffer;

    } catch (error) {
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
};

module.exports = { runDashOntarioWorkflow };


