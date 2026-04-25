import { computeBoundsCenter, computeCentroid, getColorDistance } from "../utils/ColorUtils";

import { Bounds, ColorRegion, Pixel, RGBAColor } from "@/ColorFantasy.types";

/**
 * Класс для объединения областей с похожими цветами
 * @class
 */
export class RegionMerger {
  /** Допустимое отклонение при объединении регионов */
  private tolerance: number;
  /** Данные изображения */
  private imageData: ImageData | null = null;
  /** Ширина канваса */
  private width: number;

  /**
   * @param {number} tolerance - допуск при сравнении цветов для объединения
   * @param {ImageData} imageData - пиксельные данные изображения
   * @param {number=} width - ширина канваса
   */
  constructor(tolerance: number, imageData: ImageData, width?: number) {
    this.imageData = imageData;
    this.tolerance = tolerance;
    this.width = width || 0;
  }

  /**
   * Объединяет похожие по цвету области
   * Группирует области, расстояние между цветами которых не превышает tolerance
   * @param {ColorRegion[]} regions - исходный массив областей
   * @returns {ColorRegion[]} массив с объединенными областями
   */
  public merge = (regions: ColorRegion[]): ColorRegion[] => {
    const merged: ColorRegion[] = [];
    const used = new Set<number>();

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;

      /** Начинаем новую группу с текущей области */
      const group: ColorRegion[] = [regions[i]];
      used.add(i);

      /** Ищем области с похожими цветами */
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;

        const colorDistance = getColorDistance(regions[i].color, regions[j].color);

        if (colorDistance <= this.tolerance) {
          group.push(regions[j]);
          used.add(j);
        }
      }

      /** Если в группе одна область, оставляем как есть, иначе объединяем */
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        /** Объединяем все области группы в одну */
        let combined = group[0];

        for (let k = 1; k < group.length; k++) {
          combined = this.mergeTwoRegions(combined, group[k]);
        }

        merged.push(combined);
      }
    }

    /**
     * Переназначаем ID и генерируем буквенно-цифровые метки
     * A, B, C, ..., Z, AA, AB, ...
     */
    merged.forEach((region, idx) => {
      region.id = idx;
      region.label = this.getLabel(idx);
    });

    return merged;
  };

  /**
   * Сокращает количество областей до целевого числа путем попарного слияния самых близких по цвету
   * @param {ColorRegion[]} regions - исходный массив областей
   * @param {number} targetCount - целевое количество областей
   * @returns {ColorRegion[]} массив с сокращенным количеством областей
   */
  public reduceToCount(regions: ColorRegion[], targetCount: number): ColorRegion[] {
    if (targetCount <= 0 || regions.length <= targetCount) {
      return regions;
    }

    let working = [...regions];

    while (working.length > targetCount) {
      /** Находим пару с минимальным цветовым расстоянием */
      let minDist = Infinity;
      let idxA = -1,
        idxB = -1;

      for (let i = 0; i < working.length; i++) {
        for (let j = i + 1; j < working.length; j++) {
          const dist = getColorDistance(working[i].color, working[j].color);
          if (dist < minDist) {
            minDist = dist;
            idxA = i;
            idxB = j;
          }
        }
      }

      if (idxA === -1) break;

      /** Объединяем найденную пару */
      const merged = this.mergeTwoRegions(working[idxA], working[idxB]);

      /** Удаляем старые области и добавляем новую */
      const newWorking: ColorRegion[] = [];
      for (let i = 0; i < working.length; i++) {
        if (i !== idxA && i !== idxB) {
          newWorking.push(working[i]);
        }
      }
      newWorking.push(merged);
      working = newWorking;
    }

    /** Переназначаем ID и метки */
    working.forEach((region, idx) => {
      region.id = idx;
      region.label = this.getLabel(idx);
    });

    return working;
  }

  /**
   * Объединяет две области в одну
   * @param {ColorRegion} a - первая область
   * @param {ColorRegion} b - вторая область
   * @returns {ColorRegion} объединенная область
   */
  private mergeTwoRegions(a: ColorRegion, b: ColorRegion): ColorRegion {
    /** Собираем все пиксели из всех областей */
    const allPixels = [...a.pixels, ...b.pixels];
    /** Вычисляем цвет объединенной области */
    const mergedColor = this.computeMergedColor(allPixels);

    /** Вычисляем общие границы (охватывающий прямоугольник) */
    const bounds: Bounds = {
      minX: Math.min(a.bounds.minX, b.bounds.minX),
      maxX: Math.max(a.bounds.maxX, b.bounds.maxX),
      minY: Math.min(a.bounds.minY, b.bounds.minY),
      maxY: Math.max(a.bounds.maxY, b.bounds.maxY),
    };

    /** Центроид на основе всех пикселей */
    const centroid = computeCentroid(allPixels);
    /** Центр на основе всех пикселей */
    const center = computeBoundsCenter(bounds);

    return {
      id: 0,
      label: "",
      center,
      centroid,
      color: mergedColor,
      pixels: allPixels,
      bounds,
      isTiny: false,
    };
  }

  /**
   * Вычисляем средний цвет объединенной области на основе оригинальных данных
   * @param {Pixel[]} pixels - список пикселей
   * @returns {RGBAColor} средний цвет
   */
  private computeMergedColor(pixels: Pixel[]): RGBAColor {
    if (!this.imageData) return { r: 0, g: 0, b: 0, a: 255 };

    let sumR = 0,
      sumG = 0,
      sumB = 0,
      sumA = 0;

    for (const p of pixels) {
      const idx = this.getDataIndex(p.x, p.y);

      sumR += this.imageData.data[idx];
      sumG += this.imageData.data[idx + 1];
      sumB += this.imageData.data[idx + 2];
      sumA += this.imageData.data[idx + 3];
    }

    const cnt = pixels.length;

    return {
      r: Math.round(sumR / cnt),
      g: Math.round(sumG / cnt),
      b: Math.round(sumB / cnt),
      a: Math.round(sumA / cnt),
    };
  }

  /**
   * Получить индекс в массиве данных по координатам (4 байта на пиксель)
   * @param {number} x - координата x
   * @param {number} y - координата y
   * @returns {number} - индекс
   */
  private getDataIndex = (x: number, y: number): number => {
    return (y * this.width + x) * 4;
  };

  /** Преобразуем число в буквенную метку (0 -> A, 1 -> B, ...) */
  private getLabel = (num: number): string => {
    if (num < 26) return String.fromCharCode(65 + num);

    return this.getLabel(Math.floor(num / 26) - 1) + String.fromCharCode(65 + (num % 26));
  };
}
