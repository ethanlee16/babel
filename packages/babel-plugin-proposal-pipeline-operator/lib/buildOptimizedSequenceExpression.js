"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _core = require("@babel/core");

const buildOptimizedSequenceExpression = ({
  call,
  path,
  placeholder
}) => {
  const {
    callee: calledExpression
  } = call;
  const pipelineLeft = path.node.left;

  const assign = _core.types.assignmentExpression("=", _core.types.cloneNode(placeholder), pipelineLeft);

  let optimizeArrow = _core.types.isArrowFunctionExpression(calledExpression) && _core.types.isExpression(calledExpression.body) && !calledExpression.async && !calledExpression.generator;
  let param;

  if (optimizeArrow) {
    const {
      params
    } = calledExpression;

    if (params.length === 1 && _core.types.isIdentifier(params[0])) {
      param = params[0];
    } else if (params.length > 0) {
      optimizeArrow = false;
    }
  } else if (_core.types.isIdentifier(calledExpression, {
    name: "eval"
  })) {
    const evalSequence = _core.types.sequenceExpression([_core.types.numericLiteral(0), calledExpression]);

    call.callee = evalSequence;
    path.scope.push({
      id: _core.types.cloneNode(placeholder)
    });
    return _core.types.sequenceExpression([assign, call]);
  }

  if (optimizeArrow && !param) {
    return _core.types.sequenceExpression([pipelineLeft, calledExpression.body]);
  }

  path.scope.push({
    id: _core.types.cloneNode(placeholder)
  });

  if (param) {
    path.get("right").scope.rename(param.name, placeholder.name);
    return _core.types.sequenceExpression([assign, calledExpression.body]);
  }

  return _core.types.sequenceExpression([assign, call]);
};

var _default = buildOptimizedSequenceExpression;
exports.default = _default;