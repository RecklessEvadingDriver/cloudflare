#!/usr/bin/env python3
"""
Helper module to generate temporary proxy links for protected media URLs.
Works with the Cloudflare Worker proxy service.
"""

import base64
import json
import time
from typing import Dict, Optional
import requests


class LinkProxyClient:
    """Client for generating temporary proxy links."""
    
    def __init__(self, worker_url: str):
        """
        Initialize the client.
        
        Args:
            worker_url: Base URL of the Cloudflare Worker (e.g., "https://your-worker.workers.dev")
        """
        self.worker_url = worker_url.rstrip('/')
    
    def generate_link(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        ttl: int = 86400
    ) -> Dict[str, str]:
        """
        Generate a temporary proxy link for a protected media URL.
        
        Args:
            url: The protected media URL
            headers: Headers to include (Referer, Cookie, etc.)
            ttl: Time-to-live in seconds (default: 86400 = 24 hours)
        
        Returns:
            Dict with 'proxyUrl' and 'expiresAt' keys
        """
        payload = {
            "url": url,
            "headers": headers or {},
            "ttl": ttl
        }
        
        response = requests.post(
            f"{self.worker_url}/generate",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        data = response.json()
        if not data.get('success'):
            raise RuntimeError(f"Failed to generate link: {data.get('error')}")
        
        return {
            'proxyUrl': data['proxyUrl'],
            'expiresAt': data['expiresAt']
        }
    
    def generate_link_offline(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        ttl: int = 86400
    ) -> str:
        """
        Generate a proxy link offline without calling the worker API.
        Useful when you want to create links without network requests.
        
        Args:
            url: The protected media URL
            headers: Headers to include (Referer, Cookie, etc.)
            ttl: Time-to-live in seconds (default: 86400 = 24 hours)
        
        Returns:
            The proxy URL string
        """
        config = {
            "url": url,
            "headers": headers or {},
            "exp": int(time.time() * 1000) + (ttl * 1000)
        }
        
        encoded = base64.b64encode(json.dumps(config).encode('utf-8')).decode('utf-8')
        return f"{self.worker_url}/proxy/{encoded}"


def convert_moviebox_stream(stream: Dict, worker_url: str, ttl: int = 86400) -> Dict:
    """
    Convert a MovieBox stream object to use proxy links.
    
    Args:
        stream: Stream dict from MovieBox API (with url, headers, etc.)
        worker_url: Base URL of the Cloudflare Worker
        ttl: Time-to-live in seconds
    
    Returns:
        Modified stream dict with proxy URL
    """
    client = LinkProxyClient(worker_url)
    
    original_url = stream.get('url')
    headers = stream.get('headers', {})
    
    if not original_url:
        return stream
    
    # Generate proxy link offline for efficiency
    proxy_url = client.generate_link_offline(original_url, headers, ttl)
    
    # Create new stream object with proxy URL and no headers needed
    new_stream = stream.copy()
    new_stream['url'] = proxy_url
    new_stream['headers'] = {}  # No headers needed for proxy
    new_stream['proxied'] = True
    new_stream['originalUrl'] = original_url
    
    return new_stream


# Example usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python link_proxy.py <worker_url> [url] [headers_json]")
        print("Example: python link_proxy.py https://your-worker.workers.dev")
        sys.exit(1)
    
    worker_url = sys.argv[1]
    
    if len(sys.argv) >= 3:
        # Generate link from command line
        url = sys.argv[2]
        headers = {}
        
        if len(sys.argv) >= 4:
            headers = json.loads(sys.argv[3])
        
        client = LinkProxyClient(worker_url)
        
        # Generate offline
        proxy_url = client.generate_link_offline(url, headers)
        print(f"Proxy URL (offline): {proxy_url}")
        
        # Or generate via API
        try:
            result = client.generate_link(url, headers)
            print(f"Proxy URL (via API): {result['proxyUrl']}")
            print(f"Expires at: {result['expiresAt']}")
        except Exception as e:
            print(f"API call failed: {e}")
    else:
        # Example with MovieBox stream
        example_stream = {
            "url": "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd",
            "type": "dash",
            "headers": {
                "Referer": "https://api.inmoviebox.com",
                "Cookie": "CloudFront-Policy=eyJTdGF0ZW...PLACEHOLDER...;CloudFront-Signature=qeavJeZ...PLACEHOLDER...;CloudFront-Key-Pair-Id=KMHN1LQ1HEUPL"
            }
        }
        
        converted = convert_moviebox_stream(example_stream, worker_url)
        print("Original stream:", json.dumps(example_stream, indent=2))
        print("\nConverted stream:", json.dumps(converted, indent=2))
