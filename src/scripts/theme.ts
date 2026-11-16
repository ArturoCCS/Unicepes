export type Theme = 'light' | 'dark';

const root = document.documentElement;

export const getTheme = (): Theme => (root.dataset.theme === 'dark' ? 'dark' : 'light');

export function setTheme(theme: Theme) {
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem('theme', theme);
  } catch {}
}

export const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');

export function onThemeChange(listener: (theme: Theme) => void) {
  listener(getTheme());
  const observer = new MutationObserver(() => listener(getTheme()));
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
