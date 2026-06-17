const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'http://localhost:5174/mock-interview',
  screenshotDir: './screenshots',
  videoDir: './feature-videos',
  video: { width: 1280, height: 720 },
  timeouts: {
    pageLoad: 2000,
    sessionStart: 3000,
    elementWait: 5000,
    sentiment: 8000,
  },
  selectors: {
    startButton: [
      'text=Start',
      'text=Begin',
      'button[data-testid="start"]',
      '[aria-label="Start Interview"]',
      'text=Start Interview',
    ],
    endButton: [
      'text=End Session',
      'text=Finish',
      '[data-testid="end-session"]',
      '[aria-label="End Interview"]',
    ],
    sentimentIndicator: [
      '[data-testid="sentiment"]',
      '.sentiment-indicator',
      '[aria-label="Sentiment"]',
      '[data-testid="sentiment-score"]',
      '.sentiment-score',
    ],
  },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
      console.log(`[found] selector: ${sel}`);
      return sel;
    } catch { continue; }
  }
  return null;
}

async function capture(page, filename, label) {
  const filePath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[screenshot] ${label} → ${filePath}`);
  return filePath;
}

async function debugPageElements(page) {
  const buttons = await page.$$eval('button', els => els.map(e => e.innerText.trim()));
  console.log('[debug] buttons:', buttons);
  const testIds = await page.$$eval('[data-testid]', els => els.map(e => e.dataset.testid));
  console.log('[debug] testids:', testIds);
  const classes = await page.$$eval('[class*="sentiment"]', els => els.map(e => e.className));
  console.log('[debug] sentiment classes:', classes);
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

    // --- Lobby ---
    console.log('[nav] loading lobby...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(CONFIG.timeouts.pageLoad);
    await capture(page, '01-lobby.png', 'lobby loaded');
    await debugPageElements(page);

    // --- Start session ---
    const startSel = await tryClick(page, CONFIG.selectors.startButton, CONFIG.timeouts.elementWait);
    if (startSel) {
      await page.waitForTimeout(CONFIG.timeouts.sessionStart);
      await capture(page, '02-session-active.png', 'session started');
      await debugPageElements(page);

      // --- Sentiment indicator ---
      const sentimentSel = await waitForAny(
        page,
        CONFIG.selectors.sentimentIndicator,
        CONFIG.timeouts.sentiment
      );
      if (sentimentSel) {
        await capture(page, '03-sentiment-visible.png', 'sentiment visible');
        const sentimentText = await page.$eval(sentimentSel, el => el.innerText ?? el.textContent);
        console.log(`[sentiment] value: ${sentimentText}`);
      } else {
        console.warn('[warn] sentiment indicator not found — check CONFIG.selectors.sentimentIndicator');
        await capture(page, '03-sentiment-missing.png', 'sentiment not found');
      }

      // --- End session ---
      const endSel = await tryClick(page, CONFIG.selectors.endButton, CONFIG.timeouts.elementWait);
      if (endSel) {
        await page.waitForTimeout(CONFIG.timeouts.pageLoad);
        await capture(page, '04-session-ended.png', 'session ended');
      } else {
        console.warn('[warn] end button not found — check CONFIG.selectors.endButton');
      }

    } else {
      console.warn('[warn] start button not found — check CONFIG.selectors.startButton');
      await capture(page, '02-start-missing.png', 'start button not found');
    }

  } catch (err) {
    console.error('[error]', err.message);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
    console.log('[done] video saved to', CONFIG.videoDir);
  }
})();