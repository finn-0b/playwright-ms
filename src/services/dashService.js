const { launchBrowser } = require('./baseBrowser');

const MAX_VIEW_RETRIES = 3;

const runDashOntarioWorkflow = async (license, onBehalfOf = "25 Years - Intact - All") => {
    const browser = await launchBrowser();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'en-CA',
        timezoneId: 'America/Toronto',
        viewport: { width: 1280, height: 800 },
        extraHTTPHeaders: {
            'Accept-Language': 'en-CA,en;q=0.9',
        }
    });
    // START TRACING: Captures screenshots, DOM snapshots, and network logs for every single step
    await context.tracing.start({ screenshots: true, snapshots: true });

    const page = await context.newPage();

    // Block unnecessary resources (images, fonts, media) to speed up page loads significantly
    await context.route('**/*', route => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

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
        // Removed unnecessary and slow networkidle wait here, Playwright auto-waits for elements

        // Dismiss cookie banner if present — it can block clicks or cause layout shifts
        try {
            const cookieOk = page.getByRole('button', { name: 'OK' });
            // Reduced timeout from 3000ms to 500ms to avoid wasting time when banner is absent
            await cookieOk.click({ timeout: 500 });
            console.log('[DASH] Cookie banner dismissed');
        } catch {
            // Banner not present or already dismissed — continue
        }

        await page.getByTestId('btnSearch').click();

        // Wait for search results to fully load from the DASH backend
        // Removed networkidle - wait directly for the result text
        await page.getByText('result found', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
        console.log('[DASH] Search results loaded, attempting to view report...');

        // Retry loop: the DASH backend sometimes returns "System error [connection]"
        // especially from server environments (different IP/network path than local dev)
        let pdfBuffer;
        for (let attempt = 1; attempt <= MAX_VIEW_RETRIES; attempt++) {
            try {
                await page.getByTestId('btnViewReport0').click();

                // Wait for either the PDF button or error text instead of all network traffic
                const pdfBtn = page.getByRole('button', { name: 'Open PDF' });
                const errorTxt = page.getByText('System error', { exact: false });
                
                await Promise.race([
                    pdfBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
                    errorTxt.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
                ]);

                // Check if the DASH website itself returned an error page
                if (await errorTxt.isVisible()) {
                    const pageContent = await page.textContent('body');
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
                await page.goBack({ waitUntil: 'domcontentloaded' });
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