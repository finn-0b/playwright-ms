const { launchBrowser } = require('./baseBrowser');
const fs = require('fs');

const runMvrOntarioWorkflow = async (license, onBehalfOf = 5) => {
    const browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://iis.cgi.com/rapidweb/public/login.aspx?ReturnUrl=%2fRapidWeb%2fMVR%2fMVRMenu.aspx%3fsId%3dMVR_ON');

        // Login
        await page.getByRole('textbox', { name: 'john.smith@cgi.com' }).fill(process.env.CGI_USERNAME);
        await page.getByRole('textbox', { name: 'Enter your password' }).fill(process.env.CGI_PASSWORD);

        // Wait for navigation after clicking login
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => { }),
            page.getByRole('button', { name: 'Login' }).click()
        ]);

        // Select 'On Behalf of' - This usually triggers a postback/reload
        await page.waitForSelector('label:has-text("On Behalf of:")', { state: 'visible' });

        await page.getByLabel('On Behalf of:').selectOption(`${onBehalfOf}`);

        // Wait a small moment for the session to settle if needed
        await page.waitForTimeout(3000);

        // Access the 'Auto Risks' section
        await page.getByText('Auto Risks').click();
        await page.getByRole('link', { name: 'MVR Ontario' }).click();

        // Reprint workflow
        await page.getByRole('link', { name: 'New Request' }).click();

        await page.getByRole('textbox', { name: 'License' }).fill(`${license}`);

        await page.locator('#ctl00_MainContentPlaceHolder_ddReferencePurpose').selectOption('New Business');

        await page.getByRole('textbox', { name: 'Reference' }).fill('-') || await page.locator('#ctl00_MainContentPlaceHolder_ddReferencePurpose').selectOption('New Business');


        await page.getByLabel('Disclose').selectOption('Unknown');


        await page.getByRole('button', { name: 'Get Report' }).click();

        // Set up download listener BEFORE clicking to avoid race condition
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

        // Try multiple selectors in case the CGI site structure varies
        const downloadBtn = page.locator('figure > span, a[href*="download"], button:has-text("Download"), a:has-text("Download PDF")').first();
        await downloadBtn.click();

        const download = await downloadPromise;

        // Use download.path() and fs to get the buffer
        const downloadPath = await download.path();
        const buffer = fs.readFileSync(downloadPath);
        return buffer;

    } catch (error) {
        // Save a screenshot so you can see exactly what the page looked like on failure
        try {
            await page.screenshot({ path: '/tmp/cgi-debug.png', fullPage: true });
            console.error('CGI debug screenshot saved to /tmp/cgi-debug.png');
        } catch (screenshotErr) {
            console.error('Could not save debug screenshot:', screenshotErr.message);
        }
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
};

module.exports = { runMvrOntarioWorkflow };
