// Quick test to verify a license key works
import { verifyLicenseKey } from './src/licensing/license.js';

const testKey = 'SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidWktdGVzdC1jdXN0b21lciIsImlzc3VlZEF0IjoxNzY2MzgxMzgyODc3LCJzZWF0cyI6MSwiZW1haWwiOiJ1aS10ZXN0QGV4YW1wbGUuY29tIn0.-EV9btKRgecr2BxinLzuU7xL2vBI6MPTlVJX7XdW-1OadmHo-KgG31xeVyMkqkmBPOTm1KsybART_KHwPqxgBw';

(async () => {
  console.log('Testing license key verification...');
  const result = await verifyLicenseKey(testKey);
  console.log('Result:', result);

  if (result.ok) {
    console.log('✅ License key is valid!');
    console.log('License ID:', result.licenseId);
    console.log('Email:', result.email);
    console.log('Seats:', result.seats);
  } else {
    console.log('❌ License key is invalid:', result.error);
  }
})();
