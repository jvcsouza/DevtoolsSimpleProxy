export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = { success: false; errors: string[] };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export interface ValidatorPort<T> {
	validate(data: unknown): ValidationResult<T>;
}
