"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clear = clear;
exports.get = get;
exports.load = load;
exports.save = save;
exports.setDirty = setDirty;

var _path = require("path");

var _fs = require("fs");

var _os = require("os");

var babel = require("@babel/core");

var _findCacheDir = require("find-cache-dir");

const DEFAULT_CACHE_DIR = _findCacheDir({
  name: "@babel/register"
}) || _os.homedir() || _os.tmpdir();

const DEFAULT_FILENAME = _path.join(DEFAULT_CACHE_DIR, `.babel.${babel.version}.${babel.getEnv()}.json`);

const FILENAME = process.env.BABEL_CACHE_PATH || DEFAULT_FILENAME;
let data = {};
let cacheDirty = false;
let cacheDisabled = false;

function isCacheDisabled() {
  return process.env.BABEL_DISABLE_CACHE ?? cacheDisabled;
}

function save() {
  if (isCacheDisabled() || !cacheDirty) return;
  cacheDirty = false;
  let serialised = "{}";

  try {
    serialised = JSON.stringify(data, null, "  ");
  } catch (err) {
    if (err.message === "Invalid string length") {
      err.message = "Cache too large so it's been cleared.";
      console.error(err.stack);
    } else {
      throw err;
    }
  }

  try {
    _fs.mkdirSync(_path.dirname(FILENAME), {
      recursive: true
    });

    _fs.writeFileSync(FILENAME, serialised);
  } catch (e) {
    switch (e.code) {
      case "ENOENT":
      case "EACCES":
      case "EPERM":
        console.warn(`Babel could not write cache to file: ${FILENAME}
due to a permission issue. Cache is disabled.`);
        cacheDisabled = true;
        break;

      case "EROFS":
        console.warn(`Babel could not write cache to file: ${FILENAME}
because it resides in a readonly filesystem. Cache is disabled.`);
        cacheDisabled = true;
        break;

      default:
        throw e;
    }
  }
}

function load() {
  if (isCacheDisabled()) {
    data = {};
    return;
  }

  process.on("exit", save);
  process.nextTick(save);
  let cacheContent;

  try {
    cacheContent = _fs.readFileSync(FILENAME);
  } catch (e) {
    switch (e.code) {
      case "EACCES":
        console.warn(`Babel could not read cache file: ${FILENAME}
due to a permission issue. Cache is disabled.`);
        cacheDisabled = true;

      default:
        return;
    }
  }

  try {
    data = JSON.parse(cacheContent);
  } catch {}
}

function get() {
  return data;
}

function setDirty() {
  cacheDirty = true;
}

function clear() {
  data = {};
}