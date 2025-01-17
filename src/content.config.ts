import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { LANGS } from './i18n/ui';

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({
    base: './src/content/blog',
    pattern: `{${LANGS.join(',')}}/*.{md,mdx}`,
  }),
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()),
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog };
