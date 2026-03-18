export interface CatalogResponse {
  repositories: string[]
}

export interface TagListResponse {
  name: string
  tags: string[] | null
}

export interface ManifestV2 {
  schemaVersion: number
  mediaType: string
  config: {
    mediaType: string
    size: number
    digest: string
  }
  layers: Array<{
    mediaType: string
    size: number
    digest: string
  }>
}

export interface ManifestList {
  schemaVersion: number
  mediaType: string
  manifests: Array<{
    mediaType: string
    size: number
    digest: string
    platform: {
      architecture: string
      os: string
      variant?: string
    }
  }>
}

export type Manifest = ManifestV2 | ManifestList

export interface ImageConfig {
  architecture: string
  os: string
  created: string
  config: {
    Env?: string[]
    Cmd?: string[]
    ExposedPorts?: Record<string, object>
    Labels?: Record<string, string>
  }
  history: Array<{
    created: string
    created_by: string
    empty_layer?: boolean
    comment?: string
  }>
  rootfs: {
    type: string
    diff_ids: string[]
  }
}

export interface TagDetail {
  tag: string
  digest: string
  contentDigest: string
  size: number
  createdAt: string
  architecture?: string
  os?: string
  isManifestList: boolean
  platforms?: Array<{
    architecture: string
    os: string
    variant?: string
    digest: string
    size: number
  }>
}

export interface RegistryConfig {
  url: string
  name: string
}

export interface HistoryLayer {
  created: string
  createdBy: string
  size: number
  emptyLayer: boolean
  comment?: string
}
