import repl from "repl";

/** Function called when the REPL is closed */
export type ReplCloseFunc = () => void;

/** Mimic the required elements from a db object */
interface DBLikeObject {
  /** db object can have a reference to an initialized sequelize instance */
  sequelize?: {
    /** Sequelize instance should have a close() method */
    close?: () => void;
  }
}

interface ReplArgs {
  /** Display a service name in the prompt */
  serviceName: string;
  /**
   * A DB object. If it exposes a db.sequelize.close() function, it will be called when the REPL is
   * closed.
   */
  db?: DBLikeObject;
  srv?: Record<string, unknown>;
  /** Extra properties to attach to the REPL context */
  extraContext?: Record<string, unknown>;
  onClose?: ReplCloseFunc,
  historyFile?: string,
}

const setupContext = (
  r: repl.REPLServer,
  db?: DBLikeObject,
  srv?: Record<string, unknown>,
  extraContext?: Record<string, unknown>,
): void => {
  const doContextSetup = () => {
    Object.assign(
      r.context,
      {
        ...extraContext,
        db,
        srv,
      },
    );
  }
  doContextSetup();
  r.on(
    "reset",
    doContextSetup,
  );
}

/** Configure action when the REPL is closed */
const setupClose = (
  r: repl.REPLServer,
  db?: DBLikeObject,
  onClose?: ReplCloseFunc,
): void => {
  if (!db && !onClose) return;
  r.on(
    "exit",
    () => {
      if (db?.sequelize?.close) {
        db.sequelize.close();
      }
      if (onClose) {
        onClose();
      }
    },
  );
}

/** Start the REPL prompt */
export const startRepl = ({
  serviceName = "",
  db,
  srv,
  extraContext,
  onClose,
  historyFile = ".node_repl_history",
}: ReplArgs): void => {
  const r = repl.start({
    prompt: `${serviceName}> `,
    breakEvalOnSigint: true,
  });
  setupContext(r, db, srv, extraContext);
  setupClose(r, db, onClose);
  r.setupHistory(historyFile, () => {});
}

