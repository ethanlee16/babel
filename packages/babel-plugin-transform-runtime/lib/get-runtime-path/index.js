"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _path = require("path");

var _module = require("module");

function _default(moduleName, dirname, absoluteRuntime) {
  if (absoluteRuntime === false) return moduleName;
  return resolveAbsoluteRuntime(moduleName, _path.resolve(dirname, absoluteRuntime === true ? "." : absoluteRuntime));
}

function resolveAbsoluteRuntime(moduleName, dirname) {
  try {
    return _path.dirname(require.resolve(`${moduleName}/package.json`, {
      paths: [dirname]
    })).replace(/\\/g, "/");
  } catch (err) {
    if (err.code !== "MODULE_NOT_FOUND") throw err;
    throw Object.assign(new Error(`Failed to resolve "${moduleName}" relative to "${dirname}"`), {
      code: "BABEL_RUNTIME_NOT_FOUND",
      runtime: moduleName,
      dirname
    });
  }
}