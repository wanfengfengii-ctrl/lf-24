export interface Point {
  x: number
  y: number
}

export interface BoundingBox {
  left: number
  top: number
  width: number
  height: number
}

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

export function calculateBoundingBox(points: Point[]): BoundingBox {
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

export function calculateShapeArea(
  shapeType: 'rect' | 'polygon' | 'freehand',
  points: Point[]
): number {
  if (shapeType === 'rect' && points.length >= 2) {
    const width = Math.abs(points[1].x - points[0].x)
    const height = Math.abs(points[1].y - points[0].y)
    return width * height
  }
  return calculatePolygonArea(points)
}

export function calculateFabricObjectArea(obj: any): number {
  const type = obj.type
  if (type === 'rect') {
    return (obj.width || 0) * (obj.height || 0)
  } else if (type === 'circle') {
    return Math.PI * Math.pow(obj.radius || 0, 2)
  } else if (type === 'ellipse') {
    return Math.PI * (obj.rx || 0) * (obj.ry || 0)
  } else if (type === 'polygon' || type === 'polyline') {
    return calculatePolygonArea(obj.points || [])
  } else if (type === 'path') {
    return (obj.width || 0) * (obj.height || 0) * 0.5
  }
  return (obj.width || 0) * (obj.height || 0)
}
