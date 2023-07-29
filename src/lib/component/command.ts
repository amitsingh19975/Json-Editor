// pattern: (FieldKey ':')? StringLiteral | LogicalOperator | key | empty
// FieldKey: '$' ('key' | 'value' | 'type')
// StringLiteral: '"'? StringContent '"'?
// StringContent: EscapeSequence | Character | StringContent | empty
// LogicalOperator: '&' | '|' | '!'
// Expr: '(' Expr ')' | Expr LogicalOperator Expr | FieldKey ':' StringLiteral | key
// key: [a-zA-Z0-9_]+

enum TokenKind {
    FieldKey,
    StringLiteral,
    BooleanLiteral,
    NullLiteral,
    NumberLiteral,
    AndOperator,
    OrOperator,
    NotOperator,
    Colon,
    LeftParen,
    RightParen,
}

type Token = {
    kind: TokenKind;
    value: string | boolean | null | number;
}

function tokenKindToString(kind: TokenKind): string {
    switch (kind) {
        case TokenKind.FieldKey: return 'FieldKey';
        case TokenKind.StringLiteral: return 'StringLiteral';
        case TokenKind.BooleanLiteral: return 'BooleanLiteral';
        case TokenKind.NullLiteral: return 'NullLiteral';
        case TokenKind.NumberLiteral: return 'NumberLiteral';
        case TokenKind.AndOperator: return 'AndOperator';
        case TokenKind.OrOperator: return 'OrOperator';
        case TokenKind.NotOperator: return 'NotOperator';
        case TokenKind.Colon: return 'Colon';
        case TokenKind.LeftParen: return 'LeftParen';
        case TokenKind.RightParen: return 'RightParen';
    }
}

type Result<T, E = string> = { value: T } | { error: E };

export function ok<T, E = string>(value: T): Result<T, E> {
    return { value };
}

export function err<T, E = string>(error: E): Result<T, E> {
    return { error };
}

export function isOk<T, E>(result: Result<T, E>): result is { value: T } {
    return 'value' in result;
}

export function isErr<T, E>(result: Result<T, E>): result is { error: E } {
    return 'error' in result;
}

class Lexer {
    private source: string;
    private cursor = 0;

    constructor(source: string) {
        this.source = source;
    }

    private consume(): string {
        this.cursor = Math.min(this.cursor + 1, this.source.length);
        return this.source[this.cursor];
    }

    private current(): string {
        return this.source[this.cursor];
    }

    private isWhitespace(char: string) {
        return char === ' ' || char === '\t' || char === '\n' || char === '\r';
    }

    private isDigit(char: string) {
        return char >= '0' && char <= '9';
    }

    private isAlpha(char: string) {
        return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z';
    }

    private skipWhile(predicate: (char: string) => boolean) {
        while (this.cursor < this.source.length && predicate(this.source[this.cursor])) {
            this.cursor++;
        }
    }

    private isQuote(char: string) {
        return char === '"' || char === "'";
    }

    private skipWhitespace() {
        this.skipWhile(this.isWhitespace);
    }

    private matchPattern(pattern: string): boolean {
        const len = pattern.length;
        const start = this.cursor;
        const left = this.source.length - start;
        if (left < len) return false;
        for (let i = 0; i < len; i++) {
            if (this.source[start + i] !== pattern[i]) return false;
        }
        this.cursor += len;
        return true;
    }

    private readIdentifier(): Result<string> {
        const start = this.cursor;
        let char = this.current();
        while (this.isAlpha(char) || this.isDigit(char) || char === '_') {
            char = this.consume();
        }
        const end = this.cursor;
        if (end === start) return err(`Expected unquoted string, but found ${this.current()}`);
        return ok(this.source.substring(start, end));
    }

    private readStringLiteral(): Result<string> {
        const startQuote = this.current();
        
        this.consume();
        let value = '';
        let char = this.current();
        if (char == null) return err(`Expected '"' or ''', but found eos`);

        while (char && !this.isQuote(char)) {
            value += char;
            char = this.consume();
        }
        if (this.current() !== startQuote) return err(`Expected '"' or ''', but found eos`);
        this.consume();
        
        return ok(value);
    }

    private readNumberLiteral(): Result<number> {
        let value = '';
        let char = this.current();

        while (this.isDigit(char) || char === '.' || char === '-' || char === '+') {
            value += char;
            char = this.consume();
        }

        if (value === '') return err(`Expected number literal, but found ${this.current()}`);
        const num = Number(value);
        if (Number.isNaN(num)) return err(`Expected number literal, but found ${this.current()}`);
        return ok(num);
    }

