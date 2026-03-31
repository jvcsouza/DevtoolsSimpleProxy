import { createRuntime } from '@/infra/adapters/runtime.factory';
import { StorageShapeSchema } from '@domain/schemas';
import { RuntimePort } from '../ports/runtime.port';

const createPanelService = (runtime: RuntimePort) => {
	const exportPanelDataAsync = async () => {
		const data = await runtime.storage.get();
		const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		return url;
	};

	const importPanelDataAsync = async (file: File) => {
		const text = await file.text();

		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			throw new Error('O arquivo selecionado não é um JSON válido.');
		}

		const result = StorageShapeSchema.safeParse(parsed);
		if (!result.success) {
			const messages = result.error.issues
				.map(issue => `${issue.path.join('.')}: ${issue.message}`)
				.join('\n');
			throw new Error(`Arquivo inválido. Problemas encontrados:\n${messages}`);
		}

		await runtime.storage.set(result.data);
	};

	return {
		exportPanelDataAsync,
		importPanelDataAsync,
	};
};

export default createPanelService(createRuntime());
