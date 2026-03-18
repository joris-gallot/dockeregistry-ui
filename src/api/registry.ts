import type { CatalogResponse, TagListResponse, ManifestV2, ManifestList, ImageConfig } from './types'

const MANIFEST_V2 = 'application/vnd.docker.distribution.manifest.v2+json'
const MANIFEST_LIST_V2 = 'application/vnd.docker.distribution.manifest.list.v2+json'
const OCI_MANIFEST = 'application/vnd.oci.image.manifest.v1+json'
const OCI_INDEX = 'application/vnd.oci.image.index.v1+json'

const ALL_MANIFEST_TYPES = [MANIFEST_V2, MANIFEST_LIST_V2, OCI_MANIFEST, OCI_INDEX].join(', ')

let bearerToken: string | null = null

function getCacheKey(url: string): string | null {
  const match = url.match(/(blobs|manifests)\/sha256:[a-f0-9]+$/)
  return match ? url : null
}

function getCached(url: string): string | null {
  const key = getCacheKey(url)
  if (!key) return null
  return sessionStorage.getItem(`${key}/response`)
}

function setCache(url: string, response: string, contentDigest?: string) {
  const key = getCacheKey(url)
  if (!key) return
  try {
    sessionStorage.setItem(`${key}/response`, response)
    if (contentDigest) {
      sessionStorage.setItem(`${key}/contentDigest`, contentDigest)
    }
  } catch {
    // sessionStorage full, ignore
  }
}

async function parseWwwAuthenticate(header: string): Promise<{ realm: string; service: string; scope: string } | null> {
  const match = header.match(/Bearer\s+realm="([^"]+)"(?:,\s*service="([^"]*)")?(?:,\s*scope="([^"]*)")?/)
  if (!match) return null
  return { realm: match[1], service: match[2] || '', scope: match[3] || '' }
}

async function fetchToken(realm: string, service: string, scope: string): Promise<string> {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (scope) params.set('scope', scope)
  const url = `${realm}?${params.toString()}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Auth failed: ${resp.status}`)
  const data = await resp.json()
  return data.token || data.access_token
}

async function registryFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }

  let resp = await fetch(url, { ...options, headers })

  if (resp.status === 401) {
    const wwwAuth = resp.headers.get('www-authenticate')
    if (wwwAuth) {
      const auth = await parseWwwAuthenticate(wwwAuth)
      if (auth) {
        bearerToken = await fetchToken(auth.realm, auth.service, auth.scope)
        headers.set('Authorization', `Bearer ${bearerToken}`)
        resp = await fetch(url, { ...options, headers })
      }
    }
  }

  return resp
}

export function buildRegistryUrl(registryUrl: string, path: string): string {
  const base = registryUrl.replace(/\/$/, '')
  return `${base}/v2${path}`
}

export async function getCatalog(registryUrl: string, limit = 1000): Promise<CatalogResponse> {
  const url = buildRegistryUrl(registryUrl, `/_catalog?n=${limit}`)
  const resp = await registryFetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch catalog: ${resp.status}`)
  return resp.json()
}

export async function getTagList(registryUrl: string, image: string): Promise<TagListResponse> {
  const url = buildRegistryUrl(registryUrl, `/${image}/tags/list`)
  const resp = await registryFetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch tags: ${resp.status}`)
  return resp.json()
}

export async function getManifest(registryUrl: string, image: string, reference: string): Promise<{ manifest: ManifestV2 | ManifestList; contentDigest: string }> {
  const url = buildRegistryUrl(registryUrl, `/${image}/manifests/${reference}`)

  const cached = getCached(url)
  if (cached) {
    const cachedDigest = sessionStorage.getItem(`${url}/contentDigest`) || ''
    return { manifest: JSON.parse(cached), contentDigest: cachedDigest }
  }

  const resp = await registryFetch(url, {
    headers: { Accept: ALL_MANIFEST_TYPES },
  })
  if (!resp.ok) throw new Error(`Failed to fetch manifest: ${resp.status}`)

  const contentDigest = resp.headers.get('docker-content-digest') || ''
  const text = await resp.text()
  setCache(url, text, contentDigest)

  return { manifest: JSON.parse(text), contentDigest }
}

export async function getBlob(registryUrl: string, image: string, digest: string): Promise<ImageConfig> {
  const url = buildRegistryUrl(registryUrl, `/${image}/blobs/${digest}`)

  const cached = getCached(url)
  if (cached) return JSON.parse(cached)

  const resp = await registryFetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status}`)

  const text = await resp.text()
  setCache(url, text)

  return JSON.parse(text)
}

export async function deleteManifest(registryUrl: string, image: string, digest: string): Promise<boolean> {
  const url = buildRegistryUrl(registryUrl, `/${image}/manifests/${digest}`)
  const resp = await registryFetch(url, { method: 'DELETE' })
  return resp.ok || resp.status === 202
}

export function isManifestList(manifest: ManifestV2 | ManifestList): manifest is ManifestList {
  const mt = (manifest as any).mediaType
  return mt === MANIFEST_LIST_V2 || mt === OCI_INDEX || Array.isArray((manifest as ManifestList).manifests)
}

export function resetAuth() {
  bearerToken = null
}
