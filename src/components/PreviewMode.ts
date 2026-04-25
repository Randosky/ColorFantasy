import { ColorRegion } from "@/ColorFantasy.types";

/**
 * Режим предпросмотра отображает области разными цветами
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
   * Генерирует случайный цвет на основе ID области
   * @param {number} id - ID области
   * @returns {string} цвет в формате RGB
   */
  private getRegionColor(id: number): string {
    /** Используем предсказуемые цвета на основе ID */
    const hue = (id * 137) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }

  /**
   * Отрисовывает предпросмотр областей разными цветами
   * @param {ColorRegion[]} regions - массив областей
   * @returns {void}
   */
  public render(regions: ColorRegion[]): void {
    if (!this.isActive) return;

    for (const region of regions) {
      const color = this.getRegionColor(region.id);
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.7;

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
