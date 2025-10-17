// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import pagefind from "astro-pagefind";


// https://astro.build/config
export default defineConfig({
	site: 'https://leonard1403.github.io/CyberRedBlog/',
	base: '/CyberRedBlog/',
	integrations: [mdx(), sitemap(), pagefind()],
});
