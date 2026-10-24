import { Config, PartInfo } from "../index.js";
export declare function defaultIsFile(info: PartInfo): boolean;
export declare function make({ headers, onFile: onPart, onField, onError, onDone, isFile, maxParts, maxTotalSize, maxPartSize, maxFieldSize, }: Config): {
    readonly write: (chunk: Uint8Array) => void;
    readonly end: () => void;
};
export declare function decodeField(info: PartInfo, value: Uint8Array): string;
//# sourceMappingURL=multipart.d.ts.map