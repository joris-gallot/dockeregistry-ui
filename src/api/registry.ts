import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { CatalogResponse, TagListResponse, ManifestV2, ManifestList, ImageConfig } from './types'

const MANIFEST_V2 = 'application/vnd.docker.distribution.manifest.v2+json'
const MANIFEST_LIST_V2 = 'application/vnd.docker.distribution.manifest.list.v2+json'
const OCI_MANIFEST = 'application/vnd.oci.image.manifest.v1+json'
const OCI_INDEX = 'application/vnd.oci.image.index.v1+json'

const ALL_MANIFEST_TYPES = [MANIFEST_V2, MANIFEST_LIST_V2, OCI_MANIFEST, OCI_INDEX].join(', ')

// --- Auth state ---
let bearerToken: string | null = null
let basicCredentials: string | null = null

// --- Session cache for immutable blobs/manifests ---
function getCacheKey(url: string): string | null {
  return url.match(/(blobs|manifests)\/sha256:[a-f0-9]+$/) ? url : null
}

function getCached(url: string): { data: string; contentDigest?: string } | null {
  const key = getCacheKey(url)
  if (!key) return null
  const data = sessionStorage.getItem(`${key}/response`)
  if (!data) return null
  const contentDigest = sessionStorage.getItem(`${key}/contentDigest`) || undefined
  return { data, contentDigest }
}

function setCache(url: string, data: string, contentDigest?: string) {
  const key = getCacheKey(url)
  if (!key) return
  try {
    sessionStorage.setItem(`${key}/response`, data)
    if (contentDigest) sessionStorage.setItem(`${key}/contentDigest`, contentDigest)
  } catch { /* storage full */ }
}

// --- Bearer token flow ---
function parseWwwAuthenticate(header: string) {
  const match = header.match(/Bearer\s+realm="([^"]+)"(?:,\s*service="([^"]*)")?(?:,\s*scope="([^"]*)")?/)
  if (!match) return null
  return { realm: match[1], service: match[2] || '', scope: match[3] || '' }
}

async function fetchBearerToken(realm: string, service: string, scope: string): Promise<string> {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (scope) params.set('scope', scope)

  const headers: Record<string, string> = {}
  if (basicCredentials) {
    headers['Authorization'] = `Basic ${basicCredentials}`
  }

  const { data } = await axios.get(`${realm}?${params}`, { headers })
  return data.token || data.access_token
}

// --- Axios instance factory ---
function createRegistryClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${baseURL.replace(/\/$/, '')}/v2`,
    timeout: 30000,
  })

  // Request interceptor: inject auth
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (bearerToken) {
      config.headers.set('Authorization', `Bearer ${bearerToken}`)
    } else if (basicCredentials) {
      config.headers.set('Authorization', `Basic ${basicCredentials}`)
    }
    return config
  })

  // Response interceptor: handle 401 → fetch token → retry
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config
      if (error.response?.status === 401 && !originalRequest._retried) {
        originalRequest._retried = true
        const wwwAuth = error.response.headers['www-authenticate']
        if (wwwAuth) {
          const auth = parseWwwAuthenticate(wwwAuth)
          if (auth) {
            bearerToken = await fetchBearerToken(auth.realm, auth.service, auth.scope)
            originalRequest.headers['Authorization'] = `Bearer ${bearerToken}`
            return client(originalRequest)
          }
        }
      }
      return Promise.reject(error)
    },
  )

  return client
}

// --- Registry client singleton per URL ---
const clients = new Map<string, AxiosInstance>()

function getClient(registryUrl: string): AxiosInstance {
  const key = registryUrl.replace(/\/$/, '')
  if (!clients.has(key)) {
    clients.set(key, createRegistryClient(key))
  }
  return clients.get(key)!
}

// --- Public API ---

export function setBasicAuth(username: string, password: string) {
  basicCredentials = btoa(`${username}:${password}`)
  bearerToken = null
  clients.clear()
}

export function resetAuth() {
  bearerToken = null
  basicCredentials = null
  clients.clear()
}

export async function getCatalog(registryUrl: string, limit = 1000): Promise<CatalogResponse> {
  const { data } = await getClient(registryUrl).get<CatalogResponse>(`/_catalog`, {
    params: { n: limit },
  })
  return data
}

export async function getTagList(registryUrl: string, image: string): Promise<TagListResponse> {
  const { data } = await getClient(registryUrl).get<TagListResponse>(`/${image}/tags/list`)
  return data
}

export async function getManifest(
  registryUrl: string,
  image: string,
  reference: string,
): Promise<{ manifest: ManifestV2 | ManifestList; contentDigest: string }> {
  const url = `/${image}/manifests/${reference}`
  const fullUrl = `${registryUrl.replace(/\/$/, '')}/v2${url}`

  const cached = getCached(fullUrl)
  if (cached) {
    return { manifest: JSON.parse(cached.data), contentDigest: cached.contentDigest || '' }
  }

  const { data, headers } = await getClient(registryUrl).get(url, {
    headers: { Accept: ALL_MANIFEST_TYPES },
    transformResponse: [(d) => d], // keep raw string for caching
  })

  const contentDigest = headers['docker-content-digest'] || ''
  setCache(fullUrl, data, contentDigest)

  return { manifest: JSON.parse(data), contentDigest }
}

export async function getBlob(registryUrl: string, image: string, digest: string): Promise<ImageConfig> {
  const url = `/${image}/blobs/${digest}`
  const fullUrl = `${registryUrl.replace(/\/$/, '')}/v2${url}`

  const cached = getCached(fullUrl)
  if (cached) return JSON.parse(cached.data)

  const { data } = await getClient(registryUrl).get(url, {
    transformResponse: [(d) => d],
  })

  setCache(fullUrl, data)
  return JSON.parse(data)
}

export async function deleteManifest(registryUrl: string, image: string, digest: string): Promise<boolean> {
  try {
    await getClient(registryUrl).delete(`/${image}/manifests/${digest}`)
    return true
  } catch {
    return false
  }
}

export function isManifestList(manifest: ManifestV2 | ManifestList): manifest is ManifestList {
  const mt = (manifest as ManifestV2 | ManifestList & { mediaType?: string }).mediaType
  return mt === MANIFEST_LIST_V2 || mt === OCI_INDEX || Array.isArray((manifest as ManifestList).manifests)
}
