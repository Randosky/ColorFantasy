/**
 * Компонент управления кнопками
 */
export class Controls {
  private processBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private onProcess: () => void;
  private onExport: () => void;
  private onReset: () => void;

  /**
   * @param {Function} onProcess - обработчик создания раскраски
   * @param {Function} onExport - обработчик скачивания
   * @param {Function} onReset - обработчик сброса
   */
  constructor(onProcess: () => void, onExport: () => void, onReset: () => void) {
    this.onProcess = onProcess;
    this.onExport = onExport;
    this.onReset = onReset;

    this.processBtn = document.getElementById("processBtn") as HTMLButtonElement;
    this.exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
    this.resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

    this.init();
  }

  /** Инициализация обработчиков */
  private init(): void {
    this.processBtn?.addEventListener("click", () => this.onProcess());
    this.exportBtn?.addEventListener("click", () => this.onExport());
    this.resetBtn?.addEventListener("click", () => this.onReset());
  }

  /** Включает/выключает кнопки */
  public setButtonsState(processEnabled: boolean, exportEnabled: boolean): void {
    if (this.processBtn) this.processBtn.disabled = !processEnabled;
    if (this.exportBtn) this.exportBtn.disabled = !exportEnabled;
  }
}
