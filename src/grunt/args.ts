import {camelToKebab} from "../util";

// eslint-disable-next-line no-shadow
export enum OptType {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  STRING = "string",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  NUMBER = "number",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  BOOLEAN = "boolean",
}

/**
 * Possible value type for options from command line
 */
export type OptValue = string | number | boolean;

/**
 * List of all configured options
 */
export type Opts = Record<string, OptValue>;

/**
 * Raw value type from command line
 */
export type RawOptValue =
  undefined
  | boolean
  | string;

/**
 * Interface to an option provider (usually Grunt itself)
 */
export interface OptionsProvider {
  /**
   * Return the value of an option from its key
   */
  option: (key: string) => RawOptValue;
}

/**
 * Expected option from command line
 */
interface OptionDefinitionBase {
  /**
   * Description for --help
   */
  description?: string;
  /**
   * Value type. Default to STRING.
   */
  type?: OptType;
}
/**
 * String option from command line
 */
export interface OptionDefinitionString extends OptionDefinitionBase {
  type: OptType.STRING;
  defaultValue?: string;
}
/**
 * Number option from command line
 */
export interface OptionDefinitionNumber extends OptionDefinitionBase {
  type: OptType.NUMBER;
  defaultValue?: number;
}
/**
 * Boolean option from command line
 */
export interface OptionDefinitionBoolean extends OptionDefinitionBase {
  type: OptType.BOOLEAN;
  defaultValue?: boolean;
}

/**
 * All possible option definition types
 */
export type OptionDefinition =
  OptionDefinitionString
  | OptionDefinitionNumber
  | OptionDefinitionBoolean;

/**
 * Expected options from command line
 */
export type ConfigDefinition = Record<string, OptionDefinition>;

/**
 * Process a string-type argument
 */
const handleOptionString = (
  rawValue: RawOptValue,
): string => {
  if (typeof rawValue !== "string") {
    throw new Error("Missing string argument");
  }
  return rawValue;
};

/**
 * Process a number-type argument
 */
const handleOptionNumber = (
  rawValue: RawOptValue,
): number => {
  if (typeof rawValue !== "string") {
    throw new Error("Missing number argument");
  }
  const asNumber = Number.parseFloat(rawValue);
  if (Number.isNaN(asNumber)) {
    throw new Error("Not a number");
  }
  return asNumber;
};

/**
 * Process a boolean-type argument
 */
const handleOptionBoolean = (
  rawValue: RawOptValue,
): boolean => {
  if (typeof rawValue !== "boolean") {
    throw new Error("Missing boolean argument");
  }
  return rawValue;
};

/**
 * Process one option from the list of expected arguments
 */
const handleOptionDef = (
  optionDef: OptionDefinition,
  rawValue: RawOptValue,
): OptValue => {
  if (rawValue === undefined) {
    if (optionDef.defaultValue === undefined) {
      throw new Error("Missing option");
    }
    return optionDef.defaultValue;
  }
  switch (optionDef.type) {
    case OptType.STRING: return handleOptionString(rawValue);
    case OptType.NUMBER: return handleOptionNumber(rawValue);
    case OptType.BOOLEAN: return handleOptionBoolean(rawValue);
  }
};

/**
 * Get a value from the command line
 */
const getFromOptionProvider = (
  keyName: string,
  optionProvider: OptionsProvider,
): RawOptValue => {
  const kebabName = camelToKebab(keyName);
  return optionProvider.option(kebabName);
};

// eslint-disable-next-line no-console
const outputHelp = (msg: string): void => console.log(msg);

const getTypeInfoString = (
  optionType: OptType,
  kebabName: string,
): string => {
  switch (optionType) {
    case OptType.STRING: return "=<string value>";
    case OptType.NUMBER: return "=<numeric value>";
    case OptType.BOOLEAN: return ` (use --no-${kebabName} to disable)`;
  }
};

/**
 * Display help for a single parameter
 */
const displayHelpForConfigKey = (
  keyName: string,
  optionDef: OptionDefinition,
): void => {
  const isMandatory = optionDef.defaultValue === undefined;
  const kebabName = camelToKebab(keyName);
  const mandatoryString = isMandatory
    ? ""
    : ` (optional, default value:${optionDef.defaultValue as string})`;
  const typeInfo = getTypeInfoString(optionDef.type, kebabName);
  outputHelp(` --${kebabName}${typeInfo}${mandatoryString}`);
  if (optionDef.description) {
    optionDef.description.split("\n").forEach(line => {
      outputHelp(`    ${line}`);
    });
  }
};

/**
 * Display help to the user
 */
const displayHelp = (
  configDef: ConfigDefinition,
): void => {
  outputHelp("Accepted command line arguments:");
  Object.keys(configDef).forEach(
    configKey => displayHelpForConfigKey(configKey, configDef[configKey]),
  );
};

/**
 * Construct the full config object from command line values.
 *
 * If "--help" is provided, display an help message and return null.
 */
export const getOptionsFromGruntCLI = (
  optionProvider: OptionsProvider,
  configDef: ConfigDefinition,
): Opts | null => {
  if (getFromOptionProvider("help", optionProvider) === true) {
    displayHelp(configDef);
    return null;
  }
  const result: Opts = {};
  Object.keys(configDef).forEach(
    keyName => {
      try {
        result[keyName] = handleOptionDef(
          configDef[keyName],
          getFromOptionProvider(keyName, optionProvider),
        );
      } catch (error) {
        throw new Error(`CLI Argument "${camelToKebab(keyName)}": ${error as string}`);
      }
    },
  );
  return result;
};
