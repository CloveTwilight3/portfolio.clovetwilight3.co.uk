const fs = require('fs');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

// Your GitHub username
const username = 'clovetwilight3';

async function fetchGitHubAvatar() {
  try {
    // Check if favicon already exists
    const faviconPath = path.join(process.cwd(), 'favicon.ico');
    const faviconPngPath = path.join(process.cwd(), 'favicon.png');
    
    // First, fetch user data from GitHub API
    const userDataPromise = new Promise((resolve, reject) => {
      https.get(`https://api.github.com/users/${username}`, {
        headers: {
          'User-Agent': 'Node.js'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Failed to fetch user data: ${res.statusCode}`));
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
    
    const userData = await userDataPromise;
    const avatarUrl = userData.avatar_url;
    
    if (!avatarUrl) {
      throw new Error('No avatar URL found in GitHub user data');
    }
    
    console.log(`Found avatar URL: ${avatarUrl}`);
    
    // Check if we already have this avatar cached by URL
    const cacheFilePath = path.join(process.cwd(), '.avatar-cache.json');
    let cache = { url: '', etag: '', hash: '' };
    
    if (fs.existsSync(cacheFilePath)) {
      try {
        cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      } catch (err) {
        console.log('Could not read avatar cache, will download fresh copy');
      }
    }
    
    // If URL matches and files exist, we can skip the download
    const filesExist = fs.existsSync(faviconPath) && fs.existsSync(faviconPngPath);
    
    if (filesExist && cache.url === avatarUrl) {
      console.log('Avatar already downloaded and up to date. Skipping download.');
      return;
    }
    
    // Download the avatar image
    const downloadPromise = new Promise((resolve, reject) => {
      https.get(avatarUrl, {
        headers: {
          'User-Agent': 'Node.js',
          'If-None-Match': cache.etag || '' // Use etag for caching if available
        }
      }, (res) => {
        if (res.statusCode === 304) {
          // Not modified, use cached version
          console.log('Avatar not modified since last download. Using cached version.');
          resolve(null);
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download avatar: ${res.statusCode}`));
          return;
        }
        
        // Get the etag for future requests
        const etag = res.headers.etag || '';
        
        const data = [];
        
        res.on('data', (chunk) => {
          data.push(chunk);
        });
        
        res.on('end', () => {
          const imageBuffer = Buffer.concat(data);
          
          // Calculate hash of the image for future comparison
          const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
          
          // Update cache
          cache = { url: avatarUrl, etag, hash };
          fs.writeFileSync(cacheFilePath, JSON.stringify(cache));
          
          resolve(imageBuffer);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
    
    const imageBuffer = await downloadPromise;
    
    // If imageBuffer is null, we're using cached version and don't need to write files
    if (imageBuffer) {
      // Save as favicon.ico in the root directory
      fs.writeFileSync(faviconPath, imageBuffer);
      console.log('Favicon saved successfully!');
      
      // Also save as a PNG for modern browsers
      fs.writeFileSync(faviconPngPath, imageBuffer);
      console.log('Favicon PNG saved successfully!');
    }
    
  } catch (error) {
    console.error('Error fetching GitHub avatar:', error);
  }
}

// Run the function
fetchGitHubAvatar();
