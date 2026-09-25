import * as MP from "./index.js";
import { Duplex, Readable } from "node:stream";
export { decodeField } from "./index.js";
export class MultipastaStream extends Duplex {
  _parser;
  _canWrite = true;
  _writeCallback;
  constructor(config) {
    super({
      readableObjectMode: true
    });
    let currentError;
    let currentFile;
    this._parser = MP.make({
      ...config,
      onField: (info, value) => {
        if (currentError !== undefined) return;
        const field = {
          _tag: "Field",
          info,
          value
        };
        this.push(field);
        this.emit("field", field);
      },
      onFile: info => {
        if (currentError !== undefined) return _ => {};
        const file = new FileStream(info, this);
        currentFile = file;
        this.push(file);
        this.emit("file", file);
        return chunk => {
          this._canWrite = file.push(chunk);
          if (chunk === null && !this._canWrite) {
            currentFile = undefined;
            this._resume();
          }
        };
      },
      onError: error => {
        this.emit("error", error);
        currentFile?.emit("error", error);
        currentError = error;
      },
      onDone: () => {
        this.push(null);
      }
    });
  }
  _resume() {
    this._canWrite = true;
    if (this._writeCallback !== undefined) {
      const callback = this._writeCallback;
      this._writeCallback = undefined;
      callback();
    }
  }
  _read(_size) {}
  _write(chunk, encoding, callback) {
    this._parser.write(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk, encoding));
    if (this._canWrite) {
      callback();
    } else {
      this._writeCallback = callback;
    }
  }
  _final(callback) {
    this._parser.end();
    callback();
  }
}
export const make = config => new MultipastaStream(config);
export class FileStream extends Readable {
  info;
  _parent;
  _tag = "File";
  filename;
  constructor(info, _parent) {
    super();
    this.info = info;
    this._parent = _parent;
    this.filename = info.filename;
  }
  _read(_size) {
    if (this._parent._canWrite === false) {
      this._parent._resume();
    }
  }
}
//# sourceMappingURL=node.js.map