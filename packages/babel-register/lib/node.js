"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = register;
exports.revert = revert;

var _cloneDeep = require("clone-deep");

var _sourceMapSupport = require("source-map-support");

var registerCache = require("./cache");

var babel = require("@babel/core");

var _pirates = require("pirates");

var _fs = require("fs");

var _path = require("path");

var _module = require("module");

const maps = {};
let transformOpts = {};
let piratesRevert = null;

function installSourceMapSupport() {
  _sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: "node",

    retrieveSourceMap(source) {
      const map = maps && maps[source];

      if (map) {
        return {
          url: null,
          map: map
        };
      } else {
        return null;
      }
    }

  });
}

let cache;

function mtime(filename) {
  return +_fs.statSync(filename).mtime;
}

function compile(code, filename) {
  const opts = new babel.OptionManager().init(Object.assign({
    sourceRoot: _path.dirname(filename) + _path.sep
  }, _cloneDeep(transformOpts), {
    filename
  }));
  if (opts === null) return code;
  let cacheKey = `${JSON.stringify(opts)}:${babel.version}`;
  const env = babel.getEnv(false);
  if (env) cacheKey += `:${env}`;
  let cached, fileMtime;

  if (cache) {
    cached = cache[cacheKey];
    fileMtime = mtime(filename);
  }

  if (!cached || cached.mtime !== fileMtime) {
    cached = babel.transform(code, Object.assign({}, opts, {
      sourceMaps: opts.sourceMaps === undefined ? "both" : opts.sourceMaps,
      ast: false
    }));

    if (cache) {
      cache[cacheKey] = cached;
      cached.mtime = fileMtime;
      registerCache.setDirty();
    }
  }

  if (cached.map) {
    if (Object.keys(maps).length === 0) {
      installSourceMapSupport();
    }

    maps[filename] = cached.map;
  }

  return cached.code;
}

let compiling = false;
const internalModuleCache = _module._cache;

function compileHook(code, filename) {
  if (compiling) return code;
  const globalModuleCache = _module._cache;

  try {
    compiling = true;
    _module._cache = internalModuleCache;
    return compile(code, filename);
  } finally {
    compiling = false;
    _module._cache = globalModuleCache;
  }
}

function hookExtensions(exts) {
  if (piratesRevert) piratesRevert();
  piratesRevert = (0, _pirates.addHook)(compileHook, {
    exts,
    ignoreNodeModules: false
  });
}

function revert() {
  if (piratesRevert) piratesRevert();
}

function escapeRegExp(string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function register(opts = {}) {
  opts = Object.assign({}, opts);
  hookExtensions(opts.extensions || babel.DEFAULT_EXTENSIONS);

  if (opts.cache === false && cache) {
    registerCache.clear();
    cache = null;
  } else if (opts.cache !== false && !cache) {
    registerCache.load();
    cache = registerCache.get();
  }

  delete opts.extensions;
  delete opts.cache;
  transformOpts = Object.assign({}, opts, {
    caller: Object.assign({
      name: "@babel/register"
    }, opts.caller || {})
  });
  let {
    cwd = "."
  } = transformOpts;
  cwd = transformOpts.cwd = _path.resolve(cwd);

  if (transformOpts.ignore === undefined && transformOpts.only === undefined) {
    transformOpts.only = [new RegExp("^" + escapeRegExp(cwd), "i")];
    transformOpts.ignore = [new RegExp("^" + escapeRegExp(cwd) + "(?:" + _path.sep + ".*)?" + escapeRegExp(_path.sep + "node_modules" + _path.sep), "i")];
  }
}