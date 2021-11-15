"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _presetStage = require("./preset-stage-2");

var babelPlugins = require("./generated/plugins");

var _default = (_, opts = {}) => {
  const {
    loose = false,
    useBuiltIns = false,
    decoratorsLegacy = false,
    decoratorsBeforeExport,
    pipelineProposal,
    pipelineTopicToken,
    recordAndTupleSyntax
  } = opts;
  return {
    presets: [[_presetStage.default, {
      loose,
      useBuiltIns,
      decoratorsLegacy,
      decoratorsBeforeExport,
      pipelineProposal,
      pipelineTopicToken,
      recordAndTupleSyntax
    }]],
    plugins: [babelPlugins.syntaxDecimal, babelPlugins.proposalExportDefaultFrom, babelPlugins.proposalDoExpressions]
  };
};

exports.default = _default;