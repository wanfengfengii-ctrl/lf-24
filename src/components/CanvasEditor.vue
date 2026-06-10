<template>
  <div class="canvas-container">
    <canvas ref="canvasRef" :id="canvasId"></canvas>
    <div v-if="!hasLineArt" class="placeholder">
      <n-empty description="请导入彩画线稿开始工作">
        <template #extra>
          <n-button type="primary" @click="triggerImport">导入线稿</n-button>
        </template>
      </n-empty>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileImport"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useDialog, useMessage, NEmpty, NButton } from 'naive-ui'
import * as fabric from 'fabric'
import { useSolutionStore } from '../stores/solution'
import { useDiseaseStore } from '../stores/disease'
import { storeToRefs } from 'pinia'
import type { DiseasePoint, DiseaseType, DiseaseSeverity } from '../types'
import { DISEASE_TYPE_COLORS } from '../types'

const props = defineProps<{
  canvasId: string
  readOnly?: boolean
  enablePeriodFilter?: boolean
  enableDiseaseMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'objects-updated'): void
  (e: 'disease-created', diseaseId: string): void
  (e: 'disease-selected', diseaseId: string | null): void
}>()

const solutionStore = useSolutionStore()
const { currentSolution, activeLayer, sortedLayers, visibleLayers, visibleFilteredLayers, selectedPeriodIds, activePeriodId } = storeToRefs(solutionStore)
const diseaseStore = useDiseaseStore()
const {
  diseases,
  selectedDiseaseId,
  isDrawingDisease,
  drawingShapeType,
  drawingPoints,
  diseaseVisible,
  filterType,
  filterSeverity
} = storeToRefs(diseaseStore)
const dialog = useDialog()
const message = useMessage()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const fabricCanvas = ref<any>(null)
const lineArtImage = ref<any>(null)
const isUpdating = ref(false)

const hasLineArt = computed(() => currentSolution.value?.lineArt != null)

type ToolType = 'select' | 'brush' | 'rect' | 'circle' | 'polygon' | 'eraser'

const currentTool = ref<ToolType>('select')
const currentColor = ref('#3b82f6')
const brushWidth = ref(10)
const isDrawing = ref(false)
const drawingPath = ref<any[]>([])
const drawingStartPoint = ref<{ x: number; y: number } | null>(null)
const drawingPreview = ref<any>(null)

const diseaseDrawingStartPoint = ref<{ x: number; y: number } | null>(null)
const diseaseDrawingPreview = ref<any>(null)
const currentDiseaseType = ref<DiseaseType>('fading')
const currentDiseaseSeverity = ref<DiseaseSeverity>('mild')
const diseaseObjects = ref<any[]>([])

function initCanvas() {
  if (!canvasRef.value) return

  const width = currentSolution.value?.canvasWidth || 800
  const height = currentSolution.value?.canvasHeight || 600

  fabricCanvas.value = new fabric.Canvas(props.canvasId, {
    width,
    height,
    backgroundColor: '#ffffff',
    selection: !props.readOnly
  })

  if (!props.readOnly) {
    fabricCanvas.value.on('object:modified', handleObjectModified)
    fabricCanvas.value.on('path:created', handlePathCreated)
    fabricCanvas.value.on('mouse:down', handleMouseDown)
    fabricCanvas.value.on('mouse:move', handleMouseMove)
    fabricCanvas.value.on('mouse:up', handleMouseUp)
  }

  loadLineArt()
  renderAllLayers()
}

function loadLineArt() {
  if (!fabricCanvas.value || !currentSolution.value?.lineArt) return

  if (lineArtImage.value) {
    fabricCanvas.value.remove(lineArtImage.value)
  }

  fabric.FabricImage.fromURL(currentSolution.value.lineArt).then((img: any) => {
    if (!fabricCanvas.value || !currentSolution.value) return

    const canvasWidth = currentSolution.value.canvasWidth
    const canvasHeight = currentSolution.value.canvasHeight
    const imgWidth = img.width || canvasWidth
    const imgHeight = img.height || canvasHeight

    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.9
    const scaledWidth = imgWidth * scale
    const scaledHeight = imgHeight * scale

    img.set({
      left: (canvasWidth - scaledWidth) / 2,
      top: (canvasHeight - scaledHeight) / 2,
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false
    })

    lineArtImage.value = img
    fabricCanvas.value.add(img)
    fabricCanvas.value.sendObjectToBack(img)
    fabricCanvas.value.renderAll()
  })
}

