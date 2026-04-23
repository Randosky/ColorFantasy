/**
 * Компонент загрузки изображения
 * Обрабатывает выбор файла и drag-and-drop
 */
export class ImageUploader {
  private fileInput: HTMLInputElement;
  private dropZone: HTMLElement | null;
  private onImageLoaded: (img: HTMLImageElement) => void;

  /**
   * @param {Function} onImageLoaded - колбэк при загрузке изображения
   */
  constructor(onImageLoaded: (img: HTMLImageElement) => void) {
    this.onImageLoaded = onImageLoaded;
    this.fileInput = document.getElementById("imageUpload") as HTMLInputElement;
    this.dropZone = document.getElementById("dropZone");

    this.init();
  }

  /** Инициализация обработчиков событий */
  private init(): void {
    this.fileInput?.addEventListener("change", e => this.handleFileSelect(e));
    this.initDragAndDrop();
  }

  /** Обработка выбора файла через диалог */
  private handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.loadImage(file);
  }

  /** Обработка drag-and-drop */
  private initDragAndDrop(): void {
    if (!this.dropZone) return;

    this.dropZone.addEventListener("dragover", e => {
      e.preventDefault();
      this.dropZone?.classList.add("upload-section__area--drag");
    });

    this.dropZone.addEventListener("dragleave", () => {
      this.dropZone?.classList.remove("upload-section__area--drag");
    });

    this.dropZone.addEventListener("drop", e => {
      e.preventDefault();
      this.dropZone?.classList.remove("upload-section__area--drag");

      const files = (e as DragEvent).dataTransfer?.files;
      if (files && files[0] && files[0].type.startsWith("image/")) {
        if (this.fileInput) this.fileInput.files = files;
        this.loadImage(files[0]);
      }
    });
  }

  /** Загрузка изображения в память */
  private loadImage(file: File): void {
    const reader = new FileReader();

    reader.onload = e => {
      const img = new Image();
      img.onload = () => this.onImageLoaded(img);
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  }

  /** Сброс состояния загрузчика */
  public reset(): void {
    if (this.fileInput) this.fileInput.value = "";
  }
}
