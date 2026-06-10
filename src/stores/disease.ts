import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  DiseaseAnnotation,
  DiseaseType,
  DiseaseSeverity,
  DiseaseTypeStat,
  DiseaseSeverityStat,
  DiseaseReport,
  DiseaseStage,
  DiseaseStageRecord,
  DiseaseStageStat,
  TreatmentStatus,
  TreatmentStatusStat,
  DiseaseLedgerItem,
  DiseaseRecheckReport
} from '../types'
import {
  DISEASE_TYPE_LABELS,
  DISEASE_TYPE_COLORS,
  DISEASE_SEVERITY_LABELS,
  DISEASE_SEVERITY_COLORS,
  DISEASE_STAGE_LABELS,
  DISEASE_STAGE_COLORS,
  DISEASE_STAGE_ORDER,
  TREATMENT_STATUS_LABELS,
  TREATMENT_STATUS_COLORS
} from '../types'
import { useSolutionStore } from './solution'
import { useWorkspaceStore } from './workspace'

export const useDiseaseStore = defineStore('disease', () => {
  const solutionStore = useSolutionStore()
  const workspaceStore = useWorkspaceStore()

  const diseases = computed(() => solutionStore.diseases)
  const visibleDiseases = computed(() => solutionStore.visibleDiseases)
  const filteredDiseases = computed(() => solutionStore.filteredDiseases)
  const selectedDiseaseId = computed(() => workspaceStore.selectedDiseaseId)
  const selectedDisease = computed(() => solutionStore.selectedDisease)
  const filterType = computed(() => workspaceStore.filterType)
  const filterSeverity = computed(() => workspaceStore.filterSeverity)
  const filterStage = computed(() => workspaceStore.filterStage)
  const filterTreatmentStatus = computed(() => workspaceStore.filterTreatmentStatus)
  const diseaseVisible = computed(() => workspaceStore.diseaseVisible)
  const isDrawingDisease = computed(() => workspaceStore.isDrawingDisease)
  const drawingShapeType = computed(() => workspaceStore.drawingShapeType)
  const drawingPoints = computed(() => workspaceStore.drawingPoints)

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

  const diseaseStageStats = computed((): DiseaseStageStat[] => {
    const stats = new Map<DiseaseStage, { count: number; totalArea: number }>()

    DISEASE_STAGE_ORDER.forEach(stage => {
      stats.set(stage, { count: 0, totalArea: 0 })
    })

    for (const disease of visibleDiseases.value) {
      const stat = stats.get(disease.currentStage)
      if (stat) {
        stat.count++
        stat.totalArea += disease.area
      }
    }

    const totalCount = visibleDiseases.value.length

    return DISEASE_STAGE_ORDER.map(stage => {
      const stat = stats.get(stage)!
      return {
        stage,
        stageName: DISEASE_STAGE_LABELS[stage],
        count: stat.count,
        totalArea: Math.round(stat.totalArea),
        percentage: totalCount > 0 ? Math.round((stat.count / totalCount) * 10000) / 100 : 0,
        color: DISEASE_STAGE_COLORS[stage]
      }
    })
  })

  const treatmentStatusStats = computed((): TreatmentStatusStat[] => {
    const stats = new Map<TreatmentStatus, number>()
    const statuses: TreatmentStatus[] = ['pending', 'processing', 'completed', 'closed']

    statuses.forEach(status => {
      stats.set(status, 0)
    })

    for (const disease of visibleDiseases.value) {
      const count = stats.get(disease.treatmentStatus)
      if (count !== undefined) {
        stats.set(disease.treatmentStatus, count + 1)
      }
    }

    const totalCount = visibleDiseases.value.length

    return statuses.map(status => {
      const count = stats.get(status)!
      return {
        status,
        statusName: TREATMENT_STATUS_LABELS[status],
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 10000) / 100 : 0,
        color: TREATMENT_STATUS_COLORS[status]
      }
    })
  })

  const initialTotalArea = computed(() => {
    let total = 0
    for (const disease of visibleDiseases.value) {
      const initialRecord = disease.stageRecords.find(r => r.stage === 'initial')
      if (initialRecord?.area) {
        total += initialRecord.area
      } else {
        total += disease.area
      }
    }
    return Math.round(total)
  })

  const areaChangeRate = computed(() => {
    const initial = initialTotalArea.value
    const current = totalDiseaseArea.value
    if (initial === 0) return 0
    return Math.round(((current - initial) / initial) * 10000) / 100
  })

  function addDisease(data: {
    name?: string
    types?: DiseaseType[]
    primaryType: DiseaseType
    severity: DiseaseSeverity
    description?: string
    treatmentSuggestion?: string
    shapeType: 'rect' | 'polygon' | 'freehand'
    points: { x: number; y: number }[]
  }): DiseaseAnnotation | null {
    return solutionStore.addDisease(data)
  }

  function updateDisease(diseaseId: string, updates: Partial<Omit<DiseaseAnnotation, 'id' | 'area' | 'boundingBox'>>): boolean {
    return solutionStore.updateDisease(diseaseId, updates)
  }

  function deleteDisease(diseaseId: string): boolean {
    return solutionStore.deleteDisease(diseaseId)
  }

  function toggleDiseaseVisible(diseaseId: string): boolean {
    return solutionStore.toggleDiseaseVisible(diseaseId)
  }

  function setAllDiseasesVisible(visible: boolean): boolean {
    workspaceStore.setDiseaseVisible(visible)
    return solutionStore.setAllDiseasesVisible(visible)
  }

  function selectDisease(diseaseId: string | null) {
    workspaceStore.selectDisease(diseaseId)
  }

  function setFilterType(type: DiseaseType | 'all') {
    workspaceStore.setFilterType(type)
  }

  function setFilterSeverity(severity: DiseaseSeverity | 'all') {
    workspaceStore.setFilterSeverity(severity)
  }

  function setDiseaseVisible(visible: boolean) {
    workspaceStore.setDiseaseVisible(visible)
    solutionStore.setAllDiseasesVisible(visible)
  }

  function startDrawing(shapeType: 'rect' | 'polygon' | 'freehand') {
    workspaceStore.startDrawingDisease(shapeType)
  }

  function addDrawingPoint(point: { x: number; y: number }) {
    workspaceStore.addDrawingPoint(point)
  }

  function finishDrawing(primaryType: DiseaseType, severity: DiseaseSeverity, customPoints?: { x: number; y: number }[], types?: DiseaseType[]): DiseaseAnnotation | null {
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

    workspaceStore.cancelDrawingDisease()

    return disease
  }

  function cancelDrawing() {
    workspaceStore.cancelDrawingDisease()
  }

  function addStageRecord(diseaseId: string, data: {
    stage: DiseaseStage
    inspectorName: string
    inspectTime?: number
    photos?: any[]
    conclusion: string
    treatmentOpinion: string
    area?: number
    severity?: DiseaseSeverity
    notes?: string
  }): DiseaseStageRecord | null {
    return solutionStore.addStageRecord(diseaseId, data)
  }

  function updateStageRecord(diseaseId: string, recordId: string, updates: Partial<Omit<DiseaseStageRecord, 'id' | 'stage'>>): boolean {
    return solutionStore.updateStageRecord(diseaseId, recordId, updates)
  }

  function deleteStageRecord(diseaseId: string, recordId: string): boolean {
    return solutionStore.deleteStageRecord(diseaseId, recordId)
  }

  function setDiseaseStage(diseaseId: string, stage: DiseaseStage): boolean {
    return solutionStore.setDiseaseStage(diseaseId, stage)
  }

  function setTreatmentStatus(diseaseId: string, status: TreatmentStatus): boolean {
    return solutionStore.setTreatmentStatus(diseaseId, status)
  }

  function getStageRecords(diseaseId: string, stage?: DiseaseStage): DiseaseStageRecord[] {
    const disease = diseases.value.find(d => d.id === diseaseId)
    if (!disease) return []

    let records = [...disease.stageRecords]

    if (stage) {
      records = records.filter(r => r.stage === stage)
    }

    return records.sort((a, b) => b.inspectTime - a.inspectTime)
  }

  function getLatestStageRecord(diseaseId: string, stage?: DiseaseStage): DiseaseStageRecord | null {
    const records = getStageRecords(diseaseId, stage)
    return records.length > 0 ? records[0] : null
  }

  function getAreaComparison(diseaseId: string): { initialArea: number; currentArea: number; change: number; changeRate: number } | null {
    return solutionStore.getAreaComparison(diseaseId)
  }

  function setFilterStage(stage: DiseaseStage | 'all') {
    workspaceStore.setFilterStage(stage)
  }

  function setFilterTreatmentStatus(status: TreatmentStatus | 'all') {
    workspaceStore.setFilterTreatmentStatus(status)
  }

  function generateRecheckReport(): DiseaseRecheckReport | null {
    if (!solutionStore.currentSolution) return null

    const ledger: DiseaseLedgerItem[] = visibleDiseases.value.map(d => {
      const initialRecord = d.stageRecords.find(r => r.stage === 'initial')
      const latestRecord = d.stageRecords.length > 0
        ? d.stageRecords.reduce((latest, r) => r.inspectTime > latest.inspectTime ? r : latest)
        : null

      return {
        id: d.id,
        name: d.name,
        types: d.types,
        primaryType: d.primaryType,
        severity: d.severity,
        area: d.area,
        currentStage: d.currentStage,
        treatmentStatus: d.treatmentStatus,
        discoveredAt: d.discoveredAt,
        initialInspector: initialRecord?.inspectorName || '',
        lastInspectTime: latestRecord?.inspectTime || d.discoveredAt,
        stageCount: d.stageRecords.length
      }
    })

    return {
      solutionName: solutionStore.currentSolution.name,
      generatedAt: Date.now(),
      totalDiseases: visibleDiseases.value.length,
      stageStats: diseaseStageStats.value,
      treatmentStatusStats: treatmentStatusStats.value,
      areaComparison: {
        initialTotalArea: initialTotalArea.value,
        currentTotalArea: Math.round(totalDiseaseArea.value),
        areaChange: Math.round(totalDiseaseArea.value) - initialTotalArea.value,
        areaChangeRate: areaChangeRate.value
      },
      ledger
    }
  }

  function exportRecheckReport(): string | null {
    const report = generateRecheckReport()
    if (!report) return null
    return JSON.stringify(report, null, 2)
  }

  function exportDiseaseLedgerAsText(): string | null {
    if (!solutionStore.currentSolution) return null

    const report = generateRecheckReport()
    if (!report) return null

    let text = `病害处置台账\n`
    text += `==============\n\n`
    text += `方案名称: ${report.solutionName}\n`
    text += `生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}\n`
    text += `病害总数: ${report.totalDiseases} 处\n\n`

    text += `一、各阶段统计\n`
    text += `--------------\n`
    for (const stat of report.stageStats) {
      text += `${stat.stageName}: ${stat.count} 处 (${stat.percentage}%)\n`
    }

    text += `\n二、处置状态统计\n`
    text += `----------------\n`
    for (const stat of report.treatmentStatusStats) {
      text += `${stat.statusName}: ${stat.count} 处 (${stat.percentage}%)\n`
    }

    text += `\n三、面积变化对比\n`
    text += `----------------\n`
    text += `初检总面积: ${report.areaComparison.initialTotalArea} 像素\n`
    text += `当前总面积: ${report.areaComparison.currentTotalArea} 像素\n`
    text += `面积变化: ${report.areaComparison.areaChange >= 0 ? '+' : ''}${report.areaComparison.areaChange} 像素 (${report.areaComparison.areaChangeRate >= 0 ? '+' : ''}${report.areaComparison.areaChangeRate}%)\n`

    text += `\n四、病害处置台账明细\n`
    text += `--------------------\n`
    report.ledger.forEach((item, index) => {
      text += `\n${index + 1}. ${item.name}\n`
      text += `   类型: ${item.types.map(t => DISEASE_TYPE_LABELS[t]).join('、')}\n`
      text += `   严重程度: ${DISEASE_SEVERITY_LABELS[item.severity]}\n`
      text += `   当前阶段: ${DISEASE_STAGE_LABELS[item.currentStage]}\n`
      text += `   处置状态: ${TREATMENT_STATUS_LABELS[item.treatmentStatus]}\n`
      text += `   面积: ${item.area} 像素\n`
      text += `   发现时间: ${new Date(item.discoveredAt).toLocaleString('zh-CN')}\n`
      text += `   初检人: ${item.initialInspector || '未填写'}\n`
      text += `   最近检查时间: ${new Date(item.lastInspectTime).toLocaleString('zh-CN')}\n`
      text += `   检查记录数: ${item.stageCount} 次\n`
    })

    return text
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
    return solutionStore.clearAllDiseases()
  }

  return {
    selectedDiseaseId,
    filterType,
    filterSeverity,
    filterStage,
    filterTreatmentStatus,
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
    diseaseStageStats,
    treatmentStatusStats,
    initialTotalArea,
    areaChangeRate,
    addDisease,
    updateDisease,
    deleteDisease,
    toggleDiseaseVisible,
    setAllDiseasesVisible,
    selectDisease,
    setFilterType,
    setFilterSeverity,
    setFilterStage,
    setFilterTreatmentStatus,
    setDiseaseVisible,
    startDrawing,
    addDrawingPoint,
    finishDrawing,
    cancelDrawing,
    addStageRecord,
    updateStageRecord,
    deleteStageRecord,
    setDiseaseStage,
    setTreatmentStatus,
    getStageRecords,
    getLatestStageRecord,
    getAreaComparison,
    generateDiseaseReport,
    exportDiseaseReport,
    exportDiseaseListAsText,
    generateRecheckReport,
    exportRecheckReport,
    exportDiseaseLedgerAsText,
    clearAllDiseases
  }
})
