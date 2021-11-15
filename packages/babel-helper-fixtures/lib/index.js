"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = get;
exports.multiple = multiple;
exports.readFile = readFile;
exports.resolveOptionPluginOrPreset = resolveOptionPluginOrPreset;

var _semver = require("semver");

var _path = require("path");

var _fs = require("fs");

var _url = require("url");

var _module = require("module");

const nodeVersion = _semver.clean(process.version.slice(1));

function humanize(val, noext) {
  if (noext) val = _path.basename(val, _path.extname(val));
  return val.replace(/-/g, " ");
}

function tryResolve(module) {
  try {
    return require.resolve(module);
  } catch (e) {
    return null;
  }
}

function assertDirectory(loc) {
  if (!_fs.statSync(loc).isDirectory()) {
    throw new Error(`Expected ${loc} to be a directory.`);
  }
}

function shouldIgnore(name, ignore) {
  if (ignore && ignore.indexOf(name) >= 0) {
    return true;
  }

  const ext = _path.extname(name);

  const base = _path.basename(name, ext);

  return name[0] === "." || ext === ".md" || base === "LICENSE" || base === "options";
}

const EXTENSIONS = [".js", ".mjs", ".ts", ".tsx", ".cts", ".mts"];

function findFile(filepath, allowJSON) {
  const matches = [];

  for (const ext of EXTENSIONS.concat(allowJSON ? ".json" : [])) {
    const name = filepath + ext;
    if (_fs.existsSync(name)) matches.push(name);
  }

  if (matches.length > 1) {
    throw new Error(`Found conflicting file matches: ${matches.join(", ")}`);
  }

  return matches[0];
}

function pushTask(taskName, taskDir, suite, suiteName) {
  const taskDirStats = _fs.statSync(taskDir);

  let actualLoc = findFile(taskDir + "/input");
  let execLoc = findFile(taskDir + "/exec");

  if (taskDirStats.isDirectory() && !actualLoc && !execLoc) {
    if (_fs.readdirSync(taskDir).length > 0) {
      console.warn(`Skipped test folder with invalid layout: ${taskDir}`);
    }

    return;
  } else if (!actualLoc) {
    actualLoc = taskDir + "/input.js";
  } else if (!execLoc) {
    execLoc = taskDir + "/exec.js";
  }

  const expectLoc = findFile(taskDir + "/output", true) || taskDir + "/output.js";
  const stdoutLoc = taskDir + "/stdout.txt";
  const stderrLoc = taskDir + "/stderr.txt";

  const actualLocAlias = suiteName + "/" + taskName + "/" + _path.basename(actualLoc);

  const expectLocAlias = suiteName + "/" + taskName + "/" + _path.basename(actualLoc);

  let execLocAlias = suiteName + "/" + taskName + "/" + _path.basename(actualLoc);

  if (taskDirStats.isFile()) {
    const ext = _path.extname(taskDir);

    if (EXTENSIONS.indexOf(ext) === -1) return;
    execLoc = taskDir;
    execLocAlias = suiteName + "/" + taskName;
  }

  const taskOpts = JSON.parse(JSON.stringify(suite.options));
  const taskOptsLoc = tryResolve(taskDir + "/options");
  if (taskOptsLoc) Object.assign(taskOpts, require(taskOptsLoc));
  const test = {
    optionsDir: taskOptsLoc ? _path.dirname(taskOptsLoc) : null,
    title: humanize(taskName, true),
    disabled: taskName[0] === "." || (process.env.BABEL_8_BREAKING ? taskOpts.BABEL_8_BREAKING === false : taskOpts.BABEL_8_BREAKING === true),
    options: taskOpts,
    doNotSetSourceType: taskOpts.DO_NOT_SET_SOURCE_TYPE,
    externalHelpers: taskOpts.externalHelpers ?? !!tryResolve("@babel/plugin-external-helpers"),
    validateLogs: taskOpts.validateLogs,
    ignoreOutput: taskOpts.ignoreOutput,
    stdout: {
      loc: stdoutLoc,
      code: readFile(stdoutLoc)
    },
    stderr: {
      loc: stderrLoc,
      code: readFile(stderrLoc)
    },
    exec: {
      loc: execLoc,
      code: readFile(execLoc),
      filename: execLocAlias
    },
    actual: {
      loc: actualLoc,
      code: readFile(actualLoc),
      filename: actualLocAlias
    },
    expect: {
      loc: expectLoc,
      code: readFile(expectLoc),
      filename: expectLocAlias
    },
    sourceMappings: undefined,
    sourceMap: undefined,
    inputSourceMap: undefined
  };
  delete taskOpts.BABEL_8_BREAKING;
  delete taskOpts.DO_NOT_SET_SOURCE_TYPE;

  if (taskOpts.minNodeVersion) {
    const minimumVersion = _semver.clean(taskOpts.minNodeVersion);

    if (minimumVersion == null) {
      throw new Error(`'minNodeVersion' has invalid semver format: ${taskOpts.minNodeVersion}`);
    }

    if (_semver.lt(nodeVersion, minimumVersion)) {
      return;
    }

    delete taskOpts.minNodeVersion;
  }

  if (taskOpts.os) {
    let os = taskOpts.os;

    if (!Array.isArray(os) && typeof os !== "string") {
      throw new Error(`'os' should be either string or string array: ${taskOpts.os}`);
    }

    if (typeof os === "string") {
      os = [os];
    }

    if (!os.includes(process.platform)) {
      return;
    }

    delete taskOpts.os;
  }

  if (test.exec.code.indexOf("// Async.") >= 0) {
    return;
  }

  suite.tests.push(test);
  const sourceMappingsLoc = taskDir + "/source-mappings.json";

  if (_fs.existsSync(sourceMappingsLoc)) {
    test.sourceMappings = JSON.parse(readFile(sourceMappingsLoc));
  }

  const sourceMapLoc = taskDir + "/source-map.json";

  if (_fs.existsSync(sourceMapLoc)) {
    test.sourceMap = JSON.parse(readFile(sourceMapLoc));
  }

  const inputMapLoc = taskDir + "/input-source-map.json";

  if (_fs.existsSync(inputMapLoc)) {
    test.inputSourceMap = JSON.parse(readFile(inputMapLoc));
  }

  if (taskOpts.throws) {
    if (test.expect.code) {
      throw new Error("Test cannot throw and also return output code: " + expectLoc);
    }

    if (test.sourceMappings) {
      throw new Error("Test cannot throw and also return sourcemappings: " + sourceMappingsLoc);
    }

    if (test.sourceMap) {
      throw new Error("Test cannot throw and also return sourcemaps: " + sourceMapLoc);
    }
  }

  if (!test.validateLogs && (test.stdout.code || test.stderr.code)) {
    throw new Error("stdout.txt and stderr.txt are only allowed when the 'validateLogs' option is enabled: " + (test.stdout.code ? stdoutLoc : stderrLoc));
  }

  if (test.options.ignoreOutput) {
    if (test.expect.code) {
      throw new Error("Test cannot ignore its output and also validate it: " + expectLoc);
    }

    if (!test.validateLogs) {
      throw new Error("ignoreOutput can only be used when validateLogs is true: " + taskOptsLoc);
    }
  }

  delete test.options.validateLogs;
  delete test.options.ignoreOutput;
  delete test.options.externalHelpers;
}

