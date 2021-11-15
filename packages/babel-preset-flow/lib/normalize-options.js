"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = normalizeOptions;

var _helperValidatorOption = require("@babel/helper-validator-option");

const v = new _helperValidatorOption.OptionValidator("@babel/preset-flow");

function normalizeOptions(options = {}) {
  let {
    all
  } = options;
  const {
    allowDeclareFields
  } = options;

  if (process.env.BABEL_8_BREAKING) {
    v.invariant(!("allowDeclareFields" in options), `Since Babel 8, \`declare property: A\` is always supported, and the "allowDeclareFields" option is no longer available. Please remove it from your config.`);
    const TopLevelOptions = {
      all: "all"
    };
    v.validateTopLevelOptions(options, TopLevelOptions);
    all = v.validateBooleanOption(TopLevelOptions.all, options.all);
    return {
      all
    };
  } else {
    return {
      all,
      allowDeclareFields
    };
  }
}