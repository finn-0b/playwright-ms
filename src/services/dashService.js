const { launchBrowser } = require('./baseBrowser');

const MAX_VIEW_RETRIES = 3;

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
        await page.getByRole('textbox', { name: 'Enter the password for olehb.' }).fill(process.env.DASH_PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.getByRole('button', { name: 'No' }).click();

        // Navigate to report
        await page.getByTestId('menuTile-ninetyDays').click();
        await page.waitForLoadState('networkidle');

        // Dismiss cookie banner if present — it can block clicks or cause layout shifts
        try {
            const cookieOk = page.getByRole('button', { name: 'OK' });
            await cookieOk.click({ timeout: 3000 });
            console.log('[DASH] Cookie banner dismissed');
        } catch {
            // Banner not present or already dismissed — continue
        }

        await page.getByTestId('btnSearch').click();

        // Wait for search results to fully load from the DASH backend
        await page.waitForLoadState('networkidle');
        await page.getByText('result found', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
        console.log('[DASH] Search results loaded, attempting to view report...');

        // Retry loop: the DASH backend sometimes returns "System error [connection]"
        // especially from server environments (different IP/network path than local dev)
        let pdfBuffer;
        for (let attempt = 1; attempt <= MAX_VIEW_RETRIES; attempt++) {
            try {
                await page.getByTestId('btnViewReport0').click();
                await page.waitForLoadState('networkidle');

                // Check if the DASH website itself returned an error page
                const pageContent = await page.textContent('body');
                if (pageContent.includes('System error')) {
                    throw new Error(`DASH returned: "${pageContent.trim().substring(0, 200)}"`);
                }

                console.log(`[DASH] View report loaded (attempt ${attempt}), waiting for Open PDF button...`);

                // Intercept the PDF response at the context level (works in headless)
                const pdfUrlPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () => reject(new Error('PDF URL capture timed out after 30s')),
                        30000
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
                console.log('[DASH] PDF URL:', pdfUrl);

                // Fetch the PDF binary using the authenticated browser context
                const response = await context.request.get(pdfUrl);
                pdfBuffer = await response.body();
                break; // Success — exit retry loop

            } catch (viewError) {
                console.error(`[DASH] ❌ Attempt ${attempt}/${MAX_VIEW_RETRIES} failed:`, viewError.message);

                if (attempt === MAX_VIEW_RETRIES) {
                    throw viewError; // All retries exhausted
                }

                // Navigate back to search results and retry
                console.log('[DASH] Navigating back to retry...');
                await page.goBack({ waitUntil: 'networkidle' });
                // Re-wait for the results page to be ready
                await page.getByText('result found', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
                // Brief pause before retry
                await page.waitForTimeout(2000);
            }
        }

        return pdfBuffer;
    } catch (error) {
        // STOP TRACING ON ERROR: Save the full recorded timeline to a zip file
        console.error('[DASH] Saving full execution trace to /tmp/dash-trace-error.zip');
        await context.tracing.stop({ path: '/tmp/dash-trace-error.zip' });

        // Debug screenshot on failure — capture URL for diagnostics
        try {
            console.error(`[DASH] Failed on URL: ${page.url()}`);
            await page.screenshot({ path: '/tmp/dash-debug.png', fullPage: true });
            console.error('[DASH] Debug screenshot saved to /tmp/dash-debug.png');
        } catch (screenshotErr) {
            console.error('[DASH] Could not save debug screenshot:', screenshotErr.message);
        }
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
};

module.exports = { runDashOntarioWorkflow };