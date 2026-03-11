/**
 * Normalize URL for consistent caching
 * Removes hash fragments and query parameters to ensure same page = same screenshot
 */
function normalizeUrl(url) {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    // Remove hash and query params for consistent caching
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch (e) {
    // If URL parsing fails, just remove hash and query manually
    return url.split('#')[0].split('?')[0];
  }
}

module.exports = { normalizeUrl };
