import "./ColorFantasy.css";
import { ColorRegion } from "./ColorFantasy.types";
import { BackgroundRemover } from "./components/BackgroundRemover";
import { ColorPalette } from "./components/ColorPalette";
import { Controls } from "./components/Controls";
import ExportModal, { ExportFormat } from "./components/ExportModal";
import { ImageUploader } from "./components/ImageUploader";
import { Modal } from "./components/Modal";
import { PRESETS, PresetManager, ProcessingPreset } from "./components/PresetManager";
import { PreviewMode } from "./components/PreviewMode";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { Exporter } from "./services/Exporter";
import { OutlineDrawer } from "./services/OutlineDrawer";
import { RegionFinder } from "./services/RegionFinder";
import { RegionMerger } from "./services/RegionMerger";
import "./styles/global.css";

/** Базовые настройки (по умолчанию) */

/**
 * Допустимое отклонение при сравнении цветов
 * Влияет на то, насколько похожие цвета будут считаться одной областью
 */
const DEFAULT_REGION_TOLERANCE = 45;
/** Допуск при объединении областей по цвету */
const DEFAULT_MERGE_TOLERANCE = 40;
/**
 * Минимальный размер области в пикселях
 * Области меньше этого размера будут отброшены как шум
 */
const DEFAULT_MIN_REGION_SIZE = 5;
/** Кол-во цветов, которые будут использованы в раскраске */
const DEFAULT_COLOR_COUNT = 40;

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
  private modal: Modal | null = null;
  private exportModal: ExportModal | null = null;
  private previewMode: PreviewMode | null = null;
  private presetManager: PresetManager | null = null;
  private backgroundRemover: BackgroundRemover | null = null;

  /** Настройки обработки */
  private desiredColorCount: number = DEFAULT_COLOR_COUNT;
  private useColorCountLimit: boolean = true;
  private regionTolerance: number = DEFAULT_REGION_TOLERANCE;
  private mergeTolerance: number = DEFAULT_MERGE_TOLERANCE;
  private minRegionSize: number = DEFAULT_MIN_REGION_SIZE;
  private use8Connectivity: boolean = false;
  private isPreviewMode: boolean = false;
  private removeBackgroundEnabled: boolean = false;
  private backgroundTolerance: number = 30;

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

          <div id="presetContainer"></div>

          <div class="settings-panel">
            <div class="settings__group">
              <h4 class="settings__group-title">🎨 Количество цветов</h4>
              <div class="settings__item">
                <label class="settings__checkbox">
                  <input type="checkbox" id="useColorCountLimit" class="settings__checkbox-input" checked>
                  <span class="settings__checkbox-label">Ограничить количество цветов</span>
                </label>
              </div>
              <div class="settings__item">
                <label for="colorCount" class="settings__label">Максимум цветов:</label>
                <div class="settings__control">
                  <input type="range" id="colorCount" min="2" max="100" value="${DEFAULT_COLOR_COUNT}" step="1" class="settings__slider" disabled>
                  <input type="number" id="colorCountNumber" min="2" max="100" value="${DEFAULT_COLOR_COUNT}" step="1" class="settings__number" disabled>
                </div>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">🔍 Поиск областей</h4>
              <div class="settings__item">
                <label for="regionTolerance" class="settings__label">Чувствительность (0-100):</label>
                <div class="settings__control">
                  <input type="range" id="regionTolerance" min="0" max="100" value="${DEFAULT_REGION_TOLERANCE}" step="5" class="settings__slider">
                  <span id="regionToleranceValue" class="settings__value">${DEFAULT_REGION_TOLERANCE}</span>
                </div>
                <p class="settings__hint">⬇️ 0 = точнее (больше областей) | ⬆️ 100 = грубее (меньше областей)</p>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">🎨 Объединение цветов</h4>
              <div class="settings__item">
                <label for="mergeTolerance" class="settings__label">Порог объединения (0-100):</label>
                <div class="settings__control">
                  <input type="range" id="mergeTolerance" min="0" max="100" value="${DEFAULT_MERGE_TOLERANCE}" step="5" class="settings__slider">
                  <span id="mergeToleranceValue" class="settings__value">${DEFAULT_MERGE_TOLERANCE}</span>
                </div>
                <p class="settings__hint">⬇️ 0 = не объединять | ⬆️ 100 = агрессивное объединение</p>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">📏 Размер области</h4>
              <div class="settings__item">
                <label for="minRegionSize" class="settings__label">Мин. размер области:</label>
                <div class="settings__control">
                  <input type="range" id="minRegionSize" min="1" max="50" value="${DEFAULT_MIN_REGION_SIZE}" step="1" class="settings__slider">
                  <span id="minRegionSizeValue" class="settings__value">${DEFAULT_MIN_REGION_SIZE}</span>
                </div>
                <p class="settings__hint">Мелкие области будут объединены с соседними</p>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">🖼️ Фон</h4>
              <div class="settings__item">
                <label class="settings__checkbox">
                  <input type="checkbox" id="removeBackground" class="settings__checkbox-input">
                  <span class="settings__checkbox-label">Удалить фон (сделать белым)</span>
                </label>
              </div>
              <div class="settings__item">
                <label for="backgroundTolerance" class="settings__label">Чувствительность удаления фона:</label>
                <div class="settings__control">
                  <input type="range" id="backgroundTolerance" min="10" max="80" value="30" step="5" class="settings__slider" disabled>
                  <span id="backgroundToleranceValue" class="settings__value">30</span>
                </div>
              </div>
            </div>

            <div class="settings__group">
              <h4 class="settings__group-title">✏️ Стиль отображения</h4>
              <div class="settings__item">
                <label class="settings__checkbox">
                  <input type="checkbox" id="use8Connectivity" class="settings__checkbox-input">
                  <span class="settings__checkbox-label">Использовать 8-связность для границ</span>
                </label>
                <p class="settings__hint">⚠️ Делает контуры толще (обычно не нужно для раскраски)</p>
              </div>
            </div>

            <div class="settings__group">
              <label class="switch">
                <input type="checkbox" id="previewModeSwitch">
                <span class="slider round"></span>
              </label>
              <span class="switch-label">🎨 Режим предпросмотра (цвета областей)</span>
            </div>
          </div>

          <div class="controls">
            <button id="processBtn" class="btn btn--primary" disabled>
              <span>🎨</span> Создать раскраску
            </button>
            <button id="exportBtn" class="btn btn--secondary" disabled>
              <span>💾</span> Экспорт
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
        <p class="progress__text" id="progressText"></p>
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
    this.modal = new Modal();
    this.exportModal = new ExportModal();
    this.presetManager = new PresetManager();

    this.imageUploader = new ImageUploader(img => this.onImageLoaded(img));
    this.controls = new Controls(
      () => this.processImage(),
      () => this.exportColoring(),
      () => this.reset()
    );

    /** Инициализация всех контролов */
    this.initSettingsControls();

    /** Клик по канвасу для открытия модального окна */
    this.canvas?.addEventListener("click", () => {
      if (this.canvas) {
        this.modal?.show(this.canvas.toDataURL());
      }
    });

    /** Добавляем пресеты */
    const presetContainer = document.getElementById("presetContainer");
    if (presetContainer && this.presetManager) {
      presetContainer.appendChild(this.presetManager.render());
    }

    /** Пресеты */
    this.presetManager?.onChange((preset: ProcessingPreset) => {
      this.regionTolerance = preset.regionTolerance;
      this.mergeTolerance = preset.mergeTolerance;
      this.minRegionSize = preset.minRegionSize;
      this.desiredColorCount = preset.desiredColorCount;
      this.useColorCountLimit = true;

      /** Обновляем UI */
      const regionSlider = document.getElementById("regionTolerance") as HTMLInputElement;
      const regionValue = document.getElementById("regionToleranceValue");
      const mergeSlider = document.getElementById("mergeTolerance") as HTMLInputElement;
      const mergeValue = document.getElementById("mergeToleranceValue");
      const minSizeSlider = document.getElementById("minRegionSize") as HTMLInputElement;
      const minSizeValue = document.getElementById("minRegionSizeValue");
      const colorCountSlider = document.getElementById("colorCount") as HTMLInputElement;
      const colorCountNumber = document.getElementById("colorCountNumber") as HTMLInputElement;
      const useLimitCheckbox = document.getElementById("useColorCountLimit") as HTMLInputElement;

      if (regionSlider && regionValue) {
        regionSlider.value = preset.regionTolerance.toString();
        regionValue.textContent = preset.regionTolerance.toString();
      }
      if (mergeSlider && mergeValue) {
        mergeSlider.value = preset.mergeTolerance.toString();
        mergeValue.textContent = preset.mergeTolerance.toString();
      }
      if (minSizeSlider && minSizeValue) {
        minSizeSlider.value = preset.minRegionSize.toString();
        minSizeValue.textContent = preset.minRegionSize.toString();
      }
      if (colorCountSlider && colorCountNumber) {
        colorCountSlider.value = preset.desiredColorCount.toString();
        colorCountNumber.value = preset.desiredColorCount.toString();
      }
      if (useLimitCheckbox) {
        useLimitCheckbox.checked = true;
        this.toggleColorCountInputs(true);
      }
    });
  }

  /**
   * Включает/отключает контролы количества цветов
   * @param {boolean} enabled - включен ли лимит
   * @returns {void}
   */
  private toggleColorCountInputs(enabled: boolean): void {
    const colorSlider = document.getElementById("colorCount") as HTMLInputElement;
    const colorNumber = document.getElementById("colorCountNumber") as HTMLInputElement;
    if (colorSlider) colorSlider.disabled = !enabled;
    if (colorNumber) colorNumber.disabled = !enabled;
  }

  /**
   * Инициализация всех контролов настроек
   * @returns {void}
   */
  private initSettingsControls(): void {
    /** Лимит количества цветов */
    const useLimitCheckbox = document.getElementById("useColorCountLimit") as HTMLInputElement;
    const colorCountSlider = document.getElementById("colorCount") as HTMLInputElement;
    const colorCountNumber = document.getElementById("colorCountNumber") as HTMLInputElement;

    if (useLimitCheckbox) {
      this.useColorCountLimit = useLimitCheckbox.checked;
      this.toggleColorCountInputs(this.useColorCountLimit);
      useLimitCheckbox.addEventListener("change", e => {
        this.useColorCountLimit = (e.target as HTMLInputElement).checked;
        this.toggleColorCountInputs(this.useColorCountLimit);
      });
    }

    /** Слайдер и инпут для количества цветов */
    const updateColorCount = (value: number) => {
      this.desiredColorCount = value;
      if (colorCountSlider) colorCountSlider.value = value.toString();
      if (colorCountNumber) colorCountNumber.value = value.toString();
    };

    colorCountSlider?.addEventListener("input", e => {
      updateColorCount(parseInt((e.target as HTMLInputElement).value, 10));
    });
    colorCountNumber?.addEventListener("input", e => {
      updateColorCount(parseInt((e.target as HTMLInputElement).value, 10));
    });

    /** Чувствительность поиска областей (0-100) */
    const regionSlider = document.getElementById("regionTolerance") as HTMLInputElement;
    const regionValue = document.getElementById("regionToleranceValue");
    if (regionSlider && regionValue) {
      this.regionTolerance = parseInt(regionSlider.value, 10);
      regionSlider.addEventListener("input", e => {
        this.regionTolerance = parseInt((e.target as HTMLInputElement).value, 10);
        regionValue.textContent = this.regionTolerance.toString();
      });
    }

    /** Порог объединения (0-100) */
    const mergeSlider = document.getElementById("mergeTolerance") as HTMLInputElement;
    const mergeValue = document.getElementById("mergeToleranceValue");
    if (mergeSlider && mergeValue) {
      this.mergeTolerance = parseInt(mergeSlider.value, 10);
      mergeSlider.addEventListener("input", e => {
        this.mergeTolerance = parseInt((e.target as HTMLInputElement).value, 10);
        mergeValue.textContent = this.mergeTolerance.toString();
      });
    }

    /** Минимальный размер области */
    const minSizeSlider = document.getElementById("minRegionSize") as HTMLInputElement;
    const minSizeValue = document.getElementById("minRegionSizeValue");
    if (minSizeSlider && minSizeValue) {
      this.minRegionSize = parseInt(minSizeSlider.value, 10);
      minSizeSlider.addEventListener("input", e => {
        this.minRegionSize = parseInt((e.target as HTMLInputElement).value, 10);
        minSizeValue.textContent = this.minRegionSize.toString();
      });
    }

    /** 8-связность */
    const connectivityCheckbox = document.getElementById("use8Connectivity") as HTMLInputElement;
    if (connectivityCheckbox) {
      this.use8Connectivity = connectivityCheckbox.checked;
      connectivityCheckbox.addEventListener("change", e => {
        this.use8Connectivity = (e.target as HTMLInputElement).checked;
      });
    }

    /** Режим предпросмотра */
    const previewSwitch = document.getElementById("previewModeSwitch") as HTMLInputElement;
    if (previewSwitch) {
      this.isPreviewMode = previewSwitch.checked;
      previewSwitch.addEventListener("change", e => {
        this.isPreviewMode = (e.target as HTMLInputElement).checked;
        if (this.regions.length && this.ctx && this.canvas) {
          this.redrawColoring();
        }
      });
    }

    /** Удаление фона */
    const removeBgCheckbox = document.getElementById("removeBackground") as HTMLInputElement;
    const bgToleranceSlider = document.getElementById("backgroundTolerance") as HTMLInputElement;
    const bgToleranceValue = document.getElementById("backgroundToleranceValue");

    if (removeBgCheckbox && bgToleranceSlider) {
      this.removeBackgroundEnabled = removeBgCheckbox.checked;
      bgToleranceSlider.disabled = !this.removeBackgroundEnabled;
      removeBgCheckbox.addEventListener("change", e => {
        this.removeBackgroundEnabled = (e.target as HTMLInputElement).checked;
        bgToleranceSlider.disabled = !this.removeBackgroundEnabled;
      });
    }

    if (bgToleranceSlider && bgToleranceValue) {
      this.backgroundTolerance = parseInt(bgToleranceSlider.value, 10);
      bgToleranceSlider.addEventListener("input", e => {
        this.backgroundTolerance = parseInt((e.target as HTMLInputElement).value, 10);
        bgToleranceValue.textContent = this.backgroundTolerance.toString();
      });
    }
  }

  /**
   * Перерисовывает готовую раскраску (для предпросмотра)
   * @returns {void}
   */
  private redrawColoring(): void {
    if (!this.ctx || !this.canvas || !this.regions.length) return;

    if (this.isPreviewMode && this.previewMode) {
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.previewMode.render(this.regions);
    } else {
      const drawer = new OutlineDrawer(this.ctx, this.canvas.width, this.canvas.height, this.use8Connectivity);
      drawer.drawOutlines(this.regions);
      drawer.drawLabels(this.regions);
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

    this.progress?.show(true);
    await this.progress?.updateText("Подготовка изображения...");

    try {
      /** Шаг 1: Устанавливаем размеры канваса под изображение */
      this.canvas.width = this.originalImage.width;
      this.canvas.height = this.originalImage.height;
      this.ctx.drawImage(this.originalImage, 0, 0);

      /** Шаг 2: Получаем пиксельные данные изображения */
      let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height, { colorSpace: "srgb" });

      /** Шаг 2.5: Удаление фона (опционально) */
      if (this.removeBackgroundEnabled) {
        await this.progress?.updateText("Удаление фона...");
        this.backgroundRemover = new BackgroundRemover(this.ctx, this.canvas.width, this.canvas.height);
        this.backgroundRemover.setImageData(imageData);
        const newCanvas = this.backgroundRemover.applyAndRender(this.backgroundTolerance);
        if (newCanvas) {
          this.ctx.drawImage(newCanvas, 0, 0);
          imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height, { colorSpace: "srgb" });
        }
      }

      await this.progress?.updateText("Поиск цветовых областей...");

      /** Шаг 3: Находим связанные цветовые области */
      const finder = new RegionFinder(imageData, this.regionTolerance, this.minRegionSize);
      const rawRegions = finder.find();

      console.log(`Найдено областей до объединения: ${rawRegions.length}`);
      await this.progress?.updateText(`Найдено ${rawRegions.length} областей, объединение...`);

      /** Шаг 4: Объединяем области с настройками */
      const merger = new RegionMerger(this.mergeTolerance, imageData, this.canvas.width);
      this.regions = merger.merge(rawRegions);

      console.log(`Найдено областей после объединения: ${this.regions.length}`);

      /** Шаг 4.5: Сокращаем до желаемого количества цветов (если включено) */
      if (this.useColorCountLimit && this.desiredColorCount < this.regions.length) {
        await this.progress?.updateText(`Сокращение до ${this.desiredColorCount} цветов...`);
        this.regions = merger.reduceToCount(this.regions, this.desiredColorCount);
        console.log(`После сокращения: ${this.regions.length} областей`);
      }

      await this.progress?.updateText("Создание контуров раскраски...");

      /** Шаг 5: Создаём режим предпросмотра */
      this.previewMode = new PreviewMode(this.ctx, this.canvas.width, this.canvas.height);
      if (this.isPreviewMode) {
        this.previewMode.activate();
      }

      /** Шаг 6: Рисуем результат */
      this.redrawColoring();

      /** Шаг 7: Показываем палитру цветов */
      this.palette?.display(this.regions);

      /** Включаем кнопки */
      this.controls?.setButtonsState(true, true);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Произошла ошибка при обработке изображения");
    } finally {
      this.progress?.show(false);
    }
  }

  /** Экспорт раскраски */
  private exportColoring(): void {
    if (!this.canvas || !this.regions.length) return;

    this.exportModal?.show((format: ExportFormat, includePalette: boolean) => {
      const exporter = new Exporter(this.canvas!, this.regions);
      exporter.download(format, includePalette);
    });
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
