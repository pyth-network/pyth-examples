import type { IncomingHttpHeaders } from "node:http";
import * as MP from "./index.js";
import { Duplex, Readable } from "node:stream";
export type { MultipartError, PartInfo } from "./index.js";
export { decodeField } from "./index.js";
export type Part = Field | FileStream;
export interface Field {
    readonly _tag: "Field";
    readonly info: MP.PartInfo;
    readonly value: Uint8Array;
}
export interface MultipastaStream extends Duplex {
    [Symbol.asyncIterator](): NodeJS.AsyncIterator<Part>;
    on(event: "field", listener: (field: Field) => void): this;
    on(event: "file", listener: (file: FileStream) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "data", listener: (part: Part) => void): this;
    on(event: "drain", listener: () => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: MP.MultipartError) => void): this;
    on(event: "finish", listener: () => void): this;
    on(event: "pause", listener: () => void): this;
    on(event: "pipe", listener: (src: Readable) => void): this;
    on(event: "readable", listener: () => void): this;
    on(event: "resume", listener: () => void): this;
    on(event: "unpipe", listener: (src: Readable) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    read(size?: number): Part | null;
}
export type NodeConfig = Omit<MP.BaseConfig, "headers"> & {
    readonly headers: IncomingHttpHeaders;
};
export declare class MultipastaStream extends Duplex {
    private _parser;
    _canWrite: boolean;
    private _writeCallback;
    constructor(config: NodeConfig);
    _resume(): void;
    _read(_size: number): void;
    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void;
    _final(callback: (error?: Error | null | undefined) => void): void;
}
export declare const make: (config: NodeConfig) => MultipastaStream;
export declare class FileStream extends Readable {
    readonly info: MP.PartInfo;
    private _parent;
    readonly _tag = "File";
    readonly filename: string;
    constructor(info: MP.PartInfo, _parent: MultipastaStream);
    _read(_size: number): void;
}
//# sourceMappingURL=node.d.ts.map