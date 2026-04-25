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

/** Кол-во цветов, которые будут использованы в раскраске */
const DESIRED_COLOR_COUNT = 20;
/**
 * Допустимое отклонение при сравнении цветов
 * Влияет на то, насколько похожие цвета будут считаться одной областью
 */
const REGION_TOLERANCE = 45;
/**
 * Минимальный размер области в пикселях
 * Области меньше этого размера будут отброшены как шум
 */
const MIN_REGION_SIZE = 5;
/** Допуск при объединении областей по цвету */
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

  /** Настройки обработки */
  private desiredColorCount: number = DESIRED_COLOR_COUNT;
  private regionTolerance: number = REGION_TOLERANCE;
  private mergeTolerance: number = COLOR_MERGE_TOLERANCE;
  private minRegionSize: number = MIN_REGION_SIZE;
  private use8Connectivity: boolean = false;

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

          <div class="settings-panel">
            <div class="settings__group">
              <h4 class="settings__group-title">🎨 Количество цветов</h4>
              <div class="settings__item">
                <label for="colorCount" class="settings__label">Цветов в раскраске:</label>
                <div class="settings__control">
                  <input type="range" id="colorCount" min="10" max="100" value="20" step="1" class="settings__slider">
                  <span id="colorCountValue" class="settings__value">20</span>
                </div>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">🔍 Чувствительность поиска областей</h4>
              <div class="settings__item">
                <label for="regionTolerance" class="settings__label">Чувствительность (1-100):</label>
                <div class="settings__control">
                  <input type="range" id="regionTolerance" min="10" max="100" value="45" step="5" class="settings__slider">
                  <span id="regionToleranceValue" class="settings__value">45</span>
                </div>
                <p class="settings__hint">⬇️ Меньше = точнее (больше областей) | ⬆️ Больше = грубее (меньше областей)</p>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">🎨 Объединение похожих цветов</h4>
              <div class="settings__item">
                <label for="mergeTolerance" class="settings__label">Порог объединения (1-100):</label>
                <div class="settings__control">
                  <input type="range" id="mergeTolerance" min="10" max="100" value="40" step="5" class="settings__slider">
                  <span id="mergeToleranceValue" class="settings__value">40</span>
                </div>
                <p class="settings__hint">⬇️ Меньше = меньше объединений | ⬆️ Больше = агрессивное объединение</p>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">📏 Размер области</h4>
              <div class="settings__item">
                <label for="minRegionSize" class="settings__label">Мин. размер области:</label>
                <div class="settings__control">
                  <input type="range" id="minRegionSize" min="1" max="50" value="5" step="1" class="settings__slider">
                  <span id="minRegionSizeValue" class="settings__value">5</span>
                </div>
                <p class="settings__hint">Мелкие области (шум) будут объединены с соседними</p>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">✏️ Стиль контуров</h4>
              <div class="settings__item">
                <label class="settings__checkbox">
                  <input type="checkbox" id="use8Connectivity" class="settings__checkbox-input">
                  <span class="settings__checkbox-label">Использовать 8-связность для границ</span>
                </label>
                <p class="settings__hint">⚠️ Делает контуры толще (обычно не нужно для раскраски)</p>
              </div>
            </div>
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

    /** Инициализация всех контролов */
    this.initSettingsControls();
  }

  /**
   * Инициализация всех контролов настроек
   * @returns {void}
   */
  private initSettingsControls(): void {
    /** Количество цветов (10-100) */
    const colorCountInput = document.getElementById("colorCount") as HTMLInputElement;
    const colorCountValue = document.getElementById("colorCountValue");

    if (colorCountInput) {
      this.desiredColorCount = parseInt(colorCountInput.value, 10);
      colorCountInput.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        this.desiredColorCount = parseInt(target.value, 10);
        if (colorCountValue) colorCountValue.textContent = target.value;
      });
    }

    /** Чувствительность поиска областей (10-100) */
    const regionToleranceInput = document.getElementById("regionTolerance") as HTMLInputElement;
    const regionToleranceValue = document.getElementById("regionToleranceValue");

    if (regionToleranceInput) {
      this.regionTolerance = parseInt(regionToleranceInput.value, 10);
      regionToleranceInput.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        this.regionTolerance = parseInt(target.value, 10);
        if (regionToleranceValue) regionToleranceValue.textContent = target.value;
      });
    }

    /** Порог объединения цветов (10-100) */
    const mergeToleranceInput = document.getElementById("mergeTolerance") as HTMLInputElement;
    const mergeToleranceValue = document.getElementById("mergeToleranceValue");

    if (mergeToleranceInput) {
      this.mergeTolerance = parseInt(mergeToleranceInput.value, 10);
      mergeToleranceInput.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        this.mergeTolerance = parseInt(target.value, 10);
        if (mergeToleranceValue) mergeToleranceValue.textContent = target.value;
      });
    }

    /** Минимальный размер области (1-50) */
    const minRegionSizeInput = document.getElementById("minRegionSize") as HTMLInputElement;
    const minRegionSizeValue = document.getElementById("minRegionSizeValue");

    if (minRegionSizeInput) {
      this.minRegionSize = parseInt(minRegionSizeInput.value, 10);
      minRegionSizeInput.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        this.minRegionSize = parseInt(target.value, 10);
        if (minRegionSizeValue) minRegionSizeValue.textContent = target.value;
      });
    }

    /** 8-связность для границ */
    const use8ConnectivityCheckbox = document.getElementById("use8Connectivity") as HTMLInputElement;

    if (use8ConnectivityCheckbox) {
      this.use8Connectivity = use8ConnectivityCheckbox.checked;
      use8ConnectivityCheckbox.addEventListener("change", e => {
        this.use8Connectivity = (e.target as HTMLInputElement).checked;
      });
    }
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
      console.log(`Настройки: tolerance=${this.regionTolerance}, minSize=${this.minRegionSize}`);

      /** Шаг 3: Находим связанные цветовые области (Flood Fill) */
      const finder = new RegionFinder(imageData, this.regionTolerance, this.minRegionSize);
      const rawRegions = finder.find();

      console.log(`Найдено областей до объединения: ${rawRegions.length}`);

      this.progress?.show(true, "Объединение похожих цветов...");

      /** Шаг 4: Объединяем области с настройками */
      const merger = new RegionMerger(this.mergeTolerance, imageData, this.canvas.width);
      this.regions = merger.merge(rawRegions);

      console.log(`Найдено областей после объединения: ${this.regions.length}`);

      /** Шаг 4.5: Сокращаем до желаемого количества цветов */
      if (this.desiredColorCount && this.desiredColorCount < this.regions.length) {
        this.progress?.show(true, `Сокращение до ${this.desiredColorCount} цветов...`);
        this.regions = merger.reduceToCount(this.regions, this.desiredColorCount);
        console.log(`После сокращения: ${this.regions.length} областей`);
      }

      this.progress?.show(true, "Создание контуров раскраски...");

      /** Шаг 5: Рисуем контуры областей */
      const drawer = new OutlineDrawer(this.ctx, this.canvas.width, this.canvas.height, this.use8Connectivity);
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
