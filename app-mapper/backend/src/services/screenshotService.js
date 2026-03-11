const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

class ScreenshotService {
  constructor(storagePath = null) {
    // Use absolute path to avoid issues
    this.storagePath = storagePath || path.join(__dirname, '../../storage/screenshots');
    this.ensureStorageDir();
    this.cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  async ensureStorageDir() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  /**
   * Generate a filename from URL using hash
   */
  getFilenameFromUrl(url) {
    if (!url) return null;
    // Create a hash of the URL for consistent filename
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return `${hash}.png`;
  }

  /**
   * Check if screenshot exists and is fresh (less than 24 hours old)
   */
  async getExistingScreenshot(url) {
    const filename = this.getFilenameFromUrl(url);
    if (!filename) return null;

    const filepath = path.join(this.storagePath, filename);
    const thumbnailPath = path.join(this.storagePath, `thumb_${filename}`);

    try {
      const stats = await fs.stat(filepath);
      const now = Date.now();
      const fileAge = now - stats.mtime.getTime();

      // If file is less than 24 hours old, return existing
      if (fileAge < this.cacheMaxAge) {
        const thumbnailExists = await fs.access(thumbnailPath).then(() => true).catch(() => false);
        
        return {
          id: filename.replace('.png', ''),
          filename,
          thumbnailFilename: `thumb_${filename}`,
          path: filepath,
          thumbnailPath: thumbnailExists ? thumbnailPath : null,
          url: `/screenshots/${filename}`, // This is the screenshot URL path
          thumbnailUrl: `/screenshots/thumb_${filename}`,
          fullUrl: `http://localhost:${process.env.PORT || 4000}/screenshots/${filename}`,
          thumbnailFullUrl: `http://localhost:${process.env.PORT || 4000}/screenshots/thumb_${filename}`,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          cached: true,
        };
      }
    } catch (error) {
      // File doesn't exist
      return null;
    }

    return null;
  }

  async saveScreenshot(imageBuffer, metadata = {}) {
    const url = metadata.url;
    
    // Check if we have a cached version
    if (url) {
      const existing = await this.getExistingScreenshot(url);
      if (existing) {
        console.log(`Using cached screenshot for: ${url}`);
        // Merge existing screenshot data with metadata, but ensure url (screenshot path) is preserved
        // Remove url and screenshotUrl from metadata to prevent overwriting
        const { url: metadataUrl, screenshotUrl: metadataScreenshotUrl, ...cleanMetadata } = metadata;
        const result = { 
          ...existing, 
          ...cleanMetadata,
          // CRITICAL: Ensure url stays as screenshot path, not page URL from metadata
          url: existing.url, // This is /screenshots/filename.png
        };
        console.log(`Returning screenshot data with url: ${result.url}, metadata had url: ${metadataUrl}`);
        return result;
      }
    }

    // Generate filename from URL or use hash
    const filename = url ? this.getFilenameFromUrl(url) : `${crypto.randomBytes(16).toString('hex')}.png`;
    const filepath = path.join(this.storagePath, filename);

    // Save original screenshot
    await fs.writeFile(filepath, imageBuffer);

    // Create thumbnail
    const thumbnailPath = path.join(this.storagePath, `thumb_${filename}`);
    await sharp(imageBuffer)
      .resize(400, 300, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbnailPath);

    // Remove url and screenshotUrl from metadata to prevent overwriting screenshot path
    const { url: metadataUrl, screenshotUrl: metadataScreenshotUrl, ...cleanMetadata } = metadata;
    
    const screenshotData = {
      id: filename.replace('.png', ''),
      filename,
      thumbnailFilename: `thumb_${filename}`,
      path: filepath,
      thumbnailPath,
      url: `/screenshots/${filename}`, // CRITICAL: This must be the screenshot path, not page URL
      thumbnailUrl: `/screenshots/thumb_${filename}`,
      fullUrl: `http://localhost:${process.env.PORT || 4000}/screenshots/${filename}`,
      thumbnailFullUrl: `http://localhost:${process.env.PORT || 4000}/screenshots/thumb_${filename}`,
      createdAt: new Date().toISOString(),
      cached: false,
      ...cleanMetadata, // Spread cleaned metadata (without url/screenshotUrl)
    };
    
    console.log(`Saved new screenshot: url=${screenshotData.url}, metadata had url=${metadataUrl}`);

    console.log(`Saved new screenshot for: ${url || 'unknown'}`);
    return screenshotData;
  }

  async getScreenshot(idOrUrl) {
    // Support both ID and URL lookup
    let filename;
    if (idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
      filename = this.getFilenameFromUrl(idOrUrl);
    } else {
      filename = `${idOrUrl}.png`;
    }
    
    const filepath = path.join(this.storagePath, filename);
    
    try {
      return await fs.readFile(filepath);
    } catch (error) {
      throw new Error(`Screenshot not found: ${idOrUrl}`);
    }
  }

  async deleteScreenshot(idOrUrl) {
    let filename;
    if (idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
      filename = this.getFilenameFromUrl(idOrUrl);
    } else {
      filename = `${idOrUrl}.png`;
    }
    
    const thumbFilename = `thumb_${filename}`;
    const filepath = path.join(this.storagePath, filename);
    const thumbPath = path.join(this.storagePath, thumbFilename);

    try {
      await fs.unlink(filepath).catch(() => {});
      await fs.unlink(thumbPath).catch(() => {});
      return true;
    } catch (error) {
      console.error(`Failed to delete screenshot ${idOrUrl}:`, error);
      return false;
    }
  }

  /**
   * Clean up old screenshots (older than cacheMaxAge)
   */
  async cleanupOldScreenshots() {
    try {
      const files = await fs.readdir(this.storagePath);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.png') || file.startsWith('thumb_')) continue;
        
        const filepath = path.join(this.storagePath, file);
        const stats = await fs.stat(filepath);
        const fileAge = now - stats.mtime.getTime();

        if (fileAge > this.cacheMaxAge) {
          await this.deleteScreenshot(file.replace('.png', ''));
          cleaned++;
        }
      }

      console.log(`Cleaned up ${cleaned} old screenshots`);
      return cleaned;
    } catch (error) {
      console.error('Error cleaning up screenshots:', error);
      return 0;
    }
  }

  /**
   * Get screenshot info by URL
   */
  async getScreenshotInfo(url) {
    return await this.getExistingScreenshot(url);
  }
}

module.exports = ScreenshotService;
