import "./ColorFantasy.css";
import { ColorRegion } from "./ColorFantasy.types";
import { ColorPalette } from "./components/ColorPalette";
import { Controls } from "./components/Controls";
import { ImageUploader } from "./components/ImageUploader";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { OutlineDrawer } from "./services/OutlineDrawer";
import { RegionFinder } from "./services/RegionFinder";
import { RegionMerger } from "./services/RegionMerger";
import "./styles/global.css";

/**
 * TODO
 *
 * Области, которые не подходят под мин размер не отбрасывать, а объединять с ближайшим регионом
 * isBorderPixel - уточнить почему нужно проверять по 4, а не 8 направлениям
 * Выводить нормальный label в нужном месте
 * Не рисовать границу, если у другой области уже нарисована граница
 * Сделать контрол для ввода желаемого количества цветов, но основе этого придумать как сделать разбиение на определенное количество цветов
 */

/**
 * Допустимое отклонение при сравнении цветов
 * Влияет на то, насколько похожие цвета будут считаться одной областью
 */
const REGION_TOLERANCE = 45;

/**
 * Минимальный размер области в пикселях
 * Области меньше этого размера будут отброшены как шум
 */
const MIN_REGION_SIZE = 1;

/**
 * Допуск при объединении областей по цвету
 */
const COLOR_MERGE_TOLERANCE = 40;

/**
 * Основной класс проекта создания раскраски из картинки
 * @class
 */
class ColorFantasy {
  /** Канвас, на котором рисуем */
  private canvas: HTMLCanvasElement | null = null;
  /** Контекст канваса */
  private ctx: CanvasRenderingContext2D | null = null;
  /** Загруженное изображение */
  private originalImage: HTMLImageElement | null = null;
  /** Входной элемент */
  private appElement: HTMLElement | null = null;

  /** Компоненты */
  private imageUploader: ImageUploader | null = null;
  private controls: Controls | null = null;
  private palette: ColorPalette | null = null;
  private progress: ProgressIndicator | null = null;

  /** Найденные цветовые области */
  private regions: ColorRegion[] = [];

  constructor() {
    this.render();
    this.initComponents();
  }

  public destroy(): void {
    if (this.appElement) {
      this.appElement.innerHTML = "";
    }
  }

