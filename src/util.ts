const trimWordStart = 2;
const trimWordEnd = 3;

/** Convert a string identifier from camel case to kebab case.
 *
 * This is not perfect, but will allow for the first character to not be
 * uppercase.
 * There's also moderate support for all caps word in the middle, as long as
 * there is no two consecutive all caps words, which are undistinguishable.
 */
export const camelToKebab = (camel: string): string => camel.length === 0
  ? ""
  : `${camel[0].toUpperCase()}${camel.substr(1)}`
    .replace(
      /[A-Z][A-Z0-9]+[a-z0-9]/ug,
      (value) => value[0]
        + value.substr(1, value.length - trimWordEnd).toLowerCase()
        + value.substr(value.length - trimWordStart),
    ).replace(
      /[A-Z][A-Z]+$/u,
      (value) => value[0] + value.substr(1).toLowerCase(),
    )
    .split(/(?=[A-Z])/u)
    .map((word) => word.toLowerCase())
    .join("-");
