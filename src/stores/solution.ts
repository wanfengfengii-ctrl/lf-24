import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Solution, Layer, LayerType, ColorAreaStat, HistoricalPeriod, LayerHistoricalInfo, PeriodColorStat, RestorationReport } from '../types'
import { LAYER_TYPE_LABELS, DEFAULT_HISTORICAL_PERIODS } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export const useSolutionStore = defineStore('solution', () => {
  const solutions = ref<Solution[]>([])
  const currentSolutionId = ref<string | null>(null)
  const activeLayerId = ref<string | null>(null)
  const compareSolutionIds = ref<string[]>([])

  const currentSolution = computed(() => {
    return solutions.value.find(s => s.id === currentSolutionId.value) || null
  })

  const layers = computed(() => {
    return currentSolution.value?.layers || []
  })

  const activeLayer = computed(() => {
    return layers.value.find(l => l.id === activeLayerId.value) || null
  })

  const sortedLayers = computed(() => {
    return [...layers.value].sort((a, b) => a.zIndex - b.zIndex)
  })

  const visibleLayers = computed(() => {
    return sortedLayers.value.filter(l => l.visible)
  })

  function createNewSolution(name: string = '未命名方案'): Solution {
    const historicalPeriods: HistoricalPeriod[] = DEFAULT_HISTORICAL_PERIODS.map(p => ({
      ...p,
      id: generateId()
    }))

    const solution: Solution = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lineArt: null,
      layers: [],
      canvasWidth: 800,
      canvasHeight: 600,
      historicalPeriods,
      selectedPeriodIds: historicalPeriods.map(p => p.id)
    }
    solutions.value.push(solution)
    currentSolutionId.value = solution.id

    const defaultLayers: Array<{ type: LayerType; name: string }> = [
      { type: 'background', name: '底色层 1' },
      { type: 'pattern', name: '纹样层 1' },
      { type: 'outline', name: '描边层 1' }
    ]
    defaultLayers.forEach((layer, index) => {
      const newLayer: Layer = {
        id: generateId(),
        name: layer.name,
        type: layer.type,
        visible: true,
        opacity: 100,
        objects: [],
        zIndex: index,
        historicalInfo: {
          periodId: historicalPeriods[0]?.id || null,
          materialDescription: '',
          deductionBasis: '',
          confidence: 50
        }
      }
      solution.layers.push(newLayer)
    })

    if (solution.layers.length > 0) {
      const sorted = [...solution.layers].sort((a, b) => a.zIndex - b.zIndex)
      activeLayerId.value = sorted[sorted.length - 1].id
    }

    return solution
  }

  function switchSolution(solutionId: string) {
    const solution = solutions.value.find(s => s.id === solutionId)
    if (solution) {
      currentSolutionId.value = solutionId
      if (solution.layers.length > 0) {
        const sorted = [...solution.layers].sort((a, b) => a.zIndex - b.zIndex)
        activeLayerId.value = sorted[sorted.length - 1].id
      } else {
        activeLayerId.value = null
      }
    }
  }

  function deleteSolution(solutionId: string) {
    const index = solutions.value.findIndex(s => s.id === solutionId)
    if (index !== -1) {
      solutions.value.splice(index, 1)
      if (currentSolutionId.value === solutionId) {
        currentSolutionId.value = solutions.value.length > 0 ? solutions.value[0].id : null
      }
      compareSolutionIds.value = compareSolutionIds.value.filter(id => id !== solutionId)
    }
  }

  function renameSolution(solutionId: string, name: string) {
    const solution = solutions.value.find(s => s.id === solutionId)
    if (solution) {
      solution.name = name
      solution.updatedAt = Date.now()
    }
  }

  function duplicateSolution(solutionId: string): Solution | null {
    const source = solutions.value.find(s => s.id === solutionId)
    if (!source) return null

    const periodIdMap = new Map<string, string>()
    const newPeriods = source.historicalPeriods.map(p => {
      const newId = generateId()
      periodIdMap.set(p.id, newId)
      return { ...p, id: newId }
    })

    const newSolution: Solution = {
      id: generateId(),
      name: `${source.name} 副本`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lineArt: source.lineArt,
      layers: source.layers.map(l => ({
        ...l,
        id: generateId(),
        objects: JSON.parse(JSON.stringify(l.objects)),
        historicalInfo: {
          ...l.historicalInfo,
          periodId: l.historicalInfo.periodId ? periodIdMap.get(l.historicalInfo.periodId) || null : null
        }
      })),
      canvasWidth: source.canvasWidth,
      canvasHeight: source.canvasHeight,
      historicalPeriods: newPeriods,
      selectedPeriodIds: source.selectedPeriodIds.map(id => periodIdMap.get(id) || id).filter(id => newPeriods.some(p => p.id === id))
    }
    solutions.value.push(newSolution)
    return newSolution
  }

  function addLayer(type: LayerType, name?: string): Layer | null {
    if (!currentSolution.value) return null

    const layerName = name || generateLayerName(type)
    if (isLayerNameDuplicate(layerName)) {
      return null
    }

    const maxZIndex = currentSolution.value.layers.length > 0
      ? Math.max(...currentSolution.value.layers.map(l => l.zIndex))
      : -1

    const firstPeriodId = currentSolution.value.historicalPeriods[0]?.id || null

    const layer: Layer = {
      id: generateId(),
      name: layerName,
      type,
      visible: true,
      opacity: 100,
      objects: [],
      zIndex: maxZIndex + 1,
      historicalInfo: {
        periodId: firstPeriodId,
        materialDescription: '',
        deductionBasis: '',
        confidence: 50
      }
    }

    currentSolution.value.layers.push(layer)
    activeLayerId.value = layer.id
    currentSolution.value.updatedAt = Date.now()
    return layer
  }

  function generateLayerName(type: LayerType): string {
    const baseName = LAYER_TYPE_LABELS[type]
    let index = 1
    let name = `${baseName} ${index}`
    while (isLayerNameDuplicate(name)) {
      index++
      name = `${baseName} ${index}`
    }
    return name
  }

  function isLayerNameDuplicate(name: string, excludeId?: string): boolean {
    if (!currentSolution.value) return false
    return currentSolution.value.layers.some(
      l => l.name === name && l.id !== excludeId
    )
  }

  function deleteLayer(layerId: string) {
    if (!currentSolution.value) return
    const index = currentSolution.value.layers.findIndex(l => l.id === layerId)
    if (index !== -1) {
      currentSolution.value.layers.splice(index, 1)
      if (activeLayerId.value === layerId) {
        const remaining = currentSolution.value.layers
        activeLayerId.value = remaining.length > 0 ? remaining[remaining.length - 1].id : null
      }
      currentSolution.value.updatedAt = Date.now()
    }
  }

  function renameLayer(layerId: string, name: string): boolean {
    if (!currentSolution.value) return false
    if (isLayerNameDuplicate(name, layerId)) return false

    const layer = currentSolution.value.layers.find(l => l.id === layerId)
    if (layer) {
      layer.name = name
      currentSolution.value.updatedAt = Date.now()
      return true
    }
    return false
  }

  function setLayerVisibility(layerId: string, visible: boolean) {
    if (!currentSolution.value) return
    const layer = currentSolution.value.layers.find(l => l.id === layerId)
    if (layer) {
      layer.visible = visible
      currentSolution.value.updatedAt = Date.now()
    }
  }

  function setLayerOpacity(layerId: string, opacity: number) {
    if (!currentSolution.value) return
    const clampedOpacity = Math.max(0, Math.min(100, opacity))
    const layer = currentSolution.value.layers.find(l => l.id === layerId)
    if (layer) {
      layer.opacity = clampedOpacity
      currentSolution.value.updatedAt = Date.now()
    }
  }

  function moveLayerUp(layerId: string) {
    if (!currentSolution.value) return
    const layers = currentSolution.value.layers
    const layer = layers.find(l => l.id === layerId)
    if (!layer) return

    const higherLayers = layers.filter(l => l.zIndex > layer.zIndex)
    if (higherLayers.length === 0) return

    const nextLayer = higherLayers.sort((a, b) => a.zIndex - b.zIndex)[0]
    const tempZ = layer.zIndex
    layer.zIndex = nextLayer.zIndex
    nextLayer.zIndex = tempZ
    currentSolution.value.updatedAt = Date.now()
  }

  function moveLayerDown(layerId: string) {
    if (!currentSolution.value) return
    const layers = currentSolution.value.layers
    const layer = layers.find(l => l.id === layerId)
    if (!layer) return

    const lowerLayers = layers.filter(l => l.zIndex < layer.zIndex)
    if (lowerLayers.length === 0) return

    const prevLayer = lowerLayers.sort((a, b) => b.zIndex - a.zIndex)[0]
    const tempZ = layer.zIndex
    layer.zIndex = prevLayer.zIndex
    prevLayer.zIndex = tempZ
    currentSolution.value.updatedAt = Date.now()
  }

  function setActiveLayer(layerId: string) {
    activeLayerId.value = layerId
  }

  function setLayerObjects(layerId: string, objects: any[]) {
    if (!currentSolution.value) return
    const layer = currentSolution.value.layers.find(l => l.id === layerId)
    if (layer) {
      layer.objects = objects
      currentSolution.value.updatedAt = Date.now()
    }
  }

  function setLineArt(dataUrl: string) {
    if (!currentSolution.value) return
    currentSolution.value.lineArt = dataUrl
    currentSolution.value.updatedAt = Date.now()
  }

  function setCanvasSize(width: number, height: number) {
    if (!currentSolution.value) return
    currentSolution.value.canvasWidth = width
    currentSolution.value.canvasHeight = height
    currentSolution.value.updatedAt = Date.now()
  }

  function exportSolution(solutionId: string): string | null {
    const solution = solutions.value.find(s => s.id === solutionId)
    if (!solution) return null
    return JSON.stringify(solution, null, 2)
  }

  function importSolution(jsonString: string): Solution | null {
    try {
      const data = JSON.parse(jsonString)
      if (!validateSolution(data)) {
        return null
      }

      let historicalPeriods: HistoricalPeriod[] = []
      if (data.historicalPeriods && Array.isArray(data.historicalPeriods)) {
        historicalPeriods = data.historicalPeriods.map((p: any) => ({
          id: generateId(),
          name: p.name || '未命名时期',
          startYear: p.startYear || 0,
          endYear: p.endYear || 0,
          description: p.description || '',
          color: p.color || '#888888'
        }))
      } else {
        historicalPeriods = DEFAULT_HISTORICAL_PERIODS.map(p => ({
          ...p,
          id: generateId()
        }))
      }

      const periodIdMap = new Map<string, string>()
      if (data.historicalPeriods && Array.isArray(data.historicalPeriods)) {
        data.historicalPeriods.forEach((p: any, index: number) => {
          if (historicalPeriods[index]) {
            periodIdMap.set(p.id, historicalPeriods[index].id)
          }
        })
      }

      const layers = data.layers.map((l: any) => {
        let historicalInfo = l.historicalInfo
        if (!historicalInfo) {
          historicalInfo = {
            periodId: historicalPeriods[0]?.id || null,
            materialDescription: '',
            deductionBasis: '',
            confidence: 50
          }
        } else if (historicalInfo.periodId && periodIdMap.has(historicalInfo.periodId)) {
          historicalInfo = {
            ...historicalInfo,
            periodId: periodIdMap.get(historicalInfo.periodId) || null
          }
        }
        return {
          ...l,
          id: generateId(),
          historicalInfo
        }
      })

      let selectedPeriodIds: string[] = []
      if (data.selectedPeriodIds && Array.isArray(data.selectedPeriodIds)) {
        selectedPeriodIds = data.selectedPeriodIds
          .map((id: string) => periodIdMap.get(id) || id)
          .filter((id: string) => historicalPeriods.some(p => p.id === id))
      } else {
        selectedPeriodIds = historicalPeriods.map(p => p.id)
      }

      const solution: Solution = {
        id: generateId(),
        name: `${data.name} (导入)`,
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now(),
        lineArt: data.lineArt || null,
        layers,
        canvasWidth: data.canvasWidth || 800,
        canvasHeight: data.canvasHeight || 600,
        historicalPeriods,
        selectedPeriodIds
      }
      solutions.value.push(solution)
      return solution
    } catch {
      return null
    }
  }

  function validateSolution(data: any): boolean {
    if (!data || typeof data !== 'object') return false
    if (typeof data.name !== 'string') return false
    if (!Array.isArray(data.layers)) return false
    for (const layer of data.layers) {
      if (typeof layer.id !== 'string') return false
      if (typeof layer.name !== 'string') return false
      if (typeof layer.type !== 'string') return false
      if (typeof layer.visible !== 'boolean') return false
      if (typeof layer.opacity !== 'number' || layer.opacity < 0 || layer.opacity > 100) return false
      if (!Array.isArray(layer.objects)) return false
      if (typeof layer.zIndex !== 'number') return false
    }
    return true
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

  function calculateColorAreaStats(): ColorAreaStat[] {
    if (!currentSolution.value) return []
    
    const stats: Map<string, number> = new Map()
    let totalArea = 0

    for (const layer of visibleLayers.value) {
      for (const obj of layer.objects) {
        const color = obj.fill || obj.stroke
        if (!color || typeof color !== 'string') continue
        if (color === 'transparent' || color === 'none') continue

        let area = 0
        if (obj.type === 'rect') {
          area = (obj.width || 0) * (obj.height || 0)
        } else if (obj.type === 'circle') {
          area = Math.PI * Math.pow(obj.radius || 0, 2)
        } else if (obj.type === 'ellipse') {
          area = Math.PI * (obj.rx || 0) * (obj.ry || 0)
        } else if (obj.type === 'polygon' || obj.type === 'polyline') {
          area = calculatePolygonArea(obj.points || [])
        } else if (obj.type === 'path') {
          area = (obj.width || 0) * (obj.height || 0) * 0.5
        } else {
          area = (obj.width || 0) * (obj.height || 0)
        }

        const opacityFactor = (layer.opacity / 100) * (obj.opacity || 1)
        area = area * opacityFactor

        if (area > 0) {
          const normalizedColor = color.toLowerCase()
          stats.set(normalizedColor, (stats.get(normalizedColor) || 0) + area)
          totalArea += area
        }
      }
    }

    const result: ColorAreaStat[] = []
    for (const [color, area] of stats) {
      result.push({
        color,
        area: Math.round(area),
        percentage: totalArea > 0 ? Math.round((area / totalArea) * 10000) / 100 : 0
      })
    }

    return result.sort((a, b) => b.area - a.area)
  }

  function calculatePolygonArea(points: { x: number; y: number }[]): number {
    if (points.length < 3) return 0
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].y
      area -= points[j].x * points[i].y
    }
    return Math.abs(area / 2)
  }

  function hasLayerContent(layerId: string): boolean {
    const layer = layers.value.find(l => l.id === layerId)
    return layer ? layer.objects.length > 0 : false
  }

  const historicalPeriods = computed(() => {
    return currentSolution.value?.historicalPeriods || []
  })

  const selectedPeriodIds = computed(() => {
    return currentSolution.value?.selectedPeriodIds || []
  })

  const sortedHistoricalPeriods = computed(() => {
    return [...historicalPeriods.value].sort((a, b) => a.startYear - b.startYear)
  })

  const filteredLayers = computed(() => {
    if (!currentSolution.value || selectedPeriodIds.value.length === 0) {
      return []
    }
    return sortedLayers.value.filter(layer =>
      layer.historicalInfo.periodId && selectedPeriodIds.value.includes(layer.historicalInfo.periodId)
    )
  })

  const visibleFilteredLayers = computed(() => {
    return filteredLayers.value.filter(l => l.visible)
  })

  function addHistoricalPeriod(period: Omit<HistoricalPeriod, 'id'>): HistoricalPeriod | null {
    if (!currentSolution.value) return null
    const newPeriod: HistoricalPeriod = {
      ...period,
      id: generateId()
    }
    currentSolution.value.historicalPeriods.push(newPeriod)
    currentSolution.value.selectedPeriodIds.push(newPeriod.id)
    currentSolution.value.updatedAt = Date.now()
    return newPeriod
  }

  function updateHistoricalPeriod(periodId: string, updates: Partial<Omit<HistoricalPeriod, 'id'>>): boolean {
    if (!currentSolution.value) return false
    const period = currentSolution.value.historicalPeriods.find(p => p.id === periodId)
    if (!period) return false
    Object.assign(period, updates)
    currentSolution.value.updatedAt = Date.now()
    return true
  }

  function deleteHistoricalPeriod(periodId: string): boolean {
    if (!currentSolution.value) return false
    const index = currentSolution.value.historicalPeriods.findIndex(p => p.id === periodId)
    if (index === -1) return false
    currentSolution.value.historicalPeriods.splice(index, 1)
    currentSolution.value.selectedPeriodIds = currentSolution.value.selectedPeriodIds.filter(id => id !== periodId)
    for (const layer of currentSolution.value.layers) {
      if (layer.historicalInfo.periodId === periodId) {
        layer.historicalInfo.periodId = null
      }
    }
    currentSolution.value.updatedAt = Date.now()
    return true
  }

  function togglePeriodSelection(periodId: string) {
    if (!currentSolution.value) return
    const index = currentSolution.value.selectedPeriodIds.indexOf(periodId)
    if (index === -1) {
      currentSolution.value.selectedPeriodIds.push(periodId)
    } else {
      currentSolution.value.selectedPeriodIds.splice(index, 1)
    }
    currentSolution.value.updatedAt = Date.now()
  }

  function setSelectedPeriods(periodIds: string[]) {
    if (!currentSolution.value) return
    currentSolution.value.selectedPeriodIds = periodIds
    currentSolution.value.updatedAt = Date.now()
  }

  function setLayerHistoricalInfo(layerId: string, info: Partial<LayerHistoricalInfo>): boolean {
    if (!currentSolution.value) return false
    const layer = currentSolution.value.layers.find(l => l.id === layerId)
    if (!layer) return false
    layer.historicalInfo = { ...layer.historicalInfo, ...info }
    currentSolution.value.updatedAt = Date.now()
    return true
  }

  function calculateColorStatsForLayers(targetLayers: Layer[]): ColorAreaStat[] {
    const stats: Map<string, number> = new Map()
    let totalArea = 0

    for (const layer of targetLayers) {
      for (const obj of layer.objects) {
        const color = obj.fill || obj.stroke
        if (!color || typeof color !== 'string') continue
        if (color === 'transparent' || color === 'none') continue

        let area = 0
        if (obj.type === 'rect') {
          area = (obj.width || 0) * (obj.height || 0)
        } else if (obj.type === 'circle') {
          area = Math.PI * Math.pow(obj.radius || 0, 2)
        } else if (obj.type === 'ellipse') {
          area = Math.PI * (obj.rx || 0) * (obj.ry || 0)
        } else if (obj.type === 'polygon' || obj.type === 'polyline') {
          area = calculatePolygonArea(obj.points || [])
        } else if (obj.type === 'path') {
          area = (obj.width || 0) * (obj.height || 0) * 0.5
        } else {
          area = (obj.width || 0) * (obj.height || 0)
        }

        const opacityFactor = (layer.opacity / 100) * (obj.opacity || 1)
        area = area * opacityFactor

        if (area > 0) {
          const normalizedColor = color.toLowerCase()
          stats.set(normalizedColor, (stats.get(normalizedColor) || 0) + area)
          totalArea += area
        }
      }
    }

    const result: ColorAreaStat[] = []
    for (const [color, area] of stats) {
      result.push({
        color,
        area: Math.round(area),
        percentage: totalArea > 0 ? Math.round((area / totalArea) * 10000) / 100 : 0
      })
    }

    return result.sort((a, b) => b.area - a.area)
  }

  function calculateColorStatsByPeriod(): PeriodColorStat[] {
    if (!currentSolution.value) return []

    const result: PeriodColorStat[] = []

    for (const period of sortedHistoricalPeriods.value) {
      const periodLayers = visibleLayers.value.filter(
        layer => layer.historicalInfo.periodId === period.id
      )
      const stats = calculateColorStatsForLayers(periodLayers)
      const totalArea = stats.reduce((sum, s) => sum + s.area, 0)

      result.push({
        periodId: period.id,
        periodName: period.name,
        stats,
        totalArea
      })
    }

    return result
  }

  function generateRestorationReport(): RestorationReport | null {
    if (!currentSolution.value) return null

    const solution = currentSolution.value
    const periods: RestorationReport['periods'] = []

    for (const period of sortedHistoricalPeriods.value) {
      const periodLayers = [...sortedLayers.value].filter(
        layer => layer.historicalInfo.periodId === period.id
      )

      const layerStats = periodLayers.map(layer => {
        const colorStats = calculateColorStatsForLayers([layer].filter(l => l.visible))
        const totalArea = colorStats.reduce((sum, s) => sum + s.area, 0)
        return {
          layer,
          colorStats,
          totalArea
        }
      })

      const visiblePeriodLayers = periodLayers.filter(l => l.visible)
      const totalColorStats = calculateColorStatsForLayers(visiblePeriodLayers)
      const totalArea = totalColorStats.reduce((sum, s) => sum + s.area, 0)

      periods.push({
        period,
        layers: layerStats,
        totalColorStats,
        totalArea
      })
    }

    const overallStats = calculateColorAreaStats()
    const overallTotalArea = overallStats.reduce((sum, s) => sum + s.area, 0)

    return {
      solutionName: solution.name,
      generatedAt: Date.now(),
      periods,
      overallStats,
      overallTotalArea
    }
  }

  function exportRestorationReport(): string | null {
    const report = generateRestorationReport()
    if (!report) return null
    return JSON.stringify(report, null, 2)
  }

  return {
    solutions,
    currentSolutionId,
    activeLayerId,
    compareSolutionIds,
    currentSolution,
    layers,
    activeLayer,
    sortedLayers,
    visibleLayers,
    historicalPeriods,
    selectedPeriodIds,
    sortedHistoricalPeriods,
    filteredLayers,
    visibleFilteredLayers,
    createNewSolution,
    switchSolution,
    deleteSolution,
    renameSolution,
    duplicateSolution,
    addLayer,
    deleteLayer,
    renameLayer,
    isLayerNameDuplicate,
    setLayerVisibility,
    setLayerOpacity,
    moveLayerUp,
    moveLayerDown,
    setActiveLayer,
    setLayerObjects,
    setLineArt,
    setCanvasSize,
    exportSolution,
    importSolution,
    toggleCompare,
    clearCompare,
    calculateColorAreaStats,
    hasLayerContent,
    addHistoricalPeriod,
    updateHistoricalPeriod,
    deleteHistoricalPeriod,
    togglePeriodSelection,
    setSelectedPeriods,
    setLayerHistoricalInfo,
    calculateColorStatsByPeriod,
    calculateColorStatsForLayers,
    generateRestorationReport,
    exportRestorationReport
  }
})
