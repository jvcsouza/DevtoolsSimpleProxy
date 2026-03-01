import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: [
			{
				find: '@components',
				replacement: path.resolve(__dirname, 'src/components'),
			},
			{
				find: '@services',
				replacement: path.resolve(__dirname, 'src/core/services'),
			},
			{
				find: '@',
				replacement: path.resolve(__dirname, 'src'),
			},
			{
				find: '@core',
				replacement: path.resolve(__dirname, 'src/core'),
			},
			{
				find: '@domain',
				replacement: path.resolve(__dirname, 'src/core/domain'),
			},
			{
				find: '@data',
				replacement: path.resolve(__dirname, 'src/data'),
			},
			{
				find: '@lib',
				replacement: path.resolve(__dirname, 'src/lib'),
			}
		],
	},

	plugins: [
		react({
			babel: {
				plugins: [['babel-plugin-react-compiler']],
			},
		}),
	],
});
