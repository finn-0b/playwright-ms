const { launchBrowser } = require('./baseBrowser');

const runMvrOntarioWorkflow = async (username, password, formData) => {
    const browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://iis.cgi.com/rapidweb/public/login.aspx?ReturnUrl=%2fRapidWeb%2fMVR%2fMVRMenu.aspx%3fsId%3dMVR_ON');
        await page.getByRole('textbox', { name: 'john.smith@cgi.com' }).click().fill(username);
        await page.getByRole('textbox', { name: 'Enter your password' }).click().fill(password);
        await page.getByRole('button', { name: 'Login' }).click();

        await page.getByLabel('On Behalf of:').selectOption('5');
        await page.goto('https://iis.cgi.com/RapidWeb/main/welcome.aspx');
        await page.getByText('Auto Risks').click();
        await page.getByRole('link', { name: 'MVR Ontario' }).click();
        await page.getByRole('link', { name: 'New Requests' }).click();
        await page.getByRole('textbox', { name: 'License' }).click().fill(formData.license);
        await page.locator('#ctl00_MainContentPlaceHolder_ddReferencePurpose').selectOption('New Business');
        await page.getByRole('textbox', { name: 'Reference' }).click().fill('-');
        await page.getByLabel('Disclose').selectOption('Unknown');
        await page.getByRole('button', { name: 'Get Report' }).click();

        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'PDF' }).click();
        const download = await downloadPromise;
        return await download.buffer();

    } catch (error) {
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
};

module.exports = { runMvrOntarioWorkflow };
