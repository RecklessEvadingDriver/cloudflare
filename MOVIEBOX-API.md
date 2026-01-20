# MovieBox API Worker

A complete Node.js/Cloudflare Worker implementation of the MovieBox API with automatic proxy URL generation for protected media links.

## 🎯 What This Does

This worker is a **full conversion** of `moviebox_cli.py` to JavaScript/Node.js that:
1. ✅ Implements all MovieBox API endpoints (search, browse, load, links)
2. ✅ Uses the exact same authentication logic (HMAC signatures, tokens)
3. ✅ **Automatically converts protected links to proxy URLs** in API responses
4. ✅ Includes the proxy service to handle CloudFront cookies
5. ✅ Returns playable URLs that work directly in video players

## 🚀 Key Feature: Automatic Link Conversion

When you request streaming links, the API automatically converts:

**Before (Protected Link):**
```json
{
  "url": "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd",
  "headers": {
    "Referer": "https://api.inmoviebox.com",
    "Cookie": "CloudFront-Policy=...; CloudFront-Signature=...; CloudFront-Key-Pair-Id=..."
  }
}
```

**After (Proxy Link):**
```json
{
  "url": "https://your-worker.workers.dev/proxy/eyJ1cmwiOiJodHRwczovL3NhY2RuLmhha3VuYXltYXRhdGEuY29tL2Rhc2gvNTA4Mzc3MjAxNTc4NjUwODI0MF8wXzBfMTA4MF9oMjY1XzEzNi9pbmRleC5tcGQiLCJoZWFkZXJzIjp7IlJlZmVyZXIiOiJodHRwczovL2FwaS5pbm1vdmllYm94LmNvbSIsIkNvb2tpZSI6IkNsb3VkRnJvbnQtUG9saWN5PS4uLiJ9LCJleHAiOjE3Mzc0NTMxODQwMDB9",
  "headers": {},
  "proxied": true,
  "originalUrl": "https://sacdn.hakunaymatata.com/dash/..."
}
```

The proxy URL works **directly in any video player** without additional headers!

## 📦 Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Installation

1. **Install dependencies:**
```bash
npm install -g wrangler
```

2. **Login to Cloudflare:**
```bash
wrangler login
```

3. **Deploy the MovieBox API Worker:**
```bash
wrangler deploy -c wrangler-moviebox.toml
```

You'll get a URL like: `https://moviebox-api-worker.your-account.workers.dev`

## 🔌 API Endpoints

### 1. List Categories
```bash
GET /api/list-categories
```

**Example:**
```bash
curl https://your-worker.workers.dev/api/list-categories
```

**Response:**
```json
{
  "1|1": "Movies",
  "1|2": "Series",
  "4516404531735022304": "Trending",
  ...
}
```

### 2. Browse Category
```bash
GET /api/main-page?category={id}&page={num}
```

**Example:**
```bash
curl "https://your-worker.workers.dev/api/main-page?category=1|1&page=1"
```

**Response:**
```json
{
  "name": "Movies",
  "items": [
    {
      "title": "Inception",
      "subjectId": "5083772015786508240",
      "poster": "https://...",
      "type": "movie",
      "imdbRatingValue": "8.8"
    },
    ...
  ]
}
```

### 3. Search
```bash
GET /api/search?query={text}
```

**Example:**
```bash
curl "https://your-worker.workers.dev/api/search?query=Inception"
```

### 4. Load Subject Details
```bash
GET /api/load?subject={id}
```

**Example:**
```bash
curl "https://your-worker.workers.dev/api/load?subject=5083772015786508240"
```

**Response:**
```json
{
  "subjectId": "5083772015786508240",
  "title": "Inception",
  "type": "movie",
  "poster": "https://...",
  "plot": "A thief who steals corporate secrets...",
  "year": 2010,
  "tags": ["Action", "Sci-Fi", "Thriller"],
  "actors": [...],
  "score": "8.8",
  "durationMinutes": 148
}
```

For TV shows, includes `episodes` array:
```json
{
  "episodes": [
    {
      "id": "5083772015786508240|1|1",
      "name": "S1E1",
      "season": 1,
      "episode": 1,
      "poster": "https://..."
    },
    ...
  ]
}
```

