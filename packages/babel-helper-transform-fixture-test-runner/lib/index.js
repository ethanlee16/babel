"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
exports.runCodeInTestContext = runCodeInTestContext;

var babel = require("@babel/core");

var _helperFixtures = require("@babel/helper-fixtures");

var _sourceMap = require("source-map");

var _codeFrame = require("@babel/code-frame");

var helpers = require("./helpers");

var _assert = require("assert");

var _fs = require("fs");

var _path = require("path");

var _vm = require("vm");

var _quickLru = require("quick-lru");

var _url = require("url");

var _module = require("module");

var _babelCheckDuplicatedNodes = require("babel-check-duplicated-nodes");

const checkDuplicatedNodes = _babelCheckDuplicatedNodes.default;
const EXTERNAL_HELPERS_VERSION = "7.100.0";
const cachedScripts = new _quickLru({
  maxSize: 10
});
const contextModuleCache = new WeakMap();
const sharedTestContext = createContext();

function transformWithoutConfigFile(code, opts) {
  return babel.transform(code, Object.assign({
    configFile: false,
    babelrc: false
  }, opts));
}

function createContext() {
  const context = _vm.createContext(Object.assign({}, helpers, {
    process: process,
    transform: transformWithoutConfigFile,
    setTimeout: setTimeout,
    setImmediate: setImmediate,
    expect
  }));

  context.global = context;
  const moduleCache = Object.create(null);
  contextModuleCache.set(context, moduleCache);
  runModuleInTestContext("regenerator-runtime", __filename, context, moduleCache);
  runCacheableScriptInTestContext(_path.join(_path.dirname(__filename), "babel-helpers-in-memory.js"), babel.buildExternalHelpers, context, moduleCache);
  return context;
}

function runCacheableScriptInTestContext(filename, srcFn, context, moduleCache) {
  let cached = cachedScripts.get(filename);

  if (!cached) {
    const code = `(function (exports, require, module, __filename, __dirname) {\n${srcFn()}\n});`;
    cached = {
      code,
      cachedData: undefined
    };
    cachedScripts.set(filename, cached);
  }

  let script;

  if (process.env.BABEL_8_BREAKING) {
    script = new _vm.Script(cached.code, {
      filename,
      displayErrors: true,
      lineOffset: -1,
      cachedData: cached.cachedData
    });
    cached.cachedData = script.createCachedData();
  } else {
    script = new _vm.Script(cached.code, {
      filename,
      displayErrors: true,
      lineOffset: -1,
      cachedData: cached.cachedData,
      produceCachedData: true
    });

    if (script.cachedDataProduced) {
      cached.cachedData = script.cachedData;
    }
  }

  const module = {
    id: filename,
    exports: {}
  };

  const req = id => runModuleInTestContext(id, filename, context, moduleCache);

  const dirname = _path.dirname(filename);

  script.runInContext(context).call(module.exports, module.exports, req, module, filename, dirname);
  return module;
}

function runModuleInTestContext(id, relativeFilename, context, moduleCache) {
  const filename = require.resolve(id, {
    paths: [_path.dirname(relativeFilename)]
  });

  if (filename === id) return require(id);
  if (moduleCache[filename]) return moduleCache[filename].exports;
  const module = runCacheableScriptInTestContext(filename, () => _fs.readFileSync(filename, "utf8"), context, moduleCache);
  moduleCache[filename] = module;
  return module.exports;
}

function runCodeInTestContext(code, opts, context = sharedTestContext) {
  const filename = opts.filename;

  const dirname = _path.dirname(filename);

  const moduleCache = contextModuleCache.get(context);

  const req = id => runModuleInTestContext(id, filename, context, moduleCache);

  const module = {
    id: filename,
    exports: {}
  };
  const oldCwd = process.cwd();

  try {
    if (opts.filename) process.chdir(_path.dirname(opts.filename));
    const src = `(function(exports, require, module, __filename, __dirname, opts) {\n${code}\n});`;
    return _vm.runInContext(src, context, {
      filename,
      displayErrors: true,
      lineOffset: -1
    })(module.exports, req, module, filename, dirname, opts);
  } finally {
    process.chdir(oldCwd);
  }
}

