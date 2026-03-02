import { createRuntime } from '@/infra/adapters/runtime.factory';
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
		const data = JSON.parse(text);
		await runtime.storage.set(data);
	};

	return {
		exportPanelDataAsync,
		importPanelDataAsync,
	};
};

export default createPanelService(createRuntime());
