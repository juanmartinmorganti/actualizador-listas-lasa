const puppeteer = require('puppeteer');
const fs = require('node:fs');
const path = require('node:path');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'public/assets/logo-lasa.png')).toString('base64');
const { LIMITES } = require('./pdf');
async function renderizar(page, html) {
  await page.setJavaScriptEnabled(false);
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  page.on('request', request => { (request.url() === logo && request.resourceType() === 'image' ? request.continue() : request.abort('blockedbyclient')).catch(() => {}); });
  await page.setOfflineMode(true);
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(10000);
  await page.setContent(html, { waitUntil: 'load', timeout: 10000 });
  await page.emulateMediaType('print');
  return page.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: false,
    preferCSSPageSize: true, timeout: 10000, margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } });
}
if (require.main === module) process.once('message', async ({ html }) => {
  let browser;
  try {
    if (typeof html !== 'string' || Buffer.byteLength(html) > LIMITES.html) throw new Error('Documento inválido');
    browser = await puppeteer.launch({ headless: true, timeout: 8000,
      args: ['--disable-crash-reporter', '--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    const pdf = await renderizar(await browser.newPage(), html);
    if (pdf.length > LIMITES.pdf) throw new Error('PDF demasiado grande');
    await browser.close(); browser = null;
    process.send({ pdf: Buffer.from(pdf).toString('base64') });
  } catch { process.send({ error: true }); }
  finally { if (browser) await browser.close().catch(() => {}); }
});
module.exports = { renderizar };