function maybeMockConsole(validateLogs, run) {
  const actualLogs = {
    stdout: "",
    stderr: ""
  };
  if (!validateLogs) return {
    result: run(),
    actualLogs
  };
  const spy1 = jest.spyOn(console, "log").mockImplementation(msg => {
    actualLogs.stdout += `${msg}\n`;
  });
  const spy2 = jest.spyOn(console, "warn").mockImplementation(msg => {
    actualLogs.stderr += `${msg}\n`;
  });

  try {
    return {
      result: run(),
      actualLogs
    };
  } finally {
    spy1.mockRestore();
    spy2.mockRestore();
  }
}

function run(task) {
  const {
    actual,
    expect: expected,
    exec,
    options: opts,
    doNotSetSourceType,
    optionsDir,
    validateLogs,
    ignoreOutput,
    stdout,
    stderr
  } = task;

  function getOpts(self) {
    const newOpts = Object.assign({
      ast: true,
      cwd: _path.dirname(self.loc),
      filename: self.loc,
      filenameRelative: self.filename,
      sourceFileName: self.filename
    }, doNotSetSourceType ? {} : {
      sourceType: "script"
    }, {
      babelrc: false,
      configFile: false,
      inputSourceMap: task.inputSourceMap || undefined
    }, opts);
    return (0, _helperFixtures.resolveOptionPluginOrPreset)(newOpts, optionsDir);
  }

  let execCode = exec.code;
  let result;
  let resultExec;

  if (execCode) {
    const context = createContext();
    const execOpts = getOpts(exec);
    ({
      result
    } = maybeMockConsole(validateLogs, () => babel.transform(execCode, execOpts)));
    checkDuplicatedNodes(babel, result.ast);
    execCode = result.code;

    try {
      resultExec = runCodeInTestContext(execCode, execOpts, context);
    } catch (err) {
      err.message = `${exec.loc}: ${err.message}\n` + (0, _codeFrame.codeFrameColumns)(execCode, {});
      throw err;
    }
  }

  const inputCode = actual.code;
  const expectedCode = expected.code;

  if (!execCode || inputCode) {
    let actualLogs;
    ({
      result,
      actualLogs
    } = maybeMockConsole(validateLogs, () => babel.transform(inputCode, getOpts(actual))));
    const outputCode = normalizeOutput(result.code);
    checkDuplicatedNodes(babel, result.ast);

    if (!ignoreOutput) {
      if (!expected.code && outputCode && !opts.throws && _fs.statSync(_path.dirname(expected.loc)).isDirectory() && !process.env.CI) {
        const expectedFile = expected.loc.replace(/\.m?js$/, result.sourceType === "module" ? ".mjs" : ".js");
        console.log(`New test file created: ${expectedFile}`);

        _fs.writeFileSync(expectedFile, `${outputCode}\n`);

        if (expected.loc !== expectedFile) {
          try {
            _fs.unlinkSync(expected.loc);
          } catch (e) {}
        }
      } else {
        validateFile(outputCode, expected.loc, expectedCode);

        if (inputCode) {
          expect(expected.loc).toMatch(result.sourceType === "module" ? /\.mjs$/ : /\.js$/);
        }
      }
    }

    if (validateLogs) {
      validateFile(normalizeOutput(actualLogs.stdout, true), stdout.loc, stdout.code);
      validateFile(normalizeOutput(actualLogs.stderr, true), stderr.loc, stderr.code);
    }
  }

  if (task.sourceMap) {
    expect(result.map).toEqual(task.sourceMap);
  }

  if (task.sourceMappings) {
    const consumer = new _sourceMap.SourceMapConsumer(result.map);
    task.sourceMappings.forEach(function (mapping) {
      const actual = mapping.original;
      const expected = consumer.originalPositionFor(mapping.generated);
      expect({
        line: expected.line,
        column: expected.column
      }).toEqual(actual);
    });
  }

  if (execCode && resultExec) {
    return resultExec;
  }
}

