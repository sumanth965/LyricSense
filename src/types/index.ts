export type Theme = 'dark' | 'light'

export type ViewState = 'home' | 'workspace'

export interface CarouselSlideData {
  id: number
  title: string
  subtitle: string
  description: string
  category: string
  badge: string
}

export interface AudioMetadata {
  file: File
  name: string
  size: number
  formattedSize: string
  format: string
  duration: number
  objectUrl: string
}
