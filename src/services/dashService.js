const { launchBrowser } = require('./baseBrowser');

const runDashOntarioWorkflow = async (license, onBehalfOf = "25 Years - Intact - All") => {
    const browser = await launchBrowser();
    const context = await browser.newContext();
    
    // START TRACING: Captures screenshots, DOM snapshots, and network logs for every single step
    await context.tracing.start({ screenshots: true, snapshots: true });
    
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
        await page.waitForTimeout(2000); // Give SPA time to render

        // The cookie banner might be blocking clicks or causing layout shifts
        try {
            const cookieBtn = page.getByRole('button', { name: 'OK', exact: true });
            if (await cookieBtn.isVisible({ timeout: 1000 })) {
                await cookieBtn.click();
            }
        } catch (e) { }

        await page.getByTestId('btnSearch').click();

        // CRITICAL: Wait for search results to actually load from the backend!
        // If we click the view button too fast, we cause a state/connection error on their backend.
        await page.waitForTimeout(3000);

        await page.getByTestId('btnViewReport0').click();

        // Wait for the report page to fully load before trying to find the Open PDF button
        await page.waitForTimeout(2000);

        // Intercept the PDF response at the context level (works in headless)
        // This captures the real PDF URL from network traffic regardless of popup behavior
        const pdfUrlPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(
                () => reject(new Error('PDF URL capture timed out after 30s')),
                10000
            );
            const handler = (response) => {
                const url = response.url();
                if (url.includes('pdfreports')) {
                    clearTimeout(timeout);
                    context.off('response', handler);
                    resolve(url);
                }
            };
            context.on('response', handler);
        });

        // Click "Open PDF" — triggers a popup/new tab with the PDF
        await page.getByRole('button', { name: 'Open PDF' }).click();

        // Wait for the PDF URL from network interception
        const pdfUrl = await pdfUrlPromise;
        console.log('PDF URL:', pdfUrl);

        // Fetch the PDF binary using the authenticated browser context
        const response = await context.request.get(pdfUrl);
        const pdfBuffer = await response.body();

        // Return the buffer directly – no file saving needed
        return pdfBuffer;
    } catch (error) {
        // STOP TRACING ON ERROR: Save the full recorded timeline to a zip file
        console.error('Saving full execution trace to /tmp/dash-trace-error.zip');
        await context.tracing.stop({ path: '/tmp/dash-trace-error.zip' });
        
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