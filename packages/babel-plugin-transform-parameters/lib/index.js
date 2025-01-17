"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "convertFunctionParams", {
  enumerable: true,
  get: function () {
    return _params.default;
  }
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _params = require("./params");

var _rest = require("./rest");

var _default = (0, _helperPluginUtils.declare)((api, options) => {
  api.assertVersion(7);
  const ignoreFunctionLength = api.assumption("ignoreFunctionLength") ?? options.loose;
  const noNewArrows = api.assumption("noNewArrows");
  return {
    name: "transform-parameters",
    visitor: {
      Function(path) {
        if (path.isArrowFunctionExpression() && path.get("params").some(param => param.isRestElement() || param.isAssignmentPattern())) {
          path.arrowFunctionToExpression({
            noNewArrows
          });
        }

        const convertedRest = (0, _rest.default)(path);
        const convertedParams = (0, _params.default)(path, ignoreFunctionLength);

        if (convertedRest || convertedParams) {
          path.scope.crawl();
        }
      }

    }
  };
});

exports.default = _default;