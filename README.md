# MovieBox API Worker

A comprehensive Cloudflare Workers solution for accessing MovieBox content with automatic proxy link generation for protected media.

## 📦 What's Included

This repository contains a **unified Cloudflare Worker** (`moviebox-worker.js`) that provides:

1. ✅ **Complete MovieBox API** - Search, browse, and stream content via REST endpoints
2. ✅ **Automatic Proxy URLs** - Protected links are automatically converted to playable proxy URLs
3. ✅ **Built-in Proxy Service** - Handles CloudFront cookies and headers transparently
4. ✅ **CORS Enabled** - Works directly from web browsers and video players

## 🚀 Quick Start

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy the worker
npm run deploy
```

You'll get a URL like: `https://moviebox-api-worker.your-account.workers.dev`
## 🎯 Features

- 🔐 **Proxy Protected Links**: Handles media URLs that require CloudFront signed cookies
- 🎬 **MovieBox API**: Complete REST API for search, browse, and streaming
- 🔄 **Automatic Conversion**: Protected links are automatically converted to proxy URLs
- 🎥 **Direct Playback**: Generated links work directly in video players (VLC, MPV, web players)
- ⏰ **Temporary Links**: Links expire after 24 hours by default
- 🌐 **CORS Support**: Full CORS headers for web player compatibility
- 📡 **Range Requests**: Supports partial content for video seeking
- 🚀 **Free & Serverless**: Runs on Cloudflare Workers (free tier available)

## 🔗 Example Workflow

```bash
# 1. Search for content
curl "https://your-worker.workers.dev/api/search?query=Inception"

# 2. Get streaming links (already proxied!)
curl "https://your-worker.workers.dev/api/links?data=5083772015786508240|0|0"

# 3. Play directly
vlc "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg=="
```

**Result**: Protected URLs are automatically converted to playable proxy URLs! 🎉

## 🎬 Real-World Example

```javascript
// Search for a movie
const search = await fetch('https://your-worker.workers.dev/api/search?query=Inception');
const movies = await search.json();
// [{ title: "Inception", subjectId: "5083772015786508240", ... }]

// Get streaming links
const links = await fetch('https://your-worker.workers.dev/api/links?data=5083772015786508240|0|0');
const data = await links.json();

// Streams are already proxied!
console.log(data.streams[0]);
// {
//   "url": "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg==",
//   "type": "dash",
//   "headers": {},  // No headers needed!
//   "proxied": true,
//   "originalUrl": "https://sacdn.hakunaymatata.com/dash/.../index.mpd"
// }
```

## 📁 Repository Structure

```
.
├── moviebox-worker.js          # Main worker (API + Proxy)
├── wrangler.toml               # Worker configuration
├── test_moviebox_worker.js     # Integration tests
├── moviebox_cli.py             # Original Python implementation (reference)
├── link_proxy.py               # Python helper library
├── examples.py                 # Python usage examples
├── test_proxy.py               # Unit tests
├── package.json                # NPM scripts
├── README.md                   # This file
├── MOVIEBOX-API.md            # MovieBox API documentation
└── .gitignore
```

## 🔧 Configuration

The worker is pre-configured and ready to deploy:

```toml
name = "moviebox-api-worker"
main = "moviebox-worker.js"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
```

## Problem Statement

MovieBox and similar services provide streaming links that require special headers:
- **CloudFront Cookies**: Signed policy, signature, and key-pair-id
- **Referer Headers**: Required by the CDN
- **Custom Headers**: Various authentication headers

Standard video players cannot handle these protected links directly. This service solves that problem by creating a proxy that injects the required headers transparently.

## Architecture

```
┌──────────────┐      ┌──────────────────┐      ┌─────────────────┐
│ Video Player │─────▶│ Cloudflare       │─────▶│ Protected CDN   │
│              │      │ Worker (Proxy)   │      │ (CloudFront)    │
└──────────────┘      └──────────────────┘      └─────────────────┘
                             │
                             │ Injects:
                             │ - Cookies
                             │ - Referer
                             │ - Headers
```

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/RecklessEvadingDriver/cloudflare.git
cd cloudflare
```

2. **Install Wrangler** (if not already installed):
```bash
npm install -g wrangler
```

3. **Login to Cloudflare**:
```bash
wrangler login
```

4. **Deploy the Worker**:
```bash
npm run deploy
```

You'll get a URL like: `https://moviebox-api-worker.your-account.workers.dev`

## API Endpoints

For detailed API documentation, see [MOVIEBOX-API.md](MOVIEBOX-API.md) or visit your deployed worker URL in a browser.

### Quick Reference

```bash
# List categories
GET /api/list-categories

# Browse category
GET /api/main-page?category={id}&page={num}

# Search
GET /api/search?query={text}

# Load details
GET /api/load?subject={id}

# Get streaming links (auto-converted to proxy URLs)
GET /api/links?data={subjectId|season|episode}

# Manual proxy generation
POST /generate

# Proxy endpoint
GET /proxy/{encoded}
```

