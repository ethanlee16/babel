"use strict";

var _v8flags = require("v8flags");

var _path = require("path");

var _child_process = require("child_process");

var _url = require("url");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const args = [_path.join(_path.dirname(__filename), "_babel-node")];
let babelArgs = process.argv.slice(2);
let userArgs;
const argSeparator = babelArgs.indexOf("--");

if (argSeparator > -1) {
  userArgs = babelArgs.slice(argSeparator);
  babelArgs = babelArgs.slice(0, argSeparator);
}

function getNormalizedV8Flag(arg) {
  const matches = arg.match(/--(?:no)?(.+)/);

  if (matches) {
    return `--${matches[1].replace(/-/g, "_")}`;
  }

  return arg;
}

const aliases = new Map([["-d", "--debug"], ["-gc", "--expose-gc"]]);

_v8flags(async function (err, v8Flags) {
  for (let i = 0; i < babelArgs.length; i++) {
    const arg = babelArgs[i];
    const flag = arg.split("=")[0];

    if (flag === "-r" || flag === "--require") {
      args.push(flag);
      args.push(babelArgs[++i]);
    } else if (aliases.has(flag)) {
      args.unshift(aliases.get(flag));
    } else if (flag === "debug" || flag === "inspect" || v8Flags.indexOf(getNormalizedV8Flag(flag)) >= 0 || process.allowedNodeEnvironmentFlags.has(flag)) {
      args.unshift(arg);
    } else {
      args.push(arg);
    }
  }

  if (argSeparator > -1) {
    args.push(...userArgs);
  }

  try {
    const {
      default: kexec
    } = await Promise.resolve().then(() => _interopRequireWildcard(require("kexec")));
    kexec(process.argv[0], args);
  } catch (err) {
    if (err.code !== "ERR_MODULE_NOT_FOUND" && err.code !== "MODULE_NOT_FOUND" && err.code !== "UNDECLARED_DEPENDENCY") {
      throw err;
    }

    const shouldPassthroughIPC = process.send !== undefined;

    const proc = _child_process.spawn(process.argv[0], args, {
      stdio: shouldPassthroughIPC ? ["inherit", "inherit", "inherit", "ipc"] : "inherit"
    });

    proc.on("exit", function (code, signal) {
      process.on("exit", function () {
        if (signal) {
          process.kill(process.pid, signal);
        } else {
          process.exitCode = code;
        }
      });
    });

    if (shouldPassthroughIPC) {
      proc.on("message", message => process.send(message));
    }

    process.on("SIGINT", () => proc.kill("SIGINT"));
    process.on("SIGTERM", () => proc.kill("SIGTERM"));
  }
});