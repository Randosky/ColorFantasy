/**
 * Настройки обработки изображения
 */
export interface ProcessingPreset {
  name: string;
  description: string;
  regionTolerance: number;
  mergeTolerance: number;
  minRegionSize: number;
  desiredColorCount: number;
}

/**
 * Пресеты настроек для разных типов изображений
 */
export const PRESETS: Record<string, ProcessingPreset> = {
  /** Высокая детализация - сохраняем все мелкие детали */
  highDetail: {
    name: "🔍 Высокая детализация",
    description: "Сохраняет много мелких областей, идеально для сложных изображений",
    regionTolerance: 25,
    mergeTolerance: 20,
    minRegionSize: 3,
    desiredColorCount: 80,
  },
  /** Средняя детализация - баланс */
  balanced: {
    name: "⚖️ Сбалансированный",
    description: "Хороший баланс между детализацией и количеством областей",
    regionTolerance: 45,
    mergeTolerance: 40,
    minRegionSize: 5,
    desiredColorCount: 40,
  },
  /** Низкая детализация - для простых раскрасок */
  simple: {
    name: "🎨 Простая раскраска",
    description: "Крупные области, идеально для детей",
    regionTolerance: 70,
    mergeTolerance: 65,
    minRegionSize: 10,
    desiredColorCount: 20,
  },
  /** Контурный режим - только основные границы */
  outline: {
    name: "✏️ Только контуры",
    description: "Минимум областей, только основные формы",
    regionTolerance: 90,
    mergeTolerance: 85,
    minRegionSize: 15,
    desiredColorCount: 10,
  },
  /** Реалистичный - для фотографий */
  realistic: {
    name: "📸 Реалистичный",
    description: "Для фотографий, много градаций цветов",
    regionTolerance: 35,
    mergeTolerance: 30,
    minRegionSize: 4,
    desiredColorCount: 60,
  },
};

/**
 * Класс для управления пресетами настроек
 * @class
 */
export class PresetManager {
  private presetSelect: HTMLSelectElement | null = null;
  private onPresetChange: ((preset: ProcessingPreset) => void) | null = null;

  /**
   * Создает DOM элемент выбора пресета
   * @returns {HTMLElement} элемент выбора пресета
   */
  public render(): HTMLElement {
    const container = document.createElement("div");
    container.className = "settings__group";
    container.innerHTML = `
      <h4 class="settings__group-title">🎯 Быстрые пресеты</h4>
      <div class="settings__item">
        <label for="presetSelect" class="settings__label">Выберите пресет:</label>
        <select id="presetSelect" class="settings__select">
          ${Object.entries(PRESETS)
            .map(([key, preset]) => `<option value="${key}">${preset.name} - ${preset.description}</option>`)
            .join("")}
        </select>
      </div>
    `;

    this.presetSelect = container.querySelector("#presetSelect");

    this.presetSelect?.addEventListener("change", e => {
      const key = (e.target as HTMLSelectElement).value;
      const preset = PRESETS[key];
      if (preset && this.onPresetChange) {
        this.onPresetChange(preset);
      }
    });

    return container;
  }

  /**
   * Устанавливает колбэк при изменении пресета
   * @param {(preset: ProcessingPreset) => void} callback - колбэк
   * @returns {void}
   */
  public onChange(callback: (preset: ProcessingPreset) => void): void {
    this.onPresetChange = callback;
  }

  /**
   * Устанавливает выбранный пресет
   * @param {string} presetKey - ключ пресета
   * @returns {void}
   */
  public setPreset(presetKey: string): void {
    if (this.presetSelect) {
      this.presetSelect.value = presetKey;
    }
  }
}
