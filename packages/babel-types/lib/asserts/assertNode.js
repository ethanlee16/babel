"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = assertNode;

var _isNode = require("../validators/isNode");

function assertNode(node) {
  if (!(0, _isNode.default)(node)) {
    const type = (node == null ? void 0 : node.type) ?? JSON.stringify(node);
    throw new TypeError(`Not a valid node of type "${type}"`);
  }
}