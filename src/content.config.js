import { defineCollection, z } from "astro:content";

const posts = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		id: z.string(),
		publishDate: z.string(),
		description: z.string(),
	}),
});

export const collections = {
	'posts': posts
};
