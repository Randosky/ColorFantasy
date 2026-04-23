/**
 * Компонент индикатора загрузки
 */
export class ProgressIndicator {
  private progressElement: HTMLElement | null;
  private subtextElement: HTMLElement | null;

  constructor() {
    this.progressElement = document.getElementById("progressIndicator");
    this.subtextElement = document.getElementById("progressSubtext");
  }

  /**
   * Показывает или скрывает индикатор
   * @param {boolean} show - показать/скрыть
   * @param {string=} text - текст для отображения (опционально)
   */
  public show(show: boolean, text?: string): void {
    if (!this.progressElement) return;

    if (show) {
      this.progressElement.classList.remove("progress--hidden");
      if (text && this.subtextElement) {
        this.subtextElement.textContent = text;
      }
    } else {
      this.progressElement.classList.add("progress--hidden");
    }
  }
}
