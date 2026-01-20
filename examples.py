#!/usr/bin/env python3
"""
Example usage of the CloudFront Link Proxy service.
Demonstrates how to convert protected MovieBox links to playable URLs.
"""

import json
from link_proxy import LinkProxyClient, convert_moviebox_stream


def example_basic_usage():
    """Basic example: Generate a proxy link for a protected URL."""
    print("=" * 60)
    print("Example 1: Basic Link Generation")
    print("=" * 60)
    
    # Your Cloudflare Worker URL (replace with your actual URL)
    worker_url = "https://your-worker.workers.dev"
    
    # Protected media URL from MovieBox
    media_url = "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd"
    
    # Required headers (CloudFront cookies, referer, etc.)
    headers = {
        "Referer": "https://api.inmoviebox.com",
        "Cookie": "CloudFront-Policy=eyJTdGF0ZW...PLACEHOLDER...;CloudFront-Signature=qeavJeZ...PLACEHOLDER...;CloudFront-Key-Pair-Id=KMHN1LQ1HEUPL"
    }
    
    # Create client
    client = LinkProxyClient(worker_url)
    
    # Generate proxy link (offline method - no API call needed)
    proxy_url = client.generate_link_offline(media_url, headers, ttl=86400)
    
    print(f"\nOriginal URL:\n{media_url}\n")
    print(f"Proxy URL:\n{proxy_url}\n")
    print("✅ You can now play this URL in any video player!")
    print("\nExample commands:")
    print(f'  vlc "{proxy_url}"')
    print(f'  mpv "{proxy_url}"')
    print()


def example_moviebox_integration():
    """Example: Convert MovieBox stream objects to use proxy links."""
    print("=" * 60)
    print("Example 2: MovieBox Stream Conversion")
    print("=" * 60)
    
    worker_url = "https://your-worker.workers.dev"
    
    # Typical stream object from MovieBox API
    moviebox_stream = {
        "source": "MovieBox Original",
        "name": "MovieBox (Original)",
        "url": "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd",
        "type": "dash",
        "headers": {
            "Referer": "https://api.inmoviebox.com",
            "Cookie": "CloudFront-Policy=eyJTdGF0ZW...PLACEHOLDER...;CloudFront-Signature=qeavJeZ...PLACEHOLDER...;CloudFront-Key-Pair-Id=KMHN1LQ1HEUPL"
        },
        "quality": 1080
    }
    
    print("\n📥 Original MovieBox Stream:")
    print(json.dumps(moviebox_stream, indent=2))
    
    # Convert to proxy stream
    converted_stream = convert_moviebox_stream(moviebox_stream, worker_url)
    
    print("\n📤 Converted Proxy Stream:")
    print(json.dumps(converted_stream, indent=2))
    
    print("\n✅ The converted stream can be played without any headers!")
    print()


def example_multiple_streams():
    """Example: Batch convert multiple streams."""
    print("=" * 60)
    print("Example 3: Batch Conversion of Multiple Streams")
    print("=" * 60)
    
    worker_url = "https://your-worker.workers.dev"
    
    # Multiple streams from MovieBox (different languages/qualities)
    streams = [
        {
            "name": "MovieBox (Original) - 1080p",
            "url": "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd",
            "type": "dash",
            "headers": {
                "Referer": "https://api.inmoviebox.com",
                "Cookie": "CloudFront-Policy=...;CloudFront-Signature=...;CloudFront-Key-Pair-Id=..."
            },
            "quality": 1080
        },
        {
            "name": "MovieBox (Hindi) - 720p",
            "url": "https://sacdn.hakunaymatata.com/dash/another_stream_720/index.mpd",
            "type": "dash",
            "headers": {
                "Referer": "https://api.inmoviebox.com",
                "Cookie": "CloudFront-Policy=...;CloudFront-Signature=...;CloudFront-Key-Pair-Id=..."
            },
            "quality": 720
        }
    ]
    
    print("\n🎬 Converting multiple streams...\n")
    
    converted_streams = []
    for stream in streams:
        converted = convert_moviebox_stream(stream, worker_url, ttl=86400)
        converted_streams.append(converted)
        print(f"✅ {stream['name']}")
        print(f"   Proxy URL: {converted['url'][:80]}...")
        print()
    
    print(f"✅ Successfully converted {len(converted_streams)} streams!")
    print()


def example_custom_ttl():
    """Example: Using different expiration times."""
    print("=" * 60)
    print("Example 4: Custom Link Expiration Times")
    print("=" * 60)
    
    worker_url = "https://your-worker.workers.dev"
    media_url = "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd"
    headers = {
        "Referer": "https://api.inmoviebox.com",
        "Cookie": "CloudFront-Policy=...;CloudFront-Signature=...;CloudFront-Key-Pair-Id=..."
    }
    
    client = LinkProxyClient(worker_url)
    
    # Different TTL values
    ttl_configs = [
        (3600, "1 hour"),
        (21600, "6 hours"),
        (86400, "24 hours (default)"),
        (604800, "7 days")
    ]
    
    print("\n🕐 Generating links with different expiration times:\n")
    
    for ttl_seconds, description in ttl_configs:
        proxy_url = client.generate_link_offline(media_url, headers, ttl=ttl_seconds)
        print(f"⏰ {description}:")
        print(f"   {proxy_url[:80]}...")
        print()
    
    print("💡 Tip: Use longer TTLs for playlists, shorter for one-time viewing")
    print()


def example_with_moviebox_cli():
    """Example: Integration with moviebox_cli.py"""
    print("=" * 60)
    print("Example 5: Full Integration with MovieBox CLI")
    print("=" * 60)
    
    print("""
This example shows how to integrate the proxy with moviebox_cli.py:

1. Get streaming links from MovieBox:
   
   python moviebox_cli.py links "5083772015786508240|1|1"

2. The output will include streams with headers:
   
   {
     "streams": [
       {
         "url": "https://sacdn.hakunaymatata.com/dash/.../index.mpd",
         "headers": {
           "Referer": "https://api.inmoviebox.com",
           "Cookie": "CloudFront-Policy=...;CloudFront-Signature=...;"
         }
       }
     ]
   }

3. Convert to proxy links:
   
   from link_proxy import convert_moviebox_stream
   
   for stream in streams:
       proxy_stream = convert_moviebox_stream(stream, worker_url)
       # Now use proxy_stream['url'] in your player

4. Or add to moviebox_cli.py directly:
   
   # In load_links method, after collecting streams:
   if enable_proxy:
       from link_proxy import convert_moviebox_stream
       streams = [convert_moviebox_stream(s, worker_url) for s in streams]
   
   return {"streams": streams, "subtitles": subtitles}
""")


def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("CloudFront Link Proxy - Usage Examples")
    print("=" * 60 + "\n")
    
    print("ℹ️  Before running, replace 'your-worker.workers.dev' with your actual")
    print("   Cloudflare Worker URL after deployment.\n")
    
    try:
        example_basic_usage()
        example_moviebox_integration()
        example_multiple_streams()
        example_custom_ttl()
        example_with_moviebox_cli()
        
        print("=" * 60)
        print("✅ All examples completed!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Deploy the worker: wrangler deploy")
        print("2. Replace 'your-worker.workers.dev' with your actual URL")
        print("3. Run these examples with real data")
        print("4. Integrate with moviebox_cli.py for seamless streaming")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Note: These are examples and won't work until you deploy the worker.")


if __name__ == "__main__":
    main()
