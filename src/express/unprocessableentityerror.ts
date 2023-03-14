import HttpCodes from "@cley_faye/http-codes-consts";
import {ExtendedError} from "../winston.js";

interface Error422Fields {
  message: string;
  fields: Array<string>;
  errors: Array<Error>;
}

export const get422Fields = (error: ExtendedError): Error422Fields | undefined => {
  const {statusCode, cause, fields} = error;
  if (
    statusCode !== HttpCodes.UnprocessableEntity
    || !cause
    || !Array.isArray(cause)
    || !fields
    || !(fields instanceof Set)
  ) {
    return;
  }
  const fieldsList: Array<string> = Array.from(fields).filter(c => typeof c === "string");
  const errors: Array<Error> = cause.filter<Error>((c: unknown): c is Error => c instanceof Error);
  // eslint-disable-next-line max-len
  const message = `${error.message}: fields=${JSON.stringify(fieldsList)}, errors=${JSON.stringify(errors.map(c => c.message))}`;
  return {message, fields: fieldsList, errors};
};
