import * as MP from "./index.js";
export type { MultipartError, PartInfo } from "./index.js";
export { decodeField } from "./index.js";
export type Part = Field | File;
export interface Field {
    readonly _tag: "Field";
    readonly info: MP.PartInfo;
    readonly value: Uint8Array;
}
export interface File {
    readonly _tag: "File";
    readonly info: MP.PartInfo;
    readonly readable: ReadableStream<Uint8Array>;
}
export interface MultipastaStream {
    readonly writable: WritableStream<Uint8Array>;
    readonly readable: ReadableStream<Part>;
}
export type WebConfig = Omit<MP.BaseConfig, "headers"> & {
    readonly headers: Headers;
};
export declare const make: (config: WebConfig) => MultipastaStream;
//# sourceMappingURL=web.d.ts.map