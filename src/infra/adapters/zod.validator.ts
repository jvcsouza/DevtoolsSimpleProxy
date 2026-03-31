import { StorageShape } from '@core/ports/runtime.port';
import { ValidationResult, ValidatorPort } from '@core/ports/validator.port';
import { StorageShapeSchema } from './zod.schemas';

export function createZodStorageValidator(): ValidatorPort<StorageShape> {
	return {
		validate(data: unknown): ValidationResult<StorageShape> {
			const result = StorageShapeSchema.safeParse(data);

			if (result.success) {
				return { success: true, data: result.data };
			}

			return {
				success: false,
				errors: result.error.issues.map(
					issue => `${issue.path.join('.')}: ${issue.message}`
				),
			};
		},
	};
}
