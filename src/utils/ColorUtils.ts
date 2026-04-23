import { Bounds, Pixel, Point, RGBAColor } from "@/ColorFantasy.types";

/**
 * Вычисляет Евклидово расстояние между двумя цветами в RGB-пространстве
 * @param {RGBAColor} color1 - первый цвет
 * @param {RGBAColor} color2 - второй цвет
 * @returns {number} расстояние между цветами (0-441)
 */
export function getColorDistance(color1: RGBAColor, color2: RGBAColor): number {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Проверяет, похожи ли два пикселя по цвету с заданным допуском
 * @param {Uint8ClampedArray} data - массив пиксельных данных
 * @param {number} idx1 - индекс первого пикселя
 * @param {number} idx2 - индекс второго пикселя
 * @param {number} tolerance - допустимое отклонение
 * @returns {boolean} true если цвета похожи
 */
export function areColorsSimilar(data: Uint8ClampedArray, idx1: number, idx2: number, tolerance: number): boolean {
  const dr = data[idx1] - data[idx2];
  const dg = data[idx1 + 1] - data[idx2 + 1];
  const db = data[idx1 + 2] - data[idx2 + 2];
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  const da = Math.abs(data[idx1 + 3] - data[idx2 + 3]);

  return distance <= tolerance && da <= tolerance;
}

/**
 * Вычисляет средний цвет из списка пикселей
 * @param {Pixel[]} pixels - список пикселей
 * @param {Uint8ClampedArray} data - массив пиксельных данных
 * @param {(x:number, y:number) => number} getIndex - функция получения индекса
 * @returns {RGBAColor} средний цвет
 */
export function computeAverageColor(
  pixels: Pixel[],
  data: Uint8ClampedArray,
  getIndex: (x: number, y: number) => number
): RGBAColor {
  let sumR = 0,
    sumG = 0,
    sumB = 0,
    sumA = 0;

  for (const { x, y } of pixels) {
    const idx = getIndex(x, y);
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
    sumA += data[idx + 3];
  }

  const count = pixels.length;
  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count),
    a: Math.round(sumA / count),
  };
}

/**
 * Вычисляет центроид (центр масс) области
 * @param {Pixel[]} pixels - список пикселей области
 * @returns {Point} координаты центроида
 */
export function computeCentroid(pixels: Pixel[]): Point {
  const sumX = pixels.reduce((sum, p) => sum + p.x, 0);
  const sumY = pixels.reduce((sum, p) => sum + p.y, 0);
  return {
    x: Math.round(sumX / pixels.length),
    y: Math.round(sumY / pixels.length),
  };
}

/**
 * Вычисляет геометрический центр прямоугольника
 * @param {Bounds} bounds - границы прямоугольника
 * @returns {Point} координаты центра
 */
export function computeBoundsCenter(bounds: Bounds): Point {
  return {
    x: Math.round((bounds.minX + bounds.maxX) / 2),
    y: Math.round((bounds.minY + bounds.maxY) / 2),
  };
}
