<template>
  <n-modal
    :show="show"
    preset="card"
    title="方案对比"
    :mask-closable="false"
    :style="{ width: '90vw', maxWidth: '1200px' }"
    @update:show="handleUpdateShow"
  >
    <div class="compare-view">
      <div class="compare-header">
        <span>并排对比 ({{ compareSolutions.length }} 个方案)</span>
        <n-button size="small" @click="handleClose">关闭</n-button>
      </div>

      <div class="compare-content" :class="`cols-${compareSolutions.length}`">
        <div
          v-for="solution in compareSolutions"
          :key="solution.id"
          class="compare-item"
        >
          <div class="compare-item-header">
            <span class="compare-item-name">{{ solution.name }}</span>
            <span class="compare-item-meta">{{ solution.layers.length }}个图层</span>
          </div>
          <div class="compare-canvas-wrapper">
            <canvas :id="`compare-canvas-${solution.id}`" class="compare-canvas"></canvas>
          </div>
          <div class="compare-item-footer">
            <span>更新于 {{ formatDate(solution.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { NModal, NButton } from 'naive-ui'
import * as fabric from 'fabric'
import { useSolutionStore } from '../stores/solution'
import { storeToRefs } from 'pinia'
import type { Solution } from '../types'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const solutionStore = useSolutionStore()
const { solutions, compareSolutionIds } = storeToRefs(solutionStore)

const fabricCanvases = ref<Map<string, any>>(new Map())

const compareSolutions = computed(() => {
  return compareSolutionIds.value
    .map(id => solutions.value.find(s => s.id === id))
    .filter((s): s is Solution => s !== undefined)
})

function initCompareCanvases() {
  nextTick(() => {
    compareSolutions.value.forEach(solution => {
      const canvasId = `compare-canvas-${solution.id}`
      const existing = fabricCanvases.value.get(solution.id)
      if (existing) {
        existing.dispose()
      }

      const canvas = new fabric.Canvas(canvasId, {
        width: solution.canvasWidth,
        height: solution.canvasHeight,
        backgroundColor: '#ffffff',
        selection: false
      })

      fabricCanvases.value.set(solution.id, canvas)
      renderSolution(canvas, solution)
    })
  })
}

function renderSolution(canvas: any, solution: Solution) {
  if (solution.lineArt) {
    fabric.FabricImage.fromURL(solution.lineArt).then((img: any) => {
      const canvasWidth = solution.canvasWidth
      const canvasHeight = solution.canvasHeight
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

      canvas.add(img)
      canvas.sendObjectToBack(img)
      renderLayers(canvas, solution)
    })
  } else {
    renderLayers(canvas, solution)
  }
}

function renderLayers(canvas: any, solution: Solution) {
  const sortedLayers = [...solution.layers].sort((a, b) => a.zIndex - b.zIndex)

  for (const layer of sortedLayers) {
    if (!layer.visible) continue

    for (const objData of layer.objects) {
      try {
        let fabricObj: any = null

        switch (objData.type) {
          case 'rect':
            fabricObj = new fabric.Rect(objData)
            break
          case 'circle':
            fabricObj = new fabric.Circle(objData)
            break
          case 'ellipse':
            fabricObj = new fabric.Ellipse(objData)
            break
          case 'polygon':
            fabricObj = new fabric.Polygon(objData.points || [], objData as any)
            break
          case 'path':
            fabricObj = new fabric.Path(objData.path || '', objData)
            break
          default:
            continue
        }

        if (fabricObj) {
          fabricObj.set({
            opacity: (layer.opacity / 100) * (objData.opacity || 1),
            selectable: false,
            evented: false
          })
          canvas.add(fabricObj)
        }
      } catch (e) {
        console.error('Failed to render object:', e)
      }
    }
  }

  canvas.renderAll()
}

function handleUpdateShow(value: boolean) {
  if (!value) {
    handleClose()
  }
}

function handleClose() {
  fabricCanvases.value.forEach(canvas => {
    canvas.dispose()
  })
  fabricCanvases.value.clear()
  emit('update:show', false)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initCompareCanvases()
    })
  }
})
</script>

<style scoped>
.compare-view {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.compare-content {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

.compare-content.cols-2 .compare-item {
  flex: 1;
}

.compare-content.cols-3 .compare-item {
  flex: 1;
}

.compare-content.cols-4 .compare-item {
  flex: 1;
}

.compare-item {
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.compare-item-header {
  padding: 10px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.compare-item-name {
  font-weight: 600;
  font-size: 14px;
}

.compare-item-meta {
  font-size: 12px;
  color: #888;
}

.compare-canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 10px;
  overflow: auto;
}

.compare-canvas {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 100%;
  max-height: 100%;
}

.compare-item-footer {
  padding: 8px 12px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #999;
  text-align: center;
}
</style>
