import { computeBoundsCenter, computeCentroid, getColorDistance } from "../utils/ColorUtils";

import { Bounds, ColorRegion, Pixel, RGBAColor } from "@/ColorFantasy.types";

/**
 * Класс для объединения областей с похожими цветами
 * @class
 */
export class RegionMerger {
  /** Допустимое отклонение при объединении регионов */
  private tolerance: number;

  /**
   * @param {number} tolerance - допуск при сравнении цветов для объединения
   */
  constructor(tolerance: number) {
    this.tolerance = tolerance;
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
        const mergedRegion = this.mergeRegions(group);
        merged.push(mergedRegion);
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
  }

  /**
   * Объединяет несколько областей в одну
   * @param {ColorRegion[]} regions - массив областей для объединения
   * @returns {ColorRegion} объединенная область
   */
  private mergeRegions = (regions: ColorRegion[]): ColorRegion => {
    /** Собираем все пиксели из всех областей */
    const allPixels: Pixel[] = regions.flatMap(r => r.pixels);

    /**
     * Вычисляем средний цвет объединенной области
     * Для простоты берем цвет первой области,
     * в реальном проекте нужно пересчитать из оригинальных данных
     */
    const mergedColor: RGBAColor = regions[0].color;

    /** Вычисляем общие границы (охватывающий прямоугольник) */
    const bounds: Bounds = {
      minX: Math.min(...regions.map(r => r.bounds.minX)),
      maxX: Math.max(...regions.map(r => r.bounds.maxX)),
      minY: Math.min(...regions.map(r => r.bounds.minY)),
      maxY: Math.max(...regions.map(r => r.bounds.maxY)),
    };

    /** Пересчитываем центроид на основе всех пикселей */
    const centroid = computeCentroid(allPixels);
    const center = computeBoundsCenter(bounds);

    return {
      id: 0,
      label: "",
      center,
      centroid,
      color: mergedColor,
      pixels: allPixels,
      bounds,
    };
  }

  /** Преобразуем число в буквенную метку (0 -> A, 1 -> B, ...) */
  private getLabel = (num: number): string => {
    if (num < 26) return String.fromCharCode(65 + num);

    return this.getLabel(Math.floor(num / 26) - 1) + String.fromCharCode(65 + (num % 26));
  };
}
