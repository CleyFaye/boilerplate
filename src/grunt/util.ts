export interface BaseOptions {
  disabled?: boolean;
}

export type ConfigValue = string | number | boolean | Record<string, unknown> | null;
export type GenericConfigObject = Record<string, ConfigValue>;

/** Set a value in a nested object
 *
 * This will set, for example, sourceObject.foo.bar = value by making copies of
 * all intermediate objects.
 *
 * @param sourceObject
 * Object to copy/update
 *
 * @param path
 * Properties path (for the example above: "foo.bar")
 *
 * @param value
 * The value to set
 *
 * @return
 * A copy of sourceObject with the property set
 */
export const deepSet = (
  sourceObject: GenericConfigObject,
  path: string,
  value: string | number | boolean | Record<string, unknown> | null,
): GenericConfigObject => {
  const result = {...sourceObject};
  const pathElements = path.split(".");
  let cursor = result;
  pathElements.slice(0, -1).forEach(pathElement => {
    cursor[pathElement] = {...(cursor[pathElement] as Record<string, unknown>)};
    cursor = cursor[pathElement] as GenericConfigObject;
  });
  cursor[pathElements[pathElements.length - 1]] = value;
  return result;
};
