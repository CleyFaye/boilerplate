let serverRefs = [];

/** Store a server instance for closing it later.
 *
 * @param {Object} ref
 * The server instance
 */
export const setRef = ref => {
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
export const unsetRef = ref => {
  if (!serverRefs.includes(ref)) {
    return;
  }
  serverRefs.splice(serverRefs.indexOf(ref), 1);
};

/** Stop the server on SIGINT */
export const setSignalHandler = () => {
  if (process.platform === "win32") {
    process.on("message", msg => {
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

/** Close the stored server reference */
export const closeServer = () => {
  serverRefs.forEach(ref => ref.close());
  serverRefs.length = 0;
};

