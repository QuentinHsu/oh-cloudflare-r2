export interface BlobFile {
  pathname: string
  contentType: string
  size: number
  uploadedAt: string
}

export interface FilesResponse {
  folders: string[]
  files: BlobFile[]
  currentPath: string
}

export interface FolderNode {
  name: string
  path: string
  children: FolderNode[]
}
