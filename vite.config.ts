import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
	const isProduction = mode === 'production';
	const isGithubPages = command === 'build' && isProduction;
	return {
		plugins: [sveltekit()],
		base: isGithubPages ? '/Json-Editor/' : '/',
	};	
});
