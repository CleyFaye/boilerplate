import {join} from "path";
import {insertTask, GruntConfig} from "./util";
import {BaseOptions} from "../util";

export interface ImageOptions extends BaseOptions {
  options?: object;
  sourcePath?: string;
  outputPath?: string;
}

/** File extensions handled by this task */
export const handledExtensions = [".jpg", ".png", ".svg"];

/** Add an image minification task to the Grunt configuration
 * 
 * @param gruntConfig
 * Grunt configuration to add the task to
 * 
 * @param targetName
 * Name of the target for the image minification task.
 * 
 * @param imageOptions
 * Options for the image task configuration.
 * 
 * @param [imageOptions.options]
 * Options to pass to grunt-contrib-imagemin.
 * 
 * @param [imageOptions.sourcePath]
 * Path where the pug templates can be found. Subdirectories will be searched.
 * Default to "webres/<targetName>"
 * 
 * @param [imageOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 * 
 * @return
 * List of tasks added to the grunt configuration
 */
export const handle = (
  gruntConfig: GruntConfig,
  targetName: string,
  imageOptions: ImageOptions
): Array<string> => {
  const newImageTask = {
    options: imageOptions.options,
    files: [{
      expand: true,
      cwd: imageOptions.sourcePath || join("webres", targetName),
      src: handledExtensions.map(ext => `**/*${ext}`),
      dest: imageOptions.outputPath || join("dist", targetName),
    }],
  };
  return [insertTask(gruntConfig, "imagemin", targetName, newImageTask)];
};