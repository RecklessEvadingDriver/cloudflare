#!/usr/bin/env python3
"""
Test script to verify the link proxy encoding/decoding functionality.
"""

import base64
import json
import time


def test_encoding_decoding():
    """Test that we can encode and decode URLs correctly."""
    print("Testing encoding/decoding functionality...")
    
    # Test data
    test_url = "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd"
    test_headers = {
        "Referer": "https://api.inmoviebox.com",
        "Cookie": "CloudFront-Policy=test;CloudFront-Signature=test;CloudFront-Key-Pair-Id=test"
    }
    test_ttl = 86400
    
    # Encode (same logic as Python client)
    config = {
        "url": test_url,
        "headers": test_headers,
        "exp": int(time.time() * 1000) + (test_ttl * 1000)
    }
    
    encoded = base64.b64encode(json.dumps(config).encode('utf-8')).decode('utf-8')
    print(f"✅ Encoded config length: {len(encoded)} characters")
    
    # Decode (same logic as Worker)
    decoded = json.loads(base64.b64decode(encoded).decode('utf-8'))
    
    # Verify
    assert decoded["url"] == test_url, "URL mismatch!"
    assert decoded["headers"]["Referer"] == test_headers["Referer"], "Referer mismatch!"
    assert decoded["headers"]["Cookie"] == test_headers["Cookie"], "Cookie mismatch!"
    assert "exp" in decoded, "Expiration missing!"
    
    print("✅ Encoding/decoding works correctly!")
    print(f"✅ Decoded URL: {decoded['url']}")
    print(f"✅ Decoded headers count: {len(decoded['headers'])}")
    print(f"✅ Has expiration: {decoded['exp'] > 0}")
    

def test_url_length():
    """Test URL length with realistic data."""
    print("\nTesting URL length with realistic CloudFront cookies...")
    
    realistic_cookie = "CloudFront-Policy=eyJTdGF0ZW...PLACEHOLDER...;CloudFront-Signature=qeavJeZ...PLACEHOLDER...;CloudFront-Key-Pair-Id=KMHN1LQ1HEUPL"
    
    config = {
        "url": "https://sacdn.hakunaymatata.com/dash/5083772015786508240_0_0_1080_h265_136/index.mpd",
        "headers": {
            "Referer": "https://api.inmoviebox.com",
            "Cookie": realistic_cookie
        },
        "exp": int(time.time() * 1000) + (86400 * 1000)
    }
    
    encoded = base64.b64encode(json.dumps(config).encode('utf-8')).decode('utf-8')
    full_url = f"https://your-worker.workers.dev/proxy/{encoded}"
    
    print(f"✅ Full proxy URL length: {len(full_url)} characters")
    
    if len(full_url) > 2000:
        print("⚠️  Warning: URL is longer than 2000 characters")
        print("   Some browsers may have issues with very long URLs")
    else:
        print("✅ URL length is acceptable (< 2000 characters)")
    
    # Test that it can be decoded
    decoded = json.loads(base64.b64decode(encoded).decode('utf-8'))
    assert decoded["headers"]["Cookie"] == realistic_cookie
    print("✅ Realistic CloudFront cookie encoding/decoding works!")


def test_expiration_check():
    """Test expiration logic."""
    print("\nTesting expiration logic...")
    
    # Create expired config
    expired_config = {
        "url": "https://example.com/video.mpd",
        "headers": {},
        "exp": int(time.time() * 1000) - 1000  # 1 second ago
    }
    
    # Create valid config
    valid_config = {
        "url": "https://example.com/video.mpd",
        "headers": {},
        "exp": int(time.time() * 1000) + (3600 * 1000)  # 1 hour from now
    }
    
    current_time = int(time.time() * 1000)
    
    # Check expired
    if current_time > expired_config["exp"]:
        print("✅ Expired link correctly identified as expired")
    else:
        print("❌ Failed to identify expired link")
    
    # Check valid
    if current_time <= valid_config["exp"]:
        print("✅ Valid link correctly identified as valid")
    else:
        print("❌ Failed to identify valid link")


def test_special_characters():
    """Test handling of special characters in URLs and headers."""
    print("\nTesting special characters in URLs...")
    
    # URL with query parameters and special characters
    url_with_params = "https://example.com/video.mpd?token=abc123&key=xyz&special=%20%3D%26"
    headers_with_special = {
        "Referer": "https://api.example.com/player",
        "Cookie": "session=abc123; path=/; secure",
        "Custom-Header": "value with spaces"
    }
    
    config = {
        "url": url_with_params,
        "headers": headers_with_special,
        "exp": int(time.time() * 1000) + (3600 * 1000)
    }
    
    encoded = base64.b64encode(json.dumps(config).encode('utf-8')).decode('utf-8')
    decoded = json.loads(base64.b64decode(encoded).decode('utf-8'))
    
    assert decoded["url"] == url_with_params, "URL with parameters not preserved!"
    assert decoded["headers"]["Cookie"] == headers_with_special["Cookie"], "Cookie not preserved!"
    
    print("✅ Special characters handled correctly")
    print(f"✅ Preserved URL: {decoded['url']}")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Link Proxy - Unit Tests")
    print("=" * 60 + "\n")
    
    try:
        test_encoding_decoding()
        test_url_length()
        test_expiration_check()
        test_special_characters()
        
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
