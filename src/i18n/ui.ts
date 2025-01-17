export const LANGS = ['ru', 'en'] as const;
const ru = {
  'nav.blog': 'Блог',
  'social.github': 'Перейти на github ТюленITь',
  'date.lastUpdate': 'Обновлено',
  copyright: 'ТюленITь. Все права защищены.',
  title: 'ТюленITь',
  description:
    'Нить рассуждений о технологиях, разработке программного обеспечения и о тюленчиках.',

  'description.tags': 'Облако тегов',
} as const;

export type TLangs = (typeof LANGS)[number];

const definei18n = <const T extends Record<keyof typeof ru, string>>(t: T) => t;

export const ui = {
  ru,
  en: definei18n({
    'nav.blog': 'Blog',
    'social.github': "Go to the Tyulenit's github",
    'date.lastUpdate': 'Last updated on',
    copyright: 'Tyulenit. All rights reserved.',
    title: 'Tyulenit',
    description:
      'A thread of reflections on technology, software development, and little seals.',
    'description.tags': 'Tags cloud',
  }),
} satisfies Record<TLangs, unknown>;

export const defaultLang: TLangs = 'en';

const defineConst = <const T extends Record<TLangs, string>>(t: T) => t;

export const languages = defineConst({
  ru: 'Русский',
  en: 'English',
});

export const locales = defineConst({
  ru: 'ru',
  en: 'en-us',
});