    private readFieldKey(): Result<string> {
        if (this.matchPattern('key')) return ok('key');
        if (this.matchPattern('value')) return ok('value');
        if (this.matchPattern('type')) return ok('type');
        return err(`Expected field key, but found ${this.current()}`);
    }

    lex(): Result<Token[]> {
        const tokens: Token[] = [];
        while (this.cursor < this.source.length) {
            this.skipWhitespace();
            const char = this.current();
            if (char == null) break;
            switch (char) {
                case '"': case "'": {
                    const result = this.readStringLiteral();
                    if (isErr(result)) return err(result.error);
                    tokens.push({ kind: TokenKind.StringLiteral, value: result.value });
                    break;
                }
                case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9': case '-': case '+': case '.': {
                    const result = this.readNumberLiteral();
                    if (isErr(result)) return err(result.error);
                    tokens.push({ kind: TokenKind.NumberLiteral, value: result.value });
                    break;
                }
                case '$': {
                    this.consume();
                    const result = this.readFieldKey();
                    if (isErr(result)) return err(result.error);
                    tokens.push({ kind: TokenKind.FieldKey, value: result.value });
                    break;
                }
                case '&': {
                    this.consume();
                    tokens.push({ kind: TokenKind.AndOperator, value: '&' });
                    break;
                }
                case '|': {
                    this.consume();
                    tokens.push({ kind: TokenKind.OrOperator, value: '|' });
                    break;
                }
                case '!': {
                    this.consume();
                    tokens.push({ kind: TokenKind.NotOperator, value: '!' });
                    break;
                }
                case ':': {
                    this.consume();
                    tokens.push({ kind: TokenKind.Colon, value: ':' });
                    break;
                }
                case '(': {
                    this.consume();
                    tokens.push({ kind: TokenKind.LeftParen, value: '(' });
                    break;
                }
                case ')': {
                    this.consume();
                    tokens.push({ kind: TokenKind.RightParen, value: ')' });
                    break;
                }
                default: {
                    const result = this.readIdentifier();
                    if (isErr(result)) return err(result.error);
                    if (result.value === 'true' || result.value === 'false') {
                        tokens.push({ kind: TokenKind.BooleanLiteral, value: result.value === 'true' });
                    } else if (result.value === 'null') {
                        tokens.push({ kind: TokenKind.NullLiteral, value: null });
                    } else {
                        tokens.push({ kind: TokenKind.StringLiteral, value: result.value });
                    }
                }
            }
        }
        return ok(tokens);
    }

}

export function lexCommand(source: string) {
    const lexer = new Lexer(source.trim());
    return lexer.lex();
}

enum ExprKind {
    And,
    Or,
    Not,
    Field,
    Value,
    Type,
}

export type CommandExpr = {
    kind: ExprKind.And | ExprKind.Or,
    left: CommandExpr,
    right: CommandExpr,
} | {
    kind: ExprKind.Not,
    expr: CommandExpr,
} | {
    kind: ExprKind.Field,
    field: CommandExpr,
    key: PropertyKey,
} | {
    kind: ExprKind.Value,
    value: string | number | boolean | null,
} | {
    kind: ExprKind.Type,
    type: string,
}

class Parser {
    
