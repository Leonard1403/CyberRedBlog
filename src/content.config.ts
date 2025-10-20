import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writeups = defineCollection({
	loader: glob({ base: './src/content/writeups', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: image().optional(), // sau comentează dacă nu ai imagine lângă .md
		tags: z.array(z.string()).default([]),
		platform: z.enum(['THM','HTB','Other']).optional(),
		difficulty: z.enum(['Easy','Medium','Hard']).optional(),
	}),
});

export const collections = { writeups };
