/** Insert a new task in a grunt config object.
 * 
 * @param {Object} gruntConfig
 * The grunt configuration, before sending it to initConfig()
 * 
 * @param {string} taskType
 * The task type name (first level of grunt config object)
 * 
 * @param {string} taskName
 * The task name under a givne type (second level of grunt config object)
 * 
 * @param {Object} taskDef
 * The task definition to insert
 * 
 * @return {string}
 * The task full name to reference in registerTask()
 */
export const insertTask = (gruntConfig, taskType, taskName, taskDef) => {
  gruntConfig[taskType] = gruntConfig[taskType] || {};
  const taskFullName = `${taskType}:${taskName}`;
  if (gruntConfig[taskType][taskName] !== undefined) {
    throw new Error(`Grunt task ${taskFullName} already defined`);
  }
  gruntConfig[taskType][taskName] = taskDef;
  return taskFullName;
};