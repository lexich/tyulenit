// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://tyulenit.com',
  integrations: [
    mdx(),
    sitemap({
      // i18n: {
      //   defaultLocale: 'ru',
      //   locales: {
      //     en: 'en-US', // The `defaultLocale` value must present in `locales` keys
      //     ru: 'ru-RU',
      //   },
      // },
    }),
  ],
});