function validateFile(actualCode, expectedLoc, expectedCode) {
  try {
    expect(actualCode).toEqualFile({
      filename: expectedLoc,
      code: expectedCode
    });
  } catch (e) {
    if (!process.env.OVERWRITE) throw e;
    console.log(`Updated test file: ${expectedLoc}`);

    _fs.writeFileSync(expectedLoc, `${actualCode}\n`);
  }
}

function escapeRegExp(string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function normalizeOutput(code, normalizePathSeparator) {
  const projectRoot = _path.resolve(_path.dirname(__filename), "../../../");

  const cwdSymbol = "<CWD>";
  let result = code.trim().replace(new RegExp(escapeRegExp(projectRoot), "g"), cwdSymbol);

  if (process.platform === "win32") {
    result = result.replace(new RegExp(escapeRegExp(projectRoot.replace(/\\/g, "/")), "g"), cwdSymbol).replace(new RegExp(escapeRegExp(projectRoot.replace(/\\/g, "\\\\")), "g"), cwdSymbol);

    if (normalizePathSeparator) {
      result = result.replace(/<CWD>[\w\\/.-]+/g, path => path.replace(/\\\\?/g, "/"));
    }
  }

  return result;
}

expect.extend({
  toEqualFile(actual, {
    filename,
    code
  }) {
    if (this.isNot) {
      throw new Error(".toEqualFile does not support negation");
    }

    const pass = actual === code;
    return {
      pass,
      message: () => {
        const diffString = this.utils.diff(code, actual, {
          expand: false
        });
        return `Expected ${filename} to match transform output.\n` + `To autogenerate a passing version of this file, delete the file and re-run the tests.\n\n` + `Diff:\n\n${diffString}`;
      }
    };
  }

});

function _default(fixturesLoc, name, suiteOpts = {}, taskOpts = {}, dynamicOpts) {
  const suites = (0, _helperFixtures.default)(fixturesLoc);

  for (const testSuite of suites) {
    var _suiteOpts$ignoreSuit;

    if ((_suiteOpts$ignoreSuit = suiteOpts.ignoreSuites) != null && _suiteOpts$ignoreSuit.includes(testSuite.title)) continue;
    describe(name + "/" + testSuite.title, function () {
      for (const task of testSuite.tests) {
        var _suiteOpts$ignoreTask, _suiteOpts$ignoreTask2;

        if ((_suiteOpts$ignoreTask = suiteOpts.ignoreTasks) != null && _suiteOpts$ignoreTask.includes(task.title) || (_suiteOpts$ignoreTask2 = suiteOpts.ignoreTasks) != null && _suiteOpts$ignoreTask2.includes(testSuite.title + "/" + task.title)) {
          continue;
        }

        const testFn = task.disabled ? it.skip : it;
        testFn(task.title, function () {
          function runTask() {
            run(task);
          }

          if ("sourceMap" in task.options === false) {
            task.options.sourceMap = !!(task.sourceMappings || task.sourceMap);
          }

          Object.assign(task.options, taskOpts);
          if (dynamicOpts) dynamicOpts(task.options, task);

          if (task.externalHelpers) {
            var _task$options;

            ((_task$options = task.options).plugins ?? (_task$options.plugins = [])).push(["external-helpers", {
              helperVersion: EXTERNAL_HELPERS_VERSION
            }]);
          }

          const throwMsg = task.options.throws;

          if (throwMsg) {
            delete task.options.throws;

            _assert.throws(runTask, function (err) {
              _assert.ok(throwMsg === true || err.message.includes(throwMsg), `
Expected Error: ${throwMsg}
Actual Error: ${err.message}`);

              return true;
            });
          } else {
            if (task.exec.code) {
              const result = run(task);

              if (result && typeof result.then === "function") {
                return result;
              }
            } else {
              runTask();
            }
          }
        });
      }
    });
  }
}