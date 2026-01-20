/**
 * MovieBox API Worker - Node.js/Cloudflare Worker Implementation
 * Converted from moviebox_cli.py with automatic proxy link generation
 */

import crypto from 'crypto';

// Constants from Python implementation
const MAIN_URL = "https://api.inmoviebox.com";
const USER_AGENT = "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)";
const CLIENT_INFO = JSON.stringify({
  package_name: "com.community.mbox.in",
  version_name: "3.0.03.0529.03",
  version_code: 50020042,
  os: "android",
  os_version: "16",
  device_id: "da2b99c821e6ea023e4be55b54d5f7d8",
  install_store: "ps",
  gaid: "d7578036d13336cc",
  brand: "google",
  model: "sdk_gphone64_x86_64",
  system_language: "en",
  net: "NETWORK_WIFI",
  region: "IN",
  timezone: "Asia/Calcutta",
  sp_code: ""
});

// Keep the base64-encoded strings to match Python's double-decode behavior
const SECRET_KEY_DEFAULT = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
const SECRET_KEY_ALT = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ==";

const MAIN_PAGE = {
  "4516404531735022304": "Trending",
  "5692654647815587592": "Trending in Cinema",
  "414907768299210008": "Bollywood",
  "3859721901924910512": "South Indian",
  "8019599703232971616": "Hollywood",
  "4741626294545400336": "Top Series This Week",
  "8434602210994128512": "Anime",
  "1255898847918934600": "Reality TV",
  "4903182713986896328": "Indian Drama",
  "7878715743607948784": "Korean Drama",
  "8788126208987989488": "Chinese Drama",
  "3910636007619709856": "Western TV",
  "5177200225164885656": "Turkish Drama",
  "1|1": "Movies",
  "1|2": "Series",
  "1|1006": "Anime",
  "1|1;country=India": "Indian (Movies)",
  "1|2;country=India": "Indian (Series)",
  "1|1;classify=Hindi dub;country=United States": "USA (Movies)",
  "1|2;classify=Hindi dub;country=United States": "USA (Series)",
  "1|1;country=Japan": "Japan (Movies)",
  "1|2;country=Japan": "Japan (Series)",
  "1|1;country=China": "China (Movies)",
  "1|2;country=China": "China (Series)",
  "1|1;country=Philippines": "Philippines (Movies)",
  "1|2;country=Philippines": "Philippines (Series)",
  "1|1;country=Thailand": "Thailand(Movies)",
  "1|2;country=Thailand": "Thailand(Series)",
  "1|1;country=Nigeria": "Nollywood (Movies)",
  "1|2;country=Nigeria": "Nollywood (Series)",
  "1|1;country=Korea": "South Korean (Movies)",
  "1|2;country=Korea": "South Korean (Series)",
  "1|1;classify=Hindi dub;genre=Action": "Action (Movies)",
  "1|1;classify=Hindi dub;genre=Crime": "Crime (Movies)",
  "1|1;classify=Hindi dub;genre=Comedy": "Comedy (Movies)",
  "1|1;classify=Hindi dub;genre=Romance": "Romance (Movies)",
  "1|2;classify=Hindi dub;genre=Crime": "Crime (Series)",
  "1|2;classify=Hindi dub;genre=Comedy": "Comedy (Series)",
  "1|2;classify=Hindi dub;genre=Romance": "Romance (Series)"
};

const QUALITIES = [
  ["2160", 2160],
  ["1440", 1440],
  ["1080", 1080],
  ["720", 720],
  ["480", 480],
  ["360", 360],
  ["240", 240]
];

/**
 * MovieBox API Client
 */
class MovieBoxClient {
  constructor(workerBaseUrl = null) {
    this.workerBaseUrl = workerBaseUrl;
  }

  md5(inputBytes) {
    return crypto.createHash('md5').update(inputBytes).digest('hex');
  }

  reverseString(str) {
    return str.split('').reverse().join('');
  }

  generateXClientToken(hardcodedTimestamp = null) {
    const timestamp = String(hardcodedTimestamp || Date.now());
    const reversedTs = this.reverseString(timestamp);
    const hashValue = this.md5(Buffer.from(reversedTs, 'utf-8'));
    return `${timestamp},${hashValue}`;
  }

