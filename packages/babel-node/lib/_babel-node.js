"use strict";

var _commander = require("commander");

var _module = _interopRequireWildcard(require("module"), true);

var _util = require("util");

var _path = require("path");

var _repl = require("repl");

var babel = require("@babel/core");

var _vm = require("vm");

require("core-js/stable");

require("regenerator-runtime/runtime");

var _register = require("@babel/register");

var _url = require("url");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const program = new _commander.Command("babel-node");

function collect(value, previousValue) {
  if (typeof value !== "string") return previousValue;
  const values = value.split(",");

  if (previousValue) {
    previousValue.push(...values);
    return previousValue;
  }

  return values;
}

program.option("-e, --eval [script]", "Evaluate script");
program.option("--no-babelrc", "Specify whether or not to use .babelrc and .babelignore files");
program.option("-r, --require [module]", "Require module");
program.option("-p, --print [code]", "Evaluate script and print result");
program.option("-o, --only [globs]", "A comma-separated list of glob patterns to compile", collect);
program.option("-i, --ignore [globs]", "A comma-separated list of glob patterns to skip compiling", collect);
program.option("-x, --extensions [extensions]", "List of extensions to hook into [.es6,.js,.es,.jsx,.mjs]", collect);
program.option("--config-file [path]", "Path to the babel config file to use. Defaults to working directory babel.config.js");
program.option("--env-name [name]", "The name of the 'env' to use when loading configs and plugins. " + "Defaults to the value of BABEL_ENV, or else NODE_ENV, or else 'development'.");
program.option("--root-mode [mode]", "The project-root resolution mode. " + "One of 'root' (the default), 'upward', or 'upward-optional'.");
program.option("-w, --plugins [string]", "", collect);
program.option("-b, --presets [string]", "", collect);
program.version("7.16.0");
program.usage("[options] [ -e script | script.js ] [arguments]");
program.parse(process.argv);
const babelOptions = {
  caller: {
    name: "@babel/node"
  },
  extensions: program.extensions,
  ignore: program.ignore,
  only: program.only,
  plugins: program.plugins,
  presets: program.presets,
  configFile: program.configFile,
  envName: program.envName,
  rootMode: program.rootMode,
  babelrc: program.babelrc === true ? undefined : program.babelrc
};

for (const key of Object.keys(babelOptions)) {
  if (babelOptions[key] === undefined) {
    delete babelOptions[key];
  }
}

(0, _register.default)(babelOptions);

const replPlugin = ({
  types: t
}) => ({
  visitor: {
    ModuleDeclaration(path) {
      throw path.buildCodeFrameError("Modules aren't supported in the REPL");
    },

    VariableDeclaration(path) {
      if (path.node.kind !== "var") {
        throw path.buildCodeFrameError("Only `var` variables are supported in the REPL");
      }
    },

    Program(path) {
      if (path.get("body").some(child => child.isExpressionStatement())) return;
      path.pushContainer("body", t.expressionStatement(t.identifier("undefined")));
    }

  }
});

const _eval = function (code, filename) {
  code = code.trim();
  if (!code) return undefined;
  code = babel.transform(code, {
    filename: filename,
    presets: program.presets,
    plugins: (program.plugins || []).concat([replPlugin])
  }).code;
  return _vm.runInThisContext(code, {
    filename: filename
  });
};

if (program.eval || program.print) {
  let code = program.eval;
  if (!code || code === true) code = program.print;
  global.__filename = "[eval]";
  global.__dirname = process.cwd();
  const module = new _module.default(global.__filename);
  module.filename = global.__filename;
  module.paths = _module.default._nodeModulePaths(global.__dirname);
  global.exports = module.exports;
  global.module = module;
  global.require = module.require.bind(module);

  const result = _eval(code, global.__filename);

  if (program.print) {
    const output = typeof result === "string" ? result : (0, _util.inspect)(result);
    process.stdout.write(output + "\n");
  }
} else {
  if (program.args.length) {
    let args = process.argv.slice(2);
    let i = 0;
    let ignoreNext = false;
    args.some(function (arg, i2) {
      if (ignoreNext) {
        ignoreNext = false;
        return;
      }

      if (arg[0] === "-") {
        const parsedOption = program.options.find(option => {
          return option.long === arg || option.short === arg;
        });

        if (parsedOption === undefined) {
          return;
        }

        const optionName = parsedOption.attributeName();
        const parsedArg = program[optionName];

        if (optionName === "require" || parsedArg && parsedArg !== true) {
          ignoreNext = true;
        }
      } else {
        i = i2;
        return true;
      }
    });
    args = args.slice(i);
    requireArgs();
    const filename = args[0];

    if (!_path.isAbsolute(filename)) {
      args[0] = _path.join(process.cwd(), filename);
    }

    process.argv = ["node", ...args];
    process.execArgv.push(__filename);

    _module.default.runMain();
  } else {
    requireArgs();
    replStart();
  }
}

function requireArgs() {
  if (program.require) {
    require(require.resolve(program.require, {
      paths: [process.cwd()]
    }));
  }
}

function replStart() {
  const replServer = _repl.start({
    prompt: "babel > ",
    input: process.stdin,
    output: process.stdout,
    eval: replEval,
    useGlobal: true,
    preview: true
  });

  if (process.env.BABEL_8_BREAKING) {
    replServer.setupHistory(process.env.NODE_REPL_HISTORY, () => {});
  } else {
    replServer.setupHistory == null ? void 0 : replServer.setupHistory(process.env.NODE_REPL_HISTORY, () => {});
  }
}

function replEval(code, context, filename, callback) {
  let err;
  let result;

  try {
    if (code[0] === "(" && code[code.length - 1] === ")") {
      code = code.slice(1, -1);
    }

    result = _eval(code, filename);
  } catch (e) {
    err = e;
  }

  callback(err, result);
}