function getRenderLayers() {
  if (props.enablePeriodFilter) {
    return visibleLayers.value
  }
  if (selectedPeriodIds.value.length > 0) {
    return visibleFilteredLayers.value
  }
  return sortedLayers.value
}

function getLayerObjects(layer: any): any[] {
  if (props.enablePeriodFilter && activePeriodId.value) {
    const version = layer.versions?.find((v: any) => v.periodId === activePeriodId.value)
    if (version) {
      return version.objects
    }
    return []
  }
  return layer.objects
}

function renderAllLayers() {
  if (!fabricCanvas.value || isUpdating.value) return

  isUpdating.value = true

  const objectsToRemove: any[] = []
  fabricCanvas.value.getObjects().forEach((obj: any) => {
    if (obj !== lineArtImage.value) {
      objectsToRemove.push(obj)
    }
  })
  objectsToRemove.forEach((obj: any) => fabricCanvas.value.remove(obj))

  const layers = [...getRenderLayers()].sort((a, b) => a.zIndex - b.zIndex)

  for (const layer of layers) {
    const objects = getLayerObjects(layer)
    for (const objData of objects) {
      try {
        const fabricObj = createFabricObjectFromData(objData)
        if (fabricObj) {
          const isActive = layer.id === activeLayer.value?.id
          fabricObj.set({
            opacity: (layer.opacity / 100) * (objData.opacity || 1),
            visible: layer.visible,
            selectable: !props.readOnly && isActive,
            evented: !props.readOnly && isActive,
            data: { layerId: layer.id }
          })
          fabricCanvas.value.add(fabricObj)
        }
      } catch (e) {
        console.error('Failed to create fabric object:', e)
      }
    }
  }

  if (lineArtImage.value) {
    fabricCanvas.value.sendObjectToBack(lineArtImage.value)
  }

  if (props.enableDiseaseMode && diseaseVisible.value) {
    renderDiseases()
  }

  fabricCanvas.value.renderAll()
  isUpdating.value = false
}

function getFilteredDiseases() {
  return diseases.value.filter(d => {
    if (filterType.value !== 'all' && d.type !== filterType.value) return false
    if (filterSeverity.value !== 'all' && d.severity !== filterSeverity.value) return false
    return true
  })
}

function renderDiseases() {
  if (!fabricCanvas.value) return

  const filteredDiseases = getFilteredDiseases()
  diseaseObjects.value = []

  for (const disease of filteredDiseases) {
    try {
      let fabricObj: any = null

      if (disease.shapeType === 'rect') {
        const { left, top, width, height } = disease.boundingBox
        fabricObj = new fabric.Rect({
          left,
          top,
          width,
          height,
          fill: disease.color + '30',
          stroke: disease.color,
          strokeWidth: 2,
          selectable: !props.readOnly,
          evented: !props.readOnly,
          data: { diseaseId: disease.id, isDisease: true }
        })
      } else if (disease.shapeType === 'polygon' || disease.shapeType === 'freehand') {
        const points = disease.points.map(p => new fabric.Point(p.x, p.y))
        fabricObj = new fabric.Polygon(points, {
          fill: disease.color + '30',
          stroke: disease.color,
          strokeWidth: 2,
          selectable: !props.readOnly,
          evented: !props.readOnly
        })
        ;(fabricObj as any).data = { diseaseId: disease.id, isDisease: true }
      }

      if (fabricObj) {
        if (disease.id === selectedDiseaseId.value) {
          fabricObj.set({
            strokeWidth: 3,
            stroke: '#1677ff'
          })
        }
        fabricCanvas.value.add(fabricObj)
        diseaseObjects.value.push(fabricObj)

        const labelText = new fabric.IText(disease.name, {
          left: disease.boundingBox.left,
          top: disease.boundingBox.top - 20,
          fontSize: 12,
          fill: disease.color,
          backgroundColor: '#ffffff',
          selectable: false,
          evented: false,
          data: { diseaseId: disease.id, isDiseaseLabel: true }
        })
        fabricCanvas.value.add(labelText)
      }
    } catch (e) {
      console.error('Failed to render disease:', e)
    }
  }
}