  buildCanonicalString(method, accept, contentType, url, body, timestamp) {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname || "";
    
    let query = "";
    if (parsedUrl.search) {
      const params = new URLSearchParams(parsedUrl.search);
      const pairs = [];
      const sortedKeys = Array.from(params.keys()).sort();
      for (const key of sortedKeys) {
        const values = params.getAll(key);
        for (const value of values) {
          pairs.push(`${key}=${value}`);
        }
      }
      query = pairs.join('&');
    }

    const canonicalUrl = query ? `${path}?${query}` : path;

    let bodyHash = "";
    let bodyLength = "";
    if (body !== null) {
      const bodyBytes = Buffer.from(body, 'utf-8');
      const trimmed = bodyBytes.slice(0, 102400);
      bodyHash = this.md5(trimmed);
      bodyLength = String(bodyBytes.length);
    }

    return [
      method.toUpperCase(),
      accept || '',
      contentType || '',
      bodyLength,
      timestamp,
      bodyHash,
      canonicalUrl
    ].join('\n');
  }

  generateXTrSignature(method, accept, contentType, url, body = null, useAltKey = false, hardcodedTimestamp = null) {
    const timestamp = hardcodedTimestamp || Date.now();
    const canonical = this.buildCanonicalString(method, accept, contentType, url, body, timestamp);
    const secret = useAltKey ? SECRET_KEY_ALT : SECRET_KEY_DEFAULT;
    // Python does double base64 decode: first to UTF-8 string, then decode that string again
    const firstDecode = Buffer.from(secret, 'base64').toString('utf-8');
    const secretBytes = Buffer.from(firstDecode, 'base64');
    const mac = crypto.createHmac('md5', secretBytes).update(canonical, 'utf-8').digest('base64');
    return `${timestamp}|2|${mac}`;
  }

  baseHeaders(xClientToken, xTrSignature) {
    return {
      'user-agent': USER_AGENT,
      'accept': 'application/json',
      'content-type': 'application/json',
      'connection': 'keep-alive',
      'x-client-token': xClientToken,
      'x-tr-signature': xTrSignature,
      'x-client-info': CLIENT_INFO,
      'x-client-status': '0'
    };
  }

