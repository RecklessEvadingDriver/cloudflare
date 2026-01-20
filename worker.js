/**
 * Cloudflare Worker for proxying protected media links with CloudFront cookies
 * This worker accepts encoded URLs and proxies requests with the required headers/cookies
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Main request handler
 */
async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCORS()
  }
  
  // Root path - show usage info
  if (url.pathname === '/' || url.pathname === '') {
    return new Response(getUsageHTML(), {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
  
  // API endpoint to generate temporary links
  if (url.pathname === '/generate' && request.method === 'POST') {
    return handleGenerate(request)
  }
  
  // Proxy endpoint - decode and proxy the request
  if (url.pathname.startsWith('/proxy/')) {
    return handleProxy(request, url)
  }
  
  return new Response('Not Found', { status: 404 })
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400',
    }
  })
}

/**
 * Generate a temporary link from protected URL with headers
 */
async function handleGenerate(request) {
  try {
    const body = await request.json()
    const { url, headers, ttl } = body
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }
    
    // Encode the URL and headers
    const config = {
      url: url,
      headers: headers || {},
      exp: ttl ? Date.now() + (ttl * 1000) : Date.now() + (24 * 3600 * 1000) // Default 24h
    }
    
    const encoded = btoa(JSON.stringify(config))
    const workerUrl = new URL(request.url)
    const proxyUrl = `${workerUrl.protocol}//${workerUrl.host}/proxy/${encoded}`
    
    return new Response(JSON.stringify({
      success: true,
      proxyUrl: proxyUrl,
      expiresAt: new Date(config.exp).toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}

/**
 * Proxy the request to the actual media URL with required headers
 */
async function handleProxy(request, url) {
  try {
    // Extract encoded config from path
    const encodedConfig = url.pathname.replace('/proxy/', '')
    
    if (!encodedConfig) {
      return new Response('Invalid proxy URL', { status: 400 })
    }
    
    // Decode the configuration
    let config
    try {
      config = JSON.parse(atob(encodedConfig))
    } catch (e) {
      return new Response('Invalid encoded data', { status: 400 })
    }
    
    // Check expiration
    if (config.exp && Date.now() > config.exp) {
      return new Response('Link expired', { status: 410 })
    }
    
    // Build target URL with any query parameters from the request
    let targetUrl = config.url
    if (url.search) {
      // Preserve query parameters for segment requests
      const separator = targetUrl.includes('?') ? '&' : '?'
      targetUrl = targetUrl + separator + url.search.substring(1)
    }
    
    // Prepare headers for the proxied request
    const proxyHeaders = new Headers()
    
    // Add stored headers (Referer, Cookie, etc.)
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        proxyHeaders.set(key, value)
      }
    }
    
    // Forward Range header for partial content requests (important for video streaming)
    const rangeHeader = request.headers.get('Range')
    if (rangeHeader) {
      proxyHeaders.set('Range', rangeHeader)
    }
    
    // Add user agent
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders
    })
    
    // Create response with CORS headers
    const proxyResponse = new Response(response.body, response)
    
    // Add CORS headers
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*')
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    proxyResponse.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type')
    
    // Pass through important headers
    if (response.headers.has('Content-Type')) {
      proxyResponse.headers.set('Content-Type', response.headers.get('Content-Type'))
    }
    if (response.headers.has('Content-Length')) {
      proxyResponse.headers.set('Content-Length', response.headers.get('Content-Length'))
    }
    if (response.headers.has('Content-Range')) {
      proxyResponse.headers.set('Content-Range', response.headers.get('Content-Range'))
    }
    
    return proxyResponse
    
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }
}

/**
 * Generate usage HTML
 */
function getUsageHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>CloudFront Link Proxy</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .section { margin: 30px 0; }
    .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    .button:hover { background: #0056b3; }
    #result { margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 5px; display: none; }
    input, textarea { width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; }
    textarea { min-height: 100px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>🔗 CloudFront Link Proxy Service</h1>
  
  <div class="section">
    <h2>About</h2>
    <p>This service converts protected media links (with CloudFront cookies and headers) into simple temporary links that can be played directly in video players.</p>
  </div>
  
  <div class="section">
    <h2>Generate Temporary Link</h2>
    <form id="generateForm">
      <label>Media URL:</label>
      <input type="text" id="mediaUrl" placeholder="https://sacdn.hakunaymatata.com/dash/..." required>
      
      <label>Headers (JSON):</label>
      <textarea id="headers" placeholder='{"Referer": "https://api.inmoviebox.com", "Cookie": "..."}'></textarea>
      
      <label>TTL (seconds, default 86400 = 24h):</label>
      <input type="number" id="ttl" placeholder="86400" value="86400">
      
      <button type="submit" class="button">Generate Link</button>
    </form>
    
    <div id="result">
      <h3>Generated Proxy URL:</h3>
      <input type="text" id="proxyUrl" readonly>
      <p id="expiresAt"></p>
      <button class="button" onclick="copyToClipboard()">Copy URL</button>
    </div>
  </div>
  
  <div class="section">
    <h2>API Usage</h2>
    <h3>Generate Link (POST /generate)</h3>
    <pre><code>curl -X POST https://your-worker.workers.dev/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://sacdn.hakunaymatata.com/dash/index.mpd",
    "headers": {
      "Referer": "https://api.inmoviebox.com",
      "Cookie": "CloudFront-Policy=...; CloudFront-Signature=...; CloudFront-Key-Pair-Id=..."
    },
    "ttl": 86400
  }'</code></pre>
    
    <h3>Response</h3>
    <pre><code>{
  "success": true,
  "proxyUrl": "https://your-worker.workers.dev/proxy/eyJ1cmwiOi...",
  "expiresAt": "2024-01-21T08:00:00.000Z"
}</code></pre>
  </div>
  
  <script>
    document.getElementById('generateForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const url = document.getElementById('mediaUrl').value;
      const headersText = document.getElementById('headers').value;
      const ttl = parseInt(document.getElementById('ttl').value) || 86400;
      
      let headers = {};
      if (headersText) {
        try {
          headers = JSON.parse(headersText);
        } catch (e) {
          alert('Invalid JSON in headers field');
          return;
        }
      }
      
      try {
        const response = await fetch('/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, headers, ttl })
        });
        
        const data = await response.json();
        
        if (data.success) {
          document.getElementById('proxyUrl').value = data.proxyUrl;
          document.getElementById('expiresAt').textContent = 'Expires: ' + data.expiresAt;
          document.getElementById('result').style.display = 'block';
        } else {
          alert('Error: ' + data.error);
        }
      } catch (error) {
        alert('Request failed: ' + error.message);
      }
    });
    
    function copyToClipboard() {
      const input = document.getElementById('proxyUrl');
      input.select();
      document.execCommand('copy');
      alert('URL copied to clipboard!');
    }
  </script>
</body>
</html>`
}
