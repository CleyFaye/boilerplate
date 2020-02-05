export type GruntConfig = Record<string, Record<string, object>>;

/** Insert a new task in a grunt config object.
 *
 * @param gruntConfig
 * The grunt configuration, before sending it to initConfig()
 *
 * @param taskType
 * The task type name (first level of grunt config object)
 *
 * @param taskName
 * The task name under a givne type (second level of grunt config object)
 *
 * @param taskDef
 * The task definition to insert
 *
 * @return
 * The task full name to reference in registerTask()
 */
export const insertTask = (
  gruntConfig: GruntConfig,
  taskType: string,
  taskName: string,
  taskDef: object,
): string => {
  if (!(taskType in gruntConfig)) {
    gruntConfig[taskType] = {};
  }
  const taskFullName = `${taskType}:${taskName}`;
  if (gruntConfig[taskType][taskName] !== undefined) {
    throw new Error(`Grunt task ${taskFullName} already defined`);
  }
  gruntConfig[taskType][taskName] = taskDef;
  return taskFullName;
};
