import { ColorRegion, Point } from "@/ColorFantasy.types";

/**
 * Класс для отрисовки контуров раскраски
 */
export class OutlineDrawer {
  /** Контекст канваса, на котором рисуем */
  private ctx: CanvasRenderingContext2D;
  /** Ширина канваса */
  private width: number;
  /** Высота канваса */
  private height: number;

  /**
   * @param {CanvasRenderingContext2D} ctx - контекст для рисования
   * @param {number} width - ширина канваса
   * @param {number} height - высота канваса
   */
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  /**
   * Рисует контуры всех областей
   * Закрашивает белым фоном и черным цветом обводит границы
   * @param {ColorRegion[]} regions - массив областей
   */
  public drawOutlines(regions: ColorRegion[]): void {
    /** Очищаем канвас и заливаем белым фоном */
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.width, this.height);

    const regionMap = this.buildRegionMap(regions);

    /** Рисуем граничные пиксели черным цветом */
    for (const region of regions) {
      for (const { x, y } of region.pixels) {
        if (this.isBorderPixel(x, y, region.id, regionMap)) {
          this.ctx.fillStyle = "black";
          this.ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  /**
   * Рисует метки областей (номера/буквы) в центре каждой области
   * @param {ColorRegion[]} regions - массив областей
   */
  public drawLabels(regions: ColorRegion[]): void {
    this.ctx.fillStyle = "black";
    this.ctx.font = "bold 14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    for (const region of regions) {
      const labelPos = this.findLabelPosition(region);

      /** Добавляем белый фон под меткой для лучшей читаемости */
      this.ctx.save();
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = "white";
      //   this.ctx.fillRect(labelPos.x - 15, labelPos.y - 12, 30, 24);
      this.ctx.fillStyle = "black";
      //   this.ctx.fillText(region.label, labelPos.x, labelPos.y);
      this.ctx.restore();
    }
  }

  /**
   * Создает карту принадлежности пикселей к областям для быстрого доступа
   * @param {ColorRegion[]} regions - массив областей
   * @returns {Map<string, number>} карта "x,y" -> id области
   */
  private buildRegionMap(regions: ColorRegion[]): Map<string, number> {
    const regionMap = new Map<string, number>();

    for (const region of regions) {
      for (const { x, y } of region.pixels) {
        regionMap.set(`${x},${y}`, region.id);
      }
    }

    return regionMap;
  }

  /**
   * Проверяет, является ли пиксель граничным
   * Пиксель считается граничным, если любой из его 4 соседей:
   * - находится за пределами изображения
   * - принадлежит другой области
   * @param {number} x - координата X
   * @param {number} y - координата Y
   * @param {number} regionId - ID текущей области
   * @param {Map<string, number>} regionMap - карта принадлежности пикселей
   * @returns {boolean} true если пиксель на границе
   */
  private isBorderPixel(x: number, y: number, regionId: number, regionMap: Map<string, number>): boolean {
    /** 4 основных направления (крест) для определения границы */
    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y - 1],
      [x - 1, y + 1],
      [x + 1, y - 1],
      [x + 1, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      /** Граница изображения */
      if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
        return true;
      }
      const neighborId = regionMap.get(`${nx},${ny}`);
      /** Сосед из другой области */
      if (neighborId !== regionId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Находит подходящую позицию для метки области
   * Если центроид не принадлежит области, ищем ближайший пиксель
   * @param {ColorRegion} region - область
   * @returns {Point} координаты для размещения метки
   */
  private findLabelPosition(region: ColorRegion): Point {
    /** Проверяем, принадлежит ли центроид области */
    const isCentroidInRegion = region.pixels.some(p => p.x === region.centroid.x && p.y === region.centroid.y);

    if (isCentroidInRegion) {
      return region.centroid;
    }

    /** Ищем ближайший к центроиду пиксель области */
    let minDist = Infinity;
    let bestPixel = region.pixels[0];

    for (const pixel of region.pixels) {
      const dist = Math.hypot(pixel.x - region.centroid.x, pixel.y - region.centroid.y);
      if (dist < minDist) {
        minDist = dist;
        bestPixel = pixel;
      }
    }

    return bestPixel;
  }
}
