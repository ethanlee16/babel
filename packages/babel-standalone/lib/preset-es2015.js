"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var babelPlugins = require("./generated/plugins");

var _default = (_, opts) => {
  let loose = false;
  let modules = "commonjs";
  let spec = false;

  if (opts !== undefined) {
    if (opts.loose !== undefined) loose = opts.loose;
    if (opts.modules !== undefined) modules = opts.modules;
    if (opts.spec !== undefined) spec = opts.spec;
  }

  const optsLoose = {
    loose
  };
  return {
    plugins: [[babelPlugins.transformTemplateLiterals, {
      loose,
      spec
    }], babelPlugins.transformLiterals, babelPlugins.transformFunctionName, [babelPlugins.transformArrowFunctions, {
      spec
    }], babelPlugins.transformBlockScopedFunctions, [babelPlugins.transformClasses, optsLoose], babelPlugins.transformObjectSuper, babelPlugins.transformShorthandProperties, babelPlugins.transformDuplicateKeys, [babelPlugins.transformComputedProperties, optsLoose], [babelPlugins.transformForOf, optsLoose], babelPlugins.transformStickyRegex, babelPlugins.transformUnicodeEscapes, babelPlugins.transformUnicodeRegex, [babelPlugins.transformSpread, optsLoose], [babelPlugins.transformParameters, optsLoose], [babelPlugins.transformDestructuring, optsLoose], babelPlugins.transformBlockScoping, babelPlugins.transformTypeofSymbol, babelPlugins.transformInstanceof, (modules === "commonjs" || modules === "cjs") && [babelPlugins.transformModulesCommonjs, optsLoose], modules === "systemjs" && [babelPlugins.transformModulesSystemjs, optsLoose], modules === "amd" && [babelPlugins.transformModulesAmd, optsLoose], modules === "umd" && [babelPlugins.transformModulesUmd, optsLoose], [babelPlugins.transformRegenerator, {
      async: false,
      asyncGenerators: false
    }]].filter(Boolean)
  };
};

exports.default = _default;