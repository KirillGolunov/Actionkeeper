import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations } from './translations';

const I18nContext = createContext(null);

function getByPath(object, path) {
  return path.split('.').reduce((current, part) => (current == null ? undefined : current[part]), object);
}

function interpolate(template, params) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const value = params[key.trim()];
    return value == null ? '' : String(value);
  });
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('locale') || 'ru');

  const value = useMemo(() => ({
    locale,
    setLocale: (nextLocale) => {
      localStorage.setItem('locale', nextLocale);
      setLocale(nextLocale);
    },
    t: (key, params = {}) => {
      const catalog = translations[locale] || translations.en;
      const fallback = translations.en;
      const rawValue = getByPath(catalog, key) ?? getByPath(fallback, key) ?? key;
      return typeof rawValue === 'string' ? interpolate(rawValue, params) : rawValue;
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used inside I18nProvider');
  }
  return context;
}
