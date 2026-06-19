const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'http://localhost:5174/register',
  screenshotDir: './screenshots',
  videoDir: './feature-videos',
  video: { width: 1280, height: 720 },
  timeouts: {
    pageLoad: 2000,
    elementWait: 5000,
  },
  selectors: {
    form: ['form', '[data-testid="register-form"]', '#register-form'],
    submitButton: ['button[type="submit"]', 'text=Register', 'text=Sign Up', 'text=Create Account'],
    emailField: ['input[type="email"]', 'input[name="email"]', '[data-testid="email"]'],
    passwordField: ['input[type="password"]', 'input[name="password"]', '[data-testid="password"]'],
  },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function attachNetworkLogger(page) {
  page.on('requestfailed', req => {
    console.warn(`[network] failed: ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      console.warn(`[network] ${res.status()} ${res.url()}`);
    }
  });
}

async function tryClick(page, selectors, timeout = 5000) {
  for (const sel of selectors) {
    try {
      await page.click(sel, { timeout });
      console.log(`[click] matched: ${sel}`);
      return sel;
    } catch { continue; }
  }
  return null;
}

async function waitForAny(page, selectors, timeout = 5000) {
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout });
      return sel;
    } catch { continue; }
  }
  return null;
}

async function waitForNavigation(page, expectedPath, timeout = 5000) {
  try {
    await page.waitForURL(`**${expectedPath}**`, { timeout });
    console.log(`[nav] reached: ${expectedPath}`);
    return true;
  } catch {
    console.warn(`[warn] expected ${expectedPath} — current: ${page.url()}`);
    return false;
  }
}

async function captureScreenshot(page, filename, label) {
  const filePath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[screenshot] ${label} → ${filePath}`);
  return filePath;
}

(async () => {
  ensureDir(CONFIG.screenshotDir);
  ensureDir(CONFIG.videoDir);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: { dir: CONFIG.videoDir, size: CONFIG.video },
  });

  try {
    const page = await context.newPage();
    attachNetworkLogger(page);

    console.log('[nav] loading register page...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(CONFIG.timeouts.pageLoad);
    await captureScreenshot(page, '01-signup-lobby.png', 'register page loaded');

    // --- Detect form ---
    const formSel = await waitForAny(page, CONFIG.selectors.form, CONFIG.timeouts.elementWait);
    if (formSel) {
      console.log(`[found] form: ${formSel}`);
    } else {
      console.warn('[warn] no form detected — check CONFIG.selectors.form');
    }

    // --- Fill email ---
    const emailSel = await waitForAny(page, CONFIG.selectors.emailField, CONFIG.timeouts.elementWait);
    if (emailSel) {
      await page.fill(emailSel, 'test@example.com');
      console.log(`[fill] email filled via: ${emailSel}`);
    } else {
      console.warn('[warn] email field not found');
    }

    // --- Fill password ---
    const passwordSel = await waitForAny(page, CONFIG.selectors.passwordField, CONFIG.timeouts.elementWait);
    if (passwordSel) {
      await page.fill(passwordSel, 'Test@1234');
      console.log(`[fill] password filled via: ${passwordSel}`);
    } else {
      console.warn('[warn] password field not found');
    }

    await captureScreenshot(page, '02-signup-filled.png', 'form filled');

    // --- Submit ---
    const submitSel = await tryClick(page, CONFIG.selectors.submitButton, CONFIG.timeouts.elementWait);
    if (submitSel) {
      await page.waitForTimeout(CONFIG.timeouts.pageLoad);
      await captureScreenshot(page, '03-signup-submitted.png', 'form submitted');

      const navigated = await waitForNavigation(page, '/dashboard', 3000);
      if (!navigated) {
        const errors = await page.$$eval(
          '[class*="error"],[class*="alert"],[role="alert"]',
          els => els.map(e => e.innerText.trim())
        );
        if (errors.length > 0) console.warn('[warn] form errors:', errors);
        await captureScreenshot(page, '04-signup-error.png', 'signup error state');
      } else {
        await captureScreenshot(page, '04-signup-success.png', 'signup success');
      }
    } else {
      console.warn('[warn] submit button not found — check CONFIG.selectors.submitButton');
    }

    // --- Debug ---
    const buttons = await page.$$eval('button', els => els.map(e => e.innerText.trim()));
    console.log('[debug] buttons:', buttons);
    const testIds = await page.$$eval('[data-testid]', els => els.map(e => e.dataset.testid));
    console.log('[debug] testids:', testIds);
    const inputs = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, id: e.id })));
    console.log('[debug] inputs:', inputs);
    const ariaLabels = await page.$$eval('[aria-label]', els => els.map(e => e.getAttribute('aria-label')));
    console.log('[debug] aria-labels:', ariaLabels);

  } catch (err) {
    console.error('[error]', err.message);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
    console.log('[done] video saved to', CONFIG.videoDir);
  }
})();