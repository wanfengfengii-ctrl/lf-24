import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DiseaseAnnotation,
  DiseaseType,
  DiseaseSeverity,
  DiseasePoint,
  DiseaseTypeStat,
  DiseaseSeverityStat,
  DiseaseReport
} from '../types'
import {
  DISEASE_TYPE_LABELS,
  DISEASE_TYPE_COLORS,
  DISEASE_SEVERITY_LABELS,
  DISEASE_SEVERITY_COLORS
} from '../types'
import { useSolutionStore } from './solution'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function calculatePolygonArea(points: DiseasePoint[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

function calculateBoundingBox(points: DiseasePoint[]): { left: number; top: number; width: number; height: number } {
  if (points.length === 0) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }
  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function calculateArea(shapeType: DiseaseAnnotation['shapeType'], points: DiseasePoint[]): number {
  if (shapeType === 'rect' && points.length >= 2) {
    const width = Math.abs(points[1].x - points[0].x)
    const height = Math.abs(points[1].y - points[0].y)
    return width * height
  }
  return calculatePolygonArea(points)
}

export const useDiseaseStore = defineStore('disease', () => {
  const solutionStore = useSolutionStore()

  const selectedDiseaseId = ref<string | null>(null)
  const filterType = ref<DiseaseType | 'all'>('all')
  const filterSeverity = ref<DiseaseSeverity | 'all'>('all')
  const isDrawingDisease = ref(false)
  const drawingShapeType = ref<'rect' | 'polygon' | 'freehand'>('rect')
  const drawingPoints = ref<DiseasePoint[]>([])
  const diseaseVisible = ref(true)

  const diseases = computed(() => {
    return solutionStore.currentSolution?.diseases || []
  })

  const visibleDiseases = computed(() => {
    return diseases.value.filter(d => d.visible)
  })

  const filteredDiseases = computed(() => {
    return visibleDiseases.value.filter(d => {
      if (filterType.value !== 'all' && !d.types.includes(filterType.value)) return false
      if (filterSeverity.value !== 'all' && d.severity !== filterSeverity.value) return false
      return true
    })
  })

  const selectedDisease = computed(() => {
    return diseases.value.find(d => d.id === selectedDiseaseId.value) || null
  })

  const totalDiseaseArea = computed(() => {
    return visibleDiseases.value.reduce((sum, d) => sum + d.area, 0)
  })

  const diseaseTypeStats = computed((): DiseaseTypeStat[] => {
    const stats = new Map<DiseaseType, { count: number; totalArea: number }>()
    const types: DiseaseType[] = ['fading', 'peeling', 'crack', 'stain', 'other']

    types.forEach(type => {
      stats.set(type, { count: 0, totalArea: 0 })
    })

    for (const disease of visibleDiseases.value) {
      for (const type of disease.types) {
        const stat = stats.get(type)
        if (stat) {
          stat.count++
          stat.totalArea += disease.area
        }
      }
    }

    const typeTotalArea = Array.from(stats.values()).reduce((sum, s) => sum + s.totalArea, 0)

    return types.map(type => {
      const stat = stats.get(type)!
      return {
        type,
        typeName: DISEASE_TYPE_LABELS[type],
        count: stat.count,
        totalArea: Math.round(stat.totalArea),
        percentage: typeTotalArea > 0 ? Math.round((stat.totalArea / typeTotalArea) * 10000) / 100 : 0,
        color: DISEASE_TYPE_COLORS[type]
      }
    })
  })

  const diseaseSeverityStats = computed((): DiseaseSeverityStat[] => {
    const stats = new Map<DiseaseSeverity, { count: number; totalArea: number }>()
    const severities: DiseaseSeverity[] = [1, 2, 3, 4, 5]

    severities.forEach(severity => {
      stats.set(severity, { count: 0, totalArea: 0 })
    })

    for (const disease of visibleDiseases.value) {
      const stat = stats.get(disease.severity)
      if (stat) {
        stat.count++
        stat.totalArea += disease.area
      }
    }

    const totalArea = totalDiseaseArea.value

    return severities.map(severity => {
      const stat = stats.get(severity)!
      return {
        severity,
        severityName: DISEASE_SEVERITY_LABELS[severity],
        count: stat.count,
        totalArea: Math.round(stat.totalArea),
        percentage: totalArea > 0 ? Math.round((stat.totalArea / totalArea) * 10000) / 100 : 0,
        color: DISEASE_SEVERITY_COLORS[severity]
      }
    })
  })

  function addDisease(data: {
    name?: string
    types?: DiseaseType[]
    primaryType: DiseaseType
    severity: DiseaseSeverity
    description?: string
    treatmentSuggestion?: string
    shapeType: 'rect' | 'polygon' | 'freehand'
    points: DiseasePoint[]
  }): DiseaseAnnotation | null {
    if (!solutionStore.currentSolution) return null

    const area = calculateArea(data.shapeType, data.points)
    const boundingBox = calculateBoundingBox(data.points)
    const types = data.types && data.types.length > 0 ? data.types : [data.primaryType]

    const disease: DiseaseAnnotation = {
      id: generateId(),
      name: data.name || `${DISEASE_TYPE_LABELS[data.primaryType]} ${diseases.value.length + 1}`,
      types,
      primaryType: data.primaryType,
      severity: data.severity,
      description: data.description || '',
      discoveredAt: Date.now(),
      treatmentSuggestion: data.treatmentSuggestion || '',
      shapeType: data.shapeType,
      points: data.points,
      boundingBox,
      area: Math.round(area),
      color: DISEASE_TYPE_COLORS[data.primaryType],
      visible: true
    }

    solutionStore.currentSolution.diseases.push(disease)
    selectedDiseaseId.value = disease.id
    solutionStore.currentSolution.updatedAt = Date.now()

    return disease
  }

  function updateDisease(diseaseId: string, updates: Partial<Omit<DiseaseAnnotation, 'id' | 'area' | 'boundingBox'>>): boolean {
    const disease = diseases.value.find(d => d.id === diseaseId)
    if (!disease) return false

    Object.assign(disease, updates)

    if (updates.points || updates.shapeType) {
      const shapeType = updates.shapeType || disease.shapeType
      const points = updates.points || disease.points
      disease.area = Math.round(calculateArea(shapeType, points))
      disease.boundingBox = calculateBoundingBox(points)
    }

    if (updates.primaryType) {
      disease.color = DISEASE_TYPE_COLORS[updates.primaryType]
    }

    if (updates.types && updates.types.length > 0 && !updates.primaryType) {
      if (!updates.types.includes(disease.primaryType)) {
        disease.primaryType = updates.types[0]
        disease.color = DISEASE_TYPE_COLORS[updates.types[0]]
      }
    }

    if (solutionStore.currentSolution) {
      solutionStore.currentSolution.updatedAt = Date.now()
    }

    return true
  }

  function deleteDisease(diseaseId: string): boolean {
    if (!solutionStore.currentSolution) return false

    const index = solutionStore.currentSolution.diseases.findIndex(d => d.id === diseaseId)
    if (index === -1) return false

    solutionStore.currentSolution.diseases.splice(index, 1)

    if (selectedDiseaseId.value === diseaseId) {
      selectedDiseaseId.value = null
    }

    solutionStore.currentSolution.updatedAt = Date.now()
    return true
  }

  function toggleDiseaseVisible(diseaseId: string): boolean {
    const disease = diseases.value.find(d => d.id === diseaseId)
    if (!disease) return false

    disease.visible = !disease.visible

    if (solutionStore.currentSolution) {
      solutionStore.currentSolution.updatedAt = Date.now()
    }

    return true
  }

  function setAllDiseasesVisible(visible: boolean): boolean {
    if (!solutionStore.currentSolution) return false

    for (const disease of solutionStore.currentSolution.diseases) {
      disease.visible = visible
    }

    if (solutionStore.currentSolution) {
      solutionStore.currentSolution.updatedAt = Date.now()
    }

    return true
  }

  function selectDisease(diseaseId: string | null) {
    selectedDiseaseId.value = diseaseId
  }

  function setFilterType(type: DiseaseType | 'all') {
    filterType.value = type
  }

  function setFilterSeverity(severity: DiseaseSeverity | 'all') {
    filterSeverity.value = severity
  }

  function setDiseaseVisible(visible: boolean) {
    diseaseVisible.value = visible
    setAllDiseasesVisible(visible)
  }

  function startDrawing(shapeType: 'rect' | 'polygon' | 'freehand') {
    isDrawingDisease.value = true
    drawingShapeType.value = shapeType
    drawingPoints.value = []
  }

  function addDrawingPoint(point: DiseasePoint) {
    drawingPoints.value.push(point)
  }

  function finishDrawing(primaryType: DiseaseType, severity: DiseaseSeverity, customPoints?: DiseasePoint[], types?: DiseaseType[]): DiseaseAnnotation | null {
    const points = customPoints || drawingPoints.value

    if (points.length < 2) {
      cancelDrawing()
      return null
    }

    const disease = addDisease({
      primaryType,
      types: types || [primaryType],
      severity,
      shapeType: drawingShapeType.value,
      points: [...points]
    })

    isDrawingDisease.value = false
    drawingPoints.value = []

    return disease
  }

  function cancelDrawing() {
    isDrawingDisease.value = false
    drawingPoints.value = []
  }

  function generateDiseaseReport(): DiseaseReport | null {
    if (!solutionStore.currentSolution) return null

    return {
      solutionName: solutionStore.currentSolution.name,
      generatedAt: Date.now(),
      totalDiseases: visibleDiseases.value.length,
      totalArea: Math.round(totalDiseaseArea.value),
      typeStats: diseaseTypeStats.value,
      severityStats: diseaseSeverityStats.value,
      diseases: JSON.parse(JSON.stringify(visibleDiseases.value))
    }
  }

  function exportDiseaseReport(): string | null {
    const report = generateDiseaseReport()
    if (!report) return null
    return JSON.stringify(report, null, 2)
  }

  function exportDiseaseListAsText(): string | null {
    if (!solutionStore.currentSolution) return null

    let text = `病害清单与修复建议报告\n`
    text += `========================\n\n`
    text += `方案名称: ${solutionStore.currentSolution.name}\n`
    text += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`
    text += `病害总数: ${visibleDiseases.value.length}\n`
    text += `病害总面积: ${Math.round(totalDiseaseArea.value)} 像素\n\n`

    text += `一、病害类型统计\n`
    text += `----------------\n`
    for (const stat of diseaseTypeStats.value) {
      text += `${stat.typeName}: ${stat.count} 处, 面积 ${stat.totalArea} 像素 (${stat.percentage}%)\n`
    }

    text += `\n二、病害严重程度统计\n`
    text += `--------------------\n`
    for (const stat of diseaseSeverityStats.value) {
      text += `${stat.severityName}: ${stat.count} 处, 面积 ${stat.totalArea} 像素 (${stat.percentage}%)\n`
    }

    text += `\n三、病害明细\n`
    text += `------------\n`
    visibleDiseases.value.forEach((d, index) => {
      text += `\n${index + 1}. ${d.name}\n`
      text += `   类型: ${d.types.map(t => DISEASE_TYPE_LABELS[t]).join('、')}\n`
      text += `   主类型: ${DISEASE_TYPE_LABELS[d.primaryType]}\n`
      text += `   严重程度: ${DISEASE_SEVERITY_LABELS[d.severity]}\n`
      text += `   发现时间: ${new Date(d.discoveredAt).toLocaleString('zh-CN')}\n`
      text += `   面积: ${d.area} 像素\n`
      text += `   说明: ${d.description || '无'}\n`
      text += `   修复建议: ${d.treatmentSuggestion || '待制定'}\n`
    })

    return text
  }

  function clearAllDiseases(): boolean {
    if (!solutionStore.currentSolution) return false
    solutionStore.currentSolution.diseases = []
    selectedDiseaseId.value = null
    solutionStore.currentSolution.updatedAt = Date.now()
    return true
  }

  return {
    selectedDiseaseId,
    filterType,
    filterSeverity,
    isDrawingDisease,
    drawingShapeType,
    drawingPoints,
    diseaseVisible,
    diseases,
    visibleDiseases,
    filteredDiseases,
    selectedDisease,
    totalDiseaseArea,
    diseaseTypeStats,
    diseaseSeverityStats,
    addDisease,
    updateDisease,
    deleteDisease,
    toggleDiseaseVisible,
    setAllDiseasesVisible,
    selectDisease,
    setFilterType,
    setFilterSeverity,
    setDiseaseVisible,
    startDrawing,
    addDrawingPoint,
    finishDrawing,
    cancelDrawing,
    generateDiseaseReport,
    exportDiseaseReport,
    exportDiseaseListAsText,
    clearAllDiseases
  }
})
