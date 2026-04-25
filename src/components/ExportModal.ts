import { ColorRegion } from "@/ColorFantasy.types";

/**
 * Форматы экспорта
 */
export type ExportFormat = "A2" | "A3" | "A4" | "original";

/**
 * Размеры форматов в пикселях (при 300 DPI)
 */
export const FORMAT_SIZES: Record<ExportFormat, { width: number; height: number }> = {
  A2: { width: 4961, height: 7016 },
  A3: { width: 3508, height: 4961 },
  A4: { width: 2480, height: 3508 },
  original: { width: 0, height: 0 },
};

/**
 * Компонент модального окна экспорта
 * @class
 */
class ExportModal {
  private modalElement: HTMLElement | null = null;
  private onExport: ((format: ExportFormat, includePalette: boolean) => void) | null = null;

  constructor() {
    this.createModal();
  }

  /**
   * Создает DOM элемент модального окна экспорта
   * @returns {void}
   */
  private createModal(): void {
    const modal = document.createElement("div");
    modal.className = "color-fantasy__export-modal";
    modal.innerHTML = `
      <div class="color-fantasy__export-modal-overlay"></div>
      <div class="color-fantasy__export-modal-container">
        <h3 class="color-fantasy__export-modal-title">📄 Экспорт раскраски</h3>
        
        <div class="color-fantasy__export-option">
          <label class="color-fantasy__export-label">Формат:</label>
          <select class="color-fantasy__export-select" id="exportFormat">
            <option value="A4">📄 A4 (2480x3508px)</option>
            <option value="A3">📄 A3 (3508x4961px)</option>
            <option value="A2">📄 A2 (4961x7016px)</option>
            <option value="original">В оригинальном размере</option>
          </select>
        </div>

        <div class="color-fantasy__export-option">
          <label class="color-fantasy__export-checkbox">
            <input type="checkbox" id="includePalette" checked>
            <span>📊 Включить палитру цветов</span>
          </label>
        </div>

        <div class="color-fantasy__export-actions">
          <button class="color-fantasy__export-cancel">Отмена</button>
          <button class="color-fantasy__export-confirm">🎨 Экспортировать</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElement = modal;

    /** Закрытие по клику на оверлей */
    const overlay = modal.querySelector(".color-fantasy__export-modal-overlay");
    overlay?.addEventListener("click", () => this.hide());

    /** Кнопка отмены */
    const cancelBtn = modal.querySelector(".color-fantasy__export-cancel");
    cancelBtn?.addEventListener("click", () => this.hide());

    /** Кнопка подтверждения */
    const confirmBtn = modal.querySelector(".color-fantasy__export-confirm");
    confirmBtn?.addEventListener("click", () => {
      const formatSelect = document.getElementById("exportFormat") as HTMLSelectElement;
      const includePalette = (document.getElementById("includePalette") as HTMLInputElement).checked;
      const format = formatSelect.value as ExportFormat;
      this.onExport?.(format, includePalette);
      this.hide();
    });
  }

  /**
   * Показывает модальное окно экспорта
   * @param {(format: ExportFormat, includePalette: boolean) => void} onExport - колбэк экспорта
   * @returns {void}
   */
  public show(onExport: (format: ExportFormat, includePalette: boolean) => void): void {
    if (!this.modalElement) return;
    this.onExport = onExport;
    this.modalElement.classList.add("color-fantasy__export-modal--visible");
  }

  /**
   * Скрывает модальное окно экспорта
   * @returns {void}
   */
  public hide(): void {
    if (!this.modalElement) return;
    this.modalElement.classList.remove("color-fantasy__export-modal--visible");
  }
}

export default ExportModal;
