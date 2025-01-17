"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _assert = require("assert");

var _t = require("@babel/types");

const {
  callExpression,
  cloneNode,
  expressionStatement,
  identifier,
  importDeclaration,
  importDefaultSpecifier,
  importNamespaceSpecifier,
  importSpecifier,
  memberExpression,
  stringLiteral,
  variableDeclaration,
  variableDeclarator
} = _t;

class ImportBuilder {
  _statements = [];
  _resultName = null;
  _scope = null;
  _hub = null;
  _importedSource;

  constructor(importedSource, scope, hub) {
    this._scope = scope;
    this._hub = hub;
    this._importedSource = importedSource;
  }

  done() {
    return {
      statements: this._statements,
      resultName: this._resultName
    };
  }

  import() {
    this._statements.push(importDeclaration([], stringLiteral(this._importedSource)));

    return this;
  }

  require() {
    this._statements.push(expressionStatement(callExpression(identifier("require"), [stringLiteral(this._importedSource)])));

    return this;
  }

  namespace(name = "namespace") {
    const local = this._scope.generateUidIdentifier(name);

    const statement = this._statements[this._statements.length - 1];

    _assert(statement.type === "ImportDeclaration");

    _assert(statement.specifiers.length === 0);

    statement.specifiers = [importNamespaceSpecifier(local)];
    this._resultName = cloneNode(local);
    return this;
  }

  default(name) {
    name = this._scope.generateUidIdentifier(name);
    const statement = this._statements[this._statements.length - 1];

    _assert(statement.type === "ImportDeclaration");

    _assert(statement.specifiers.length === 0);

    statement.specifiers = [importDefaultSpecifier(name)];
    this._resultName = cloneNode(name);
    return this;
  }

  named(name, importName) {
    if (importName === "default") return this.default(name);
    name = this._scope.generateUidIdentifier(name);
    const statement = this._statements[this._statements.length - 1];

    _assert(statement.type === "ImportDeclaration");

    _assert(statement.specifiers.length === 0);

    statement.specifiers = [importSpecifier(name, identifier(importName))];
    this._resultName = cloneNode(name);
    return this;
  }

  var(name) {
    name = this._scope.generateUidIdentifier(name);
    let statement = this._statements[this._statements.length - 1];

    if (statement.type !== "ExpressionStatement") {
      _assert(this._resultName);

      statement = expressionStatement(this._resultName);

      this._statements.push(statement);
    }

    this._statements[this._statements.length - 1] = variableDeclaration("var", [variableDeclarator(name, statement.expression)]);
    this._resultName = cloneNode(name);
    return this;
  }

  defaultInterop() {
    return this._interop(this._hub.addHelper("interopRequireDefault"));
  }

  wildcardInterop() {
    return this._interop(this._hub.addHelper("interopRequireWildcard"));
  }

  _interop(callee) {
    const statement = this._statements[this._statements.length - 1];

    if (statement.type === "ExpressionStatement") {
      statement.expression = callExpression(callee, [statement.expression]);
    } else if (statement.type === "VariableDeclaration") {
      _assert(statement.declarations.length === 1);

      statement.declarations[0].init = callExpression(callee, [statement.declarations[0].init]);
    } else {
      _assert.fail("Unexpected type.");
    }

    return this;
  }

  prop(name) {
    const statement = this._statements[this._statements.length - 1];

    if (statement.type === "ExpressionStatement") {
      statement.expression = memberExpression(statement.expression, identifier(name));
    } else if (statement.type === "VariableDeclaration") {
      _assert(statement.declarations.length === 1);

      statement.declarations[0].init = memberExpression(statement.declarations[0].init, identifier(name));
    } else {
      _assert.fail("Unexpected type:" + statement.type);
    }

    return this;
  }

  read(name) {
    this._resultName = memberExpression(this._resultName, identifier(name));
  }

}

exports.default = ImportBuilder;