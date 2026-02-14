import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'path';

(() => {
	const outDir = 'dist';
	const extDir = 'extension';
	const execPath = path.dirname(fileURLToPath(import.meta.url));

	const fromDir = path.resolve(execPath, '..', outDir);
	const toDir = path.resolve(execPath, '..', extDir);

	if (!fs.existsSync(toDir)) {
		fs.mkdirSync(toDir, { recursive: true });
	}

	const copyRecursive = (src, dest) => {
		fs.stat(src, (err, stats) => {
			if (err) return;

			if (stats.isFile()) fs.copyFile(src, dest, () => {});

			if (!stats.isDirectory()) return;

			if (fs.existsSync(dest)) fs.rm(dest, () => {});

			console.log(dest);

			fs.mkdirSync(dest, { recursive: true });

			fs.readdir(src, (_, items) => {
				items.forEach(item => copyRecursive(path.join(src, item), path.join(dest, item)));
			});
		});
	};

	fs.readdir(fromDir, (_, items) => {
		items.forEach(item => {
			copyRecursive(path.join(fromDir, item), path.join(toDir, item));
		});
	});
})();