  /** Рендер HTML структуры */
  private render(): void {
    const app = document.getElementById("app");
    if (!app) return;

    this.appElement = app;
    app.className = "color-fantasy";

    app.innerHTML = `
      <header class="color-fantasy__header">
        <h1 class="color-fantasy__title">✨ Color Fantasy ✨</h1>
        <p class="color-fantasy__subtitle">Создайте раскраску из вашего изображения</p>
      </header>

      <main>
        <div class="upload-section">
          <div class="upload-section__area" id="dropZone">
            <input type="file" id="imageUpload" accept="image/*,.png,.jpg,.jpeg,.webp" class="upload-section__input">
            <label for="imageUpload" class="upload-section__label">
              <span class="upload-section__icon">🖼️</span>
              <span class="upload-section__text">Выберите изображение</span>
              <span class="upload-section__hint">или перетащите его сюда</span>
            </label>
          </div>

          <div class="controls">
            <button id="processBtn" class="btn btn--primary" disabled>
              <span>🎨</span> Создать раскраску
            </button>
            <button id="downloadBtn" class="btn btn--secondary" disabled>
              <span>💾</span> Скачать
            </button>
            <button id="resetBtn" class="btn btn--outline">
              <span>🔄</span> Сбросить
            </button>
          </div>
        </div>

        <div class="images-container">
          <div class="image-card">
            <h3 class="image-card__title">Исходное изображение</h3>
            <div id="originalImageContainer" class="image-card__wrapper">
              <p class="image-card__placeholder">
                <span class="image-card__placeholder-icon">📸</span>
                <span>Загрузите изображение</span>
              </p>
            </div>
          </div>

          <div class="image-card">
            <h3 class="image-card__title">Готовая раскраска</h3>
            <div id="coloringContainer" class="image-card__wrapper">
              <canvas id="coloringCanvas" class="image-card__canvas"></canvas>
            </div>
          </div>
        </div>

        <div id="paletteSection" class="palette palette--hidden">
          <h3 class="palette__title">
            <span>🎨</span> Палитра цветов
            <span class="palette__count"></span>
          </h3>
          <div id="colorPalette" class="palette__grid"></div>
        </div>
      </main>

      <footer class="color-fantasy__footer">
        <p class="color-fantasy__footer-text">❤️ Каждая область - один цвет из палитры</p>
      </footer>

      <div id="progressIndicator" class="progress progress--hidden">
        <div class="progress__spinner"></div>
        <p class="progress__text">Обработка изображения...</p>
        <p class="progress__subtext" id="progressSubtext"></p>
      </div>
    `;

    this.canvas = document.getElementById("coloringCanvas") as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }
  }

  /** Инициализация компонентов */
  private initComponents(): void {
    this.progress = new ProgressIndicator();
    this.palette = new ColorPalette();

    this.imageUploader = new ImageUploader(img => this.onImageLoaded(img));
    this.controls = new Controls(
      () => this.processImage(),
      () => this.downloadColoring(),
      () => this.reset()
    );
  }

  /**
   * Отображает загруженную картинку в превью
   * @param {HTMLImageElement} img - загруженное изображение
   */
  private displayOriginalImage(img: HTMLImageElement): void {
    const container = document.getElementById("originalImageContainer");
    if (!container) return;

    container.innerHTML = "";
    const displayImg = document.createElement("img");
    displayImg.src = img.src;
    displayImg.className = "image-card__image";
    container.appendChild(displayImg);
  }

  /**
   * Колбэк после загрузки изображения
   * @param {HTMLImageElement} img - загруженное изображение
   */
  private onImageLoaded(img: HTMLImageElement): void {
    this.originalImage = img;
    this.displayOriginalImage(img);
    this.controls?.setButtonsState(true, false);
  }

  /**
   * Основной процесс обработки изображения и создания раскраски
   * @returns {Promise<void>}
   */
  private async processImage(): Promise<void> {
    if (!this.originalImage || !this.canvas || !this.ctx) return;

    this.progress?.show(true, "Подготовка изображения...");

    /** Небольшая задержка для отображения прогресса */
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      /** Шаг 1: Устанавливаем размеры канваса под изображение */
      this.canvas.width = this.originalImage.width;
      this.canvas.height = this.originalImage.height;
      this.ctx.drawImage(this.originalImage, 0, 0);

      /** Шаг 2: Получаем пиксельные данные изображения */
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height, { colorSpace: "srgb" });

      this.progress?.show(true, "Поиск цветовых областей...");

      /** Шаг 3: Находим связанные цветовые области (Flood Fill) */
      const finder = new RegionFinder(imageData, REGION_TOLERANCE, MIN_REGION_SIZE);
      const rawRegions = finder.find();

      console.log(`Найдено областей до объединения: ${rawRegions.length}`);

      this.progress?.show(true, "Объединение похожих цветов...");

      /** Шаг 4: Объединяем области с похожими цветами */
      const merger = new RegionMerger(COLOR_MERGE_TOLERANCE);
      this.regions = merger.merge(rawRegions);

      console.log(`Найдено областей после объединения: ${this.regions.length}`);

      this.progress?.show(true, "Создание контуров раскраски...");

      /** Шаг 5: Рисуем контуры областей */
      const drawer = new OutlineDrawer(this.ctx, this.canvas.width, this.canvas.height);
      drawer.drawOutlines(this.regions);
      drawer.drawLabels(this.regions);

      /** Шаг 6: Показываем палитру цветов */
      this.palette?.display(this.regions);

      /** Включаем кнопку скачивания */
      this.controls?.setButtonsState(true, true);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Произошла ошибка при обработке изображения");
    } finally {
      this.progress?.show(false);
    }
  }

  /** Скачивание готовой раскраски в PNG */
  private downloadColoring(): void {
    if (!this.canvas) return;
    const link = document.createElement("a");
    link.download = `coloring-${Date.now()}.png`;
    link.href = this.canvas.toDataURL("image/png");
    link.click();
  }

  /** Полный сброс состояния приложения */
  private reset(): void {
    /** Очищаем данные */
    this.originalImage = null;
    this.regions = [];

    /** Очищаем канвас */
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /** Восстанавливаем плейсхолдер оригинального изображения */
    const originalContainer = document.getElementById("originalImageContainer");
    if (originalContainer) {
      originalContainer.innerHTML = `
        <p class="image-card__placeholder">
          <span class="image-card__placeholder-icon">📸</span>
          <span>Загрузите изображение</span>
        </p>
      `;
    }

    /** Скрываем палитру */
    this.palette?.hide();

    /** Сбрасываем состояние кнопок */
    this.controls?.setButtonsState(false, false);

    /** Сбрасываем загрузчик файлов */
    this.imageUploader?.reset();
  }
}

/**
 * Экспорт в глобальный объект window
 */
if (typeof window !== "undefined") {
  window.ColorFantasy = ColorFantasy;
}

/**
 * Инициализация страницы после загрузки DOM
 * @returns {void}
 */
const initColorFantasy = (): void => {
  new ColorFantasy();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initColorFantasy);
} else {
  initColorFantasy();
}

export default ColorFantasy;
