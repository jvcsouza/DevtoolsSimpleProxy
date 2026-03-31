import { createRuntime } from '@/infra/adapters/runtime.factory';
import { createZodStorageValidator } from '@/infra/adapters/zod.validator';
import { RuntimePort } from '../ports/runtime.port';
import { ValidatorPort } from '../ports/validator.port';
import { StorageShape } from '../ports/runtime.port';

const createPanelService = (runtime: RuntimePort, validator: ValidatorPort<StorageShape>) => {
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

		const result = validator.validate(parsed);
		if (!result.success) {
			throw new Error(`Arquivo inválido. Problemas encontrados:\n${result.errors.join('\n')}`);
		}

		await runtime.storage.set(result.data);
	};

	return {
		exportPanelDataAsync,
		importPanelDataAsync,
	};
};

export default createPanelService(createRuntime(), createZodStorageValidator());
