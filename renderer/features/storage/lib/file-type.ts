import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  File,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  AppWindow
} from 'lucide-react'

export type FileCategory =
  | 'videos'
  | 'images'
  | 'documents'
  | 'archives'
  | 'executables'
  | 'other'

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  videos: 'Videos',
  images: 'Images',
  documents: 'Documents',
  archives: 'Archives',
  executables: 'Executables',
  other: 'Other'
}

const EXTENSION_MAP: Record<string, FileCategory> = {
  mp4: 'videos',
  mkv: 'videos',
  avi: 'videos',
  mov: 'videos',
  wmv: 'videos',
  webm: 'videos',
  m4v: 'videos',
  jpg: 'images',
  jpeg: 'images',
  png: 'images',
  gif: 'images',
  webp: 'images',
  bmp: 'images',
  svg: 'images',
  heic: 'images',
  pdf: 'documents',
  doc: 'documents',
  docx: 'documents',
  xls: 'documents',
  xlsx: 'documents',
  ppt: 'documents',
  pptx: 'documents',
  txt: 'documents',
  rtf: 'documents',
  md: 'documents',
  csv: 'documents',
  zip: 'archives',
  rar: 'archives',
  '7z': 'archives',
  tar: 'archives',
  gz: 'archives',
  bz2: 'archives',
  exe: 'executables',
  msi: 'executables',
  app: 'executables',
  dmg: 'executables',
  bat: 'executables',
  cmd: 'executables',
  sh: 'executables',
  js: 'other',
  ts: 'other',
  json: 'other'
}

export function getExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName
  const idx = base.lastIndexOf('.')
  if (idx <= 0 || idx === base.length - 1) return ''
  return base.slice(idx + 1).toLowerCase()
}

export function getFileCategory(fileName: string): FileCategory {
  const ext = getExtension(fileName)
  if (!ext) return 'other'
  return EXTENSION_MAP[ext] ?? 'other'
}

export function getFileTypeIcon(fileName: string): LucideIcon {
  const category = getFileCategory(fileName)
  switch (category) {
    case 'videos':
      return FileVideo
    case 'images':
      return FileImage
    case 'documents':
      return FileText
    case 'archives':
      return Archive
    case 'executables':
      return AppWindow
    default: {
      const ext = getExtension(fileName)
      if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cs'].includes(ext)) return FileCode
      return File
    }
  }
}

export const FILE_CATEGORY_CHIPS: FileCategory[] = [
  'videos',
  'images',
  'documents',
  'archives',
  'executables',
  'other'
]