    private tokens: Token[];
    private cursor: number;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.cursor = 0;
    }

    private current(): Token | undefined {
        return this.tokens[this.cursor];
    }

    private consume(): Token | undefined {
        const token = this.current();
        this.cursor = Math.min(this.cursor + 1, this.tokens.length);
        return token
    }

    private expect(kind: TokenKind): Result<Token> {
        const token = this.consume();
        if (!token) return err(`Expected ${tokenKindToString(kind)}, but found eos`);
        if (token.kind !== kind) return err(`Expected ${kind}, but found ${token.kind}`);
        return ok(token);
    }

    private parseExpr(): Result<CommandExpr> {
        const token = this.current();
        if (!token) return err('Expected expression, but found eos');
        this.consume();
        switch (token.kind) {
            case TokenKind.LeftParen: {
                const expr = this.parseExprs();
                if (isErr(expr)) return expr;
                const rightParen = this.expect(TokenKind.RightParen);
                if (isErr(rightParen)) return rightParen;
                return ok(expr.value);
            }
            case TokenKind.NotOperator: {
                const expr = this.parseExprs();
                if (isErr(expr)) return expr;
                return ok({ kind: ExprKind.Not, expr: expr.value});
            }
            case TokenKind.FieldKey: {
                const keyToken = token;
                const ColonToken = this.expect(TokenKind.Colon);
                if (isErr(ColonToken)) return ColonToken;
                const expr = this.parseExprs();
                if (isErr(expr)) return expr;
                return ok({ kind: ExprKind.Field, field: expr.value, key: keyToken?.value?.toString() } as CommandExpr);
            }
            case TokenKind.StringLiteral: {
                return ok({ kind: ExprKind.Value, value: token.value });
            }
            case TokenKind.NumberLiteral: {
                return ok({ kind: ExprKind.Value, value: token.value });
            }
            case TokenKind.BooleanLiteral: {
                return ok({ kind: ExprKind.Value, value: token.value });
            }
            case TokenKind.NullLiteral: {
                return ok({ kind: ExprKind.Value, value: token.value });
            }
            default: {
                return err(`Expected expression, but found ${tokenKindToString(token.kind)}`);
            }
        }
    }

    private isEof(): boolean {
        return this.cursor >= this.tokens.length;
    }

    private parseExprs(): Result<CommandExpr> {
        const expr = this.parseExpr();
        if (isErr(expr)) return expr;
        if (this.isEof()) return expr;
        const token = this.current();
        
        switch (token?.kind) {
            case TokenKind.AndOperator: {
                this.consume();
                const rightExpr = this.parseExprs();
                if (isErr(rightExpr)) return rightExpr;
                return ok({ kind: ExprKind.And, left: expr.value, right: rightExpr.value });
            }
            case TokenKind.OrOperator: {
                this.consume();
                const rightExpr = this.parseExprs();
                if (isErr(rightExpr)) return rightExpr;
                return ok({ kind: ExprKind.Or, left: expr.value, right: rightExpr.value });
            }
            case TokenKind.RightParen: {
                return expr;
            }
            default: {
                return err('Expected and or or operator');
            }
        }
    }

    parse(): Result<CommandExpr> {
        const expr = this.parseExprs();
        if (isErr(expr)) return expr;
        if (this.current()) return err('Expected eos, but found token');
        return expr;
    }
    
}

export function parseCommand(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.lex();
    if (isErr(tokens)) return tokens;
    const parser = new Parser(tokens.value);
    return parser.parse();
}

export type Environment<T> = {
    [key: PropertyKey]: (data: T) => unknown,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DefaultComparator<U = any> = (left: U, pattern: string | number | boolean | null) => boolean;

function evalMatchExprHelper<T>(expr: CommandExpr, data: T, env: Environment<T>, cmp?: DefaultComparator): Result<boolean> {
    switch (expr.kind) {
        case ExprKind.And: {
            const left = evalMatchExprHelper(expr.left, data, env, cmp);
            if (isErr(left)) return left;
            if (!left.value) return ok(false);
            const right = evalMatchExprHelper(expr.right, data, env, cmp);
            if (isErr(right)) return right;
            return ok(right.value);
        }
        case ExprKind.Or: {
            const left = evalMatchExprHelper(expr.left, data, env, cmp);
            if (isErr(left)) return left;
            if (left.value) return ok(true);
            const right = evalMatchExprHelper(expr.right, data, env, cmp);
            if (isErr(right)) return right;
            return ok(right.value);
        }
        case ExprKind.Not: {
            const result = evalMatchExprHelper(expr.expr, data, env, cmp);
            if (isErr(result)) return result;
            return ok(!result.value);
        }
        case ExprKind.Field: {
            const value = env[expr.key](data);
            if (value === undefined) return err(`Field ${expr.key?.toString()} not found`);
            return evalMatchExprHelper(expr.field, value, {}, cmp);
        }
        case ExprKind.Value: {
            if (typeof data === 'object') {
                return ok(cmp ? cmp(data, expr.value) : false);
            } 
            return ok(data === expr.value);
        }
        case ExprKind.Type: {
            switch (expr.type.toLowerCase()) {
                case 'array': return ok(data === 'array');
                case 'boolean': case 'bool': return ok(data === 'boolean');
                case 'number': return ok(data === 'number');
                case 'object': return ok(data === 'object');
                case 'string': return ok(data === 'string');
                case 'null': return ok(data === null);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                case 'primitive': return ok(['boolean', 'number', 'string', null].includes(data as any));
                case 'undefined': return ok(data === undefined);
                default: return err(`Unknown type ${expr.type}`);
            }
        }
    }
}

export function evalMatchExpr<T>(source: string | CommandExpr | Result<CommandExpr>, data: T, env: Environment<T>, cmp?: DefaultComparator) {
    const expr = (typeof source === 'string') ? parseCommand(source) : ('kind' in source ? ok(source) : source);
    if (isErr(expr)) return expr;
    return evalMatchExprHelper(expr.value, data, env, cmp);
}
