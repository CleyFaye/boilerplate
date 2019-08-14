/** Set a value in a nested object
 * 
 * This will set, for example, sourceObject.foo.bar = value by making copies of
 * all intermediate objects.
 * 
 * @param {Object} sourceObject
 * Object to copy/update
 * 
 * @param {string} path
 * Properties path (for the example above: "foo.bar")
 * 
 * @param {any} value
 * The value to set
 * 
 * @return {Object}
 * A copy of sourceObject with the property set
 */
export const deepSet = (sourceObject, path, value) => {
  const result = Object.assign({}, sourceObject);
  const pathElements = path.split(".");
  let cursor = result;
  pathElements.slice(0, -1).forEach(pathElement => {
    cursor[pathElement] = Object.assign({}, cursor[pathElement]);
    cursor = cursor[pathElement];
  });
  cursor[pathElements[pathElements.length - 1]] = value;
  return result;
};