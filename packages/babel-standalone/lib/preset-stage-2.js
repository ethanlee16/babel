"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _presetStage = require("./preset-stage-3");

var babelPlugins = require("./generated/plugins");

var _default = (_, opts = {}) => {
  const {
    loose = false,
    useBuiltIns = false,
    decoratorsLegacy = false,
    decoratorsBeforeExport,
    pipelineProposal = "minimal",
    pipelineTopicToken = "%",
    recordAndTupleSyntax = "hash"
  } = opts;
  return {
    presets: [[_presetStage.default, {
      loose,
      useBuiltIns
    }]],
    plugins: [[babelPlugins.proposalDecorators, {
      legacy: decoratorsLegacy,
      decoratorsBeforeExport
    }], [babelPlugins.proposalPipelineOperator, {
      proposal: pipelineProposal,
      topicToken: pipelineTopicToken
    }], babelPlugins.proposalFunctionSent, babelPlugins.proposalThrowExpressions, [babelPlugins.syntaxRecordAndTuple, {
      syntaxType: recordAndTupleSyntax
    }], babelPlugins.syntaxModuleBlocks]
  };
};

exports.default = _default;