#!/usr/bin/env node

/**
 * Test license verification in the actual built plugin
 */

// Mock the Obsidian environment
globalThis.app = {};
globalThis.console = console;

const licenseKey = process.argv[2] || "SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoibWF0dHkiLCJpc3N1ZWRBdCI6MTc2NjQyNjYxMTcyMSwic2VhdHMiOjEsImVtYWlsIjoibWF0dHlAZ21haWwuY29tIn0.D_KGUY26QdfoidyucHRwrSUztEMtg34F6wnB72QKAJgW-lUFkOQiz7WWxvUKTwNXTaKbACIlTkSDxoPUTMJDCw";

console.log('🧪 Testing license in plugin environment...');
console.log('License key:', licenseKey.substring(0, 50) + '...');

// This simulates what happens in the plugin
async function testLicenseInPlugin() {
  try {
    // Import the crypto functions (this should work since they're bundled)
    const cryptoModule = await import('../src/licensing/crypto.ts');
    const licenseModule = await import('../src/licensing/license.ts');

    console.log('✅ Modules imported successfully');

    // Test the license verification
    const result = await licenseModule.verifyLicenseKey(licenseKey);

    console.log('📋 License verification result:');
    console.log('  ok:', result.ok);
    console.log('  error:', result.error);
    console.log('  licenseId:', result.licenseId);
    console.log('  email:', result.email);
    console.log('  seats:', result.seats);

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

testLicenseInPlugin().then(result => {
  if (result?.ok) {
    console.log('✅ License verification successful!');
  } else {
    console.log('❌ License verification failed!');
  }
});
