const fs = require('fs');
const path = require('path');

// Extract YouTube video ID from various URL formats
const extractYouTubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
    /youtube\.com\/v\/([^&?/]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get YouTube thumbnail URL (hqdefault is more reliably available than maxresdefault)
const getYouTubeThumbnail = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

// Fetch app icon from iTunes API
const fetchAppStoreIcon = async (appStoreId) => {
  try {
    const https = require('https');
    const url = `https://itunes.apple.com/lookup?id=${appStoreId}`;
    
    return new Promise((resolve) => {
      const request = https.get(url, { timeout: 10000 }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.results && json.results.length > 0) {
              // Prefer artworkUrl512, fall back to artworkUrl100
              const icon = json.results[0].artworkUrl512 || json.results[0].artworkUrl100;
              if (icon) {
                console.log(`[gems] Found App Store icon for ${appStoreId}`);
                resolve(icon);
                return;
              }
            }
            console.log(`[gems] No icon found for App Store ID: ${appStoreId}`);
            resolve(null);
          } catch (e) {
            console.log(`[gems] Error parsing App Store response: ${e.message}`);
            resolve(null);
          }
        });
      });
      
      request.on('error', (err) => {
        console.log(`[gems] Error fetching App Store icon: ${err.message}`);
        resolve(null);
      });
      
      request.on('timeout', () => {
        console.log(`[gems] Timeout fetching App Store icon`);
        request.destroy();
        resolve(null);
      });
    });
  } catch (error) {
    console.warn(`[gems] Failed to fetch App Store icon:`, error.message);
    return null;
  }
};

// Fetch RSS feed and extract image (async)
const fetchRssImage = async (rssUrl) => {
  try {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve) => {
      const protocol = rssUrl.startsWith('https') ? https : http;
      
      const request = protocol.get(rssUrl, { timeout: 15000 }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          fetchRssImage(response.headers.location).then(resolve);
          return;
        }
        
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          // Try multiple patterns to find the podcast image
          
          // 1. itunes:image href (most common for podcasts)
          let match = data.match(/<itunes:image[^>]+href=["']([^"']+)["']/i);
          if (match) {
            console.log(`[gems] Found itunes:image for RSS feed`);
            resolve(match[1]);
            return;
          }
          
          // 2. Standard RSS image/url
          match = data.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i);
          if (match) {
            console.log(`[gems] Found image/url for RSS feed`);
            resolve(match[1]);
            return;
          }
          
          // 3. media:thumbnail
          match = data.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
          if (match) {
            console.log(`[gems] Found media:thumbnail for RSS feed`);
            resolve(match[1]);
            return;
          }
          
          // 4. googleplay:image
          match = data.match(/<googleplay:image[^>]+href=["']([^"']+)["']/i);
          if (match) {
            console.log(`[gems] Found googleplay:image for RSS feed`);
            resolve(match[1]);
            return;
          }
          
          console.log(`[gems] No image found in RSS feed: ${rssUrl}`);
          resolve(null);
        });
      });
      
      request.on('error', (err) => {
        console.log(`[gems] Error fetching RSS: ${err.message}`);
        resolve(null);
      });
      
      request.on('timeout', () => {
        console.log(`[gems] Timeout fetching RSS: ${rssUrl}`);
        request.destroy();
        resolve(null);
      });
    });
  } catch (error) {
    console.warn(`[gems] Failed to fetch RSS image from ${rssUrl}:`, error.message);
    return null;
  }
};

module.exports = async () => {
  const filePath = path.join(__dirname, '..', 'gems.json');

  if (!fs.existsSync(filePath)) {
    return { podcasts: [], youtube: [], writing: [], apps: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(parsed)) {
      return { podcasts: [], youtube: [], websites: [] };
    }

    const podcasts = [];
    const youtube = [];
    const writing = [];
    const apps = [];

    for (const item of parsed) {
      if (!item || !item.id) continue;

      if (item.type === 'podcast') {
        // Fetch image from RSS feed
        let image = item.image || null;
        if (!image && item.rss) {
          console.log(`[gems] Fetching RSS for ${item.title}: ${item.rss}`);
          image = await fetchRssImage(item.rss);
          if (image) {
            console.log(`[gems] Got image for ${item.title}: ${image.substring(0, 60)}...`);
          }
        }
        
        podcasts.push({
          ...item,
          image
        });
      } else if (item.type === 'youtube') {
        const videoId = extractYouTubeId(item.url);
        youtube.push({
          ...item,
          image: item.image || (videoId ? getYouTubeThumbnail(videoId) : null),
          youtubeId: videoId
        });
      } else if (item.type === 'writing') {
        writing.push(item);
      } else if (item.type === 'app') {
        // Fetch icon from App Store if appStoreId provided
        let image = item.image || null;
        if (!image && item.appStoreId) {
          console.log(`[gems] Fetching App Store icon for ${item.title}: ${item.appStoreId}`);
          image = await fetchAppStoreIcon(item.appStoreId);
          if (image) {
            console.log(`[gems] Got icon for ${item.title}: ${image.substring(0, 60)}...`);
          }
        }
        
        apps.push({
          ...item,
          image
        });
      }
    }

    return {
      podcasts,
      youtube,
      writing,
      apps,
      all: parsed
    };
  } catch (error) {
    console.warn('Unable to parse gems from src/gems.json:', error.message);
    return { podcasts: [], youtube: [], writing: [], apps: [], all: [] };
  }
};
