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
  /** Временное хранилище для мелких областей (артефакты) */
  private tinyRegions: ColorRegion[] = [];

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
    this.tinyRegions = [];
  }

  /**
   * Находит все цветовые области на изображении
   * Проходит по всем пикселям, запуская floodFill для не посещенных
   * @returns {ColorRegion[]} массив найденных областей
   */
  public find = (): ColorRegion[] => {
    const regions: ColorRegion[] = [];
    this.tinyRegions = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const flatIdx = this.getFlatIndex(x, y);

        /** Если пиксель еще не посещен, начинаем новую область */
        if (!this.visited[flatIdx]) {
          const startIdx = this.getDataIndex(x, y);
          const region = this.floodFill(x, y, startIdx);

          if (region && !region.isTiny) {
            region.id = regions.length;
            region.label = regions.length.toString();
            regions.push(region);
          }
        }
      }
    }

    /** Объединяем мелкие области с ближайшими нормальными */
    this.mergeTinyRegions(regions);

    return regions;
  };

  /**
   * Получить индекс в массиве данных по координатам (4 байта на пиксель)
   * @param {number} x - координата x
   * @param {number} y - координата y
   * @returns {number} - индекс
   */
  private getDataIndex = (x: number, y: number): number => {
    return (y * this.width + x) * 4;
  };

  /**
   * Получить плоский индекс для visited массива
   * @param {number} x - координата x
   * @param {number} y - координата y
   * @returns {number} - индекс
   */
  private getFlatIndex = (x: number, y: number): number => {
    return y * this.width + x;
  };

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

    /** Сохраняем слишком маленькие области (шум) в отдельный массив для последующего объединения */
    if (pixels.length < this.minRegionSize) {
      const centroid = { x: Math.round(sumX / pixels.length), y: Math.round(sumY / pixels.length) };
      const center = computeBoundsCenter(bounds);
      const averageColor = computeAverageColor(pixels, this.data, (x, y) => this.getDataIndex(x, y));

      const tinyRegion: ColorRegion = {
        id: 0,
        label: "",
        center,
        centroid,
        color: averageColor,
        pixels,
        bounds,
        isTiny: true,
      };

      this.tinyRegions.push(tinyRegion);

      return null;
    }

    /** Вычисляем характеристики области */
    const centroid = { x: Math.round(sumX / pixels.length), y: Math.round(sumY / pixels.length) };
    const center = computeBoundsCenter(bounds);
    const averageColor = computeAverageColor(pixels, this.data, (x, y) => this.getDataIndex(x, y));

    return {
      id: 0,
      label: "",
      center,
      centroid,
      color: averageColor,
      pixels,
      bounds,
      isTiny: false,
    };
  };

  /**
   * Объединяет мелкие области с ближайшими нормальными
   * @param {ColorRegion[]} normalRegions - список нормальных областей
   */
  private mergeTinyRegions(normalRegions: ColorRegion[]): void {
    for (const tiny of this.tinyRegions) {
      /** Находим ближайший нормальный регион по центроиду */
      const nearestRegion = this.findNearestRegion(tiny.centroid, normalRegions);

      /** Если нашли ближайший - присоединяем мелкую область к нему */
      if (nearestRegion) this.updateRegionAfterMerge(nearestRegion, tiny.pixels);
    }
  }

  /**
   * Находит ближайший регион к заданной точке
   * @param {Pixel} point - точка
   * @param {ColorRegion[]} regions - список регионов
   * @returns {ColorRegion | null} ближайший регион
   */
  private findNearestRegion(point: Pixel, regions: ColorRegion[]): ColorRegion | null {
    let minDist = Infinity;
    let nearest = null;

    for (const region of regions) {
      const dist = Math.hypot(point.x - region.centroid.x, point.y - region.centroid.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = region;
      }
    }

    return nearest;
  }

  /**
   * Обновляет характеристики региона после добавления пикселей
   * @param {ColorRegion} region - регион для обновления
   * @param {Pixel[]} newPixels - новые пиксели
   */
  private updateRegionAfterMerge(region: ColorRegion, newPixels: Pixel[]): void {
    /** Добавляем новые пиксели */
    region.pixels.push(...newPixels);

    /** Пересчитываем центроид */
    let sumX = 0,
      sumY = 0;

    for (const p of region.pixels) {
      sumX += p.x;
      sumY += p.y;
    }

    region.centroid = {
      x: Math.round(sumX / region.pixels.length),
      y: Math.round(sumY / region.pixels.length),
    };

    /** Пересчитываем границы */
    for (const p of newPixels) {
      region.bounds.minX = Math.min(region.bounds.minX, p.x);
      region.bounds.maxX = Math.max(region.bounds.maxX, p.x);
      region.bounds.minY = Math.min(region.bounds.minY, p.y);
      region.bounds.maxY = Math.max(region.bounds.maxY, p.y);
    }
    region.center = computeBoundsCenter(region.bounds);
  }
}