function wrapPackagesArray(type, names, optionsDir) {
  return names.map(function (val) {
    if (typeof val === "string") val = [val];

    if (val[0][0] === ".") {
      if (!optionsDir) {
        throw new Error("Please provide an options.json in test dir when using a " + "relative plugin path.");
      }

      val[0] = _path.resolve(optionsDir, val[0]);
    } else {
      let name = val[0];
      const match = name.match(/^(@babel\/(?:plugin-|preset-)?)(.*)$/);

      if (match) {
        name = match[2];
      }

      const monorepoPath = _path.join(_path.dirname(__filename), "../..", `babel-${type}-${name}`);

      if (_fs.existsSync(monorepoPath)) {
        if (match) {
          throw new Error(`Remove the "${match[1]}" prefix from "${val[0]}", to load it from the monorepo`);
        }

        val[0] = monorepoPath;
      }
    }

    return val;
  });
}

function resolveOptionPluginOrPreset(options, optionsDir) {
  if (options.plugins) {
    options.plugins = wrapPackagesArray("plugin", options.plugins, optionsDir);
  }

  if (options.presets) {
    options.presets = wrapPackagesArray("preset", options.presets, optionsDir).map(function (val) {
      if (val.length > 3) {
        throw new Error("Unexpected extra options " + JSON.stringify(val.slice(3)) + " passed to preset.");
      }

      return val;
    });
  }

  return options;
}

function get(entryLoc) {
  const suites = [];
  let rootOpts = {};
  const rootOptsLoc = tryResolve(entryLoc + "/options");
  if (rootOptsLoc) rootOpts = require(rootOptsLoc);

  for (const suiteName of _fs.readdirSync(entryLoc)) {
    if (shouldIgnore(suiteName)) continue;
    const suite = {
      options: Object.assign({}, rootOpts),
      tests: [],
      title: humanize(suiteName),
      filename: entryLoc + "/" + suiteName
    };
    assertDirectory(suite.filename);
    suites.push(suite);
    const suiteOptsLoc = tryResolve(suite.filename + "/options");

    if (suiteOptsLoc) {
      suite.options = resolveOptionPluginOrPreset(require(suiteOptsLoc), suite.filename);
    }

    for (const taskName of _fs.readdirSync(suite.filename)) {
      pushTask(taskName, suite.filename + "/" + taskName, suite, suiteName);
    }
  }

  return suites;
}

function multiple(entryLoc, ignore) {
  const categories = {};

  for (const name of _fs.readdirSync(entryLoc)) {
    if (shouldIgnore(name, ignore)) continue;

    const loc = _path.join(entryLoc, name);

    assertDirectory(loc);
    categories[name] = get(loc);
  }

  return categories;
}

function readFile(filename) {
  if (_fs.existsSync(filename)) {
    let file = _fs.readFileSync(filename, "utf8").trimRight();

    file = file.replace(/\r\n/g, "\n");
    return file;
  } else {
    return "";
  }
}