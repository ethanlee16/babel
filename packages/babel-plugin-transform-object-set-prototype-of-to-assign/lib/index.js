"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion(7);
  return {
    name: "transform-object-set-prototype-of-to-assign",
    visitor: {
      CallExpression(path, file) {
        if (path.get("callee").matchesPattern("Object.setPrototypeOf")) {
          path.node.callee = file.addHelper("defaults");
        }
      }

    }
  };
});

exports.default = _default;