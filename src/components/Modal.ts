/**
 * Компонент модального окна для просмотра изображения
 * @class
 */
export class Modal {
  private modalElement: HTMLElement | null = null;
  private imageElement: HTMLImageElement | null = null;
  private currentScale: number = 1;

  constructor() {
    this.createModal();
  }

  /**
   * Создает DOM элемент модального окна
   * @returns {void}
   */
  private createModal(): void {
    const modal = document.createElement("div");
    modal.className = "color-fantasy__modal";
    modal.innerHTML = `
      <div class="color-fantasy__modal-overlay"></div>
      <div class="color-fantasy__modal-container">
        <button class="color-fantasy__modal-close">&times;</button>
        <div class="color-fantasy__modal-content">
          <img class="color-fantasy__modal-image" alt="Увеличенная раскраска">
        </div>
        <div class="color-fantasy__modal-controls">
          <button class="color-fantasy__modal-zoom-in">🔍+</button>
          <button class="color-fantasy__modal-zoom-out">🔍-</button>
          <button class="color-fantasy__modal-reset">⟳ Сброс</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElement = modal;
    this.imageElement = modal.querySelector(".color-fantasy__modal-image");

    /** Закрытие по клику на оверлей или крестик */
    const closeBtn = modal.querySelector(".color-fantasy__modal-close");
    const overlay = modal.querySelector(".color-fantasy__modal-overlay");

    closeBtn?.addEventListener("click", () => this.hide());
    overlay?.addEventListener("click", () => this.hide());

    /** Закрытие по Escape */
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && this.isVisible()) {
        this.hide();
      }
    });

    /** Управление зумом */
    const zoomIn = modal.querySelector(".color-fantasy__modal-zoom-in");
    const zoomOut = modal.querySelector(".color-fantasy__modal-zoom-out");
    const reset = modal.querySelector(".color-fantasy__modal-reset");

    zoomIn?.addEventListener("click", () => this.zoom(1.2));
    zoomOut?.addEventListener("click", () => this.zoom(0.8));
    reset?.addEventListener("click", () => this.resetZoom());

    /** Клик по изображению */
    this.imageElement?.addEventListener("click", e => {
      if (!this.imageElement) return;

      this.zoom(e.shiftKey ? 0.8 : 1.2);
    });

    /** Следим за нажатием и отпусканием Shift глобально */
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Shift" && this.isVisible() && this.imageElement) {
        this.imageElement.style.cursor = "zoom-out";
      }
    });

    window.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Shift" && this.isVisible() && this.imageElement) {
        this.imageElement.style.cursor = "zoom-in";
      }
    });
  }

  /**
   * Показывает модальное окно с изображением
   * @param {string} imageSrc - источник изображения
   * @returns {void}
   */
  public show(imageSrc: string): void {
    if (!this.modalElement || !this.imageElement) return;
    this.imageElement.src = imageSrc;
    this.modalElement.classList.add("color-fantasy__modal--visible");

    this.resetZoom();
  }

  /**
   * Скрывает модальное окно
   * @returns {void}
   */
  public hide(): void {
    if (!this.modalElement) return;
    this.modalElement.classList.remove("color-fantasy__modal--visible");
  }

  /**
   * Проверяет, видимо ли модальное окно
   * @returns {boolean}
   */
  public isVisible(): boolean {
    return this.modalElement?.classList.contains("color-fantasy__modal--visible") || false;
  }

  /**
   * Изменяет масштаб изображения
   * @param {number} factor - множитель масштаба
   * @returns {void}
   */
  private zoom(factor: number): void {
    this.currentScale = this.currentScale * factor;
    this.changeStyle();
  }

  /**
   * Сбрасывает масштаб изображения
   * @returns {void}
   */
  private resetZoom(): void {
    this.currentScale = 1;
    this.changeStyle();
  }

  /**
   * Изменяет стиль элемента
   * @returns {void}
   */
  private changeStyle(): void {
    if (!this.imageElement) return;

    if (this.currentScale > 1) {
      this.imageElement.style.transformOrigin = "left top";
    } else {
      this.imageElement.style.transformOrigin = "center center";
    }

    this.imageElement.style.transform = `scale(${this.currentScale})`;
  }
}
