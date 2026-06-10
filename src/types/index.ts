export interface Layer {
  id: string
  name: string
  type: 'background' | 'pattern' | 'outline' | 'repair'
  visible: boolean
  opacity: number
  objects: FabricObjectData[]
  zIndex: number
}

export interface FabricObjectData {
  type: string
  [key: string]: any
}

export interface Solution {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  lineArt: string | null
  layers: Layer[]
  canvasWidth: number
  canvasHeight: number
}

export interface ColorAreaStat {
  color: string
  area: number
  percentage: number
}

export type LayerType = 'background' | 'pattern' | 'outline' | 'repair'

export const LAYER_TYPE_LABELS: Record<LayerType, string> = {
  background: '底色层',
  pattern: '纹样层',
  outline: '描边层',
  repair: '修补层'
}

export const LAYER_TYPE_COLORS: Record<LayerType, string> = {
  background: '#e8c39e',
  pattern: '#c9a0dc',
  outline: '#2c3e50',
  repair: '#a8d8ea'
}
