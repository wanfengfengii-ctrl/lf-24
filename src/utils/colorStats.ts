import type { Layer, ColorAreaStat } from '../types'
import { calculateFabricObjectArea } from './geometry'

export function calculateColorStatsForLayers(
  layers: Layer[],
  periodId?: string | null
): ColorAreaStat[] {
  const stats: Map<string, number> = new Map()
  let totalArea = 0

  for (const layer of layers) {
    let objects = layer.objects
    if (periodId) {
      const version = layer.versions.find(v => v.periodId === periodId)
      if (version) {
        objects = version.objects
      }
    }

    for (const obj of objects) {
      const color = obj.fill || obj.stroke
      if (!color || typeof color !== 'string') continue
      if (color === 'transparent' || color === 'none') continue

      let area = calculateFabricObjectArea(obj)
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
