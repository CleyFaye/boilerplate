const {readFileSync} = require("fs");

const loadGruntTasks = require("load-grunt-tasks");

const licenseJS = [
  "/**",
  " * @license",
  " * @preserve",
  ...readFileSync("LICENSE", "utf8")
    .split("\n")
    .map((c) => ` * ${c}`.trimEnd()),
  " */",
].join("\n");

module.exports = (grunt) => {
  loadGruntTasks(grunt, {scope: "devDependencies"});

  grunt.initConfig({
    clean: {
      build: ["lib"],
      cache: [".tscache", ".tsbuildinfo", "**/.cache"],
    },
    run: {
      tsbuild: {
        cmd: "npx",
        args: ["tsc"],
      },
    },
    usebanner: {
      options: {banner: licenseJS},
      build: {
        files: [{cwd: "lib", expand: true, src: ["**/*.js"]}],
      },
    },
  });

  grunt.registerTask("build", "Build the library", ["run:tsbuild", "usebanner:build"]);

  grunt.registerTask("default", "build");
};
