const { launchBrowser } = require('./baseBrowser');

const runDashOntarioWorkflow = async (license, onBehalfOf = "25 Years - Intact - All") => {
    const browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Login
        await page.goto('https://dash.ibc.ca/login');
        await page.getByTestId('username').fill(process.env.DASH_USERNAME);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.locator('#i0118').fill(process.env.DASH_PASSWORD);
        await page.locator('#i0118').press('Enter');
        await page.getByRole('button', { name: 'No' }).click();

        // Navigate to report
        await page.getByTestId('menuTile-ninetyDays').click();
        await page.getByTestId('btnSearch').click();
        await page.getByTestId('btnViewReport0').click();

        // Open PDF in new tab (the browser's PDF viewer)
        const page1Promise = page.waitForEvent('popup');
        await page.getByRole('button', { name: 'Open PDF' }).click();
        const page1 = await page1Promise;

        // Wait for the PDF viewer to load (network idle is usually enough)
        await page1.waitForLoadState('networkidle', { timeout: 30000 });

        // Get the URL of the PDF (the viewer's address bar shows the actual PDF resource)
        const pdfUrl = page1.url();
        console.log('PDF URL:', pdfUrl); // Debug: ensure it's a direct link to a PDF

        // Use the browser context's request API (which carries cookies) to fetch the PDF
        const response = await context.request.get(pdfUrl);
        const pdfBuffer = await response.body();

        // Close the popup tab (optional)
        await page1.close();

        return pdfBuffer;
    } catch (error) {
        // Debug screenshot on failure
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