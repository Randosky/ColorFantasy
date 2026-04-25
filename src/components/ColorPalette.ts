import { ColorRegion } from "@/ColorFantasy.types";

/**
 * Компонент отображения палитры цветов
 */
export class ColorPalette {
  private paletteContainer: HTMLElement | null;
  private paletteSection: HTMLElement | null;

  constructor() {
    this.paletteSection = document.getElementById("paletteSection");
    this.paletteContainer = document.getElementById("colorPalette");
  }

  /**
   * Отображает палитру уникальных цветов
   * @param {ColorRegion[]} regions - массив областей
   */
  public display(regions: ColorRegion[]): void {
    if (!this.paletteContainer || !this.paletteSection) return;

    this.paletteSection.classList.remove("palette--hidden");
    this.paletteContainer.innerHTML = "";

    /** Собираем уникальные цвета */
    const uniqueColors = new Map<string, ColorRegion>();
    for (const region of regions) {
      const key = `${region.color.r},${region.color.g},${region.color.b}`;
      if (!uniqueColors.has(key)) {
        uniqueColors.set(key, region);
      }
    }

    /** Обновляем счетчик цветов */
    const countSpan = this.paletteSection.querySelector(".palette__count");
    if (countSpan) countSpan.textContent = `(${uniqueColors.size} цветов)`;

    /** Создаем элементы палитры */
    for (const region of uniqueColors.values()) {
      const colorItem = document.createElement("div");
      colorItem.className = "palette__item";
      colorItem.innerHTML = `
        <div class="palette-item__color" style="background: rgb(${region.color.r}, ${region.color.g}, ${region.color.b})"></div>
        <div class="palette-item__label">${region.label}</div>
        <div class="palette-item__value">rgb(${region.color.r}, ${region.color.g}, ${region.color.b})</div>
      `;
      this.paletteContainer.appendChild(colorItem);
    }
  }

  /** Скрывает палитру */
  public hide(): void {
    if (this.paletteSection) {
      this.paletteSection.classList.add("palette--hidden");
    }
  }
}
