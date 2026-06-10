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
import { useDialog, NEmpty, NButton } from 'naive-ui'
import * as fabric from 'fabric'
import { useSolutionStore } from '../stores/solution'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  canvasId: string
  readOnly?: boolean
  enablePeriodFilter?: boolean
}>()

const emit = defineEmits<{
  (e: 'objects-updated'): void
}>()

const solutionStore = useSolutionStore()
const { currentSolution, activeLayer, sortedLayers, visibleFilteredLayers, selectedPeriodIds } = storeToRefs(solutionStore)
const dialog = useDialog()

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
  if (props.enablePeriodFilter && selectedPeriodIds.value.length > 0) {
    return visibleFilteredLayers.value
  }
  return sortedLayers.value
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
    for (const objData of layer.objects) {
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

  fabricCanvas.value.renderAll()
  isUpdating.value = false
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
  if (props.readOnly || !activeLayer.value) return
  if (currentTool.value === 'select') return

  const pointer = getPointer(options.e)
  if (!pointer) return

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
  if (!isDrawing.value || !activeLayer.value || props.readOnly) return
  if (currentTool.value === 'select') return

  const pointer = getPointer(options.e)
  if (!pointer) return

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

function handleMouseUp() {
  if (!isDrawing.value || !activeLayer.value || props.readOnly) return
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
  solutionStore.setLayerObjects(activeLayer.value.id, objectData)
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
  fabricCanvas
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
