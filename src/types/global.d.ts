/** Объект с классами стилей */
interface CssModule {
  /** Классы стилей */
  [key: string]: string;
  /** Строка всех стилей */
  __raw: string;
}

/** Декларация для импорта CSS модулей как строку */
declare module "*.module.css" {
  const content: CssModule;
  export default content;
}

/** Декларация для импорта SCSS модулей как строку */
declare module "*.module.scss" {
  const content: CssModule;
  export default content;
}

/** Декларация для CSS */
declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: CssModule;
  export default content;
}
