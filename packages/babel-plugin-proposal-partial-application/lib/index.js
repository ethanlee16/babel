"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _pluginSyntaxPartialApplication = require("@babel/plugin-syntax-partial-application");

var _core = require("@babel/core");

var _default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion(7);

  function hasArgumentPlaceholder(node) {
    return node.arguments.some(arg => _core.types.isArgumentPlaceholder(arg));
  }

  function unwrapArguments(node, scope) {
    const init = [];

    for (let i = 0; i < node.arguments.length; i++) {
      if (!_core.types.isArgumentPlaceholder(node.arguments[i]) && !_core.types.isImmutable(node.arguments[i])) {
        const id = scope.generateUidIdentifierBasedOnNode(node.arguments[i], "param");
        scope.push({
          id
        });

        if (_core.types.isSpreadElement(node.arguments[i])) {
          init.push(_core.types.assignmentExpression("=", _core.types.cloneNode(id), _core.types.arrayExpression([_core.types.spreadElement(node.arguments[i].argument)])));
          node.arguments[i].argument = _core.types.cloneNode(id);
        } else {
          init.push(_core.types.assignmentExpression("=", _core.types.cloneNode(id), node.arguments[i]));
          node.arguments[i] = _core.types.cloneNode(id);
        }
      }
    }

    return init;
  }

  function replacePlaceholders(node, scope) {
    const placeholders = [];
    const args = [];
    node.arguments.forEach(arg => {
      if (_core.types.isArgumentPlaceholder(arg)) {
        const id = scope.generateUid("_argPlaceholder");
        placeholders.push(_core.types.identifier(id));
        args.push(_core.types.identifier(id));
      } else {
        args.push(arg);
      }
    });
    return [placeholders, args];
  }

  return {
    name: "proposal-partial-application",
    inherits: _pluginSyntaxPartialApplication.default,
    visitor: {
      CallExpression(path) {
        if (!hasArgumentPlaceholder(path.node)) {
          return;
        }

        const {
          node,
          scope
        } = path;
        const functionLVal = path.scope.generateUidIdentifierBasedOnNode(node.callee);
        const sequenceParts = [];
        const argsInitializers = unwrapArguments(node, scope);
        const [placeholdersParams, args] = replacePlaceholders(node, scope);
        scope.push({
          id: functionLVal
        });

        if (node.callee.type === "MemberExpression") {
          const receiverLVal = path.scope.generateUidIdentifierBasedOnNode(node.callee.object);
          scope.push({
            id: receiverLVal
          });
          sequenceParts.push(_core.types.assignmentExpression("=", _core.types.cloneNode(receiverLVal), node.callee.object), _core.types.assignmentExpression("=", _core.types.cloneNode(functionLVal), _core.types.memberExpression(_core.types.cloneNode(receiverLVal), node.callee.property)), ...argsInitializers, _core.types.functionExpression(_core.types.cloneNode(node.callee.property), placeholdersParams, _core.types.blockStatement([_core.types.returnStatement(_core.types.callExpression(_core.types.memberExpression(_core.types.cloneNode(functionLVal), _core.types.identifier("call")), [_core.types.cloneNode(receiverLVal), ...args]))], []), false, false));
        } else {
          sequenceParts.push(_core.types.assignmentExpression("=", _core.types.cloneNode(functionLVal), node.callee), ...argsInitializers, _core.types.functionExpression(_core.types.cloneNode(node.callee), placeholdersParams, _core.types.blockStatement([_core.types.returnStatement(_core.types.callExpression(_core.types.cloneNode(functionLVal), args))], []), false, false));
        }

        path.replaceWith(_core.types.sequenceExpression(sequenceParts));
      }

    }
  };
});

exports.default = _default;