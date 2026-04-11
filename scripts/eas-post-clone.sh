#!/bin/bash
# EAS post-clone hook to create google-services.json from base64 environment variable

echo "🔐 Decoding google-services.json from GOOGLE_SERVICES_JSON_BASE64..."

if [ -z "$GOOGLE_SERVICES_JSON_BASE64" ]; then
  echo "❌ Error: GOOGLE_SERVICES_JSON_BASE64 environment variable is not set"
  exit 1
fi

# Decode base64 and write to android/app/google-services.json
echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > android/app/google-services.json

if [ -f "android/app/google-services.json" ]; then
  echo "✅ google-services.json created successfully"
  # Verify it's valid JSON
  if jq empty android/app/google-services.json 2>/dev/null; then
    echo "✅ google-services.json is valid JSON"
  else
    echo "⚠️ Warning: google-services.json may not be valid JSON"
  fi
else
  echo "❌ Error: Failed to create google-services.json"
  exit 1
fi
