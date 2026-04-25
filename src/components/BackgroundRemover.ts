import { ColorRegion } from "@/ColorFantasy.types";

/**
 * Класс для удаления фона на основе выбранной области
 * @class
 */
export class BackgroundRemover {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private imageData: ImageData | null = null;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  /**
   * Устанавливает данные изображения
   * @param {ImageData} imageData - данные изображения
   * @returns {void}
   */
  public setImageData(imageData: ImageData): void {
    this.imageData = imageData;
  }

  /**
   * Находит доминирующий цвет (фон) по краям изображения
   * @returns {number[]} доминирующий цвет в формате [r,g,b]
   */
  private findDominantEdgeColor(): number[] {
    if (!this.imageData) return [255, 255, 255];

    const edgePixels: number[][] = [];
    const data = this.imageData.data;

    /** Собираем пиксели с краев (первые и последние 10 пикселей) */
    const edgeWidth = 10;

    for (let y = 0; y < Math.min(edgeWidth, this.height); y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;
        edgePixels.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    for (let y = this.height - edgeWidth; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;
        edgePixels.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    /** Находим средний цвет краев */
    const sumR = edgePixels.reduce((s, p) => s + p[0], 0);
    const sumG = edgePixels.reduce((s, p) => s + p[1], 0);
    const sumB = edgePixels.reduce((s, p) => s + p[2], 0);
    const count = edgePixels.length;

    return [Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count)];
  }

  /**
   * Проверяет, похож ли цвет на фоновый
   * @param {number[]} color - цвет для проверки
   * @param {number[]} bgColor - фоновый цвет
   * @param {number} tolerance - допуск
   * @returns {boolean}
   */
  private isBackgroundColor(color: number[], bgColor: number[], tolerance: number): boolean {
    const dr = color[0] - bgColor[0];
    const dg = color[1] - bgColor[1];
    const db = color[2] - bgColor[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    return distance <= tolerance;
  }

  /**
   * Удаляет фон изображения (делает его белым)
   * @param {number} tolerance - допуск для определения фона
   * @returns {ImageData} измененные данные изображения
   */
  public removeBackground(tolerance: number = 30): ImageData | null {
    if (!this.imageData) return null;

    const bgColor = this.findDominantEdgeColor();
    const newData = new Uint8ClampedArray(this.imageData.data);

    for (let i = 0; i < newData.length; i += 4) {
      const pixelColor = [newData[i], newData[i + 1], newData[i + 2]];
      if (this.isBackgroundColor(pixelColor, bgColor, tolerance)) {
        /** Делаем фон белым */
        newData[i] = 255;
        newData[i + 1] = 255;
        newData[i + 2] = 255;
      }
    }

    return new ImageData(newData, this.width, this.height);
  }

  /**
   * Применяет удаление фона и возвращает новый канвас
   * @param {number} tolerance - допуск
   * @returns {HTMLCanvasElement | null} новый канвас с удаленным фоном
   */
  public applyAndRender(tolerance: number = 30): HTMLCanvasElement | null {
    const newImageData = this.removeBackground(tolerance);
    if (!newImageData) return null;

    const newCanvas = document.createElement("canvas");
    newCanvas.width = this.width;
    newCanvas.height = this.height;
    const newCtx = newCanvas.getContext("2d");
    if (!newCtx) return null;

    newCtx.putImageData(newImageData, 0, 0);
    return newCanvas;
  }
}
