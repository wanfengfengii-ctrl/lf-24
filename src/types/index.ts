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

export type DiseaseSeverity = 1 | 2 | 3 | 4 | 5

export type DiseaseStage = 'initial' | 'recheck' | 'treatment' | 'reinspection'

export const DISEASE_STAGE_LABELS: Record<DiseaseStage, string> = {
  initial: '初检',
  recheck: '复查',
  treatment: '处置',
  reinspection: '复验'
}

export const DISEASE_STAGE_COLORS: Record<DiseaseStage, string> = {
  initial: '#1677ff',
  recheck: '#722ed1',
  treatment: '#fa8c16',
  reinspection: '#52c41a'
}

export const DISEASE_STAGE_ORDER: DiseaseStage[] = ['initial', 'recheck', 'treatment', 'reinspection']

export interface DiseasePhotoAttachment {
  id: string
  name: string
  url: string
  size: number
  uploadedAt: number
}

export interface DiseaseStageRecord {
  id: string
  stage: DiseaseStage
  inspectorName: string
  inspectTime: number
  photos: DiseasePhotoAttachment[]
  conclusion: string
  treatmentOpinion: string
  area?: number
  severity?: DiseaseSeverity
  notes?: string
}

export interface DiseasePoint {
  x: number
  y: number
}

export interface DiseaseAnnotation {
  id: string
  name: string
  types: DiseaseType[]
  primaryType: DiseaseType
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
  visible: boolean
  currentStage: DiseaseStage
  stageRecords: DiseaseStageRecord[]
  treatmentStatus: 'pending' | 'processing' | 'completed' | 'closed'
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
  color: string
}

export interface DiseaseStageStat {
  stage: DiseaseStage
  stageName: string
  count: number
  totalArea: number
  percentage: number
  color: string
}

export type TreatmentStatus = 'pending' | 'processing' | 'completed' | 'closed'

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  pending: '待处置',
  processing: '处置中',
  completed: '已完成',
  closed: '已闭环'
}

export const TREATMENT_STATUS_COLORS: Record<TreatmentStatus, string> = {
  pending: '#faad14',
  processing: '#1677ff',
  completed: '#52c41a',
  closed: '#8c8c8c'
}

export interface TreatmentStatusStat {
  status: TreatmentStatus
  statusName: string
  count: number
  percentage: number
  color: string
}

export interface DiseaseLedgerItem {
  id: string
  name: string
  types: DiseaseType[]
  primaryType: DiseaseType
  severity: DiseaseSeverity
  area: number
  currentStage: DiseaseStage
  treatmentStatus: TreatmentStatus
  discoveredAt: number
  initialInspector: string
  lastInspectTime: number
  stageCount: number
}

export interface DiseaseRecheckReport {
  solutionName: string
  generatedAt: number
  totalDiseases: number
  stageStats: DiseaseStageStat[]
  treatmentStatusStats: TreatmentStatusStat[]
  areaComparison: {
    initialTotalArea: number
    currentTotalArea: number
    areaChange: number
    areaChangeRate: number
  }
  ledger: DiseaseLedgerItem[]
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
  1: '1级 - 极轻微',
  2: '2级 - 轻微',
  3: '3级 - 中等',
  4: '4级 - 严重',
  5: '5级 - 极严重'
}

export const DISEASE_SEVERITY_SHORT_LABELS: Record<DiseaseSeverity, string> = {
  1: '极轻',
  2: '轻微',
  3: '中等',
  4: '严重',
  5: '极重'
}

export const DISEASE_SEVERITY_COLORS: Record<DiseaseSeverity, string> = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444'
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
