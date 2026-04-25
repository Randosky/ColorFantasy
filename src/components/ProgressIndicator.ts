/**
 * Компонент индикатора загрузки
 * @class
 */
export class ProgressIndicator {
  private progressElement: HTMLElement | null;

  constructor() {
    this.progressElement = document.getElementById("progressIndicator");
  }

  /**
   * Показывает или скрывает индикатор
   * @param {boolean} show - показать/скрыть
   * @returns {void}
   */
  public show = (show: boolean): void => {
    if (!this.progressElement) return;

    if (show) {
      this.progressElement.classList.remove("progress--hidden");
    } else {
      this.progressElement.classList.add("progress--hidden");
    }
  };

  /**
   * Обновляет текст прогресса
   * @param {string} text - текст прогресса
   * @returns {Promise<void>} - промис
   */
  public updateText = async (text: string): Promise<void> => {
    const progressText = document.getElementById("progressText");

    if (progressText) progressText.textContent = text;

    await new Promise(resolve => requestAnimationFrame(resolve));
    /** Небольшая задержка для отображения прогресса */
    await new Promise(resolve => setTimeout(resolve, 50));
  };
}
