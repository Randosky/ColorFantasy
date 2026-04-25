import { ColorRegion } from "@/ColorFantasy.types";

/**
 * Режим предпросмотра отображает области цветами из палитры
 * @class
 */
export class PreviewMode {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private isActive: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  /**
   * Отрисовывает предпросмотр областей их собственными цветами
   * @param {ColorRegion[]} regions - массив областей
   * @returns {void}
   */
  public render(regions: ColorRegion[]): void {
    if (!this.isActive) return;

    for (const region of regions) {
      const { r, g, b, a } = region.color;
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      this.ctx.globalAlpha = a / 255;

      for (const { x, y } of region.pixels) {
        this.ctx.fillRect(x, y, 1, 1);
      }
    }

    this.ctx.globalAlpha = 1;
  }

  /**
   * Активирует режим предпросмотра
   * @returns {void}
   */
  public activate(): void {
    this.isActive = true;
  }

  /**
   * Деактивирует режим предпросмотра
   * @returns {void}
   */
  public deactivate(): void {
    this.isActive = false;
  }

  /**
   * Проверяет, активен ли режим предпросмотра
   * @returns {boolean}
   */
  public isActiveMode(): boolean {
    return this.isActive;
  }
}
