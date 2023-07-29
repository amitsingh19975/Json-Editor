export type JSONType = 'object'|'array'|'string'|'number'|'boolean'|'null';

export type JSONMetaInfo = {
    type: JSONType;
    key?: PropertyKey;
    index: number;
    value?: unknown;
}