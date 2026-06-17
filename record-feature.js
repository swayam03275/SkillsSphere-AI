import { chromium } from 'playwright';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: './server/.env' });

const CONFIG = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/skillssphere',
  baseUrl: 'http://localhost:5174',
  videoDir: './feature-videos',
  screenshotDir: './screenshots',
  video: { width: 1280, height: 720 },
  timeouts: {
    login: 3000,
    navigation: 2000,
    session: 5000,
    elementWait: 5000,
  },
  selectors: {
    emailInput: ['input[type="email"]', 'input[name="email"]', '[data-testid="email"]'],
    passwordInput: ['input[type="password"]', 'input[name="password"]', '[data-testid="password"]'],
    submitButton: ['button[type="submit"]', 'text=Login', 'text=Sign In'],
    startButton: ['text=Start', 'text=Begin Interview', '[data-testid="start-interview"]', 'button[aria-label="Start"]'],
    endButton: ['text=End Session', 'text=Finish', '[data-testid="end-session"]'],
  },
};

// --- Helpers ---
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function tryAction(page, selectors, action = 'click', timeout = 5000) {
  for (const sel of selectors) {
    try {
      if (action === 'click') await page.click(sel, { timeout });
      else await page.waitForSelector(sel, { timeout });
      console.log(`[found] ${action} → ${sel}`);
      return sel;
    } catch { continue; }
  }
  return null;
}

async function fillField(page, selectors, value, label) {
  const sel = await tryAction(page, selectors, 'waitForSelector');
  if (sel) {
    await page.fill(sel, value);
    console.log(`[fill] ${label} filled`);
    return true;
  }
  console.warn(`[warn] ${label} field not found`);
  return false;
}

async function capture(page, filename, label) {
  const filePath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[screenshot] ${label} → ${filePath}`);
}

// --- DB: create test user ---
async function createTestUser() {
  await mongoose.connect(CONFIG.mongoUri);
  console.log('[db] connected');

  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

  const email = `test${Date.now()}@example.com`;
  const password = 'Test@1234';
  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    name: 'Test User',
    email,
    password: hashed,
    role: 'student',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`[db] test user created: ${email}`);
  await mongoose.disconnect();
  console.log('[db] disconnected');
  return { email, password };
}

// --- DB: cleanup test user ---
async function deleteTestUser(email) {
  await mongoose.connect(CONFIG.mongoUri);
  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
  await User.deleteOne({ email });
  console.log(`[db] test user removed: ${email}`);
  await mongoose.disconnect();
}

// --- Main ---
async function recordFeature() {
  ensureDir(CONFIG.videoDir);
  ensureDir(CONFIG.screenshotDir);

  const { email, password } = await createTestUser();

  console.log('[browser] launching...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: { dir: CONFIG.videoDir, size: CONFIG.video },
  });

  const page = await context.newPage();

  try {
    // --- Login ---
    console.log('[nav] login page...');
    await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle' });
    await capture(page, '01-login-page.png', 'login page');

    await fillField(page, CONFIG.selectors.emailInput, email, 'email');
    await fillField(page, CONFIG.selectors.passwordInput, password, 'password');
    await capture(page, '02-login-filled.png', 'login form filled');

    const submitted = await tryAction(page, CONFIG.selectors.submitButton);
    if (!submitted) console.warn('[warn] submit button not found — check CONFIG.selectors.submitButton');

    await page.waitForTimeout(CONFIG.timeouts.login);
    await capture(page, '03-post-login.png', 'post login');

    // --- Mock interview lobby ---
    console.log('[nav] mock interview...');
    await page.goto(`${CONFIG.baseUrl}/mock-interview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(CONFIG.timeouts.navigation);
    await capture(page, '04-lobby.png', 'interview lobby');

    // Log page elements for debugging
    const buttons = await page.$$eval('button', els => els.map(e => e.innerText.trim()));
    console.log('[debug] buttons on page:', buttons);
    const testIds = await page.$$eval('[data-testid]', els => els.map(e => e.dataset.testid));
    console.log('[debug] testids:', testIds);

    // --- Start session ---
    const started = await tryAction(page, CONFIG.selectors.startButton);
    if (started) {
      await page.waitForTimeout(CONFIG.timeouts.session);
      await capture(page, '05-session-active.png', 'session active');

      // --- End session ---
      const ended = await tryAction(page, CONFIG.selectors.endButton);
      if (ended) {
        await page.waitForTimeout(CONFIG.timeouts.navigation);
        await capture(page, '06-session-ended.png', 'session ended');
      } else {
        console.warn('[warn] end button not found — check CONFIG.selectors.endButton');
        await page.waitForTimeout(CONFIG.timeouts.session);
      }
    } else {
      console.warn('[warn] start button not found — check CONFIG.selectors.startButton');
    }

  } catch (err) {
    console.error('[error]', err.message);
    await capture(page, 'error-state.png', 'error state');
  } finally {
    await context.close();
    await browser.close();
    console.log('[browser] closed');
    await deleteTestUser(email);
    console.log('[done] video saved to', CONFIG.videoDir);
  }
}

recordFeature().catch((err) => {
  console.error('[fatal]', err.message);
  process.exit(1);
});