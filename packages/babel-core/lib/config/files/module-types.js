"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loadCjsOrMjsDefault;

var _async = require("../../gensync-utils/async");

function _path() {
  const data = require("path");

  _path = function () {
    return data;
  };

  return data;
}

function _url() {
  const data = require("url");

  _url = function () {
    return data;
  };

  return data;
}

function _module() {
  const data = require("module");

  _module = function () {
    return data;
  };

  return data;
}

let import_;

try {
  import_ = require("./import").default;
} catch {}

function* loadCjsOrMjsDefault(filepath, asyncError, fallbackToTranspiledModule = false) {
  switch (guessJSModuleType(filepath)) {
    case "cjs":
      return loadCjsDefault(filepath, fallbackToTranspiledModule);

    case "unknown":
      try {
        return loadCjsDefault(filepath, fallbackToTranspiledModule);
      } catch (e) {
        if (e.code !== "ERR_REQUIRE_ESM") throw e;
      }

    case "mjs":
      if (yield* (0, _async.isAsync)()) {
        return yield* (0, _async.waitFor)(loadMjsDefault(filepath));
      }

      throw new Error(asyncError);
  }
}

function guessJSModuleType(filename) {
  switch (_path().extname(filename)) {
    case ".cjs":
      return "cjs";

    case ".mjs":
      return "mjs";

    default:
      return "unknown";
  }
}

function loadCjsDefault(filepath, fallbackToTranspiledModule) {
  const module = require(filepath);

  return module != null && module.__esModule ? module.default || (fallbackToTranspiledModule ? module : undefined) : module;
}

async function loadMjsDefault(filepath) {
  if (!import_) {
    throw new Error("Internal error: Native ECMAScript modules aren't supported" + " by this platform.\n");
  }

  const module = await import_((0, _url().pathToFileURL)(filepath));
  return module.default;
}