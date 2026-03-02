import { createRuntime } from '@/infra/adapters/runtime.factory';
import { RuntimePort } from '../ports/runtime.port';
import { Profile } from '../domain/profile';

const createProfileService = (runtime: RuntimePort) => {
	const getAllProfilesAsync = async (): Promise<Profile[]> => {
		const profiles = await runtime.storage.get('profiles');
		return profiles || [{ id: 'default', name: 'Default' }];
	};

	const upsertProfileRuleAsync = async (profile: Profile) => {
		const existingProfiles = await getAllProfilesAsync();
		const currProfile = existingProfiles.find(r => r.id === profile.id);
		if (!currProfile) {
			await runtime.storage.set({ profiles: [...existingProfiles, profile] });
			return [...existingProfiles, profile];
		}
		const newProfiles = existingProfiles.map(p => (p.id === profile.id ? profile : p));
		await runtime.storage.set({ profiles: newProfiles });
		return newProfiles;
	};

	const deleteProfileAsync = async (id: string) => {
		const existingProfiles = await getAllProfilesAsync();
		const newProfiles = existingProfiles.filter(p => p.id !== id);
		await runtime.storage.set({ profiles: newProfiles });
		return newProfiles;
	};

	return {
		getAllProfilesAsync,
		upsertProfileRuleAsync,
		deleteProfileAsync,
	};
};

export default createProfileService(createRuntime());
