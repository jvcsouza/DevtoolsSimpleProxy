import type { JsonOperation, MockResponse, TextOperation } from './rule';

type PathSegment = string | number | '*';
type Json = unknown;

type TemplateContext = {
	/** JSON original (antes das operações), quando o body é JSON. */
	original: Json;
	/** Valor atual no path do `set` (para `{{value}}`). */
	value?: Json;
	/** Texto do body no momento da aplicação do template (para `{{body}}`). */
	body?: string;
};

export type TransformResult = {
	body: string;
	/** Operações ignoradas (path/regex inválidos, body não-JSON...). O restante é aplicado normalmente. */
	errors: string[];
};

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const EXACT_PLACEHOLDER = /^\{\{\s*([^{}]+?)\s*\}\}$/;

const isObject = (value: Json): value is Record<string, Json> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Aceita `data.items[0].name`, `$.data["chave estranha"]`, `items[*].price` e `items.*.price`. */
export const parsePath = (path: string): PathSegment[] => {
	const source = path.trim().replace(/^\$\.?/, '');
	const segments: PathSegment[] = [];
	const tokenizer = /\[\s*(\d+|\*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\]|\.?([^.[\]]+)/gy;
	let match: RegExpExecArray | null;

	while (tokenizer.lastIndex < source.length && (match = tokenizer.exec(source))) {
		const [, bracket, key] = match;
		if (bracket === undefined) segments.push(key === '*' ? '*' : key);
		else if (bracket === '*') segments.push('*');
		else if (/^\d+$/.test(bracket)) segments.push(Number(bracket));
		else segments.push(bracket.slice(1, -1).replace(/\\(.)/g, '$1'));
	}

	if (tokenizer.lastIndex !== source.length) throw new Error(`Invalid path "${path}"`);
	return segments;
};

export const getAtPath = (root: Json, segments: PathSegment[]): Json => {
	let nodes: Json[] = [root];
	let wildcard = false;

	for (const segment of segments) {
		if (segment === '*') {
			wildcard = true;
			nodes = nodes.flatMap(node => (Array.isArray(node) ? node : isObject(node) ? Object.values(node) : []));
			continue;
		}
		nodes = nodes.flatMap(node => {
			if (Array.isArray(node) && typeof segment === 'number') return segment in node ? [node[segment]] : [];
			if (isObject(node) && String(segment) in node) return [node[String(segment)]];
			return [];
		});
	}

	return wildcard ? nodes : nodes[0];
};

const updateAtPath = (node: Json, segments: PathSegment[], index: number, updater: (current: Json) => Json): Json => {
	if (index === segments.length) return updater(node);
	const segment = segments[index];

	if (segment === '*') {
		if (Array.isArray(node)) return node.map(item => updateAtPath(item, segments, index + 1, updater));
		if (isObject(node)) {
			return Object.fromEntries(
				Object.entries(node).map(([key, item]) => [key, updateAtPath(item, segments, index + 1, updater)]),
			);
		}
		return node;
	}

	if (typeof segment === 'number' && (Array.isArray(node) || node === undefined)) {
		const array = Array.isArray(node) ? [...node] : [];
		array[segment] = updateAtPath(array[segment], segments, index + 1, updater);
		return array;
	}

	// Caminho inexistente: cria os objetos intermediários
	const object = isObject(node) ? { ...node } : {};
	object[String(segment)] = updateAtPath(object[String(segment)], segments, index + 1, updater);
	return object;
};

const removeAtPath = (node: Json, segments: PathSegment[], index = 0): Json => {
	const segment = segments[index];
	const isLast = index === segments.length - 1;

	if (Array.isArray(node)) {
		if (segment === '*') return isLast ? [] : node.map(item => removeAtPath(item, segments, index + 1));
		if (typeof segment !== 'number' || !(segment in node)) return node;
		if (isLast) return node.filter((_, i) => i !== segment);
		return node.map((item, i) => (i === segment ? removeAtPath(item, segments, index + 1) : item));
	}

	if (isObject(node)) {
		if (segment === '*') {
			if (isLast) return {};
			return Object.fromEntries(
				Object.entries(node).map(([key, item]) => [key, removeAtPath(item, segments, index + 1)]),
			);
		}
		const key = String(segment);
		if (!(key in node)) return node;
		if (!isLast) return { ...node, [key]: removeAtPath(node[key], segments, index + 1) };
		const rest = { ...node };
		delete rest[key];
		return rest;
	}

	return node;
};

const lookup = (token: string, context: TemplateContext): Json => {
	if (token === 'value') return context.value;
	if (token === 'body') return context.body;
	if (token.startsWith('$')) return getAtPath(context.original, parsePath(token));
	throw new Error(`Unknown placeholder "{{${token}}}"`);
};

const stringify = (value: Json) => {
	if (value === undefined) return '';
	return typeof value === 'string' ? value : JSON.stringify(value);
};

/** `{{$.x}}` insere o valor cru (string sem aspas); `{{$.x | json}}` insere sempre JSON (útil dentro de templates JSON). */
export const interpolate = (template: string, context: TemplateContext) =>
	template.replace(PLACEHOLDER, (_, token: string) => {
		const [expression, filter] = token.split(/\s*\|\s*/);
		const value = lookup(expression, context);
		if (filter === 'json') return JSON.stringify(value ?? null);
		if (filter) throw new Error(`Unknown filter "${filter}"`);
		return stringify(value);
	});

/**
 * `{{$.x}}` sozinho insere o valor com o tipo original; placeholders no meio de texto viram string.
 * Depois da interpolação tenta `JSON.parse` (`10`, `true`, `"texto"`, `{...}`); se falhar, vira string.
 */
const resolveValue = (raw: string, context: TemplateContext): Json => {
	const exact = raw.trim().match(EXACT_PLACEHOLDER);
	if (exact) return structuredClone(lookup(exact[1], context));
	const text = interpolate(raw, context);
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};

const applyJsonOperation = (document: Json, operation: JsonOperation, original: Json) => {
	const segments = parsePath(operation.path);
	if (operation.op === 'remove') return removeAtPath(document, segments);
	return updateAtPath(document, segments, 0, current => resolveValue(operation.value, { original, value: current }));
};

const applyTextOperation = (text: string, operation: TextOperation) => {
	if (operation.regex) return text.replace(new RegExp(operation.find, 'g'), operation.replace);
	// Função como replacer para `$` no texto de substituição não ser interpretado
	return text.replaceAll(operation.find, () => operation.replace);
};

const tryParseJson = (body: string, contentType: string): Json | undefined => {
	const looksLikeJson = /json/i.test(contentType) || /^\s*[[{]/.test(body);
	if (!looksLikeJson) return undefined;
	try {
		return JSON.parse(body);
	} catch {
		return undefined;
	}
};

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Pipeline: operações JSON → find/replace → template. Usado pelo service worker e pelo preview da UI. */
export const applyResponseTransform = (
	input: { body: string; contentType: string },
	mock: Pick<MockResponse, 'jsonOps' | 'textOps' | 'textTemplate'>,
): TransformResult => {
	const errors: string[] = [];
	const original = tryParseJson(input.body, input.contentType);
	let text = input.body;

	const jsonOps = mock.jsonOps.filter(op => op.path.trim());
	if (jsonOps.length) {
		if (original === undefined) {
			errors.push('Response body is not valid JSON: JSON operations were skipped');
		} else {
			let document: Json = structuredClone(original);
			for (const operation of jsonOps) {
				try {
					document = applyJsonOperation(document, operation, original);
				} catch (error) {
					errors.push(`${operation.op} ${operation.path}: ${describeError(error)}`);
				}
			}
			text = JSON.stringify(document);
		}
	}

	for (const operation of mock.textOps.filter(op => op.find)) {
		try {
			text = applyTextOperation(text, operation);
		} catch (error) {
			errors.push(`replace ${operation.find}: ${describeError(error)}`);
		}
	}

	if (mock.textTemplate.trim()) {
		try {
			text = interpolate(mock.textTemplate, { original, body: text });
		} catch (error) {
			errors.push(`template: ${describeError(error)}`);
		}
	}

	return { body: text, errors };
};
