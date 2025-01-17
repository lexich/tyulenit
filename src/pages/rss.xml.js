import rss from '@astrojs/rss';
import { useTranslations, getPosts } from '../i18n/utils';

export async function GET(context) {
  const t = useTranslations();
  const mapPosts = await getPosts();
  return rss({
    title: t('title'),
    description: t('description'),
    site: context.site,
    items: Object.entries(mapPosts).reduce((memo, [_, posts]) => {
      posts.forEach((post) => {
        memo.push({
          ...post.data,
          link: post.url,
        });
      });

      return memo;
    }, []),
  });
}
