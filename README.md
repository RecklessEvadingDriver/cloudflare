# CloudFront Link Proxy Service

A comprehensive Cloudflare Workers solution for handling protected media links and accessing MovieBox content.

## 📦 What's Included

This repository contains **two Cloudflare Workers**:

### 1. **Link Proxy Worker** (`worker.js`)
A standalone proxy service that converts protected media links (with CloudFront cookies and headers) into simple temporary links that work in any video player.

**Use Case**: You have protected URLs with headers/cookies and want to create playable links.

[📖 Full Documentation](README.md)

### 2. **MovieBox API Worker** (`moviebox-worker.js`) ⭐ NEW
A complete MovieBox API implementation that **automatically** converts all streaming links to proxy URLs in API responses.

**Use Case**: Access MovieBox content via REST API with playable URLs out of the box.

[📖 Full Documentation](MOVIEBOX-API.md)

## 🚀 Quick Start

### Option A: Deploy Both Workers

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy both workers
npm run deploy:all
```

### Option B: Deploy Individual Workers

```bash
# Deploy only the proxy worker
wrangler deploy -c wrangler.toml

# OR deploy only the MovieBox API worker
wrangler deploy -c wrangler-moviebox.toml
```

## 🎯 Which One Should I Use?

### Use **Link Proxy Worker** if you:
- Have protected URLs from any source
- Want a simple proxy service
- Need to manually generate temporary links
- Want a lightweight solution

### Use **MovieBox API Worker** if you:
- Want to access MovieBox content
- Need a REST API
- Want automatic link conversion
- Need search, browse, and streaming in one place

### Use **Both** if you:
- Want the full solution
- Need the proxy for other services AND MovieBox API
- Want maximum flexibility

## 📊 Comparison

| Feature | Link Proxy Worker | MovieBox API Worker |
|---------|------------------|---------------------|
| Proxy protected links | ✅ | ✅ |
| Generate temporary URLs | ✅ | ✅ Automatic |
| MovieBox search | ❌ | ✅ |
| MovieBox browse | ❌ | ✅ |
| MovieBox streaming | ❌ | ✅ Auto-converted |
| Generic (any source) | ✅ | ❌ MovieBox only |
| Web interface | ✅ | ✅ |
| REST API | ⚠️ Generate only | ✅ Full API |

## 🔗 Example Workflows

### Workflow 1: Using MovieBox API Worker (Recommended)

### Workflow 1: Using MovieBox API Worker (Recommended)

```bash
# 1. Search for content
curl "https://moviebox-api.workers.dev/api/search?query=Inception"

# 2. Get streaming links (already proxied!)
curl "https://moviebox-api.workers.dev/api/links?data=5083772015786508240|0|0"

# 3. Play directly
vlc "https://moviebox-api.workers.dev/proxy/eyJ1cmwiOi4uLg=="
```

**Result**: Protected URLs are automatically converted to playable proxy URLs! 🎉

### Workflow 2: Using Link Proxy Worker (Manual)

```bash
# 1. Get protected URL from somewhere
PROTECTED_URL="https://sacdn.hakunaymatata.com/dash/.../index.mpd"

# 2. Generate proxy link
curl -X POST https://proxy.workers.dev/generate \
  -H "Content-Type: application/json" \
  -d '{"url":"'$PROTECTED_URL'","headers":{"Cookie":"..."}}'

# 3. Play the proxy URL
vlc "https://proxy.workers.dev/proxy/eyJ1cmwiOi4uLg=="
```

## 🎬 Real-World Example

### MovieBox API Worker in Action

```javascript
// Search for a movie
const search = await fetch('https://moviebox-api.workers.dev/api/search?query=Inception');
const movies = await search.json();
// [{ title: "Inception", subjectId: "5083772015786508240", ... }]

// Get streaming links
const links = await fetch('https://moviebox-api.workers.dev/api/links?data=5083772015786508240|0|0');
const data = await links.json();

