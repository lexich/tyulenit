import { getCollection, type CollectionEntry } from 'astro:content';
import { ui, defaultLang, locales, type TLangs } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function getTagFromUrl(url: URL): string {
  const [, tag] = url.pathname.split('/');

  return tag;
}

export function useTranslations(lang: keyof typeof ui = defaultLang) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function useLocale(lang: keyof typeof ui = defaultLang) {
  return locales[lang];
}

export type TPost = {
  url: string;
  page: CollectionEntry<'blog'>;
  lang: string;
  slug: string;
};

export const getPosts = async (): Promise<Record<TLangs, TPost[]>> => {
  const pages = await getCollection('blog');

  pages.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const paths = pages.reduce((memo, page) => {
    const [l, ...rest] = page.id.split('/');
    const lang = l as TLangs;
    const slug = rest.join('');
    const post: TPost = { page, url: `/${lang}/blog/${slug}`, lang, slug };

    const ref = memo[lang] ?? (memo[lang] = []);

    ref.push(post);

    return memo;
  }, {} as Record<TLangs, TPost[]>);

  return paths;
};

function getLinks(lang: keyof typeof ui) {
  const map = {
    blog: `/${lang}/blog`,
    tags: `/${lang}/tags`,
    tag: (tag: string) => `${map.tags}/${tag}`,
  } as const;

  return map;
}

export function useI18n(url: URL) {
  const lang = getLangFromUrl(url);

  const locale = useLocale(lang);
  const t = useTranslations(lang);
  const links = getLinks(lang);

  return {
    t,
    lang,
    links,
    locale,
  };
}