function createFabricObjectFromData(data: any): any {
  switch (data.type) {
    case 'rect':
      return new fabric.Rect(data)
    case 'circle':
      return new fabric.Circle(data)
    case 'ellipse':
      return new fabric.Ellipse(data)
    case 'polygon':
      return new fabric.Polygon(data.points || [], data)
    case 'polyline':
      return new fabric.Polyline(data.points || [], data)
    case 'path':
      return new fabric.Path(data.path || '', data)
    case 'triangle':
      return new fabric.Triangle(data)
    case 'line':
      return new fabric.Line([data.x1 || 0, data.y1 || 0, data.x2 || 0, data.y2 || 0], data)
    case 'i-text':
    case 'text':
      return new fabric.IText(data.text || '', data)
    default:
      return null
  }
}

function handleObjectModified() {
  if (!activeLayer.value || props.readOnly) return
  saveActiveLayerObjects()
}

function handlePathCreated() {
  if (!activeLayer.value || props.readOnly) return
  saveActiveLayerObjects()
}

function handleMouseDown(options: any) {
  if (props.readOnly) return

  const pointer = getPointer(options.e)
  if (!pointer) return

  if (props.enableDiseaseMode) {
    handleDiseaseMouseDown(pointer)
    return
  }

  if (!activeLayer.value) return
  if (currentTool.value === 'select') return

  isDrawing.value = true
  drawingStartPoint.value = { x: pointer.x, y: pointer.y }

  if (currentTool.value === 'brush' || currentTool.value === 'eraser' || currentTool.value === 'polygon') {
    drawingPath.value = [new fabric.Point(pointer.x, pointer.y)]
  } else if (currentTool.value === 'rect') {
    drawingPreview.value = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: currentColor.value,
      stroke: currentColor.value,
      strokeWidth: 1,
      selectable: false,
      evented: false,
      opacity: 0.6,
      data: { layerId: activeLayer.value.id }
    })
    fabricCanvas.value.add(drawingPreview.value)
  } else if (currentTool.value === 'circle') {
    drawingPreview.value = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 0,
      fill: currentColor.value,
      stroke: currentColor.value,
      strokeWidth: 1,
      selectable: false,
      evented: false,
      opacity: 0.6,
      data: { layerId: activeLayer.value.id }
    })
    fabricCanvas.value.add(drawingPreview.value)
  }

  fabricCanvas.value?.renderAll()
}

function handleDiseaseMouseDown(pointer: { x: number; y: number }) {
  if (!isDrawingDisease.value) {
    const target = findDiseaseAtPoint(pointer)
    if (target) {
      diseaseStore.selectDisease(target.data.diseaseId)
      emit('disease-selected', target.data.diseaseId)
    } else {
      diseaseStore.selectDisease(null)
      emit('disease-selected', null)
    }
    return
  }

  diseaseDrawingStartPoint.value = { x: pointer.x, y: pointer.y }
  diseaseStore.addDrawingPoint({ x: pointer.x, y: pointer.y })

  const color = DISEASE_TYPE_COLORS[currentDiseaseType.value]

  if (drawingShapeType.value === 'rect') {
    diseaseDrawingPreview.value = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: color + '30',
      stroke: color,
      strokeWidth: 2,
      selectable: false,
      evented: false,
      data: { isDiseasePreview: true }
    })
    fabricCanvas.value.add(diseaseDrawingPreview.value)
  } else if (drawingShapeType.value === 'polygon') {
    diseaseDrawingPreview.value = new fabric.Polygon(
      [new fabric.Point(pointer.x, pointer.y)],
      {
        fill: color + '30',
        stroke: color,
        strokeWidth: 2,
        selectable: false,
        evented: false
      }
    )
    ;(diseaseDrawingPreview.value as any).data = { isDiseasePreview: true }
    fabricCanvas.value.add(diseaseDrawingPreview.value)
  }

  fabricCanvas.value?.renderAll()
}

