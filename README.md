# dockeregistry-ui

A web UI for browsing and managing a Docker registry

## Features

### Images list

Browse all images in the registry with a tree view for namespaced repositories.

![Images list](docs/images_list.png)

### Tags list

View tags with size, platform and digest info, delete tags directly from the UI.

![Tags list](docs/tags_list.png)

### Layer history

Inspect layer history and view the reconstructed Dockerfile.

![Layer history](docs/tag_layer_history.png)

## Example with a self-hosted registry

`docker-compose.yml`:

```yaml
services:
  registry:
    image: registry:3
    volumes:
      - registry-data:/var/lib/registry
      - ./registry-config.yml:/etc/distribution/config.yml:ro
    restart: unless-stopped

  dockeregistry-ui:
    image: jorisgallot/dockeregistry-ui:latest
    ports:
      - "80:80"
    restart: unless-stopped

volumes:
  registry-data:
```

`registry-config.yml`:

```yaml
version: 0.1
log:
  level: info
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
  headers:
    Access-Control-Allow-Origin: ["https://dockeregistry-ui.example.com"]
    Access-Control-Allow-Methods: ["HEAD", "GET", "OPTIONS", "DELETE"]
    Access-Control-Allow-Headers: ["Authorization", "Accept", "Content-Type"]
    Access-Control-Expose-Headers: ["Docker-Content-Digest"]
```

### CORS configuration

The UI makes requests directly from the browser to the registry, the registry must allow CORS from the UI's origin.

Add the following `http.headers` block to your registry `config.yml`, replacing the origin with your actual UI domain:

```yaml
http:
  headers:
    Access-Control-Allow-Origin: ["https://your-ui-domain.com"]
    Access-Control-Allow-Methods: ["HEAD", "GET", "OPTIONS", "DELETE"]
    Access-Control-Allow-Headers: ["Authorization", "Accept", "Content-Type"]
    Access-Control-Expose-Headers: ["Docker-Content-Digest"]
```

## Development

```bash
pnpm install
pnpm dev
```


`docker-compose.dev.yml` starts a registry with CORS pre-configured:

```bash
docker compose -f docker-compose.dev.yml up -d
./scripts/seed-registry.sh
```

Then add `http://localhost:5000` as a registry in the UI.

For a registry with authentication:

```bash
mkdir -p auth
docker run --rm --entrypoint htpasswd httpd:2 -Bbn admin admin > auth/htpasswd
docker compose -f docker-compose.dev.yml up -d
```

Use `http://localhost:5001` and log in with `admin / admin`.

## License

MIT
