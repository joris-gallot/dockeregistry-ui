#!/bin/bash
# Push test images into a local registry
# Usage: ./scripts/seed-registry.sh [registry_url]

REGISTRY=${1:-localhost:5000}

echo "==> Seeding registry at $REGISTRY..."

# Pull small public images and re-tag them for the local registry
images=(
  "alpine:3.19"
  "alpine:3.20"
  "busybox:latest"
  "busybox:1.36"
  "nginx:alpine"
  "redis:alpine"
  "hello-world:latest"
)

for img in "${images[@]}"; do
  name="${img%%:*}"
  tag="${img##*:}"
  echo "--- Pulling $img"
  docker pull "$img" --quiet

  # Tag with namespace to test the tree view
  docker tag "$img" "$REGISTRY/library/$name:$tag"
  docker tag "$img" "$REGISTRY/$name:$tag"

  echo "--- Pushing $REGISTRY/library/$name:$tag"
  docker push "$REGISTRY/library/$name:$tag"
  echo "--- Pushing $REGISTRY/$name:$tag"
  docker push "$REGISTRY/$name:$tag"
done

# Deep namespace images to test catalog branching
docker tag alpine:3.20 "$REGISTRY/myorg/backend/api:v1.0"
docker push "$REGISTRY/myorg/backend/api:v1.0"

docker tag alpine:3.20 "$REGISTRY/myorg/backend/api:v1.1"
docker push "$REGISTRY/myorg/backend/api:v1.1"

docker tag nginx:alpine "$REGISTRY/myorg/frontend/web:latest"
docker push "$REGISTRY/myorg/frontend/web:latest"

echo "==> Done! Registry seeded with test images."
