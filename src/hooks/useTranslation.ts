// useTranslation hook - forced to Indonesian language
import translations, { Translations } from '../i18n/translations';

export function useTranslation(): { t: Translations; language: 'id' } {
  return { t: translations.id, language: 'id' };
}
