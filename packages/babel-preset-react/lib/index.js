'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var helperPluginUtils = require('@babel/helper-plugin-utils');
var transformReactJSX = require('@babel/plugin-transform-react-jsx');
var transformReactJSXDevelopment = require('@babel/plugin-transform-react-jsx-development');
var transformReactDisplayName = require('@babel/plugin-transform-react-display-name');
var transformReactPure = require('@babel/plugin-transform-react-pure-annotations');
var helperValidatorOption = require('@babel/helper-validator-option');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var transformReactJSX__default = /*#__PURE__*/_interopDefaultLegacy(transformReactJSX);
var transformReactJSXDevelopment__default = /*#__PURE__*/_interopDefaultLegacy(transformReactJSXDevelopment);
var transformReactDisplayName__default = /*#__PURE__*/_interopDefaultLegacy(transformReactDisplayName);
var transformReactPure__default = /*#__PURE__*/_interopDefaultLegacy(transformReactPure);

const v = new helperValidatorOption.OptionValidator("@babel/preset-react");
function normalizeOptions(options = {}) {
  if (process.env.BABEL_8_BREAKING) {
    if ("useSpread" in options) {
      throw new Error('@babel/preset-react: Since Babel 8, an inline object with spread elements is always used, and the "useSpread" option is no longer available. Please remove it from your config.');
    }

    if ("useBuiltIns" in options) {
      const useBuiltInsFormatted = JSON.stringify(options.useBuiltIns);
      throw new Error(`@babel/preset-react: Since "useBuiltIns" is removed in Babel 8, you can remove it from the config.
- Babel 8 now transforms JSX spread to object spread. If you need to transpile object spread with
\`useBuiltIns: ${useBuiltInsFormatted}\`, you can use the following config
{
  "plugins": [
    ["@babel/plugin-proposal-object-rest-spread", { "loose": true, "useBuiltIns": ${useBuiltInsFormatted} }]
  ],
  "presets": ["@babel/preset-react"]
}`);
    }

    const TopLevelOptions = {
      development: "development",
      importSource: "importSource",
      pragma: "pragma",
      pragmaFrag: "pragmaFrag",
      pure: "pure",
      runtime: "runtime",
      throwIfNamespace: "throwIfNamespace"
    };
    v.validateTopLevelOptions(options, TopLevelOptions);
    const development = v.validateBooleanOption(TopLevelOptions.development, options.development, false);
    let importSource = v.validateStringOption(TopLevelOptions.importSource, options.importSource);
    let pragma = v.validateStringOption(TopLevelOptions.pragma, options.pragma);
    let pragmaFrag = v.validateStringOption(TopLevelOptions.pragmaFrag, options.pragmaFrag);
    const pure = v.validateBooleanOption(TopLevelOptions.pure, options.pure);
    const runtime = v.validateStringOption(TopLevelOptions.runtime, options.runtime, "automatic");
    const throwIfNamespace = v.validateBooleanOption(TopLevelOptions.throwIfNamespace, options.throwIfNamespace, true);
    const validRuntime = ["classic", "automatic"];

    if (runtime === "classic") {
      pragma = pragma || "React.createElement";
      pragmaFrag = pragmaFrag || "React.Fragment";
    } else if (runtime === "automatic") {
      importSource = importSource || "react";
    } else {
      throw new Error(`@babel/preset-react: 'runtime' must be one of ['automatic', 'classic'] but we have '${runtime}'\n` + `- Did you mean '${helperValidatorOption.findSuggestion(runtime, validRuntime)}'?`);
    }

    return {
      development,
      importSource,
      pragma,
      pragmaFrag,
      pure,
      runtime,
      throwIfNamespace
    };
  } else {
    let {
      pragma,
      pragmaFrag
    } = options;
    const {
      pure,
      throwIfNamespace = true,
      runtime = "classic",
      importSource,
      useBuiltIns,
      useSpread
    } = options;

    if (runtime === "classic") {
      pragma = pragma || "React.createElement";
      pragmaFrag = pragmaFrag || "React.Fragment";
    }

    const development = !!options.development;
    return {
      development,
      importSource,
      pragma,
      pragmaFrag,
      pure,
      runtime,
      throwIfNamespace,
      useBuiltIns,
      useSpread
    };
  }
}

var index = helperPluginUtils.declare((api, opts) => {
  api.assertVersion(7);
  const {
    development,
    importSource,
    pragma,
    pragmaFrag,
    pure,
    runtime,
    throwIfNamespace
  } = normalizeOptions(opts);
  return {
    plugins: [[development ? transformReactJSXDevelopment__default['default'] : transformReactJSX__default['default'], process.env.BABEL_8_BREAKING ? {
      importSource,
      pragma,
      pragmaFrag,
      runtime,
      throwIfNamespace,
      pure
    } : {
      importSource,
      pragma,
      pragmaFrag,
      runtime,
      throwIfNamespace,
      pure,
      useBuiltIns: !!opts.useBuiltIns,
      useSpread: opts.useSpread
    }], transformReactDisplayName__default['default'], pure !== false && transformReactPure__default['default']].filter(Boolean)
  };
});

exports.default = index;