function findDiseaseAtPoint(pointer: { x: number; y: number }): any | null {
  if (!fabricCanvas.value) return null
  const objects = fabricCanvas.value.getObjects()
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i]
    if (obj.data?.isDisease) {
      if (obj.containsPoint?.(new fabric.Point(pointer.x, pointer.y))) {
        return obj
      }
    }
  }
  return null
}

function getPointer(e: any) {
  if (fabricCanvas.value.getViewportTransform) {
    return fabricCanvas.value.getPointer(e)
  }
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function handleMouseMove(options: any) {
  if (props.readOnly) return

  const pointer = getPointer(options.e)
  if (!pointer) return

  if (props.enableDiseaseMode && isDrawingDisease.value) {
    handleDiseaseMouseMove(pointer)
    return
  }

  if (!isDrawing.value || !activeLayer.value) return
  if (currentTool.value === 'select') return

  if (currentTool.value === 'brush' || currentTool.value === 'eraser' || currentTool.value === 'polygon') {
    drawingPath.value.push(new fabric.Point(pointer.x, pointer.y))
  } else if (currentTool.value === 'rect' && drawingPreview.value && drawingStartPoint.value) {
    const startX = drawingStartPoint.value.x
    const startY = drawingStartPoint.value.y
    const width = pointer.x - startX
    const height = pointer.y - startY

    drawingPreview.value.set({
      left: width >= 0 ? startX : pointer.x,
      top: height >= 0 ? startY : pointer.y,
      width: Math.abs(width),
      height: Math.abs(height)
    })
    fabricCanvas.value.renderAll()
  } else if (currentTool.value === 'circle' && drawingPreview.value && drawingStartPoint.value) {
    const startX = drawingStartPoint.value.x
    const startY = drawingStartPoint.value.y
    const dx = pointer.x - startX
    const dy = pointer.y - startY
    const radius = Math.sqrt(dx * dx + dy * dy)

    drawingPreview.value.set({
      left: startX - radius,
      top: startY - radius,
      radius: radius
    })
    fabricCanvas.value.renderAll()
  }
}

function handleDiseaseMouseMove(pointer: { x: number; y: number }) {
  if (!diseaseDrawingPreview.value || !diseaseDrawingStartPoint.value) return

  if (drawingShapeType.value === 'rect') {
    const startX = diseaseDrawingStartPoint.value.x
    const startY = diseaseDrawingStartPoint.value.y
    const width = pointer.x - startX
    const height = pointer.y - startY

    diseaseDrawingPreview.value.set({
      left: width >= 0 ? startX : pointer.x,
      top: height >= 0 ? startY : pointer.y,
      width: Math.abs(width),
      height: Math.abs(height)
    })
  } else if (drawingShapeType.value === 'polygon') {
    const points = [...drawingPoints.value, { x: pointer.x, y: pointer.y }]
    const fabricPoints = points.map(p => new fabric.Point(p.x, p.y))
    diseaseDrawingPreview.value.set({ points: fabricPoints })
  }

  fabricCanvas.value?.renderAll()
}

function handleMouseUp() {
  if (props.readOnly) return

  if (props.enableDiseaseMode && isDrawingDisease.value) {
    handleDiseaseMouseUp()
    return
  }

  if (!isDrawing.value || !activeLayer.value) return
  if (currentTool.value === 'select') return

  isDrawing.value = false

  if (drawingPreview.value) {
    fabricCanvas.value.remove(drawingPreview.value)
  }

  let newShape: any = null

  if (currentTool.value === 'brush' || currentTool.value === 'eraser' || currentTool.value === 'polygon') {
    if (drawingPath.value.length < 2) {
      drawingPath.value = []
      drawingPreview.value = null
      drawingStartPoint.value = null
      return
    }

    const pathData = pointsToPath(drawingPath.value)
    newShape = new fabric.Path(pathData, {
      stroke: currentColor.value,
      strokeWidth: brushWidth.value,
      fill: currentTool.value === 'brush' ? 'none' : currentColor.value,
      selectable: true,
      data: { layerId: activeLayer.value.id }
    })

    if (currentTool.value === 'eraser') {
      newShape.set({
        stroke: '#ffffff',
        strokeWidth: brushWidth.value * 2,
        globalCompositeOperation: 'destination-out'
      })
    }
  } else if (currentTool.value === 'rect' && drawingPreview.value && drawingStartPoint.value) {
    const width = drawingPreview.value.width || 0
    const height = drawingPreview.value.height || 0
    const left = drawingPreview.value.left || 0
    const top = drawingPreview.value.top || 0

    if (width > 2 && height > 2) {
      newShape = new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: currentColor.value,
        selectable: true,
        data: { layerId: activeLayer.value.id }
      })
    }
  } else if (currentTool.value === 'circle' && drawingPreview.value && drawingStartPoint.value) {
    const radius = drawingPreview.value.radius || 0
    const left = drawingPreview.value.left || 0
    const top = drawingPreview.value.top || 0

    if (radius > 2) {
      newShape = new fabric.Circle({
        left,
        top,
        radius,
        fill: currentColor.value,
        selectable: true,
        data: { layerId: activeLayer.value.id }
      })
    }
  }

  if (newShape) {
    fabricCanvas.value?.add(newShape)
    fabricCanvas.value?.setActiveObject(newShape)
    fabricCanvas.value?.renderAll()
    saveActiveLayerObjects()
  }

  drawingPath.value = []
  drawingPreview.value = null
  drawingStartPoint.value = null
}

