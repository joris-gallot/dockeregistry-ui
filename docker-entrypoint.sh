#!/bin/sh
if [ -z "$REGISTRY_URL" ]; then
  echo "Error: REGISTRY_URL environment variable is required"
  exit 1
fi

cat > /usr/share/nginx/html/config.json <<EOF
{
  "registryUrl": "${REGISTRY_URL}"
}
EOF

exec "$@"
