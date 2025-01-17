"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _pluginSyntaxAsyncDoExpressions = require("@babel/plugin-syntax-async-do-expressions");

var _helperHoistVariables = require("@babel/helper-hoist-variables");

var _default = (0, _helperPluginUtils.declare)(({
  types: t,
  assertVersion
}) => {
  assertVersion("^7.13.0");
  return {
    name: "proposal-async-do-expressions",
    inherits: _pluginSyntaxAsyncDoExpressions.default,
    visitor: {
      DoExpression: {
        exit(path) {
          if (!path.is("async")) {
            return;
          }

          const {
            scope
          } = path;
          (0, _helperHoistVariables.default)(path, id => {
            scope.push({
              id: t.cloneNode(id)
            });
          }, "var");
          const bodyPath = path.get("body");
          const completionRecords = bodyPath.getCompletionRecords();

          for (const p of completionRecords) {
            if (p.isExpressionStatement()) {
              p.replaceWith(t.returnStatement(p.node.expression));
            }
          }

          path.replaceWith(t.callExpression(t.arrowFunctionExpression([], bodyPath.node, true), []));
        }

      }
    }
  };
});

exports.default = _default;