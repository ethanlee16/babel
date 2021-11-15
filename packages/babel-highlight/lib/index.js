"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = highlight;
exports.getChalk = getChalk;
exports.shouldHighlight = shouldHighlight;

var _jsTokens = require("js-tokens");

var _helperValidatorIdentifier = require("@babel/helper-validator-identifier");

var _chalk = require("chalk");

const sometimesKeywords = new Set(["as", "async", "from", "get", "of", "set"]);

function getDefs(chalk) {
  return {
    keyword: chalk.cyan,
    capitalized: chalk.yellow,
    jsxIdentifier: chalk.yellow,
    punctuator: chalk.yellow,
    number: chalk.magenta,
    string: chalk.green,
    regex: chalk.magenta,
    comment: chalk.grey,
    invalid: chalk.white.bgRed.bold
  };
}

const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
const BRACKET = /^[()[\]{}]$/;
let tokenize;

if (process.env.BABEL_8_BREAKING) {
  const getTokenType = function (token) {
    if (token.type === "IdentifierName") {
      if ((0, _helperValidatorIdentifier.isKeyword)(token.value) || (0, _helperValidatorIdentifier.isStrictReservedWord)(token.value, true) || sometimesKeywords.has(token.value)) {
        return "keyword";
      }

      if (token.value[0] !== token.value[0].toLowerCase()) {
        return "capitalized";
      }
    }

    if (token.type === "Punctuator" && BRACKET.test(token.value)) {
      return "uncolored";
    }

    if (token.type === "Invalid" && (token.value === "@" || token.value === "#")) {
      return "punctuator";
    }

    switch (token.type) {
      case "NumericLiteral":
        return "number";

      case "StringLiteral":
      case "JSXString":
      case "NoSubstitutionTemplate":
        return "string";

      case "RegularExpressionLiteral":
        return "regex";

      case "Punctuator":
      case "JSXPunctuator":
        return "punctuator";

      case "MultiLineComment":
      case "SingleLineComment":
        return "comment";

      case "Invalid":
      case "JSXInvalid":
        return "invalid";

      case "JSXIdentifier":
        return "jsxIdentifier";

      default:
        return "uncolored";
    }
  };

  tokenize = function* (text) {
    for (const token of _jsTokens(text, {
      jsx: true
    })) {
      switch (token.type) {
        case "TemplateHead":
          yield {
            type: "string",
            value: token.value.slice(0, -2)
          };
          yield {
            type: "punctuator",
            value: "${"
          };
          break;

        case "TemplateMiddle":
          yield {
            type: "punctuator",
            value: "}"
          };
          yield {
            type: "string",
            value: token.value.slice(1, -2)
          };
          yield {
            type: "punctuator",
            value: "${"
          };
          break;

        case "TemplateTail":
          yield {
            type: "punctuator",
            value: "}"
          };
          yield {
            type: "string",
            value: token.value.slice(1)
          };
          break;

        default:
          yield {
            type: getTokenType(token),
            value: token.value
          };
      }
    }
  };
} else {
  const JSX_TAG = /^[a-z][\w-]*$/i;

  const getTokenType = function (token, offset, text) {
    if (token.type === "name") {
      if ((0, _helperValidatorIdentifier.isKeyword)(token.value) || (0, _helperValidatorIdentifier.isStrictReservedWord)(token.value, true) || sometimesKeywords.has(token.value)) {
        return "keyword";
      }

      if (JSX_TAG.test(token.value) && (text[offset - 1] === "<" || text.substr(offset - 2, 2) == "</")) {
        return "jsxIdentifier";
      }

      if (token.value[0] !== token.value[0].toLowerCase()) {
        return "capitalized";
      }
    }

    if (token.type === "punctuator" && BRACKET.test(token.value)) {
      return "bracket";
    }

    if (token.type === "invalid" && (token.value === "@" || token.value === "#")) {
      return "punctuator";
    }

    return token.type;
  };

  tokenize = function* (text) {
    let match;

    while (match = _jsTokens.default.exec(text)) {
      const token = _jsTokens.matchToToken(match);

      yield {
        type: getTokenType(token, match.index, text),
        value: token.value
      };
    }
  };
}

function highlightTokens(defs, text) {
  let highlighted = "";

  for (const {
    type,
    value
  } of tokenize(text)) {
    const colorize = defs[type];

    if (colorize) {
      highlighted += value.split(NEWLINE).map(str => colorize(str)).join("\n");
    } else {
      highlighted += value;
    }
  }

  return highlighted;
}

function shouldHighlight(options) {
  return !!_chalk.supportsColor || options.forceColor;
}

function getChalk(options) {
  return options.forceColor ? new _chalk.constructor({
    enabled: true,
    level: 1
  }) : _chalk;
}

function highlight(code, options = {}) {
  if (shouldHighlight(options)) {
    const chalk = getChalk(options);
    const defs = getDefs(chalk);
    return highlightTokens(defs, code);
  } else {
    return code;
  }
}