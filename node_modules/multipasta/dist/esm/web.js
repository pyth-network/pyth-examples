import * as MP from "./index.js";
export { decodeField } from "./index.js";
export const make = config => {
  const headers = Object.fromEntries([...config.headers]);
  let error;
  let partBuffer = [];
  let readResolve;
  let finished = false;
  const parser = MP.make({
    ...config,
    headers,
    onField(info, value) {
      partBuffer.push({
        _tag: "Field",
        info,
        value
      });
      if (readResolve !== undefined) readResolve();
    },
    onFile(info) {
      let chunkBuffer = [];
      let chunkResolve;
      let finished = false;
      const readable = new ReadableStream({
        pull(controller) {
          if (chunkBuffer.length > 0) {
            const chunks = chunkBuffer;
            chunkBuffer = [];
            for (const chunk of chunks) {
              controller.enqueue(chunk);
            }
          } else if (finished) {
            controller.close();
          } else {
            return new Promise(resolve => {
              chunkResolve = () => {
                chunkResolve = undefined;
                resolve();
              };
            }).then(() => this.pull(controller));
          }
        }
      });
      partBuffer.push({
        _tag: "File",
        info,
        readable
      });
      if (readResolve !== undefined) readResolve();
      return function (chunk) {
        if (chunk === null) {
          finished = true;
        } else {
          chunkBuffer.push(chunk);
        }
        if (chunkResolve !== undefined) {
          chunkResolve();
        }
      };
    },
    onError(error_) {
      if (error !== undefined) return;
      error = error_;
      if (readResolve !== undefined) readResolve();
    },
    onDone() {
      finished = true;
      if (readResolve !== undefined) readResolve();
    }
  });
  const writable = new WritableStream({
    write(chunk, controller) {
      parser.write(chunk);
    },
    close() {
      parser.end();
    }
  });
  const readable = new ReadableStream({
    pull(controller) {
      if (partBuffer.length > 0) {
        const parts = partBuffer;
        partBuffer = [];
        for (const part of parts) {
          controller.enqueue(part);
        }
      } else if (error) {
        controller.error(error);
      } else if (finished) {
        controller.close();
      } else {
        return new Promise(resolve => {
          readResolve = () => {
            readResolve = undefined;
            resolve();
          };
        }).then(() => this.pull(controller));
      }
    }
  });
  return {
    writable,
    readable
  };
};
//# sourceMappingURL=web.js.map