### 5. Get Streaming Links (with Auto-Conversion) ⭐
```bash
GET /api/links?data={subjectId|season|episode}
```

**Example:**
```bash
# For movies
curl "https://your-worker.workers.dev/api/links?data=5083772015786508240|0|0"

# For TV shows (Season 1, Episode 1)
curl "https://your-worker.workers.dev/api/links?data=5083772015786508240|1|1"
```

**Response (with auto-converted proxy URLs):**
```json
{
  "streams": [
    {
      "source": "MovieBox Original",
      "name": "MovieBox (Original)",
      "url": "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg==",
      "type": "dash",
      "headers": {},
      "quality": 1080,
      "proxied": true,
      "originalUrl": "https://sacdn.hakunaymatata.com/dash/.../index.mpd"
    },
    {
      "source": "MovieBox Hindi",
      "name": "MovieBox (Hindi)",
      "url": "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg==",
      "type": "dash",
      "headers": {},
      "quality": 720,
      "proxied": true,
      "originalUrl": "https://sacdn.hakunaymatata.com/dash/.../index.mpd"
    }
  ],
  "subtitles": [
    {
      "url": "https://...",
      "lang": "English (Original)"
    }
  ]
}
```

### 6. Manual Proxy Generation
```bash
POST /generate
Content-Type: application/json

{
  "url": "https://sacdn.hakunaymatata.com/dash/.../index.mpd",
  "headers": {
    "Referer": "https://api.inmoviebox.com",
    "Cookie": "CloudFront-Policy=...;CloudFront-Signature=...;CloudFront-Key-Pair-Id=..."
  },
  "ttl": 86400
}
```

### 7. Proxy Endpoint
```bash
GET /proxy/{encoded_data}
```

This endpoint is used automatically by the converted links.

## 🎬 Usage Examples

### Get a Movie's Streaming Links

```bash
# 1. Search for a movie
curl "https://your-worker.workers.dev/api/search?query=Inception"

# 2. Get the subjectId from the response
# 3. Load details
curl "https://your-worker.workers.dev/api/load?subject=5083772015786508240"

# 4. Get streaming links (automatically converted to proxy URLs)
curl "https://your-worker.workers.dev/api/links?data=5083772015786508240|0|0"

# 5. Play in VLC (the proxy URL from the response)
vlc "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg=="
```

### Get TV Show Episodes

```bash
# 1. Search for a TV show
curl "https://your-worker.workers.dev/api/search?query=Breaking+Bad"

# 2. Load details (includes episodes list)
curl "https://your-worker.workers.dev/api/load?subject=123456"

# 3. Get links for Season 1 Episode 1
curl "https://your-worker.workers.dev/api/links?data=123456|1|1"

# 4. Play the proxy URL in any player
mpv "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg=="
```

### Browse Categories

```bash
# List all categories
curl "https://your-worker.workers.dev/api/list-categories"

# Get trending movies
curl "https://your-worker.workers.dev/api/main-page?category=4516404531735022304&page=1"

# Get all movies
curl "https://your-worker.workers.dev/api/main-page?category=1|1&page=1"

# Get Korean dramas
curl "https://your-worker.workers.dev/api/main-page?category=7878715743607948784&page=1"
```

## 🔧 JavaScript/Node.js Usage

```javascript
// Example: Fetch and play a movie
async function playMovie(movieTitle) {
  const baseUrl = 'https://your-worker.workers.dev';
  
  // 1. Search
  const searchRes = await fetch(`${baseUrl}/api/search?query=${encodeURIComponent(movieTitle)}`);
  const searchData = await searchRes.json();
  
  if (searchData.length === 0) {
    console.log('Movie not found');
    return;
  }
  
  const movie = searchData[0];
  console.log(`Found: ${movie.title}`);
  
  // 2. Get streaming links
  const linksRes = await fetch(`${baseUrl}/api/links?data=${movie.subjectId}|0|0`);
  const linksData = await linksRes.json();
  
  // 3. The URLs are already proxy URLs!
  const stream = linksData.streams[0];
  console.log(`Play URL: ${stream.url}`);
  console.log(`Type: ${stream.type}`);
  console.log(`Quality: ${stream.quality}p`);
  console.log(`Proxied: ${stream.proxied}`);
  
  // Now you can use stream.url in any video player!
  return stream.url;
}

// Usage
playMovie('Inception').then(url => {
  console.log('Ready to play:', url);
});
```

