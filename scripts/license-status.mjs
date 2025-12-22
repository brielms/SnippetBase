#!/usr/bin/env node

/**
 * Quick license status and command helper
 */

console.log('🔑 SnippetBase License Status\n');

const privateKey = process.env.SNIPPETBASE_PRIVATE_KEY;

if (privateKey) {
  console.log('✅ Private key configured');
  console.log(`   Length: ${privateKey.length} characters`);
  console.log(`   Preview: ${privateKey.substring(0, 15)}...${privateKey.substring(privateKey.length - 10)}`);
} else {
  console.log('❌ Private key NOT configured');
  console.log('   Run: npm run setup');
}

console.log('\n🚀 Quick Commands:');
console.log('npm run setup                    # Configure licensing');
console.log('npm run test:license            # Test license system');
console.log('npm run build                   # Build plugin');

if (privateKey) {
  console.log('\n📝 Generate licenses:');
  console.log('node tools/generate-license.mjs "user-123" "user@example.com" 2');
  console.log('node tools/generate-license.mjs "buyer-456" "buyer-789"');
}

console.log('\n💡 Pro tip: Set your private key permanently with:');
console.log('$env:SNIPPETBASE_PRIVATE_KEY = "your-full-pem-key-here"');
console.log('Or set: $env:SNIPPETBASE_PRIVATE_KEY_FILE = "path/to/private-key.pem"');
