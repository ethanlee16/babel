"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _default = (0, _helperPluginUtils.declare)((api, options) => {
  api.assertVersion(7);
  return {
    name: "syntax-record-and-tuple",

    manipulateOptions(opts, parserOpts) {
      opts.generatorOpts.recordAndTupleSyntaxType = options.syntaxType;
      parserOpts.plugins.push(["recordAndTuple", {
        syntaxType: options.syntaxType
      }]);
    }

  };
});

exports.default = _default;