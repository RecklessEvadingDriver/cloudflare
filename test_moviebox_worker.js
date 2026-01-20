#!/usr/bin/env node
/**
 * Test script for MovieBox API Worker
 * Demonstrates how to use the API and automatic proxy link generation
 */

// Note: Replace with your actual worker URL after deployment
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

async function testSearchAPI() {
  console.log('\n📝 Test 1: Search API');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${WORKER_URL}/api/search?query=Inception`);
    const data = await response.json();
    
    console.log(`✅ Found ${data.length} results`);
    if (data.length > 0) {
      console.log(`   First result: ${data[0].title} (${data[0].type})`);
      console.log(`   Subject ID: ${data[0].subjectId}`);
      return data[0].subjectId;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  return null;
}

async function testLoadAPI(subjectId) {
  console.log('\n📚 Test 2: Load Subject Details');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${WORKER_URL}/api/load?subject=${subjectId}`);
    const data = await response.json();
    
    console.log(`✅ Loaded: ${data.title}`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Year: ${data.year}`);
    console.log(`   Score: ${data.score}`);
    console.log(`   Tags: ${data.tags?.slice(0, 3).join(', ')}...`);
    
    if (data.episodes && data.episodes.length > 0) {
      console.log(`   Episodes: ${data.episodes.length}`);
      return `${subjectId}|1|1`; // Return first episode
    }
    return `${subjectId}|0|0`; // Return movie
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  return null;
}

async function testLinksAPI(data) {
  console.log('\n🎬 Test 3: Get Streaming Links (with Auto-Proxy)');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${WORKER_URL}/api/links?data=${data}`);
    const result = await response.json();
    
    console.log(`✅ Found ${result.streams.length} streams`);
    
    if (result.streams.length > 0) {
      const stream = result.streams[0];
      console.log(`\n   Stream 1: ${stream.name}`);
      console.log(`   Type: ${stream.type}`);
      console.log(`   Quality: ${stream.quality}p`);
      console.log(`   Proxied: ${stream.proxied ? '✅ YES' : '❌ NO'}`);
      console.log(`   Headers needed: ${Object.keys(stream.headers).length > 0 ? 'Yes' : 'No'}`);
      
      if (stream.proxied) {
        console.log(`\n   ✨ Proxy URL (ready to play):`);
        console.log(`   ${stream.url.substring(0, 100)}...`);
        console.log(`\n   📺 Play in VLC:`);
        console.log(`   vlc "${stream.url}"`);
        console.log(`\n   🎥 Play in MPV:`);
        console.log(`   mpv "${stream.url}"`);
      }
      
      if (stream.originalUrl) {
        console.log(`\n   🔗 Original URL:`);
        console.log(`   ${stream.originalUrl.substring(0, 100)}...`);
      }
    }
    
    if (result.subtitles && result.subtitles.length > 0) {
      console.log(`\n   💬 Subtitles: ${result.subtitles.length} available`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function testCategoriesAPI() {
  console.log('\n📋 Test 4: List Categories');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${WORKER_URL}/api/list-categories`);
    const data = await response.json();
    
    const categories = Object.entries(data).slice(0, 5);
    console.log(`✅ Found ${Object.keys(data).length} categories`);
    console.log(`   Sample categories:`);
    for (const [id, name] of categories) {
      console.log(`   - ${name} (${id})`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function testMainPageAPI() {
  console.log('\n🎞️  Test 5: Browse Main Page');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${WORKER_URL}/api/main-page?category=1|1&page=1`);
    const data = await response.json();
    
    console.log(`✅ Category: ${data.name}`);
    console.log(`   Items: ${data.items.length}`);
    if (data.items.length > 0) {
      console.log(`   First item: ${data.items[0].title}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🎬 MovieBox API Worker - Integration Tests');
  console.log('='.repeat(60));
  console.log(`Worker URL: ${WORKER_URL}`);
  
  try {
    // Test 1: Search
    const subjectId = await testSearchAPI();
    
    if (subjectId) {
      // Test 2: Load details
      const linkData = await testLoadAPI(subjectId);
      
      if (linkData) {
        // Test 3: Get streaming links (with auto-proxy)
        await testLinksAPI(linkData);
      }
    }
    
    // Test 4 & 5: Categories and Browse
    await testCategoriesAPI();
    await testMainPageAPI();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60));
    console.log('\n💡 To deploy the worker:');
    console.log('   npm run deploy:moviebox');
    console.log('\n💡 To test locally:');
    console.log('   npm run dev:moviebox');
    console.log('   WORKER_URL=http://localhost:8787 node test_moviebox_worker.js');
    console.log();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
