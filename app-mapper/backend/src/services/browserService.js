const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class BrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init(options = {}) {
    const defaultOptions = {
      headless: options.headless === false ? false : 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    };

    this.browser = await puppeteer.launch({
      ...defaultOptions,
      ...options,
    });

    this.page = await this.browser.newPage();
    
    // iPhone 12 mobile emulation (default)
    if (options.mobile !== false) {
      const iPhone12UserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
      
      await this.page.setUserAgent(iPhone12UserAgent);
      
      // iPhone 12 viewport: 390x844 with 3x device pixel ratio
      await this.page.setViewport({
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      });

      // Set device emulation for better mobile rendering
      const client = await this.page.target().createCDPSession();
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        mobile: true,
      });
      await client.send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
      });
    } else {
      // Desktop viewport
      await this.page.setViewport({
        width: options.width || 1920,
        height: options.height || 1080,
      });
    }

    return this.page;
  }

  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  isPageReady() {
    return this.page && !this.page.isClosed();
  }

  async navigateTo(url) {
    if (!this.validateUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    if (!this.isPageReady()) {
      throw new Error('Page is closed or not initialized');
    }

    try {
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return this.page;
    } catch (error) {
      if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
        throw new Error('Page was closed during navigation');
      }
      throw error;
    }
  }

  async takeScreenshot(options = {}) {
    if (!this.isPageReady()) {
      throw new Error('Page is closed or not initialized.');
    }

    try {
      const screenshotOptions = {
        type: 'png',
        fullPage: options.fullPage !== false,
        ...options,
      };

      return await this.page.screenshot(screenshotOptions);
    } catch (error) {
      if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
        throw new Error('Page was closed during screenshot');
      }
      throw error;
    }
  }

  async getClickableElements() {
    if (!this.isPageReady()) {
      throw new Error('Page is closed or not initialized.');
    }

    try {
      return await this.page.evaluate(() => {
      const selectors = [
        'a[href]',
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        '[role="button"]',
        '[onclick]',
        'select',
        'input[type="checkbox"]',
        'input[type="radio"]',
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="number"]',
        'input[type="tel"]',
        'input[type="search"]',
        'input[type="url"]',
        'input:not([type])', // Inputs without type attribute (defaults to text)
        'textarea',
      ];

      const elements = [];
      const seen = new Set();

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          // Skip hidden elements
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          // Skip if already seen
          const id = el.id || el.className || el.tagName + el.textContent?.substring(0, 20);
          if (seen.has(id)) return;
          seen.add(id);

          // Helper to generate unique selector
          function generateSelector(el) {
            if (el.id) return `#${el.id}`;
            if (el.className) {
              const classes = el.className.split(' ').filter(c => c).join('.');
              if (classes) return `.${classes}`;
            }
            return el.tagName.toLowerCase();
          }

          // Get element info
          const info = {
            tagName: el.tagName.toLowerCase(),
            id: el.id || null,
            className: el.className || null,
            text: el.textContent?.trim().substring(0, 50) || null,
            href: el.href || null,
            type: el.type || null,
            role: el.getAttribute('role') || null,
            selector: generateSelector(el),
            boundingBox: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
          };

          elements.push(info);
        });
      });

      return elements;
    });
    } catch (error) {
      if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
        throw new Error('Page was closed during element detection');
      }
      throw error;
    }
  }

  async clickElement(selector, options = {}) {
    if (!this.isPageReady()) {
      return false;
    }

    try {
      await Promise.race([
        this.page.waitForSelector(selector, { timeout: 5000, visible: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      const navigationPromise = this.page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 5000 
      }).catch(() => null);

      await this.page.click(selector, options);
      
      await navigationPromise;
      
      await new Promise(resolve => setTimeout(resolve, options.waitAfter || 1000));
      
      return this.isPageReady();
    } catch (error) {
      if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
        return false;
      }
      return false;
    }
  }

  async fillInput(selector, value) {
    if (!this.isPageReady()) {
      return false;
    }

    try {
      await this.page.waitForSelector(selector, { timeout: 5000, visible: true });
      await this.page.click(selector);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type(selector, value, { delay: 50 });
      return true;
    } catch (error) {
      if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
        return false;
      }
      return false;
    }
  }

  async getCurrentUrl() {
    if (!this.isPageReady()) {
      return null;
    }
    try {
      return this.page.url();
    } catch (error) {
      return null;
    }
  }

  async getPageTitle() {
    if (!this.isPageReady()) {
      return null;
    }
    try {
      return await this.page.title();
    } catch (error) {
      return null;
    }
  }

  getPage() {
    return this.page;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = BrowserService;
