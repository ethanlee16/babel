"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _helperBuilderReactJsx = require("@babel/helper-builder-react-jsx");

var _core = require("@babel/core");

var _default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion(7);
  return {
    name: "transform-react-jsx-compat",

    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("jsx");
    },

    visitor: (0, _helperBuilderReactJsx.default)({
      pre(state) {
        state.callee = state.tagExpr;
      },

      post(state) {
        if (_core.types.react.isCompatTag(state.tagName)) {
          state.call = _core.types.callExpression(_core.types.memberExpression(_core.types.memberExpression(_core.types.identifier("React"), _core.types.identifier("DOM")), state.tagExpr, _core.types.isLiteral(state.tagExpr)), state.args);
        }
      },

      compat: true
    })
  };
});

exports.default = _default;