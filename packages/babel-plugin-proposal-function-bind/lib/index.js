"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _pluginSyntaxFunctionBind = require("@babel/plugin-syntax-function-bind");

var _core = require("@babel/core");

var _default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion(7);

  function getTempId(scope) {
    let id = scope.path.getData("functionBind");
    if (id) return _core.types.cloneNode(id);
    id = scope.generateDeclaredUidIdentifier("context");
    return scope.path.setData("functionBind", id);
  }

  function getStaticContext(bind, scope) {
    const object = bind.object || bind.callee.object;
    return scope.isStatic(object) && (_core.types.isSuper(object) ? _core.types.thisExpression() : object);
  }

  function inferBindContext(bind, scope) {
    const staticContext = getStaticContext(bind, scope);
    if (staticContext) return _core.types.cloneNode(staticContext);
    const tempId = getTempId(scope);

    if (bind.object) {
      bind.callee = _core.types.sequenceExpression([_core.types.assignmentExpression("=", tempId, bind.object), bind.callee]);
    } else {
      bind.callee.object = _core.types.assignmentExpression("=", tempId, bind.callee.object);
    }

    return _core.types.cloneNode(tempId);
  }

  return {
    name: "proposal-function-bind",
    inherits: _pluginSyntaxFunctionBind.default,
    visitor: {
      CallExpression({
        node,
        scope
      }) {
        const bind = node.callee;
        if (!_core.types.isBindExpression(bind)) return;
        const context = inferBindContext(bind, scope);
        node.callee = _core.types.memberExpression(bind.callee, _core.types.identifier("call"));
        node.arguments.unshift(context);
      },

      BindExpression(path) {
        const {
          node,
          scope
        } = path;
        const context = inferBindContext(node, scope);
        path.replaceWith(_core.types.callExpression(_core.types.memberExpression(node.callee, _core.types.identifier("bind")), [context]));
      }

    }
  };
});

exports.default = _default;