"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _helperAnnotateAsPure = require("@babel/helper-annotate-as-pure");

var _helperFunctionName = require("@babel/helper-function-name");

var _helperSplitExportDeclaration = require("@babel/helper-split-export-declaration");

var _core = require("@babel/core");

var _globals = require("globals");

var _transformClass = require("./transformClass");

const getBuiltinClasses = category => Object.keys(_globals[category]).filter(name => /^[A-Z]/.test(name));

const builtinClasses = new Set([...getBuiltinClasses("builtin"), ...getBuiltinClasses("browser")]);

var _default = (0, _helperPluginUtils.declare)((api, options) => {
  api.assertVersion(7);
  const {
    loose
  } = options;
  const setClassMethods = api.assumption("setClassMethods") ?? options.loose;
  const constantSuper = api.assumption("constantSuper") ?? options.loose;
  const superIsCallableConstructor = api.assumption("superIsCallableConstructor") ?? options.loose;
  const noClassCalls = api.assumption("noClassCalls") ?? options.loose;
  const VISITED = Symbol();
  return {
    name: "transform-classes",
    visitor: {
      ExportDefaultDeclaration(path) {
        if (!path.get("declaration").isClassDeclaration()) return;
        (0, _helperSplitExportDeclaration.default)(path);
      },

      ClassDeclaration(path) {
        const {
          node
        } = path;
        const ref = node.id || path.scope.generateUidIdentifier("class");
        path.replaceWith(_core.types.variableDeclaration("let", [_core.types.variableDeclarator(ref, _core.types.toExpression(node))]));
      },

      ClassExpression(path, state) {
        const {
          node
        } = path;
        if (node[VISITED]) return;
        const inferred = (0, _helperFunctionName.default)(path);

        if (inferred && inferred !== node) {
          path.replaceWith(inferred);
          return;
        }

        node[VISITED] = true;
        path.replaceWith((0, _transformClass.default)(path, state.file, builtinClasses, loose, {
          setClassMethods,
          constantSuper,
          superIsCallableConstructor,
          noClassCalls
        }));

        if (path.isCallExpression()) {
          (0, _helperAnnotateAsPure.default)(path);
          const callee = path.get("callee");

          if (callee.isArrowFunctionExpression()) {
            callee.arrowFunctionToExpression();
          }
        }
      }

    }
  };
});

exports.default = _default;