function handleDiseaseMouseUp() {
  if (!isDrawingDisease.value) return

  if (diseaseDrawingPreview.value) {
    fabricCanvas.value.remove(diseaseDrawingPreview.value)
  }

  if (drawingShapeType.value === 'rect' && diseaseDrawingStartPoint.value) {
    const preview = diseaseDrawingPreview.value
    if (preview && (preview.width > 5 || preview.height > 5)) {
      const points: DiseasePoint[] = [
        { x: preview.left, y: preview.top },
        { x: preview.left + preview.width, y: preview.top + preview.height }
      ]
      finishDiseaseDrawing(points)
    } else {
      diseaseStore.cancelDrawing()
    }
  } else if (drawingShapeType.value === 'polygon') {
    if (drawingPoints.value.length >= 3) {
      finishDiseaseDrawing([...drawingPoints.value])
    } else {
      diseaseStore.cancelDrawing()
      message.warning('多边形至少需要3个点')
    }
  }

  diseaseDrawingPreview.value = null
  diseaseDrawingStartPoint.value = null
  renderAllLayers()
}

function finishDiseaseDrawing(points: DiseasePoint[]) {
  const disease = diseaseStore.finishDrawing(
    currentDiseaseType.value,
    currentDiseaseSeverity.value,
    points
  )
  if (disease) {
    emit('disease-created', disease.id)
    message.success('病害标注已添加')
  }
}

function setDiseaseType(type: DiseaseType) {
  currentDiseaseType.value = type
}

function setDiseaseSeverity(severity: DiseaseSeverity) {
  currentDiseaseSeverity.value = severity
}

