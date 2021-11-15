"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _presetStage = require("./preset-stage-1");

var _plugins = require("./generated/plugins");

var _default = (_, opts = {}) => {
  const {
    loose = false,
    useBuiltIns = false,
    decoratorsLegacy = false,
    decoratorsBeforeExport,
    pipelineProposal,
    pipelineTopicToken,
    importAssertionsVersion = "september-2020"
  } = opts;
  return {
    presets: [[_presetStage.default, {
      loose,
      useBuiltIns,
      decoratorsLegacy,
      decoratorsBeforeExport,
      pipelineProposal,
      pipelineTopicToken,
      importAssertionsVersion
    }]],
    plugins: [_plugins.proposalFunctionBind]
  };
};

exports.default = _default;