  async getMainPage(data, page = 1) {
    const perPage = 15;
    let url;
    
    if (data.includes('|')) {
      url = `${MAIN_URL}/wefeed-mobile-bff/subject-api/list`;
    } else {
      url = `${MAIN_URL}/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=${data}&page=${page}&perPage=${perPage}`;
    }

    const mainParts = data.split(';')[0].split('|');
    const pg = mainParts[0] && /^\d+$/.test(mainParts[0]) ? parseInt(mainParts[0]) : 1;
    const channelId = mainParts.length > 1 ? mainParts[1] : null;
    // Convert null to "None" to match Python's string formatting behavior
    const channelIdStr = channelId === null ? "None" : channelId;

    const options = {};
    if (data.includes(';')) {
      const parts = data.split(';').slice(1);
      for (const part of parts) {
        if (part.includes('=')) {
          const [key, value] = part.split('=', 2);
          if (key && value) options[key] = value;
        }
      }
    }

    const classify = options.classify || "All";
    const country = options.country || "All";
    const year = options.year || "All";
    const genre = options.genre || "All";
    const sort = options.sort || "ForYou";

    // Build JSON body manually like Python to match exact format
    const jsonBody = (
      "{" +
      `"page":${pg},"perPage":${perPage},"channelId":"${channelIdStr}",` +
      `"classify":"${classify}","country":"${country}",` +
      `"year":"${year}","genre":"${genre}","sort":"${sort}"` +
      "}"
    );

    const xClientToken = this.generateXClientToken();
    let response;

    if (data.includes('|')) {
      const xTrSignature = this.generateXTrSignature('POST', 'application/json', 'application/json; charset=utf-8', url, jsonBody);
      const headers = this.baseHeaders(xClientToken, xTrSignature);
      response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: jsonBody
      });
    } else {
      const xTrSignature = this.generateXTrSignature('GET', 'application/json', 'application/json', url);
      const headers = this.baseHeaders(xClientToken, xTrSignature);
      response = await fetch(url, { headers: headers });
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const root = await response.json();
    const items = root.data?.items || root.data?.subjects || [];
    
    const results = [];
    for (const item of items) {
      const title = (item.title || "").split('[')[0];
      const subjectId = item.subjectId;
      if (!title || !subjectId) continue;
      
      const cover = item.cover || {};
      const subjectType = item.subjectType || 1;
      
      results.push({
        title: title,
        subjectId: subjectId,
        poster: cover.url,
        type: subjectType === 2 ? 'tv' : 'movie',
        imdbRatingValue: item.imdbRatingValue
      });
    }

    return {
      name: MAIN_PAGE[data] || data,
      items: results
    };
  }

  async search(query) {
    const url = `${MAIN_URL}/wefeed-mobile-bff/subject-api/search/v2`;
    const jsonBody = JSON.stringify({ page: 1, perPage: 10, keyword: query });
    
    const xClientToken = this.generateXClientToken();
    const xTrSignature = this.generateXTrSignature('POST', 'application/json', 'application/json; charset=utf-8', url, jsonBody);
    const headers = this.baseHeaders(xClientToken, xTrSignature);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: jsonBody
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const root = await response.json();
    const results = root.data?.results || [];
    
    const searchList = [];
    for (const result of results) {
      const subjects = result.subjects || [];
      for (const subject of subjects) {
        const title = subject.title;
        const subjectId = subject.subjectId;
        if (!title || !subjectId) continue;
        
        const cover = subject.cover || {};
        const subjectType = subject.subjectType || 1;
        
        searchList.push({
          title: title,
          subjectId: subjectId,
          poster: cover.url,
          type: subjectType === 2 ? 'tv' : 'movie',
          imdbRatingValue: subject.imdbRatingValue
        });
      }
    }

    return searchList;
  }

  async load(urlOrId) {
    const subjectId = this.extractSubjectId(urlOrId);
    const url = `${MAIN_URL}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;
    
    const xClientToken = this.generateXClientToken();
    const xTrSignature = this.generateXTrSignature('GET', 'application/json', 'application/json', url);
    const headers = this.baseHeaders(xClientToken, xTrSignature);
    headers['x-play-mode'] = '2';
    
    const response = await fetch(url, { headers: headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const root = await response.json();
    const data = root.data;
    if (!data) {
      throw new Error('No data returned');
    }

    const title = (data.title || "").split('[')[0];
    const description = data.description;
    const releaseDate = data.releaseDate;
    const duration = data.duration;
    const genre = data.genre;
    const imdbRating = data.imdbRatingValue;
    const year = releaseDate && releaseDate.length >= 4 && /^\d{4}/.test(releaseDate) ? parseInt(releaseDate.substring(0, 4)) : null;
    const coverUrl = data.cover?.url;
    const subjectType = data.subjectType || 1;

    const actors = [];
    const staffList = data.staffList || [];
    for (const staff of staffList) {
      if (staff.staffType === 1) {
        actors.push({
          name: staff.name,
          character: staff.character,
          avatar: staff.avatarUrl
        });
      }
    }

    const uniqueActors = [];
    const seen = new Set();
    for (const actor of actors) {
      if (actor.name && !seen.has(actor.name)) {
        uniqueActors.push(actor);
        seen.add(actor.name);
      }
    }

    // Ensure genre is a string before processing
    const genreString = genre && typeof genre === 'string' ? genre : "";
    const tags = genreString.split(',').map(t => t.trim()).filter(t => t);
    const durationMinutes = this.parseDuration(duration);
    const typeName = subjectType === 2 ? 'tv' : 'movie';

    const payload = {
      subjectId: subjectId,
      title: title,
      type: typeName,
      poster: coverUrl,
      background: coverUrl,
      plot: description,
      year: year,
      tags: tags,
      actors: uniqueActors,
      score: imdbRating,
      durationMinutes: durationMinutes
    };

    if (typeName === 'tv') {
      const seasonUrl = `${MAIN_URL}/wefeed-mobile-bff/subject-api/season-info?subjectId=${subjectId}`;
      const seasonSig = this.generateXTrSignature('GET', 'application/json', 'application/json', seasonUrl);
      const seasonHeaders = { ...headers, 'x-tr-signature': seasonSig };
      
      const seasonResponse = await fetch(seasonUrl, { headers: seasonHeaders });
      const episodes = [];
      
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        const seasons = seasonData.data?.seasons || [];
        
        for (const season of seasons) {
          const seasonNumber = season.se || 1;
          const maxEp = season.maxEp || 1;
          
          for (let episodeNumber = 1; episodeNumber <= maxEp; episodeNumber++) {
            episodes.push({
              id: `${subjectId}|${seasonNumber}|${episodeNumber}`,
              name: `S${seasonNumber}E${episodeNumber}`,
              season: seasonNumber,
              episode: episodeNumber,
              poster: coverUrl
            });
          }
        }
      }

      if (episodes.length === 0) {
        episodes.push({
          id: `${subjectId}|1|1`,
          name: "Episode 1",
          season: 1,
          episode: 1,
          poster: coverUrl
        });
      }

      payload.episodes = episodes;
    }

    return payload;
  }

  async loadLinks(data) {
    const parts = data.split('|');
    const originalSubjectId = this.extractSubjectId(parts[0]);
    const season = parts.length > 1 && /^\d+$/.test(parts[1]) ? parseInt(parts[1]) : 0;
    const episode = parts.length > 2 && /^\d+$/.test(parts[2]) ? parseInt(parts[2]) : 0;

    const subjectUrl = `${MAIN_URL}/wefeed-mobile-bff/subject-api/get?subjectId=${originalSubjectId}`;
    const subjectToken = this.generateXClientToken();
    const subjectSig = this.generateXTrSignature('GET', 'application/json', 'application/json', subjectUrl);
    const subjectHeaders = this.baseHeaders(subjectToken, subjectSig);
    
    const subjectResponse = await fetch(subjectUrl, { headers: subjectHeaders });
    const subjectIds = [];
    let originalLanguageName = "Original";

    if (subjectResponse.ok) {
      const subjectData = await subjectResponse.json();
      const dubs = subjectData.data?.dubs;
      
      if (Array.isArray(dubs)) {
        for (const dub of dubs) {
          const dubSubjectId = dub.subjectId;
          const lanName = dub.lanName;
          
          if (dubSubjectId && lanName) {
            if (dubSubjectId === originalSubjectId) {
              originalLanguageName = lanName;
            } else {
              subjectIds.push([dubSubjectId, lanName]);
            }
          }
        }
      }
    }

    subjectIds.unshift([originalSubjectId, originalLanguageName]);

    const streams = [];
    const subtitles = [];

    for (const [subjectId, language] of subjectIds) {
      const url = `${MAIN_URL}/wefeed-mobile-bff/subject-api/play-info?subjectId=${subjectId}&se=${season}&ep=${episode}`;
      const xClientToken = this.generateXClientToken();
      const xTrSignature = this.generateXTrSignature('GET', 'application/json', 'application/json', url);
      const headers = this.baseHeaders(xClientToken, xTrSignature);
      
      const response = await fetch(url, { headers: headers });
      if (!response.ok) continue;

      const playData = await response.json();
      const streamList = playData.data?.streams;
      if (!Array.isArray(streamList)) continue;

      for (const stream of streamList) {
        const streamUrl = stream.url;
        if (!streamUrl) continue;

        const formatName = stream.format || "";
        const resolutions = stream.resolutions || "";
        const signCookie = stream.signCookie || null;
        const streamId = stream.id || `${subjectId}|${season}|${episode}`;
        const quality = this.getHighestQuality(resolutions);

        const streamEntry = {
          source: `MovieBox ${language}`,
          name: `MovieBox (${language})`,
          url: streamUrl,
          type: this.inferLinkType(streamUrl, formatName),
          headers: { 'Referer': MAIN_URL },
          quality: quality
        };

        if (signCookie) {
          streamEntry.headers['Cookie'] = signCookie;
        }

        // Auto-convert to proxy URL if worker base URL is provided
        if (this.workerBaseUrl && (streamEntry.headers.Cookie || Object.keys(streamEntry.headers).length > 0)) {
          const proxyUrl = this.generateProxyUrl(streamUrl, streamEntry.headers);
          streamEntry.originalUrl = streamUrl;
          streamEntry.url = proxyUrl;
          streamEntry.proxied = true;
          streamEntry.headers = {}; // No headers needed for proxy
        }

        streams.push(streamEntry);

        // Collect subtitles
        const subLink = `${MAIN_URL}/wefeed-mobile-bff/subject-api/get-stream-captions?subjectId=${subjectId}&streamId=${streamId}`;
        await this.collectSubtitles(subLink, language, subtitles);

        const subLinkAlt = `${MAIN_URL}/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId=${subjectId}&resourceId=${streamId}&episode=0`;
        await this.collectSubtitles(subLinkAlt, language, subtitles);
      }
    }

    return { streams, subtitles };
  }

  async collectSubtitles(url, language, subtitles) {
    const xClientToken = this.generateXClientToken();
    const xTrSignature = this.generateXTrSignature('GET', '', '', url);
    const headers = {
      'User-Agent': USER_AGENT,
      'Accept': '',
      'X-Client-Info': CLIENT_INFO,
      'X-Client-Status': '0',
      'Content-Type': '',
      'X-Client-Token': xClientToken,
      'x-tr-signature': xTrSignature
    };

    try {
      const response = await fetch(url, { headers: headers });
      if (!response.ok) return;

      const data = await response.json();
      const extCaptions = data.data?.extCaptions;
      if (!Array.isArray(extCaptions)) return;

      for (const caption of extCaptions) {
        const captionUrl = caption.url;
        if (!captionUrl) continue;

        const lang = caption.language || caption.lanName || caption.lan || "Unknown";
        subtitles.push({
          url: captionUrl,
          lang: `${lang} (${language})`
        });
      }
    } catch (err) {
      // Ignore subtitle errors
    }
  }

  generateProxyUrl(url, headers, ttl = 86400) {
    if (!this.workerBaseUrl) return url;

    const config = {
      url: url,
      headers: headers || {},
      exp: Date.now() + (ttl * 1000)
    };

    const encoded = Buffer.from(JSON.stringify(config)).toString('base64');
    return `${this.workerBaseUrl}/proxy/${encoded}`;
  }

  extractSubjectId(text) {
    const match = text.match(/subjectId=([^&]+)/);
    if (match) return match[1];
    if (text.includes('/')) return text.split('/').pop();
    return text;
  }

  getHighestQuality(inputText) {
    for (const [label, value] of QUALITIES) {
      if (inputText.toLowerCase().includes(label.toLowerCase())) {
        return value;
      }
    }
    return null;
  }

  inferLinkType(url, formatName) {
    if (url.toLowerCase().startsWith('magnet:')) return 'magnet';
    if (url.toLowerCase().includes('.mpd')) return 'dash';
    if (url.toLowerCase().endsWith('.torrent')) return 'torrent';
    if (formatName.toLowerCase() === 'hls' || url.toLowerCase().endsWith('.m3u8')) return 'hls';
    if (url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mkv')) return 'video';
    return 'infer';
  }

  parseDuration(duration) {
    if (!duration) return null;
    
    const match = duration.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      return hours * 60 + minutes;
    }

    const stripped = duration.replace('m', '').trim();
    return /^\d+$/.test(stripped) ? parseInt(stripped) : null;
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleMovieBoxRequest(request, env);
  }
};

async function handleMovieBoxRequest(request, env) {
  const url = new URL(request.url);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get worker base URL for proxy generation
  const workerBaseUrl = `${url.protocol}//${url.host}`;
  const client = new MovieBoxClient(workerBaseUrl);

  try {
    // API Routes
    if (url.pathname === '/api/list-categories') {
      return new Response(JSON.stringify(MAIN_PAGE), { headers: corsHeaders });
    }

    if (url.pathname === '/api/main-page') {
      const category = url.searchParams.get('category');
      const page = parseInt(url.searchParams.get('page') || '1');
      
      if (!category) {
        return new Response(JSON.stringify({ error: 'Category required' }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const result = await client.getMainPage(category, page);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (url.pathname === '/api/search') {
      const query = url.searchParams.get('query') || url.searchParams.get('q');
      
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query required' }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const result = await client.search(query);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (url.pathname === '/api/load') {
      const subject = url.searchParams.get('subject') || url.searchParams.get('id');
      
      if (!subject) {
        return new Response(JSON.stringify({ error: 'Subject ID required' }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const result = await client.load(subject);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (url.pathname === '/api/links') {
      const data = url.searchParams.get('data') || url.searchParams.get('id');
      
      if (!data) {
        return new Response(JSON.stringify({ error: 'Data required (format: subjectId|season|episode)' }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const result = await client.loadLinks(data);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Proxy endpoint (reuse from existing worker.js)
    if (url.pathname.startsWith('/proxy/')) {
      return handleProxyRequest(request, url);
    }

    // Generate endpoint (reuse from existing worker.js)
    if (url.pathname === '/generate' && request.method === 'POST') {
      return handleGenerateRequest(request);
    }

    // Root - API documentation
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(getAPIDocHTML(), {
        headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404, 
      headers: corsHeaders 
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// Proxy handler from existing worker.js
async function handleProxyRequest(request, url) {
  try {
    const encodedConfig = url.pathname.replace('/proxy/', '');
    if (!encodedConfig) {
      return new Response('Invalid proxy URL', { status: 400 });
    }

    let config;
    try {
      config = JSON.parse(Buffer.from(encodedConfig, 'base64').toString('utf-8'));
    } catch (e) {
      return new Response('Invalid encoded data', { status: 400 });
    }

    if (config.exp && Date.now() > config.exp) {
      return new Response('Link expired', { status: 410 });
    }

    let targetUrl = config.url;
    if (url.search) {
      const separator = targetUrl.includes('?') ? '&' : '?';
      targetUrl = targetUrl + separator + url.search.substring(1);
    }

    const proxyHeaders = new Headers();
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        proxyHeaders.set(key, value);
      }
    }

    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      proxyHeaders.set('Range', rangeHeader);
    }

    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders
    });

    const proxyResponse = new Response(response.body, response);
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    proxyResponse.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

    return proxyResponse;

  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// Generate handler from existing worker.js
async function handleGenerateRequest(request) {
  try {
    const body = await request.json();
    const { url, headers, ttl } = body;
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const config = {
      url: url,
      headers: headers || {},
      exp: ttl ? Date.now() + (ttl * 1000) : Date.now() + (24 * 3600 * 1000)
    };

    const encoded = Buffer.from(JSON.stringify(config)).toString('base64');
    const workerUrl = new URL(request.url);
    const proxyUrl = `${workerUrl.protocol}//${workerUrl.host}/proxy/${encoded}`;

    return new Response(JSON.stringify({
      success: true,
      proxyUrl: proxyUrl,
      expiresAt: new Date(config.exp).toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

function getAPIDocHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>MovieBox API Worker</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .endpoint { margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa; }
    .method { display: inline-block; padding: 4px 8px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
    .get { background: #28a745; color: white; }
    .post { background: #007bff; color: white; }
  </style>
</head>
<body>
  <h1>🎬 MovieBox API Worker</h1>
  <p>A complete MovieBox API implementation in Cloudflare Workers with automatic proxy link generation.</p>

  <h2>Features</h2>
  <ul>
    <li>✅ Full MovieBox API compatibility</li>
    <li>✅ Automatic CloudFront cookie handling</li>
    <li>✅ Proxy URL generation for protected links</li>
    <li>✅ CORS enabled for all endpoints</li>
    <li>✅ Search, browse, and stream content</li>
  </ul>

  <h2>API Endpoints</h2>

  <div class="endpoint">
    <span class="method get">GET</span><code>/api/list-categories</code>
    <p>List all available categories</p>
    <pre>curl https://your-worker.workers.dev/api/list-categories</pre>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span><code>/api/main-page?category={id}&page={num}</code>
    <p>Get content from a category</p>
    <pre>curl "https://your-worker.workers.dev/api/main-page?category=1|1&page=1"</pre>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span><code>/api/search?query={text}</code>
    <p>Search for content</p>
    <pre>curl "https://your-worker.workers.dev/api/search?query=Inception"</pre>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span><code>/api/load?subject={id}</code>
    <p>Load details for a specific subject</p>
    <pre>curl "https://your-worker.workers.dev/api/load?subject=5083772015786508240"</pre>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span><code>/api/links?data={id|season|episode}</code>
    <p>Get streaming links (automatically converted to proxy URLs)</p>
    <pre>curl "https://your-worker.workers.dev/api/links?data=5083772015786508240|1|1"</pre>
    <p><strong>Note:</strong> All protected links are automatically converted to proxy URLs that work directly in video players!</p>
  </div>

  <div class="endpoint">
    <span class="method post">POST</span><code>/generate</code>
    <p>Manually generate a proxy link</p>
    <pre>curl -X POST https://your-worker.workers.dev/generate \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com/video.mpd","headers":{"Cookie":"..."}}'</pre>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span><code>/proxy/{encoded}</code>
    <p>Proxy endpoint for protected media (used automatically)</p>
  </div>

  <h2>Example Response</h2>
  <p>When you call <code>/api/links</code>, streams are automatically converted:</p>
  <pre>{
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
    }
  ],
  "subtitles": [...]
}</pre>

  <h2>Usage in Video Players</h2>
  <p>The proxy URLs work directly without any headers:</p>
  <pre>vlc "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg=="
mpv "https://your-worker.workers.dev/proxy/eyJ1cmwiOi4uLg=="</pre>

  <h2>Deploy</h2>
  <pre>wrangler deploy</pre>
</body>
</html>`;
}
