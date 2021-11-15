"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildExternalHelpers = exports.availablePresets = exports.availablePlugins = void 0;
exports.disableScriptTags = disableScriptTags;
exports.registerPlugin = registerPlugin;
exports.registerPlugins = registerPlugins;
exports.registerPreset = registerPreset;
exports.registerPresets = registerPresets;
exports.transform = transform;
exports.transformFromAst = transformFromAst;
exports.transformScriptTags = transformScriptTags;
exports.version = void 0;

require("./dynamic-require-entrypoint.cjs");

var _core = require("@babel/core");

var _plugins = require("./generated/plugins");

var _presetEs = require("./preset-es2015");

var _presetStage = require("./preset-stage-0");

var _presetStage2 = require("./preset-stage-1");

var _presetStage3 = require("./preset-stage-2");

var _presetStage4 = require("./preset-stage-3");

var _presetEnv = require("@babel/preset-env");

var _presetFlow = require("@babel/preset-flow");

var _presetReact = require("@babel/preset-react");

var _presetTypescript = require("@babel/preset-typescript");

var _transformScriptTags = require("./transformScriptTags");

var _window;

const isArray = Array.isArray || (arg => Object.prototype.toString.call(arg) === "[object Array]");

function loadBuiltin(builtinTable, name) {
  if (isArray(name) && typeof name[0] === "string") {
    if (Object.prototype.hasOwnProperty.call(builtinTable, name[0])) {
      return [builtinTable[name[0]]].concat(name.slice(1));
    }

    return;
  } else if (typeof name === "string") {
    return builtinTable[name];
  }

  return name;
}

function processOptions(options) {
  const presets = (options.presets || []).map(presetName => {
    const preset = loadBuiltin(availablePresets, presetName);

    if (preset) {
      if (isArray(preset) && typeof preset[0] === "object" && Object.prototype.hasOwnProperty.call(preset[0], "buildPreset")) {
        preset[0] = Object.assign({}, preset[0], {
          buildPreset: preset[0].buildPreset
        });
      }
    } else {
      throw new Error(`Invalid preset specified in Babel options: "${presetName}"`);
    }

    return preset;
  });
  const plugins = (options.plugins || []).map(pluginName => {
    const plugin = loadBuiltin(availablePlugins, pluginName);

    if (!plugin) {
      throw new Error(`Invalid plugin specified in Babel options: "${pluginName}"`);
    }

    return plugin;
  });
  return Object.assign({
    babelrc: false
  }, options, {
    presets,
    plugins
  });
}

function transform(code, options) {
  return (0, _core.transform)(code, processOptions(options));
}

function transformFromAst(ast, code, options) {
  return (0, _core.transformFromAst)(ast, code, processOptions(options));
}

const availablePlugins = {};
exports.availablePlugins = availablePlugins;
const availablePresets = {};
exports.availablePresets = availablePresets;
const buildExternalHelpers = _core.buildExternalHelpers;
exports.buildExternalHelpers = buildExternalHelpers;

function registerPlugin(name, plugin) {
  if (Object.prototype.hasOwnProperty.call(availablePlugins, name)) {
    console.warn(`A plugin named "${name}" is already registered, it will be overridden`);
  }

  availablePlugins[name] = plugin;
}

function registerPlugins(newPlugins) {
  Object.keys(newPlugins).forEach(name => registerPlugin(name, newPlugins[name]));
}

function registerPreset(name, preset) {
  if (Object.prototype.hasOwnProperty.call(availablePresets, name)) {
    if (name === "env") {
      console.warn("@babel/preset-env is now included in @babel/standalone, please remove @babel/preset-env-standalone");
    } else {
      console.warn(`A preset named "${name}" is already registered, it will be overridden`);
    }
  }

  availablePresets[name] = preset;
}

function registerPresets(newPresets) {
  Object.keys(newPresets).forEach(name => registerPreset(name, newPresets[name]));
}

registerPlugins(_plugins.all);
registerPresets({
  env: _presetEnv.default,
  es2015: _presetEs.default,
  es2016: () => {
    return {
      plugins: [availablePlugins["transform-exponentiation-operator"]]
    };
  },
  es2017: () => {
    return {
      plugins: [availablePlugins["transform-async-to-generator"]]
    };
  },
  react: _presetReact.default,
  "stage-0": _presetStage.default,
  "stage-1": _presetStage2.default,
  "stage-2": _presetStage3.default,
  "stage-3": _presetStage4.default,
  "es2015-loose": {
    presets: [[_presetEs.default, {
      loose: true
    }]]
  },
  "es2015-no-commonjs": {
    presets: [[_presetEs.default, {
      modules: false
    }]]
  },
  typescript: _presetTypescript.default,
  flow: _presetFlow.default
});
const version = VERSION;
exports.version = version;

function onDOMContentLoaded() {
  transformScriptTags();
}

if (typeof window !== "undefined" && (_window = window) != null && _window.addEventListener) {
  window.addEventListener("DOMContentLoaded", onDOMContentLoaded, false);
}

function transformScriptTags(scriptTags) {
  (0, _transformScriptTags.runScripts)(transform, scriptTags);
}

function disableScriptTags() {
  window.removeEventListener("DOMContentLoaded", onDOMContentLoaded);
}