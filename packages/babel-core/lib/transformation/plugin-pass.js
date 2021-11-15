"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class PluginPass {
  _map = new Map();
  key;
  file;
  opts;
  cwd;
  filename;

  constructor(file, key, options) {
    this.key = key;
    this.file = file;
    this.opts = options || {};
    this.cwd = file.opts.cwd;
    this.filename = file.opts.filename;
  }

  set(key, val) {
    this._map.set(key, val);
  }

  get(key) {
    return this._map.get(key);
  }

  availableHelper(name, versionRange) {
    return this.file.availableHelper(name, versionRange);
  }

  addHelper(name) {
    return this.file.addHelper(name);
  }

  addImport() {
    return this.file.addImport();
  }

  buildCodeFrameError(node, msg, _Error) {
    return this.file.buildCodeFrameError(node, msg, _Error);
  }

}

exports.default = PluginPass;

if (!process.env.BABEL_8_BREAKING) {
  PluginPass.prototype.getModuleName = function getModuleName() {
    return this.file.getModuleName();
  };
}