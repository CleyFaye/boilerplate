import {ExtendedError} from "../winston.js";

interface Error422Fields {
  message: string;
  fields: Array<string>;
  errors: Array<unknown>;
}

const UNPROCESSABLE_ENTITY = 422;

export const get422Fields = (error: ExtendedError): Error422Fields | undefined => {
  const {statusCode, cause, fields} = error;
  if (
    statusCode !== UNPROCESSABLE_ENTITY
    || !cause
    || !Array.isArray(cause)
    || !fields
    || !Array.isArray(fields)
  ) {
    return;
  }
  let fieldsStr: string;
  try {
    fieldsStr = JSON.stringify(fields);
  } catch {
    fieldsStr = "<error>";
  }
  let errorsStr: string;
  try {
    errorsStr = JSON.stringify(cause);
  } catch {
    errorsStr = "<error>";
  }
  const message = `${error.message}: fields=${fieldsStr}, errors=${errorsStr}`;
  return {message, fields, errors: cause};
};
