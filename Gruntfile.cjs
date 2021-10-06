const loadGruntTasks = require("load-grunt-tasks");
const {readFileSync} = require("fs");

const licenseJS = [
  "/**",
  " * @license",
  " * @preserve",
  ...readFileSync("LICENSE", "utf8").split("\n")
    .map(c => ` * ${c}`.trimEnd()),
  " */",
].join("\n");

module.exports = grunt => {
  loadGruntTasks(grunt, {scope: "devDependencies"});

  grunt.initConfig({
    clean: {
      build: [
        "lib",
      ],
      cache: [
        ".tscache",
        ".tsbuildinfo",
        "**/.cache",
      ],
    },
    run: {
      ts_build: {
        cmd: "npx",
        args: [
          "tsc",
        ],
      },
    },
    usebanner: {
      options: {banner: licenseJS},
      build: {
        files: [{
          expand: true,
          cwd: "lib",
          src: ["**/*.js"],
        }],
      },
    },
  });

  grunt.registerTask(
    "build",
    "Build the library",
    [
      "run:ts_build",
      "usebanner:build",
    ],
  );

  grunt.registerTask("default", "build");
};
