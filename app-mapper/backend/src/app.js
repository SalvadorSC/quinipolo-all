const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const mappingRoutes = require('./routes/mappingRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve screenshots statically at root level for easier access
// __dirname is src/, so we need to go up one level to backend/
const screenshotsPath = path.resolve(__dirname, '../storage/screenshots');
const fs = require('fs');
try {
  if (!fs.existsSync(screenshotsPath)) {
    fs.mkdirSync(screenshotsPath, { recursive: true });
  }
  console.log('✓ Serving screenshots from:', screenshotsPath);
} catch (error) {
  console.error('✗ Failed to setup screenshots directory:', error);
}
app.use('/screenshots', express.static(screenshotsPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  },
}));

// Routes
app.use('/api/mapping', mappingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to list screenshots
app.get('/debug/screenshots', async (req, res) => {
  const fs = require('fs').promises;
  const path = require('path');
  try {
    const screenshotsDir = path.join(__dirname, '../storage/screenshots');
    const files = await fs.readdir(screenshotsDir);
    const screenshots = await Promise.all(
      files
        .filter(f => f.endsWith('.png') && !f.startsWith('thumb_'))
        .map(async (f) => {
          const filepath = path.join(screenshotsDir, f);
          const stats = await fs.stat(filepath);
          return {
            filename: f,
            url: `/screenshots/${f}`,
            fullUrl: `http://localhost:${PORT}/screenshots/${f}`,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
            ageHours: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)),
          };
        })
    );
    res.json({ 
      screenshots, 
      count: screenshots.length,
      totalSizeMB: (screenshots.reduce((sum, s) => sum + s.size, 0) / 1024 / 1024).toFixed(2),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup endpoint
app.post('/debug/cleanup-screenshots', async (req, res) => {
  const ScreenshotService = require('./services/screenshotService');
  const screenshotService = new ScreenshotService();
  try {
    const cleaned = await screenshotService.cleanupOldScreenshots();
    res.json({ success: true, cleaned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`App Mapper Backend running on port ${PORT}`);
});
