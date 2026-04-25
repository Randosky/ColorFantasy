import ColorFantasy from "./ColorFantasy";

declare global {
  interface Window {
    ColorFantasy: typeof ColorFantasy;
  }
}

/** Точка с координатами */
export interface Point {
  /** Координата X */
  x: number;
  /** Координата Y */
  y: number;
}

/** Пиксель изображения с координатами */
export interface Pixel extends Point {}

/** Цвет в пространстве RGBA */
export interface RGBAColor {
  /** Красный канал 0-255 */
  r: number;
  /** Зеленый канал 0-255 */
  g: number;
  /** Синий канал 0-255 */
  b: number;
  /** Альфа канал 0-1 */
  a: number;
}

/** Границы области (прямоугольник) */
export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Область раскраски */
export interface ColorRegion {
  /** Идентификатор */
  id: number;
  /** Буквенная метка области */
  label: string;
  /** Цвет */
  color: RGBAColor;
  /** Точки, принадлежащие области */
  pixels: Point[];
  /** Центр области */
  center: Point;
  /** Геометрический масс (среднее арифметическое) */
  centroid: Point;
  /** Границы области */
  bounds: Bounds;
  /** Является ли область маленькой */
  isTiny: boolean;
}

/**
 * Параметры обработки изображения
 */
export interface ProcessingOptions {
  /** Допустимое отклонение при сравнении цветов при нахождении области 0-441 */
  regionTolerance: number;
  /** Минимальный размер региона */
  minRegionSize: number;
  /** Допустимое отклонение при сравнении цветов при объединении областей 0-441 */
  colorMergeTolerance: number;
}
