"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class Binding {
  identifier;
  scope;
  path;
  kind;

  constructor({
    identifier,
    scope,
    path,
    kind
  }) {
    this.identifier = identifier;
    this.scope = scope;
    this.path = path;
    this.kind = kind;
    this.clearValue();
  }

  constantViolations = [];
  constant = true;
  referencePaths = [];
  referenced = false;
  references = 0;

  deoptValue() {
    this.clearValue();
    this.hasDeoptedValue = true;
  }

  setValue(value) {
    if (this.hasDeoptedValue) return;
    this.hasValue = true;
    this.value = value;
  }

  clearValue() {
    this.hasDeoptedValue = false;
    this.hasValue = false;
    this.value = null;
  }

  reassign(path) {
    this.constant = false;

    if (this.constantViolations.indexOf(path) !== -1) {
      return;
    }

    this.constantViolations.push(path);
  }

  reference(path) {
    if (this.referencePaths.indexOf(path) !== -1) {
      return;
    }

    this.referenced = true;
    this.references++;
    this.referencePaths.push(path);
  }

  dereference() {
    this.references--;
    this.referenced = !!this.references;
  }

}

exports.default = Binding;