function pointsToPath(points: any[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

function saveActiveLayerObjects() {
  if (!activeLayer.value || !fabricCanvas.value) return

  const objects = fabricCanvas.value.getObjects().filter((obj: any) => {
    return obj.data?.layerId === activeLayer.value!.id
  })

  const objectData = objects.map((obj: any) => obj.toObject(['data']))

  if (props.enablePeriodFilter && activePeriodId.value) {
    solutionStore.setLayerVersionObjects(activeLayer.value.id, activePeriodId.value, objectData)
  } else {
    solutionStore.setLayerObjects(activeLayer.value.id, objectData)
  }
  emit('objects-updated')
}

function triggerImport() {
  fileInputRef.value?.click()
}

function handleFileImport(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string
    if (dataUrl) {
      solutionStore.setLineArt(dataUrl)
      nextTick(() => {
        loadLineArt()
      })
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

function setTool(tool: ToolType) {
  currentTool.value = tool
  if (fabricCanvas.value) {
    fabricCanvas.value.selection = tool === 'select'
    fabricCanvas.value.forEachObject((obj: any) => {
      if (obj.data?.layerId === activeLayer.value?.id) {
        obj.selectable = tool === 'select'
        obj.evented = tool === 'select'
      }
    })
    fabricCanvas.value.renderAll()
  }
}

function setColor(color: string) {
  currentColor.value = color
}

function setBrushWidth(width: number) {
  brushWidth.value = width
}

function clearActiveLayer() {
  if (!activeLayer.value || !fabricCanvas.value) return

  dialog.warning({
    title: '确认清空',
    content: `确定要清空图层「${activeLayer.value.name}」的所有内容吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      const objectsToRemove = fabricCanvas.value!.getObjects().filter((obj: any) => {
        return obj.data?.layerId === activeLayer.value!.id
      })
      objectsToRemove.forEach((obj: any) => fabricCanvas.value!.remove(obj))
      solutionStore.setLayerObjects(activeLayer.value!.id, [])
      fabricCanvas.value!.renderAll()
      emit('objects-updated')
    }
  })
}

function deleteSelected() {
  if (!fabricCanvas.value || props.readOnly) return
  const activeObjects = fabricCanvas.value.getActiveObjects()
  if (activeObjects.length === 0) return

  activeObjects.forEach((obj: any) => fabricCanvas.value!.remove(obj))
  fabricCanvas.value!.discardActiveObject()
  fabricCanvas.value!.renderAll()
  saveActiveLayerObjects()
}

watch(() => currentSolution.value?.id, () => {
  if (fabricCanvas.value) {
    loadLineArt()
    renderAllLayers()
  }
})

watch(() => currentSolution.value?.layers, () => {
  renderAllLayers()
}, { deep: true })

watch(activeLayer, () => {
  if (fabricCanvas.value && !props.readOnly) {
    fabricCanvas.value.forEachObject((obj: any) => {
      const layerId = obj.data?.layerId
      obj.selectable = layerId === activeLayer.value?.id
      obj.evented = layerId === activeLayer.value?.id
    })
    fabricCanvas.value.renderAll()
  }
})

watch(selectedPeriodIds, () => {
  if (props.enablePeriodFilter) {
    renderAllLayers()
  }
}, { deep: true })

watch(activePeriodId, () => {
  if (props.enablePeriodFilter) {
    renderAllLayers()
  }
})

watch(() => props.enableDiseaseMode, () => {
  if (fabricCanvas.value) {
    renderAllLayers()
  }
})

watch(diseaseVisible, () => {
  if (props.enableDiseaseMode && fabricCanvas.value) {
    renderAllLayers()
  }
})

watch(diseases, () => {
  if (props.enableDiseaseMode && fabricCanvas.value) {
    renderAllLayers()
  }
}, { deep: true })

watch(selectedDiseaseId, () => {
  if (props.enableDiseaseMode && fabricCanvas.value) {
    renderAllLayers()
  }
})

watch(filterType, () => {
  if (props.enableDiseaseMode && fabricCanvas.value) {
    renderAllLayers()
  }
})

watch(filterSeverity, () => {
  if (props.enableDiseaseMode && fabricCanvas.value) {
    renderAllLayers()
  }
})

onMounted(() => {
  nextTick(() => {
    initCanvas()
  })
})

onUnmounted(() => {
  if (fabricCanvas.value) {
    fabricCanvas.value.dispose()
  }
})

defineExpose({
  setTool,
  setColor,
  setBrushWidth,
  clearActiveLayer,
  deleteSelected,
  triggerImport,
  fabricCanvas,
  setDiseaseType,
  setDiseaseSeverity
})
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  overflow: auto;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px dashed #d0d0d0;
  margin: 20px;
}
</style>
