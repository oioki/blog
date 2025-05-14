import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import mdx from '@astrojs/mdx'
import remarkGfm from 'remark-gfm'
import remarkSmartypants from 'remark-smartypants'
import rehypeExternalLinks from 'rehype-external-links'

import sentry from '@sentry/astro';

// https://astro.build/config
export default defineConfig({
  site: 'https://oioki.me',
  integrations: [
    mdx(),
    svelte(),
    sentry({
      dsn: "https://f0378ad435236d1d5ac7140d9cea8d6a@o546955.ingest.us.sentry.io/4509067327635457",
      _experiments: { enableLogs: true },
    })
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['de', 'en', 'ru'],
  },
  markdown: {
    shikiConfig: {
      theme: 'nord',
    },
    remarkPlugins: [remarkGfm, remarkSmartypants],
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
        },
      ],
    ],
  },
})