// Streams are already proxied!
console.log(data.streams[0]);
// {
//   "url": "https://moviebox-api.workers.dev/proxy/eyJ1cmwiOi4uLg==",
//   "type": "dash",
//   "headers": {},  // No headers needed!
//   "proxied": true,
//   "originalUrl": "https://sacdn.hakunaymatata.com/dash/.../index.mpd"
// }
```

## 📁 Repository Structure

```
.
├── worker.js                    # Link Proxy Worker
├── wrangler.toml               # Config for Link Proxy Worker
├── moviebox-worker.js          # MovieBox API Worker ⭐
├── wrangler-moviebox.toml      # Config for MovieBox API Worker
├── moviebox_cli.py             # Original Python implementation
├── link_proxy.py               # Python helper library
├── examples.py                 # Python usage examples
├── test_proxy.py               # Unit tests
├── package.json                # NPM scripts
├── README.md                   # This file
├── MOVIEBOX-API.md            # MovieBox API documentation
└── .gitignore
```

## 🔧 Configuration

Both workers are pre-configured and ready to deploy. However, you can customize:

### Link Proxy Worker (`wrangler.toml`)
```toml
name = "cloudfront-link-proxy"
main = "worker.js"
compatibility_date = "2025-01-01"
```

### MovieBox API Worker (`wrangler-moviebox.toml`)
```toml
name = "moviebox-api-worker"
main = "moviebox-worker.js"
compatibility_date = "2025-01-01"
node_compat = true
```

## 🌟 Key Features

- 🔐 **Proxy Protected Links**: Handle media URLs that require CloudFront signed cookies
- 🎬 **Direct Playback**: Generated links work directly in video players (VLC, MPV, web players)
- ⏰ **Temporary Links**: Set custom expiration times (default: 24 hours)
- 🌐 **CORS Support**: Full CORS headers for web player compatibility
- 📡 **Range Requests**: Supports partial content for video seeking
- 🚀 **Free & Serverless**: Runs on Cloudflare Workers (free tier available)

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
wrangler deploy
```

You'll get a URL like: `https://cloudfront-link-proxy.your-account.workers.dev`

## Usage

### Web Interface

Visit your worker URL in a browser to access the interactive web interface:

```
https://your-worker.workers.dev/
```

Fill in:
- **Media URL**: The protected media link
- **Headers**: JSON object with required headers (Referer, Cookie, etc.)
- **TTL**: Link expiration time in seconds

Click "Generate Link" to create your temporary proxy URL.

### API Usage

#### Generate Temporary Link

**Endpoint**: `POST /generate`

**Request**:
```bash
curl -X POST https://your-worker.workers.dev/generate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd",
    "headers": {
      "Referer": "https://api.inmoviebox.com",
      "Cookie": "CloudFront-Policy=eyJTdGF0ZW...PLACEHOLDER...;CloudFront-Signature=qeavJeZ...PLACEHOLDER...;CloudFront-Key-Pair-Id=KMHN1LQ1HEUPL"
    },
    "ttl": 86400
  }'
```

**Response**:
```json
{
  "success": true,
  "proxyUrl": "https://your-worker.workers.dev/proxy/eyJ1cmwiOiJodHRwczovL3NhY2RuLmhha3VuYXltYXRhdGEuY29tL2Rhc2gvNTA4Mzc3MjAxNTc4NjUwODI0MF8wXzBfMTA4MF9oMjY1XzEzNi9pbmRleC5tcGQiLCJoZWFkZXJzIjp7IlJlZmVyZXIiOiJodHRwczovL2FwaS5pbm1vdmllYm94LmNvbSIsIkNvb2tpZSI6IkNsb3VkRnJvbnQtUG9saWN5PS4uLiJ9LCJleHAiOjE3Mzc0NTMxODQwMDB9",
  "expiresAt": "2026-01-21T08:06:24.000Z"
}
```

#### Play the Link

Use the `proxyUrl` in any video player:

**VLC**:
```bash
vlc "https://your-worker.workers.dev/proxy/eyJ1cmwiOi..."
```

**MPV**:
```bash
mpv "https://your-worker.workers.dev/proxy/eyJ1cmwiOi..."
```

**Web Player** (HTML5):
```html
<video controls>
  <source src="https://your-worker.workers.dev/proxy/eyJ1cmwiOi..." type="application/dash+xml">
</video>
```

### Python Integration

Use the provided Python helper module to integrate with MovieBox CLI:

```python
from link_proxy import LinkProxyClient, convert_moviebox_stream

# Initialize client
client = LinkProxyClient("https://your-worker.workers.dev")

# Generate link
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

# Or convert MovieBox stream directly
stream = {
    "url": "https://sacdn.hakunaymatata.com/dash/.../index.mpd",
    "type": "dash",
    "headers": {...}
}

converted = convert_moviebox_stream(stream, "https://your-worker.workers.dev")
# Now converted['url'] is the proxy URL with no headers needed
```

**Command Line**:
```bash
python link_proxy.py https://your-worker.workers.dev \
  "https://sacdn.hakunaymatata.com/dash/.../index.mpd" \
  '{"Referer":"https://api.inmoviebox.com","Cookie":"..."}'
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
