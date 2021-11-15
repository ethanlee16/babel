"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var babelPlugins = require("./generated/plugins");

var _default = (_, {
  loose = false
} = {}) => {
  const plugins = [babelPlugins.syntaxImportAssertions, babelPlugins.proposalClassStaticBlock];

  if (!process.env.BABEL_8_BREAKING) {
    plugins.push(babelPlugins.syntaxImportMeta, babelPlugins.syntaxTopLevelAwait, babelPlugins.proposalExportNamespaceFrom, babelPlugins.proposalLogicalAssignmentOperators, [babelPlugins.proposalOptionalChaining, {
      loose
    }], [babelPlugins.proposalNullishCoalescingOperator, {
      loose
    }], [babelPlugins.proposalClassProperties, {
      loose
    }], babelPlugins.proposalJsonStrings, babelPlugins.proposalNumericSeparator, [babelPlugins.proposalPrivateMethods, {
      loose
    }], babelPlugins.proposalPrivatePropertyInObject);
  }

  return {
    plugins
  };
};

exports.default = _default;