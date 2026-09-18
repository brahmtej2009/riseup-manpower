/**
 * Light and dark mode.
 *
 * The mode is applied to the document before the first paint by a tiny
 * inline script, which is why this lives outside the React tree - a visitor
 * must never see the page in one mode and then watch it swap to the other.
 */

export const THEME_KEY = 'ru-theme';

export interface ThemeOptions {
  /** The mode a first-time visitor arrives on. */
  defaultDark: boolean;
  /** Whether a device set to dark mode wins over the setting above. */
  followDevice: boolean;
  /** 'rounded' or 'square'. */
  corners: string;
}

/** The script inlined in the document head. Returns plain JavaScript. */
export function themeScript({ defaultDark, followDevice, corners }: ThemeOptions): string {
  const fallback = defaultDark ? "'dark'" : "'light'";
  const preferred = followDevice
    ? `(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':${fallback})`
    : fallback;

  return (
    '(function(){try{' +
    `var r=document.documentElement,s=null;` +
    `try{s=localStorage.getItem('${THEME_KEY}')}catch(e){}` +
    `var m=(s==='dark'||s==='light')?s:${preferred};` +
    `r.setAttribute('data-theme',m);` +
    `r.setAttribute('data-corners','${corners === 'square' ? 'square' : 'rounded'}');` +
    '}catch(e){}})()'
  );
}