## Usage

### Web Interface

Visit your worker URL in a browser to access the interactive API documentation and web interface:

```
https://your-worker.workers.dev/
```

### API Example

```bash
# 1. Search for content
curl "https://your-worker.workers.dev/api/search?query=Inception"

# 2. Get streaming links (automatically converted to proxy URLs)
curl "https://your-worker.workers.dev/api/links?data=5083772015786508240|0|0"

# 3. Play directly in VLC
vlc "https://your-worker.workers.dev/proxy/eyJ1cmwiOi..."
```

### Python Integration

Use the provided Python helper module:

```python
from link_proxy import LinkProxyClient

# Initialize client
client = LinkProxyClient("https://your-worker.workers.dev")

# Generate link manually
result = client.generate_link(
    url="https://sacdn.hakunaymatata.com/dash/.../index.mpd",
    headers={
        "Referer": "https://api.inmoviebox.com",
        "Cookie": "CloudFront-Policy=...;CloudFront-Signature=...;CloudFront-Key-Pair-Id=..."
    },
    ttl=86400  # 24 hours
)

print(f"Proxy URL: {result['proxyUrl']}")
print(f"Expires: {result['expiresAt']}")
```

Or use the MovieBox API directly:

```python
import requests

# Search for content
response = requests.get("https://your-worker.workers.dev/api/search?query=Inception")
results = response.json()
print(f"Found: {results[0]['title']}")

# Get streaming links (automatically converted to proxy URLs)
links_response = requests.get(f"https://your-worker.workers.dev/api/links?data={results[0]['subjectId']}|0|0")
data = links_response.json()

# Proxy URLs are ready to use!
proxy_url = data['streams'][0]['url']
print(f"Play: {proxy_url}")
```

## How It Works

1. **Encoding**: The protected URL and its required headers are encoded into a base64 string
2. **Proxy URL**: A temporary URL is created: `https://worker.dev/proxy/{encoded_data}`
3. **Playback**: When a player requests this URL:
   - The worker decodes the configuration
   - Checks if the link has expired
   - Fetches the actual media from the protected CDN with required headers
   - Streams the response back to the player with CORS headers

## Security Considerations

- **No Server Storage**: Headers and cookies are embedded in the URL (base64 encoded)
- **Expiration**: Links automatically expire after the specified TTL
- **HTTPS Only**: All traffic is encrypted via HTTPS
- **Rate Limiting**: Cloudflare provides automatic DDoS protection
- **Shared Links**: Anyone with the proxy URL can access the media until expiration

⚠️ **Warning**: Don't share proxy URLs publicly if the underlying content is sensitive. Treat them like temporary passwords.

## Configuration

### Custom Domain

To use a custom domain, update `wrangler.toml`:

```toml
routes = [
  { pattern = "proxy.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

### Environment Variables

Add custom configuration in `wrangler.toml`:

```toml
[env.production]
vars = { 
  MAX_TTL = "604800",  # 7 days max
  DEFAULT_TTL = "86400"  # 24 hours default
}
```

## Limitations

- **Cloudflare Workers Free Tier**:
  - 100,000 requests per day
  - 10ms CPU time per request
  - Sufficient for personal use
- **URL Length**: Very long cookies may approach URL length limits (~2000 chars)
- **Signed URLs**: CloudFront signed cookies will expire based on their own policy

## Troubleshooting

### "Link expired" Error
The TTL has passed. Generate a new link or use a longer TTL.

### Player Can't Load URL
- Ensure CORS is enabled (the worker handles this automatically)
- Check that the original URL is still valid
- Verify CloudFront cookies haven't expired

### Worker Errors
Check Cloudflare Dashboard → Workers → Logs for detailed error messages.

## Advanced Usage

### Batch Processing

Generate multiple links at once:

```python
from link_proxy import LinkProxyClient

client = LinkProxyClient("https://your-worker.workers.dev")
streams = [...]  # List of streams

for stream in streams:
    proxy_url = client.generate_link_offline(
        stream['url'],
        stream['headers']
    )
    print(f"{stream['name']}: {proxy_url}")
```

### Custom TTL Per Link

Set different expiration times:

```python
# Short-lived link (1 hour)
short = client.generate_link(url, headers, ttl=3600)

# Long-lived link (7 days)
long = client.generate_link(url, headers, ttl=604800)
```

## Related Projects

- [MovieBox CLI](./moviebox_cli.py) - Python CLI for accessing MovieBox content
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform

## License

This project is provided as-is for educational purposes. Ensure you have the right to access and redistribute any content you proxy.

## Contributing

Contributions are welcome! Please open issues or pull requests on GitHub.

## Support

For issues and questions:
- Open a [GitHub Issue](https://github.com/RecklessEvadingDriver/cloudflare/issues)
- Check [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

---

**Made with ❤️ for easier media streaming**
