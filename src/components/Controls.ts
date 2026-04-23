/** 
 * Компонент управления кнопками
 */
export class Controls {
  private processBtn: HTMLButtonElement;
  private downloadBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private onProcess: () => void;
  private onDownload: () => void;
  private onReset: () => void;
  
  /**
   * @param {Function} onProcess - обработчик создания раскраски
   * @param {Function} onDownload - обработчик скачивания
   * @param {Function} onReset - обработчик сброса
   */
  constructor(
    onProcess: () => void,
    onDownload: () => void,
    onReset: () => void
  ) {
    this.onProcess = onProcess;
    this.onDownload = onDownload;
    this.onReset = onReset;
    
    this.processBtn = document.getElementById("processBtn") as HTMLButtonElement;
    this.downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;
    this.resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
    
    this.init();
  }
  
  /** Инициализация обработчиков */
  private init(): void {
    this.processBtn?.addEventListener("click", () => this.onProcess());
    this.downloadBtn?.addEventListener("click", () => this.onDownload());
    this.resetBtn?.addEventListener("click", () => this.onReset());
  }
  
  /** Включает/выключает кнопки */
  public setButtonsState(processEnabled: boolean, downloadEnabled: boolean): void {
    if (this.processBtn) this.processBtn.disabled = !processEnabled;
    if (this.downloadBtn) this.downloadBtn.disabled = !downloadEnabled;
  }
}