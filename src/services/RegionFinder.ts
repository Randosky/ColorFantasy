import { areColorsSimilar, computeAverageColor, computeBoundsCenter } from "../utils/ColorUtils";

import { Bounds, ColorRegion, Pixel } from "@/ColorFantasy.types";

/**
 * Класс для поиска связанных цветовых областей на изображении
 * Использует алгоритм заливки (Flood Fill) с BFS
 * @class
 */
export class RegionFinder {
  /** Ширина изображения (канвас) */
  private width: number;
  /** Высота изображения (канвас) */
  private height: number;
  /** Массив пиксельных данных */
  private data: Uint8ClampedArray;
  /**
   * Массив посещенных пикселей (0 - не посещен, 1 - посещен)
   * Используется для оптимизации, чтобы не обрабатывать один пиксель дважды
   */
  private visited: Uint8Array;
  /** Допустимое отклонение при нахождении регионов */
  private tolerance: number;
  /** Минимальный размер области */
  private minRegionSize: number;

  /**
   * @param {ImageData} imageData - данные изображения
   * @param {number} tolerance - допуск при сравнении цветов
   * @param {number} minRegionSize - минимальный размер области в пикселях
   */
  constructor(imageData: ImageData, tolerance: number, minRegionSize: number) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.data = imageData.data;
    this.tolerance = tolerance;
    this.minRegionSize = minRegionSize;
    this.visited = new Uint8Array(this.width * this.height);
  }

  /**
   * Находит все цветовые области на изображении
   * Проходит по всем пикселям, запуская floodFill для не посещенных
   * @returns {ColorRegion[]} массив найденных областей
   */
  public find = (): ColorRegion[] => {
    const regions: ColorRegion[] = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const flatIdx = this.getFlatIndex(x, y);

        /** Если пиксель еще не посещен, начинаем новую область */
        if (!this.visited[flatIdx]) {
          const startIdx = this.getDataIndex(x, y);
          const region = this.floodFill(x, y, startIdx);

          if (region) {
            region.id = regions.length;
            region.label = regions.length.toString();
            regions.push(region);
          }
        }
      }
    }

    return regions;
  }

  /**
   * Получить индекс в массиве данных по координатам (4 байта на пиксель)
   * @param {number} x - координата x
   * @param {number} y - координата y
   * @returns {number} - индекс
   */
  private getDataIndex = (x: number, y: number): number => {
    return (y * this.width + x) * 4;
  }

  /**
   * Получить плоский индекс для visited массива
   * @param {number} x - координата x
   * @param {number} y - координата y
   * @returns {number} - индекс
   */
  private getFlatIndex = (x: number, y: number): number => {
    return y * this.width + x;
  }

  /**
   * Алгоритм заливки (Flood Fill) с использованием BFS
   * Находит все связанные пиксели, начиная с начальной точки
   * @param {number} startX - начальная координата X
   * @param {number} startY - начальная координата Y
   * @param {number} startIdx - индекс начального пикселя в data
   * @returns {ColorRegion | null} найденная область или null
   */
  private floodFill = (startX: number, startY: number, startIdx: number): ColorRegion | null => {
    /** Суммы координат для расчета центроида */
    let sumX = 0,
      sumY = 0;

    /** Очередь для BFS обхода */
    const queue: Array<[number, number]> = [[startX, startY]];
    /** Список пикселей области */
    const pixels: Pixel[] = [];
    /** Границы области */
    const bounds: Bounds = { minX: startX, maxX: startX, minY: startY, maxY: startY };

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const flatIdx = this.getFlatIndex(x, y);

      /** Пропускаем уже посещенные пиксели */
      if (this.visited[flatIdx]) continue;

      const currentIdx = this.getDataIndex(x, y);

      /** Проверяем, относится ли пиксель к текущей цветовой области */
      if (!areColorsSimilar(this.data, startIdx, currentIdx, this.tolerance)) continue;

      /** Помечаем как посещенный и добавляем в область */
      this.visited[flatIdx] = 1;
      pixels.push({ x, y });

      sumX += x;
      sumY += y;

      /** Обновляем границы области */
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);

      /**
       * Добавляем соседей в очередь
       * Используем 8-связность (включая диагонали) для более точного выделения областей
       */
      if (x > 0) queue.push([x - 1, y]);
      if (x < this.width - 1) queue.push([x + 1, y]);
      if (y > 0) queue.push([x, y - 1]);
      if (y < this.height - 1) queue.push([x, y + 1]);
      if (x > 0 && y > 0) queue.push([x - 1, y - 1]);
      if (x < this.width - 1 && y > 0) queue.push([x + 1, y - 1]);
      if (x > 0 && y < this.height - 1) queue.push([x - 1, y + 1]);
      if (x < this.width - 1 && y < this.height - 1) queue.push([x + 1, y + 1]);
    }

    /** Отбрасываем слишком маленькие области (шум) */
    if (pixels.length < this.minRegionSize) return null;

    /** Вычисляем характеристики области */
    const averageColor = computeAverageColor(pixels, this.data, (x, y) => this.getDataIndex(x, y));
    const centroid = { x: Math.round(sumX / pixels.length), y: Math.round(sumY / pixels.length) };
    const center = computeBoundsCenter(bounds);

    return {
      id: 0,
      label: "",
      center,
      centroid,
      color: averageColor,
      pixels,
      bounds,
    };
  }
}
