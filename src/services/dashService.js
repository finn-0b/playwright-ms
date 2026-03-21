const { launchBrowser } = require('./baseBrowser');

const MAX_VIEW_RETRIES = 3;

// Proper sequential queue — each request waits for ALL previous ones to complete
// before starting its own fresh browser session
let queue = Promise.resolve();

const runDashOntarioWorkflow = async (license, onBehalfOf = "25 Years - Intact - All") => {
    console.log('[DASH] Queuing request...');

    // Chain onto the existing queue — this request won't start until all previous resolve/reject
    const result = queue.then(() => {
        console.log('[DASH] Starting fresh workflow from queue...');
        return _runWorkflow(license, onBehalfOf);
    });

    // Advance the queue pointer, swallowing errors so the next item always runs
    queue = result.catch(() => { });

    return result;
};

const _runWorkflow = async (license, onBehalfOf) => {
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

    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();

    await context.route('**/*', route => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    try {
        await page.goto('https://dash.ibc.ca/login');
        await page.getByTestId('username').fill(process.env.DASH_USERNAME);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.getByRole('textbox', { name: 'Enter the password for olehb.' }).fill(process.env.DASH_PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.getByRole('button', { name: 'No' }).click();

        await page.getByTestId('menuTile-ninetyDays').click();

        try {
            await page.getByRole('button', { name: 'OK' }).click({ timeout: 500 });
            console.log('[DASH] Cookie banner dismissed');
        } catch { }

        await page.getByTestId('btnSearch').click();
        await page.getByText('result found', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
        console.log('[DASH] Search results loaded, attempting to view report...');

        let pdfBuffer;
        for (let attempt = 1; attempt <= MAX_VIEW_RETRIES; attempt++) {
            try {
                await page.getByTestId('btnViewReport0').click();

                const pdfBtn = page.getByRole('button', { name: 'Open PDF' });
                const errorTxt = page.getByText('System error', { exact: false });

                await Promise.race([
                    pdfBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => { }),
                    errorTxt.waitFor({ state: 'visible', timeout: 15000 }).catch(() => { })
                ]);

                if (await errorTxt.isVisible()) {
                    const pageContent = await page.textContent('body');
                    throw new Error(`DASH returned: "${pageContent.trim().substring(0, 200)}"`);
                }

                console.log(`[DASH] View report loaded (attempt ${attempt}), waiting for Open PDF button...`);

                const pdfResponsePromise = context.waitForEvent('response', {
                    predicate: response => response.url().includes('pdfreports'),
                    timeout: 30000
                });

                await page.getByRole('button', { name: 'Open PDF' }).click();

                const pdfResponse = await pdfResponsePromise;
                console.log('[DASH] PDF URL:', pdfResponse.url());

                try {
                    pdfBuffer = await pdfResponse.body();
                } catch (bodyErr) {
                    console.log('[DASH] Direct body read failed, falling back to manual request...', bodyErr.message);
                    const fallbackResponse = await context.request.get(pdfResponse.url());
                    pdfBuffer = await fallbackResponse.body();
                }
                break;

            } catch (viewError) {
                console.error(`[DASH] ❌ Attempt ${attempt}/${MAX_VIEW_RETRIES} failed:`, viewError.message);

                if (attempt === MAX_VIEW_RETRIES) throw viewError;

                console.log('[DASH] Navigating back to retry...');
                await page.goBack({ waitUntil: 'domcontentloaded' });
                await page.getByText('result found', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
                await page.waitForTimeout(2000);
            }
        }

        return pdfBuffer;

    } catch (error) {
        console.error('[DASH] Saving full execution trace to /tmp/dash-trace-error.zip');
        await context.tracing.stop({ path: '/tmp/dash-trace-error.zip' });

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