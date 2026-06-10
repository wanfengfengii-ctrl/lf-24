export interface HistoricalPeriod {
  id: string
  name: string
  startYear: number
  endYear: number
  description: string
  color: string
}

export interface LayerVersion {
  periodId: string | null
  objects: FabricObjectData[]
  materialDescription: string
  deductionBasis: string
  confidence: number
}

export interface LayerHistoricalInfo {
  periodId: string | null
  materialDescription: string
  deductionBasis: string
  confidence: number
}

export interface Layer {
  id: string
  name: string
  type: 'background' | 'pattern' | 'outline' | 'repair'
  visible: boolean
  opacity: number
  objects: FabricObjectData[]
  zIndex: number
  historicalInfo: LayerHistoricalInfo
  versions: LayerVersion[]
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
  historicalPeriods: HistoricalPeriod[]
  selectedPeriodIds: string[]
  diseases: DiseaseAnnotation[]
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

export interface PeriodColorStat {
  periodId: string
  periodName: string
  stats: ColorAreaStat[]
  totalArea: number
}

export interface RestorationReport {
  solutionName: string
  generatedAt: number
  periods: Array<{
    period: HistoricalPeriod
    layers: Array<{
      layer: Layer
      colorStats: ColorAreaStat[]
      totalArea: number
    }>
    totalColorStats: ColorAreaStat[]
    totalArea: number
  }>
  overallStats: ColorAreaStat[]
  overallTotalArea: number
}

export type DiseaseType = 'fading' | 'peeling' | 'crack' | 'stain' | 'other'

export type DiseaseSeverity = 'mild' | 'moderate' | 'severe'

export interface DiseasePoint {
  x: number
  y: number
}

export interface DiseaseAnnotation {
  id: string
  name: string
  type: DiseaseType
  severity: DiseaseSeverity
  description: string
  discoveredAt: number
  treatmentSuggestion: string
  shapeType: 'rect' | 'polygon' | 'freehand'
  points: DiseasePoint[]
  boundingBox: {
    left: number
    top: number
    width: number
    height: number
  }
  area: number
  color: string
}

export interface DiseaseTypeStat {
  type: DiseaseType
  typeName: string
  count: number
  totalArea: number
  percentage: number
  color: string
}

export interface DiseaseSeverityStat {
  severity: DiseaseSeverity
  severityName: string
  count: number
  totalArea: number
  percentage: number
}

export interface DiseaseReport {
  solutionName: string
  generatedAt: number
  totalDiseases: number
  totalArea: number
  typeStats: DiseaseTypeStat[]
  severityStats: DiseaseSeverityStat[]
  diseases: DiseaseAnnotation[]
}

export const DISEASE_TYPE_LABELS: Record<DiseaseType, string> = {
  fading: '褪色',
  peeling: '剥落',
  crack: '裂缝',
  stain: '污损',
  other: '其他'
}

export const DISEASE_TYPE_COLORS: Record<DiseaseType, string> = {
  fading: '#f59e0b',
  peeling: '#ef4444',
  crack: '#8b5cf6',
  stain: '#6b7280',
  other: '#10b981'
}

export const DISEASE_SEVERITY_LABELS: Record<DiseaseSeverity, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重'
}

export const DISEASE_SEVERITY_COLORS: Record<DiseaseSeverity, string> = {
  mild: '#22c55e',
  moderate: '#f59e0b',
  severe: '#ef4444'
}

export const DEFAULT_HISTORICAL_PERIODS: Omit<HistoricalPeriod, 'id'>[] = [
  {
    name: '唐代',
    startYear: 618,
    endYear: 907,
    description: '唐代建筑彩画以朱砂红、石绿、石青为主，色彩鲜艳浓烈',
    color: '#c41e3a'
  },
  {
    name: '宋代',
    startYear: 960,
    endYear: 1279,
    description: '宋代彩画渐趋淡雅，青绿叠晕成为主流，讲究层次与韵律',
    color: '#2e8b57'
  },
  {
    name: '明代',
    startYear: 1368,
    endYear: 1644,
    description: '明代彩画规制严谨，龙凤图案盛行，红金搭配富丽堂皇',
    color: '#daa520'
  },
  {
    name: '清代',
    startYear: 1644,
    endYear: 1912,
    description: '清代彩画工艺成熟，和玺、旋子、苏式三大类定型',
    color: '#4169e1'
  }
]