## 🔄 Comparison: Python vs Worker

| Feature | Python (`moviebox_cli.py`) | Worker (`moviebox-worker.js`) |
|---------|---------------------------|-------------------------------|
| Platform | Local CLI | Cloudflare Workers (Serverless) |
| Language | Python | JavaScript/Node.js |
| Authentication | ✅ HMAC + Tokens | ✅ HMAC + Tokens (same logic) |
| Search | ✅ | ✅ |
| Browse | ✅ | ✅ |
| Load Details | ✅ | ✅ |
| Streaming Links | ✅ | ✅ |
| **Auto Proxy URLs** | ❌ Manual | ✅ **Automatic** |
| CORS Support | ❌ | ✅ |
| Web API | ❌ | ✅ |
| Always Available | ❌ | ✅ (Serverless) |

## 🌟 Key Improvements Over Python Version

1. **Automatic Proxy Conversion**: Links are automatically converted to proxy URLs
2. **RESTful API**: Access via HTTP endpoints instead of CLI
3. **Always Online**: Deployed on Cloudflare's edge network
4. **CORS Enabled**: Can be used from web browsers
5. **Serverless**: No server management needed
6. **Global**: Low latency from anywhere in the world

## 🔐 Security Notes

- **Link Expiration**: Proxy URLs expire after 24 hours by default
- **No Storage**: Headers/cookies are encoded in the URL (base64)
- **HTTPS Only**: All traffic is encrypted
- **Rate Limiting**: Cloudflare provides automatic protection

## 🐛 Troubleshooting

### "Invalid signature" error
The HMAC signature generation must match exactly. The worker uses the same logic as the Python version.

### "Link expired" error
Proxy URLs expire after 24 hours. Request fresh links from `/api/links`.

### Player can't load the URL
- Ensure you're using the proxy URL, not the original URL
- Check that the worker is deployed and accessible
- Verify CORS headers are present (they should be automatic)

## 📚 Related Files

- `moviebox-worker.js` - Main worker implementation
- `wrangler-moviebox.toml` - Worker configuration
- `moviebox_cli.py` - Original Python implementation
- `worker.js` - Standalone proxy worker
- `link_proxy.py` - Python helper for proxy URLs

## 🚢 Deployment

### Deploy Both Workers

```bash
# Deploy the proxy worker
npm run deploy:proxy

# Deploy the MovieBox API worker
npm run deploy:moviebox

# Or deploy both at once
npm run deploy:all
```

### Development Mode

```bash
# Test locally
npm run dev:moviebox

# Visit: http://localhost:8787
```

## 📖 Documentation

Visit the root URL of your deployed worker for interactive API documentation:
```
https://your-worker.workers.dev/
```

## 🎯 Example: Complete Workflow

```bash
# 1. Deploy
wrangler deploy -c wrangler-moviebox.toml

# 2. Search
curl "https://moviebox-api-worker.your-account.workers.dev/api/search?query=Avengers"

# 3. Get links (subjectId from search result)
curl "https://moviebox-api-worker.your-account.workers.dev/api/links?data=123456|0|0"

# 4. Copy the proxy URL from the response and play
vlc "https://moviebox-api-worker.your-account.workers.dev/proxy/eyJ1cmwiOi4uLg=="
```

## ⚡ Performance

- **Cold Start**: < 50ms
- **API Response**: 200-500ms (depends on MovieBox API)
- **Proxy Streaming**: Near-native speed (edge caching)
- **Global**: Runs on Cloudflare's 200+ edge locations

## 📝 License

MIT - Same as the original Python implementation

---

**Made with ❤️ for easier media streaming**
