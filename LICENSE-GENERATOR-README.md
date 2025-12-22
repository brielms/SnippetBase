# SnippetBase License Generator

Two simple scripts to generate license keys for SnippetBase Pro.

## Quick Start

### Option 1: Use Existing Keys (Simplest)
```bash
# Generate a license (uses built-in keys)
node generate-license.mjs "customer-id" "email@domain.com" 2
```

### Option 2: Generate Your Own Keys (Recommended)
```bash
# Setup with fresh keys (run once)
node setup-license-generator.mjs

# Then generate licenses
node generate-license.mjs "customer-id" "email@domain.com" 2
```

## Examples

```bash
# Basic license
node generate-license.mjs "user-123"

# With email and seats
node generate-license.mjs "user-456" "user@example.com" 2

# With buyer ID
node generate-license.mjs "buyer-789" "company-id"
```

## Files

- `generate-license.mjs` - Main license generator script
- `setup-license-generator.mjs` - Setup script for fresh keys
- `private-key-backup.pem` - Backup of your private key (created by setup)

## Security Notes

- Never commit `private-key-backup.pem` to version control
- Keep your private key secure
- The public key from setup must be added to `src/licensing/license.ts`

## Output

The script outputs a license key like:
```
SB1.eyJ2IjoxLCJwcm9kdWN0Ijoic25pcHBldGJhc2UiLCJwbGFuIjoicHJvIiwibGljZW5zZUlkIjoidXNlci0xMjMiLCJpc3N1ZWRBdCI6MTY0MDk5NTIwMDAwMCwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwic2VhdHMiOjJ9.signature
```

Copy this into SnippetBase settings to enable Pro features.
