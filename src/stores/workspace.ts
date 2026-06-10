import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DiseaseType, DiseaseSeverity, DiseaseStage, TreatmentStatus, DiseasePoint } from '../types'

export type WorkspaceMode = 'normal' | 'history' | 'disease'

export type DrawingTool = 'select' | 'brush' | 'rect' | 'circle' | 'polygon' | 'eraser'

export const useWorkspaceStore = defineStore('workspace', () => {
  const mode = ref<WorkspaceMode>('normal')

  const currentSolutionId = ref<string | null>(null)
  const activeLayerId = ref<string | null>(null)
  const activePeriodId = ref<string | null>(null)
  const compareSolutionIds = ref<string[]>([])

  const selectedDiseaseId = ref<string | null>(null)
  const filterType = ref<DiseaseType | 'all'>('all')
  const filterSeverity = ref<DiseaseSeverity | 'all'>('all')
  const filterStage = ref<DiseaseStage | 'all'>('all')
  const filterTreatmentStatus = ref<TreatmentStatus | 'all'>('all')
  const diseaseVisible = ref(true)

  const isDrawingDisease = ref(false)
  const drawingShapeType = ref<'rect' | 'polygon' | 'freehand'>('rect')
  const drawingPoints = ref<DiseasePoint[]>([])

  const currentTool = ref<DrawingTool>('select')
  const currentColor = ref('#3b82f6')
  const brushWidth = ref(10)

  const diseaseDrawingType = ref<DiseaseType>('fading')
  const diseaseDrawingSeverity = ref<DiseaseSeverity>(3)

  const isDiseaseMode = computed(() => mode.value === 'disease')
  const isHistoryMode = computed(() => mode.value === 'history')
  const isNormalMode = computed(() => mode.value === 'normal')

  const canvasRenderKey = computed(() => ({
    mode: mode.value,
    activeLayerId: activeLayerId.value,
    activePeriodId: activePeriodId.value,
    currentTool: currentTool.value,
    diseaseVisible: diseaseVisible.value,
    selectedDiseaseId: selectedDiseaseId.value,
    filterType: filterType.value,
    filterSeverity: filterSeverity.value,
    isDrawingDisease: isDrawingDisease.value,
    drawingShapeType: drawingShapeType.value,
    diseaseDrawingType: diseaseDrawingType.value,
    diseaseDrawingSeverity: diseaseDrawingSeverity.value,
  }))

  const diseaseRenderKey = computed(() => ({
    diseaseVisible: diseaseVisible.value,
    selectedDiseaseId: selectedDiseaseId.value,
    filterType: filterType.value,
    filterSeverity: filterSeverity.value,
    filterStage: filterStage.value,
    filterTreatmentStatus: filterTreatmentStatus.value,
  }))

  function setMode(newMode: WorkspaceMode) {
    mode.value = newMode
  }

  function toggleDiseaseMode() {
    if (mode.value === 'disease') {
      mode.value = 'normal'
      isDrawingDisease.value = false
      drawingPoints.value = []
      selectedDiseaseId.value = null
    } else {
      mode.value = 'disease'
      diseaseVisible.value = true
    }
  }

  function toggleHistoryMode() {
    mode.value = mode.value === 'history' ? 'normal' : 'history'
  }

  function setCurrentSolutionId(id: string | null) {
    currentSolutionId.value = id
  }

  function setActiveLayer(id: string | null) {
    activeLayerId.value = id
  }

  function setActivePeriod(id: string | null) {
    activePeriodId.value = id
  }

  function toggleCompare(solutionId: string) {
    const index = compareSolutionIds.value.indexOf(solutionId)
    if (index === -1) {
      if (compareSolutionIds.value.length < 4) {
        compareSolutionIds.value.push(solutionId)
      }
    } else {
      compareSolutionIds.value.splice(index, 1)
    }
  }

  function clearCompare() {
    compareSolutionIds.value = []
  }

  function selectDisease(id: string | null) {
    selectedDiseaseId.value = id
  }

  function setFilterType(type: DiseaseType | 'all') {
    filterType.value = type
  }

  function setFilterSeverity(severity: DiseaseSeverity | 'all') {
    filterSeverity.value = severity
  }

  function setFilterStage(stage: DiseaseStage | 'all') {
    filterStage.value = stage
  }

  function setFilterTreatmentStatus(status: TreatmentStatus | 'all') {
    filterTreatmentStatus.value = status
  }

  function setDiseaseVisible(visible: boolean) {
    diseaseVisible.value = visible
  }

  function startDrawingDisease(shapeType: 'rect' | 'polygon' | 'freehand') {
    isDrawingDisease.value = true
    drawingShapeType.value = shapeType
    drawingPoints.value = []
  }

  function addDrawingPoint(point: DiseasePoint) {
    drawingPoints.value.push(point)
  }

  function cancelDrawingDisease() {
    isDrawingDisease.value = false
    drawingPoints.value = []
  }

  function finishDrawingDisease() {
    isDrawingDisease.value = false
    const points = [...drawingPoints.value]
    drawingPoints.value = []
    return {
      shapeType: drawingShapeType.value,
      points,
      type: diseaseDrawingType.value,
      severity: diseaseDrawingSeverity.value
    }
  }

  function setTool(tool: DrawingTool) {
    currentTool.value = tool
  }

  function setColor(color: string) {
    currentColor.value = color
  }

  function setBrushWidth(width: number) {
    brushWidth.value = width
  }

  function setDiseaseDrawingType(type: DiseaseType) {
    diseaseDrawingType.value = type
  }

  function setDiseaseDrawingSeverity(severity: DiseaseSeverity) {
    diseaseDrawingSeverity.value = severity
  }

  return {
    mode,
    currentSolutionId,
    activeLayerId,
    activePeriodId,
    compareSolutionIds,
    selectedDiseaseId,
    filterType,
    filterSeverity,
    filterStage,
    filterTreatmentStatus,
    diseaseVisible,
    isDrawingDisease,
    drawingShapeType,
    drawingPoints,
    currentTool,
    currentColor,
    brushWidth,
    diseaseDrawingType,
    diseaseDrawingSeverity,
    isDiseaseMode,
    isHistoryMode,
    isNormalMode,
    canvasRenderKey,
    diseaseRenderKey,
    setMode,
    toggleDiseaseMode,
    toggleHistoryMode,
    setCurrentSolutionId,
    setActiveLayer,
    setActivePeriod,
    toggleCompare,
    clearCompare,
    selectDisease,
    setFilterType,
    setFilterSeverity,
    setFilterStage,
    setFilterTreatmentStatus,
    setDiseaseVisible,
    startDrawingDisease,
    addDrawingPoint,
    cancelDrawingDisease,
    finishDrawingDisease,
    setTool,
    setColor,
    setBrushWidth,
    setDiseaseDrawingType,
    setDiseaseDrawingSeverity
  }
})
