#!/usr/bin/env node

// Test that generated licenses work with the plugin
import { verifyLicenseKey } from './src/licensing/license.js';

const testLicense = 'SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidGVzdC11aSIsImlzc3VlZEF0IjoxNzY2NDI5NTAxODk1LCJzZWF0cyI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.MEQCIGeFPazcYR71ZHapQ960LT9cGIrXT7aJ9hWCx4sI4LD5AiBrTZj3375EJc4VeS4RW-1GPpE7gF_WaJqpfr2-xDYJ7g';

async function testLicenseValidation() {
  console.log('Testing license validation...\n');

  try {
    const result = await verifyLicenseKey(testLicense);

    if (result.ok) {
      console.log('✅ LICENSE VALIDATION SUCCESS!');
      console.log(`   License ID: ${result.licenseId}`);
      console.log(`   Email: ${result.email}`);
      console.log(`   Seats: ${result.seats}`);
      console.log('\n🎉 This license will work in the SnippetBase UI!');
    } else {
      console.log('❌ LICENSE VALIDATION FAILED!');
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ VERIFICATION ERROR:', error.message);
  }
}

testLicenseValidation();
