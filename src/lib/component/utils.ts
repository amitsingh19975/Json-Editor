import type { JSONMetaInfo, JSONType } from './types';

export function normalizeJsonType(item: JSONType) {
    switch(item) {
        case 'object': return 'Object';
        case 'array': return 'Array';
        case 'string': return 'String';
        case 'number': return 'Number';
        case 'boolean': return 'Boolean';
        case 'null': return 'Null';
        default: return 'Unknown';
    }
}


export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && value !== null;
}

export function isArray(value: unknown): value is Array<unknown> {
    return Array.isArray(value);
}

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number';
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

export function isNull(value: unknown): value is null {
    return value == null;
}

export function isPrimitive(value: unknown): value is string | number | boolean | null {
    return isString(value) || isNumber(value) || isBoolean(value) || isNull(value);
}

export function getJsonType(value: unknown): JSONMetaInfo['type'] {
    if (isArray(value)) return 'array';
    if (isString(value)) return 'string';
    if (isNumber(value)) return 'number';
    if (isBoolean(value)) return 'boolean';
    if (isNull(value)) return 'null';
    if (isObject(value)) return 'object';
    return 'null';
}

export function normalizeJsonValue(value: unknown) {
    if (isArray(value)) return value;
    if (isString(value)) return value;
    if (isNumber(value)) return value;
    if (isBoolean(value)) return value;
    if (isNull(value)) return value;
    if (isObject(value)) return value;
    return null;
}

export function deepClone(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}
