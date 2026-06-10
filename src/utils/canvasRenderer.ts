import * as fabric from 'fabric'
import type { Layer, DiseaseAnnotation, HistoricalPeriod } from '../types'
import { DISEASE_TYPE_COLORS } from '../types'

export interface RenderOptions {
  readOnly?: boolean
  enablePeriodFilter?: boolean
  enableDiseaseMode?: boolean
  activePeriodId?: string | null
  activeLayerId?: string | null
  selectedDiseaseId?: string | null
  diseaseFilter?: {
    type?: string
    severity?: number | 'all'
    visibleOnly?: boolean
  }
}

export interface FabricObjectWithData extends fabric.Object {
  data?: Record<string, any>
}

export function createFabricObjectFromData(data: any): fabric.Object | null {
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

export function getLayerObjectsForPeriod(layer: Layer, periodId?: string | null): any[] {
  if (periodId) {
    const version = layer.versions?.find(v => v.periodId === periodId)
    if (version) {
      return version.objects
    }
    return []
  }
  return layer.objects
}

export class CanvasRenderer {
  private canvas: fabric.Canvas
  private lineArtImage: fabric.FabricImage | null = null
  private diseaseObjects: fabric.Object[] = []

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas
  }

  getCanvas(): fabric.Canvas {
    return this.canvas
  }

  setLineArt(dataUrl: string, canvasWidth: number, canvasHeight: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.lineArtImage) {
        this.canvas.remove(this.lineArtImage)
        this.lineArtImage = null
      }

      fabric.FabricImage.fromURL(dataUrl).then((img: fabric.FabricImage) => {
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

        this.lineArtImage = img
        this.canvas.add(img)
        this.canvas.sendObjectToBack(img)
        this.canvas.renderAll()
        resolve()
      })
    })
  }

  clearLineArt() {
    if (this.lineArtImage) {
      this.canvas.remove(this.lineArtImage)
      this.lineArtImage = null
    }
  }

  renderLayers(layers: Layer[], options: RenderOptions = {}) {
    const { readOnly = false, enablePeriodFilter = false, activePeriodId, activeLayerId } = options

    const objectsToRemove: fabric.Object[] = []
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj !== this.lineArtImage && !obj.data?.isDisease && !obj.data?.isDiseaseLabel && !obj.data?.isDiseasePreview) {
        objectsToRemove.push(obj)
      }
    })
    objectsToRemove.forEach(obj => this.canvas.remove(obj))

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex)
    const visibleLayers = sortedLayers.filter(l => l.visible)

    for (const layer of visibleLayers) {
      const objects = enablePeriodFilter
        ? getLayerObjectsForPeriod(layer, activePeriodId)
        : layer.objects

      for (const objData of objects) {
        try {
          const fabricObj = createFabricObjectFromData(objData)
          if (fabricObj) {
            const isActive = layer.id === activeLayerId
            ;(fabricObj as any).set({
              opacity: (layer.opacity / 100) * (objData.opacity || 1),
              visible: layer.visible,
              selectable: !readOnly && isActive,
              evented: !readOnly && isActive
            })
            ;(fabricObj as any).data = { layerId: layer.id }
            this.canvas.add(fabricObj)
          }
        } catch (e) {
          console.error('Failed to create fabric object:', e)
        }
      }
    }

    if (this.lineArtImage) {
      this.canvas.sendObjectToBack(this.lineArtImage)
    }

    this.canvas.renderAll()
  }

  renderDiseases(diseases: DiseaseAnnotation[], options: RenderOptions = {}) {
    const { readOnly = false, selectedDiseaseId, diseaseFilter } = options

    const diseaseObjsToRemove: fabric.Object[] = []
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.data?.isDisease || obj.data?.isDiseaseLabel) {
        diseaseObjsToRemove.push(obj)
      }
    })
    diseaseObjsToRemove.forEach(obj => this.canvas.remove(obj))

    this.diseaseObjects = []

    const filteredDiseases = diseases.filter(d => {
      if (diseaseFilter?.visibleOnly && !d.visible) return false
      if (diseaseFilter?.type && diseaseFilter.type !== 'all' && !d.types.includes(diseaseFilter.type as any)) return false
      if (diseaseFilter?.severity && diseaseFilter.severity !== 'all' && d.severity !== diseaseFilter.severity) return false
      return true
    })

    for (const disease of filteredDiseases) {
      try {
        let fabricObj: fabric.Object | null = null

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
            selectable: !readOnly,
            evented: !readOnly
          })
        } else if (disease.shapeType === 'polygon' || disease.shapeType === 'freehand') {
          const points = disease.points.map(p => new fabric.Point(p.x, p.y))
          fabricObj = new fabric.Polygon(points, {
            fill: disease.color + '30',
            stroke: disease.color,
            strokeWidth: 2,
            selectable: !readOnly,
            evented: !readOnly
          })
        }

        if (fabricObj) {
          ;(fabricObj as any).data = { diseaseId: disease.id, isDisease: true }

          if (disease.id === selectedDiseaseId) {
            fabricObj.set({
              strokeWidth: 3,
              stroke: '#1677ff'
            })
          }

          this.canvas.add(fabricObj)
          this.diseaseObjects.push(fabricObj)

          const typeCount = disease.types.length
          const labelSuffix = typeCount > 1 ? ` (+${typeCount - 1})` : ''
          const labelText = new fabric.IText(`${disease.name}${labelSuffix}`, {
            left: disease.boundingBox.left,
            top: disease.boundingBox.top - 20,
            fontSize: 12,
            fill: disease.color,
            backgroundColor: '#ffffff',
            selectable: false,
            evented: false
          })
          ;(labelText as any).data = { diseaseId: disease.id, isDiseaseLabel: true }
          this.canvas.add(labelText)
        }
      } catch (e) {
        console.error('Failed to render disease:', e)
      }
    }

    this.canvas.renderAll()
  }

  renderAll(
    layers: Layer[],
    diseases: DiseaseAnnotation[],
    options: RenderOptions = {}
  ) {
    const { enableDiseaseMode = false } = options

    this.renderLayers(layers, options)

    if (enableDiseaseMode) {
      this.renderDiseases(diseases, options)
    }
  }

  getLayerObjects(layerId: string): fabric.Object[] {
    return this.canvas.getObjects().filter((obj: any) => obj.data?.layerId === layerId)
  }

  findDiseaseAtPoint(pointer: { x: number; y: number }): fabric.Object | null {
    const objects = this.canvas.getObjects()
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i] as any
      if (obj.data?.isDisease) {
        if (obj.containsPoint?.(new fabric.Point(pointer.x, pointer.y))) {
          return obj
        }
      }
    }
    return null
  }

  getDiseaseObjects(): fabric.Object[] {
    return [...this.diseaseObjects]
  }

  dispose() {
    this.canvas.dispose()
  }
}
