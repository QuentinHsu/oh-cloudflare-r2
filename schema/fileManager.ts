export interface BlobInfo {
  pathname: string
  contentType: string
  size: number
  uploadedAt: string
  customMetadata: Record<string, unknown>
}

export interface FileManagerState {
  currentPath: string
  blobs: BlobInfo[]
  folders: string[]
  hasMore: boolean
}

export interface TreeNode {
  name: string
  isFolder: boolean
  children?: TreeNode[]
}
