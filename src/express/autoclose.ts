import {Server} from "net";

const serverRefs: Array<Server> = [];

/** Store a server instance for closing it later.
 *
 * @param {Object} ref
 * The server instance
 */
export const setRef = (ref: Server): void => {
  if (serverRefs.includes(ref)) {
    return;
  }
  serverRefs.push(ref);
};

/** Remove a server instance from the closing list.
 *
 * @param {Object} ref
 * The server instance
 */
export const unsetRef = (ref: Server): void => {
  if (!serverRefs.includes(ref)) {
    return;
  }
  serverRefs.splice(serverRefs.indexOf(ref), 1);
};

/** Close the stored server reference */
export const closeServer = (): void => {
  serverRefs.forEach((ref) => ref.close());
  serverRefs.length = 0;
};

/** Stop the server on SIGINT */
export const setSignalHandler = (): void => {
  if (process.platform === "win32") {
    process.on("message", (msg) => {
      if (msg === "shutdown") {
        closeServer();
      }
    });
  } else {
    process.on("SIGINT", () => {
      closeServer();
    });
  }
};
