/**
 * Get the full URL for a screenshot
 * @param {string} screenshotUrl - Relative URL like /screenshots/filename.png
 * @param {string} apiBaseUrl - API base URL like http://localhost:4000/api/mapping
 * @returns {string|null} Full URL or null if screenshotUrl is invalid
 */
export const getScreenshotUrl = (screenshotUrl, apiBaseUrl) => {
  // Type check: ensure screenshotUrl is a string
  if (!screenshotUrl || typeof screenshotUrl !== 'string') {
    return null;
  }
  
  // If screenshotUrl is already a full URL (starts with http:// or https://)
  if (screenshotUrl.startsWith('http://') || screenshotUrl.startsWith('https://')) {
    // If it's already a full screenshot URL, return it
    if (screenshotUrl.includes('/screenshots/')) {
      return screenshotUrl;
    }
    // If it's a full URL but NOT a screenshot path (e.g., a page URL), something is wrong
    // This is a backend bug - the backend should return /screenshots/filename.png, not the page URL
    console.error('Invalid screenshotUrl - received page URL instead of screenshot path:', screenshotUrl);
    console.error('This indicates a backend bug. The backend should return /screenshots/filename.png');
    // Return null - the backend needs to be fixed
    return null;
  }
  
  // Extract base URL (remove /api/mapping)
  let baseUrl = 'http://localhost:4000';
  if (apiBaseUrl && typeof apiBaseUrl === 'string') {
    try {
      const url = new URL(apiBaseUrl);
      baseUrl = `${url.protocol}//${url.host}`;
    } catch (e) {
      // Fallback to simple replace
      baseUrl = apiBaseUrl.replace('/api/mapping', '');
    }
  }
  
  // screenshotUrl should already include /screenshots/
  // If it doesn't start with /, add it
  const path = screenshotUrl.startsWith('/') ? screenshotUrl : `/${screenshotUrl}`;
  
  return `${baseUrl}${path}`;
};
