import { ExportFormat, FORMAT_SIZES } from "@/components/ExportModal";

import { ColorRegion } from "@/ColorFantasy.types";

/**
 * Класс для экспорта раскраски в различных форматах
 * @class
 */
export class Exporter {
  private sourceCanvas: HTMLCanvasElement;
  private regions: ColorRegion[];

  constructor(sourceCanvas: HTMLCanvasElement, regions: ColorRegion[]) {
    this.sourceCanvas = sourceCanvas;
    this.regions = regions;
  }

  /**
   * Рисует палитру на канвасе
   * @param {CanvasRenderingContext2D} ctx - контекст
   * @param {number} startY - вертикальная позиция начала палитры
   * @param {number} width - ширина области
   * @returns {void}
   */
  private drawPalette(ctx: CanvasRenderingContext2D, startY: number, width: number): void {
    /** Собираем уникальные цвета */
    const uniqueColors: ColorRegion[] = [];
    const seen = new Set<string>();

    for (const region of this.regions) {
      const key = `${region.color.r},${region.color.g},${region.color.b}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueColors.push(region);
      }
    }

    /** Настройки палитры */
    const itemSize = 60;
    const itemsPerRow = Math.min(10, Math.floor(width / (itemSize + 10)));
    const startX = (width - itemsPerRow * (itemSize + 10)) / 2;

    /** Фон палитры */
    ctx.fillStyle = "#f5f5f5";
    const paletteHeight = 140;
    ctx.fillRect(0, startY, width, paletteHeight);

    /** Заголовок палитры */
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🎨 Палитра цветов", width / 2, startY + 25);

    /** Рисуем цвета */
    for (let i = 0; i < Math.min(uniqueColors.length, itemsPerRow * 2); i++) {
      const color = uniqueColors[i];
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const x = startX + col * (itemSize + 10);
      const y = startY + 45 + row * (itemSize + 15);

      /** Цветной квадрат */
      ctx.fillStyle = `rgb(${color.color.r}, ${color.color.g}, ${color.color.b})`;
      ctx.fillRect(x, y, itemSize, itemSize);
      ctx.strokeStyle = "#ccc";
      ctx.strokeRect(x, y, itemSize, itemSize);

      /** Метка */
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(color.label, x + itemSize / 2, y + itemSize / 2);
    }
  }

  /**
   * Экспортирует раскраску в указанном формате
   * @param {ExportFormat} format - формат экспорта
   * @param {boolean} includePalette - включать ли палитру
   * @returns {HTMLCanvasElement} канвас с экспортированным изображением
   */
  public exportToFormat(format: ExportFormat, includePalette: boolean = true): HTMLCanvasElement {
    const size = FORMAT_SIZES[format];

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = size.width;
    exportCanvas.height = size.height;
    const exportCtx = exportCanvas.getContext("2d")!;

    /** Белый фон */
    exportCtx.fillStyle = "white";
    exportCtx.fillRect(0, 0, size.width, size.height);

    /** Масштабируем исходное изображение с сохранением пропорций */
    const sourceWidth = this.sourceCanvas.width;
    const sourceHeight = this.sourceCanvas.height;
    const scale = Math.min(size.width / sourceWidth, (size.height - (includePalette ? 200 : 0)) / sourceHeight);
    const scaledWidth = sourceWidth * scale;
    const scaledHeight = sourceHeight * scale;
    const x = (size.width - scaledWidth) / 2;
    const y = 40;

    exportCtx.drawImage(this.sourceCanvas, x, y, scaledWidth, scaledHeight);

    /** Рисуем рамку вокруг изображения */
    exportCtx.strokeStyle = "#ccc";
    exportCtx.lineWidth = 2;
    exportCtx.strokeRect(x - 5, y - 5, scaledWidth + 10, scaledHeight + 10);

    /** Палитра */
    if (includePalette) {
      this.drawPalette(exportCtx, y + scaledHeight + 30, size.width);
    }

    return exportCanvas;
  }

  /**
   * Скачивает экспортированное изображение
   * @param {ExportFormat} format - формат экспорта
   * @param {boolean} includePalette - включать ли палитру
   * @returns {void}
   */
  public download(format: ExportFormat, includePalette: boolean = true): void {
    let canvas = this.exportToFormat(format, includePalette);

    /** Импорт в оригинальном размере */
    if (format === "original") canvas = this.sourceCanvas;

    const link = document.createElement("a");
    link.download = `coloring-${format}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
}
