"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _renamer = require("./lib/renamer");

var _index = require("../index");

var _binding = require("./binding");

var _globals = require("globals");

var _t = require("@babel/types");

var _cache = require("../cache");

const {
  NOT_LOCAL_BINDING,
  callExpression,
  cloneNode,
  getBindingIdentifiers,
  identifier,
  isArrayExpression,
  isBinary,
  isClass,
  isClassBody,
  isClassDeclaration,
  isExportAllDeclaration,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isLiteral,
  isMethod,
  isModuleDeclaration,
  isModuleSpecifier,
  isObjectExpression,
  isProperty,
  isPureish,
  isSuper,
  isTaggedTemplateExpression,
  isTemplateLiteral,
  isThisExpression,
  isUnaryExpression,
  isVariableDeclaration,
  matchesPattern,
  memberExpression,
  numericLiteral,
  toIdentifier,
  unaryExpression,
  variableDeclaration,
  variableDeclarator
} = _t;

function gatherNodeParts(node, parts) {
  switch (node == null ? void 0 : node.type) {
    default:
      if (isModuleDeclaration(node)) {
        if ((isExportAllDeclaration(node) || isExportNamedDeclaration(node) || isImportDeclaration(node)) && node.source) {
          gatherNodeParts(node.source, parts);
        } else if ((isExportNamedDeclaration(node) || isImportDeclaration(node)) && node.specifiers && node.specifiers.length) {
          for (const e of node.specifiers) gatherNodeParts(e, parts);
        } else if ((isExportDefaultDeclaration(node) || isExportNamedDeclaration(node)) && node.declaration) {
          gatherNodeParts(node.declaration, parts);
        }
      } else if (isModuleSpecifier(node)) {
        gatherNodeParts(node.local, parts);
      } else if (isLiteral(node)) {
        parts.push(node.value);
      }

      break;

    case "MemberExpression":
    case "OptionalMemberExpression":
    case "JSXMemberExpression":
      gatherNodeParts(node.object, parts);
      gatherNodeParts(node.property, parts);
      break;

    case "Identifier":
    case "JSXIdentifier":
      parts.push(node.name);
      break;

    case "CallExpression":
    case "OptionalCallExpression":
    case "NewExpression":
      gatherNodeParts(node.callee, parts);
      break;

    case "ObjectExpression":
    case "ObjectPattern":
      for (const e of node.properties) {
        gatherNodeParts(e, parts);
      }

      break;

    case "SpreadElement":
    case "RestElement":
      gatherNodeParts(node.argument, parts);
      break;

    case "ObjectProperty":
    case "ObjectMethod":
    case "ClassProperty":
    case "ClassMethod":
    case "ClassPrivateProperty":
    case "ClassPrivateMethod":
      gatherNodeParts(node.key, parts);
      break;

    case "ThisExpression":
      parts.push("this");
      break;

    case "Super":
      parts.push("super");
      break;

    case "Import":
      parts.push("import");
      break;

    case "DoExpression":
      parts.push("do");
      break;

    case "YieldExpression":
      parts.push("yield");
      gatherNodeParts(node.argument, parts);
      break;

    case "AwaitExpression":
      parts.push("await");
      gatherNodeParts(node.argument, parts);
      break;

    case "AssignmentExpression":
      gatherNodeParts(node.left, parts);
      break;

    case "VariableDeclarator":
      gatherNodeParts(node.id, parts);
      break;

    case "FunctionExpression":
    case "FunctionDeclaration":
    case "ClassExpression":
    case "ClassDeclaration":
      gatherNodeParts(node.id, parts);
      break;

    case "PrivateName":
      gatherNodeParts(node.id, parts);
      break;

    case "ParenthesizedExpression":
      gatherNodeParts(node.expression, parts);
      break;

    case "UnaryExpression":
    case "UpdateExpression":
      gatherNodeParts(node.argument, parts);
      break;

    case "MetaProperty":
      gatherNodeParts(node.meta, parts);
      gatherNodeParts(node.property, parts);
      break;

    case "JSXElement":
      gatherNodeParts(node.openingElement, parts);
      break;

    case "JSXOpeningElement":
      parts.push(node.name);
      break;

    case "JSXFragment":
      gatherNodeParts(node.openingFragment, parts);
      break;

    case "JSXOpeningFragment":
      parts.push("Fragment");
      break;

    case "JSXNamespacedName":
      gatherNodeParts(node.namespace, parts);
      gatherNodeParts(node.name, parts);
      break;
  }
}

const collectorVisitor = {
  ForStatement(path) {
    const declar = path.get("init");

    if (declar.isVar()) {
      const {
        scope
      } = path;
      const parentScope = scope.getFunctionParent() || scope.getProgramParent();
      parentScope.registerBinding("var", declar);
    }
  },

  Declaration(path) {
    if (path.isBlockScoped()) return;
    if (path.isImportDeclaration()) return;
    if (path.isExportDeclaration()) return;
    const parent = path.scope.getFunctionParent() || path.scope.getProgramParent();
    parent.registerDeclaration(path);
  },

  ImportDeclaration(path) {
    const parent = path.scope.getBlockParent();
    parent.registerDeclaration(path);
  },

  ReferencedIdentifier(path, state) {
    state.references.push(path);
  },

  ForXStatement(path, state) {
    const left = path.get("left");

    if (left.isPattern() || left.isIdentifier()) {
      state.constantViolations.push(path);
    } else if (left.isVar()) {
      const {
        scope
      } = path;
      const parentScope = scope.getFunctionParent() || scope.getProgramParent();
      parentScope.registerBinding("var", left);
    }
  },

  ExportDeclaration: {
    exit(path) {
      const {
        node,
        scope
      } = path;
      if (isExportAllDeclaration(node)) return;
      const declar = node.declaration;

      if (isClassDeclaration(declar) || isFunctionDeclaration(declar)) {
        const id = declar.id;
        if (!id) return;
        const binding = scope.getBinding(id.name);
        binding == null ? void 0 : binding.reference(path);
      } else if (isVariableDeclaration(declar)) {
        for (const decl of declar.declarations) {
          for (const name of Object.keys(getBindingIdentifiers(decl))) {
            const binding = scope.getBinding(name);
            binding == null ? void 0 : binding.reference(path);
          }
        }
      }
    }

  },

  LabeledStatement(path) {
    path.scope.getBlockParent().registerDeclaration(path);
  },

  AssignmentExpression(path, state) {
    state.assignments.push(path);
  },

  UpdateExpression(path, state) {
    state.constantViolations.push(path);
  },

  UnaryExpression(path, state) {
    if (path.node.operator === "delete") {
      state.constantViolations.push(path);
    }
  },

  BlockScoped(path) {
    let scope = path.scope;
    if (scope.path === path) scope = scope.parent;
    const parent = scope.getBlockParent();
    parent.registerDeclaration(path);

    if (path.isClassDeclaration() && path.node.id) {
      const id = path.node.id;
      const name = id.name;
      path.scope.bindings[name] = path.scope.parent.getBinding(name);
    }
  },

  CatchClause(path) {
    path.scope.registerBinding("let", path);
  },

  Function(path) {
    const params = path.get("params");

    for (const param of params) {
      path.scope.registerBinding("param", param);
    }

    if (path.isFunctionExpression() && path.has("id") && !path.get("id").node[NOT_LOCAL_BINDING]) {
      path.scope.registerBinding("local", path.get("id"), path);
    }
  },

  ClassExpression(path) {
    if (path.has("id") && !path.get("id").node[NOT_LOCAL_BINDING]) {
      path.scope.registerBinding("local", path);
    }
  }

};
let uid = 0;

class Scope {
  uid;
  path;
  block;
  labels;
  inited;
  bindings;
  references;
  globals;
  uids;
  data;
  crawling;

  constructor(path) {
    const {
      node
    } = path;

    const cached = _cache.scope.get(node);

    if ((cached == null ? void 0 : cached.path) === path) {
      return cached;
    }

    _cache.scope.set(node, this);

    this.uid = uid++;
    this.block = node;
    this.path = path;
    this.labels = new Map();
    this.inited = false;
  }

  static globals = Object.keys(_globals.builtin);
  static contextVariables = ["arguments", "undefined", "Infinity", "NaN"];

  get parent() {
    var _parent;

    let parent,
        path = this.path;

    do {
      const isKey = path.key === "key";
      path = path.parentPath;
      if (isKey && path.isMethod()) path = path.parentPath;
      if (path && path.isScope()) parent = path;
    } while (path && !parent);

    return (_parent = parent) == null ? void 0 : _parent.scope;
  }

  get parentBlock() {
    return this.path.parent;
  }

  get hub() {
    return this.path.hub;
  }

  traverse(node, opts, state) {
    (0, _index.default)(node, opts, this, state, this.path);
  }

  generateDeclaredUidIdentifier(name) {
    const id = this.generateUidIdentifier(name);
    this.push({
      id
    });
    return cloneNode(id);
  }

  generateUidIdentifier(name) {
    return identifier(this.generateUid(name));
  }

  generateUid(name = "temp") {
    name = toIdentifier(name).replace(/^_+/, "").replace(/[0-9]+$/g, "");
    let uid;
    let i = 1;

    do {
      uid = this._generateUid(name, i);
      i++;
    } while (this.hasLabel(uid) || this.hasBinding(uid) || this.hasGlobal(uid) || this.hasReference(uid));

    const program = this.getProgramParent();
    program.references[uid] = true;
    program.uids[uid] = true;
    return uid;
  }

  _generateUid(name, i) {
    let id = name;
    if (i > 1) id += i;
    return `_${id}`;
  }

  generateUidBasedOnNode(node, defaultName) {
    const parts = [];
    gatherNodeParts(node, parts);
    let id = parts.join("$");
    id = id.replace(/^_/, "") || defaultName || "ref";
    return this.generateUid(id.slice(0, 20));
  }

  generateUidIdentifierBasedOnNode(node, defaultName) {
    return identifier(this.generateUidBasedOnNode(node, defaultName));
  }

  isStatic(node) {
    if (isThisExpression(node) || isSuper(node)) {
      return true;
    }

    if (isIdentifier(node)) {
      const binding = this.getBinding(node.name);

      if (binding) {
        return binding.constant;
      } else {
        return this.hasBinding(node.name);
      }
    }

    return false;
  }

  maybeGenerateMemoised(node, dontPush) {
    if (this.isStatic(node)) {
      return null;
    } else {
      const id = this.generateUidIdentifierBasedOnNode(node);

      if (!dontPush) {
        this.push({
          id
        });
        return cloneNode(id);
      }

      return id;
    }
  }

  checkBlockScopedCollisions(local, kind, name, id) {
    if (kind === "param") return;
    if (local.kind === "local") return;
    const duplicate = kind === "let" || local.kind === "let" || local.kind === "const" || local.kind === "module" || local.kind === "param" && (kind === "let" || kind === "const");

    if (duplicate) {
      throw this.hub.buildError(id, `Duplicate declaration "${name}"`, TypeError);
    }
  }

  rename(oldName, newName, block) {
    const binding = this.getBinding(oldName);

    if (binding) {
      newName = newName || this.generateUidIdentifier(oldName).name;
      return new _renamer.default(binding, oldName, newName).rename(block);
    }
  }

  _renameFromMap(map, oldName, newName, value) {
    if (map[oldName]) {
      map[newName] = value;
      map[oldName] = null;
    }
  }

  dump() {
    const sep = "-".repeat(60);
    console.log(sep);
    let scope = this;

    do {
      console.log("#", scope.block.type);

      for (const name of Object.keys(scope.bindings)) {
        const binding = scope.bindings[name];
        console.log(" -", name, {
          constant: binding.constant,
          references: binding.references,
          violations: binding.constantViolations.length,
          kind: binding.kind
        });
      }
    } while (scope = scope.parent);

    console.log(sep);
  }

  toArray(node, i, arrayLikeIsIterable) {
    if (isIdentifier(node)) {
      const binding = this.getBinding(node.name);

      if (binding != null && binding.constant && binding.path.isGenericType("Array")) {
        return node;
      }
    }

    if (isArrayExpression(node)) {
      return node;
    }

    if (isIdentifier(node, {
      name: "arguments"
    })) {
      return callExpression(memberExpression(memberExpression(memberExpression(identifier("Array"), identifier("prototype")), identifier("slice")), identifier("call")), [node]);
    }

    let helperName;
    const args = [node];

    if (i === true) {
      helperName = "toConsumableArray";
    } else if (i) {
      args.push(numericLiteral(i));
      helperName = "slicedToArray";
    } else {
      helperName = "toArray";
    }

    if (arrayLikeIsIterable) {
      args.unshift(this.hub.addHelper(helperName));
      helperName = "maybeArrayLike";
    }

    return callExpression(this.hub.addHelper(helperName), args);
  }

  hasLabel(name) {
    return !!this.getLabel(name);
  }

  getLabel(name) {
    return this.labels.get(name);
  }

  registerLabel(path) {
    this.labels.set(path.node.label.name, path);
  }

  registerDeclaration(path) {
    if (path.isLabeledStatement()) {
      this.registerLabel(path);
    } else if (path.isFunctionDeclaration()) {
      this.registerBinding("hoisted", path.get("id"), path);
    } else if (path.isVariableDeclaration()) {
      const declarations = path.get("declarations");

      for (const declar of declarations) {
        this.registerBinding(path.node.kind, declar);
      }
    } else if (path.isClassDeclaration()) {
      this.registerBinding("let", path);
    } else if (path.isImportDeclaration()) {
      const specifiers = path.get("specifiers");

      for (const specifier of specifiers) {
        this.registerBinding("module", specifier);
      }
    } else if (path.isExportDeclaration()) {
      const declar = path.get("declaration");

      if (declar.isClassDeclaration() || declar.isFunctionDeclaration() || declar.isVariableDeclaration()) {
        this.registerDeclaration(declar);
      }
    } else {
      this.registerBinding("unknown", path);
    }
  }

  buildUndefinedNode() {
    return unaryExpression("void", numericLiteral(0), true);
  }

  registerConstantViolation(path) {
    const ids = path.getBindingIdentifiers();

    for (const name of Object.keys(ids)) {
      const binding = this.getBinding(name);
      if (binding) binding.reassign(path);
    }
  }

  registerBinding(kind, path, bindingPath = path) {
    if (!kind) throw new ReferenceError("no `kind`");

    if (path.isVariableDeclaration()) {
      const declarators = path.get("declarations");

      for (const declar of declarators) {
        this.registerBinding(kind, declar);
      }

      return;
    }

    const parent = this.getProgramParent();
    const ids = path.getOuterBindingIdentifiers(true);

    for (const name of Object.keys(ids)) {
      parent.references[name] = true;

      for (const id of ids[name]) {
        const local = this.getOwnBinding(name);

        if (local) {
          if (local.identifier === id) continue;
          this.checkBlockScopedCollisions(local, kind, name, id);
        }

        if (local) {
          this.registerConstantViolation(bindingPath);
        } else {
          this.bindings[name] = new _binding.default({
            identifier: id,
            scope: this,
            path: bindingPath,
            kind: kind
          });
        }
      }
    }
  }

  addGlobal(node) {
    this.globals[node.name] = node;
  }

  hasUid(name) {
    let scope = this;

    do {
      if (scope.uids[name]) return true;
    } while (scope = scope.parent);

    return false;
  }

  hasGlobal(name) {
    let scope = this;

    do {
      if (scope.globals[name]) return true;
    } while (scope = scope.parent);

    return false;
  }

  hasReference(name) {
    return !!this.getProgramParent().references[name];
  }

  isPure(node, constantsOnly) {
    if (isIdentifier(node)) {
      const binding = this.getBinding(node.name);
      if (!binding) return false;
      if (constantsOnly) return binding.constant;
      return true;
    } else if (isClass(node)) {
      if (node.superClass && !this.isPure(node.superClass, constantsOnly)) {
        return false;
      }

      return this.isPure(node.body, constantsOnly);
    } else if (isClassBody(node)) {
      for (const method of node.body) {
        if (!this.isPure(method, constantsOnly)) return false;
      }

      return true;
    } else if (isBinary(node)) {
      return this.isPure(node.left, constantsOnly) && this.isPure(node.right, constantsOnly);
    } else if (isArrayExpression(node)) {
      for (const elem of node.elements) {
        if (!this.isPure(elem, constantsOnly)) return false;
      }

      return true;
    } else if (isObjectExpression(node)) {
      for (const prop of node.properties) {
        if (!this.isPure(prop, constantsOnly)) return false;
      }

      return true;
    } else if (isMethod(node)) {
      if (node.computed && !this.isPure(node.key, constantsOnly)) return false;
      if (node.kind === "get" || node.kind === "set") return false;
      return true;
    } else if (isProperty(node)) {
      if (node.computed && !this.isPure(node.key, constantsOnly)) return false;
      return this.isPure(node.value, constantsOnly);
    } else if (isUnaryExpression(node)) {
      return this.isPure(node.argument, constantsOnly);
    } else if (isTaggedTemplateExpression(node)) {
      return matchesPattern(node.tag, "String.raw") && !this.hasBinding("String", true) && this.isPure(node.quasi, constantsOnly);
    } else if (isTemplateLiteral(node)) {
      for (const expression of node.expressions) {
        if (!this.isPure(expression, constantsOnly)) return false;
      }

      return true;
    } else {
      return isPureish(node);
    }
  }

  setData(key, val) {
    return this.data[key] = val;
  }

  getData(key) {
    let scope = this;

    do {
      const data = scope.data[key];
      if (data != null) return data;
    } while (scope = scope.parent);
  }

  removeData(key) {
    let scope = this;

    do {
      const data = scope.data[key];
      if (data != null) scope.data[key] = null;
    } while (scope = scope.parent);
  }

  init() {
    if (!this.inited) {
      this.inited = true;
      this.crawl();
    }
  }

  crawl() {
    const path = this.path;
    this.references = Object.create(null);
    this.bindings = Object.create(null);
    this.globals = Object.create(null);
    this.uids = Object.create(null);
    this.data = Object.create(null);
    const programParent = this.getProgramParent();
    if (programParent.crawling) return;
    const state = {
      references: [],
      constantViolations: [],
      assignments: []
    };
    this.crawling = true;

    if (path.type !== "Program" && collectorVisitor._exploded) {
      for (const visit of collectorVisitor.enter) {
        visit(path, state);
      }

      const typeVisitors = collectorVisitor[path.type];

      if (typeVisitors) {
        for (const visit of typeVisitors.enter) {
          visit(path, state);
        }
      }
    }

    path.traverse(collectorVisitor, state);
    this.crawling = false;

    for (const path of state.assignments) {
      const ids = path.getBindingIdentifiers();

      for (const name of Object.keys(ids)) {
        if (path.scope.getBinding(name)) continue;
        programParent.addGlobal(ids[name]);
      }

      path.scope.registerConstantViolation(path);
    }

    for (const ref of state.references) {
      const binding = ref.scope.getBinding(ref.node.name);

      if (binding) {
        binding.reference(ref);
      } else {
        programParent.addGlobal(ref.node);
      }
    }

    for (const path of state.constantViolations) {
      path.scope.registerConstantViolation(path);
    }
  }

  push(opts) {
    let path = this.path;

    if (!path.isBlockStatement() && !path.isProgram()) {
      path = this.getBlockParent().path;
    }

    if (path.isSwitchStatement()) {
      path = (this.getFunctionParent() || this.getProgramParent()).path;
    }

    if (path.isLoop() || path.isCatchClause() || path.isFunction()) {
      path.ensureBlock();
      path = path.get("body");
    }

    const unique = opts.unique;
    const kind = opts.kind || "var";
    const blockHoist = opts._blockHoist == null ? 2 : opts._blockHoist;
    const dataKey = `declaration:${kind}:${blockHoist}`;
    let declarPath = !unique && path.getData(dataKey);

    if (!declarPath) {
      const declar = variableDeclaration(kind, []);
      declar._blockHoist = blockHoist;
      [declarPath] = path.unshiftContainer("body", [declar]);
      if (!unique) path.setData(dataKey, declarPath);
    }

    const declarator = variableDeclarator(opts.id, opts.init);
    declarPath.node.declarations.push(declarator);
    this.registerBinding(kind, declarPath.get("declarations").pop());
  }

  getProgramParent() {
    let scope = this;

    do {
      if (scope.path.isProgram()) {
        return scope;
      }
    } while (scope = scope.parent);

    throw new Error("Couldn't find a Program");
  }

  getFunctionParent() {
    let scope = this;

    do {
      if (scope.path.isFunctionParent()) {
        return scope;
      }
    } while (scope = scope.parent);

    return null;
  }

  getBlockParent() {
    let scope = this;

    do {
      if (scope.path.isBlockParent()) {
        return scope;
      }
    } while (scope = scope.parent);

    throw new Error("We couldn't find a BlockStatement, For, Switch, Function, Loop or Program...");
  }

  getAllBindings() {
    const ids = Object.create(null);
    let scope = this;

    do {
      for (const key of Object.keys(scope.bindings)) {
        if (key in ids === false) {
          ids[key] = scope.bindings[key];
        }
      }

      scope = scope.parent;
    } while (scope);

    return ids;
  }

  getAllBindingsOfKind(...kinds) {
    const ids = Object.create(null);

    for (const kind of kinds) {
      let scope = this;

      do {
        for (const name of Object.keys(scope.bindings)) {
          const binding = scope.bindings[name];
          if (binding.kind === kind) ids[name] = binding;
        }

        scope = scope.parent;
      } while (scope);
    }

    return ids;
  }

  bindingIdentifierEquals(name, node) {
    return this.getBindingIdentifier(name) === node;
  }

  getBinding(name) {
    let scope = this;
    let previousPath;

    do {
      const binding = scope.getOwnBinding(name);

      if (binding) {
        var _previousPath;

        if ((_previousPath = previousPath) != null && _previousPath.isPattern() && binding.kind !== "param" && binding.kind !== "local") {} else {
          return binding;
        }
      }

      previousPath = scope.path;
    } while (scope = scope.parent);
  }

  getOwnBinding(name) {
    return this.bindings[name];
  }

  getBindingIdentifier(name) {
    var _this$getBinding;

    return (_this$getBinding = this.getBinding(name)) == null ? void 0 : _this$getBinding.identifier;
  }

  getOwnBindingIdentifier(name) {
    const binding = this.bindings[name];
    return binding == null ? void 0 : binding.identifier;
  }

  hasOwnBinding(name) {
    return !!this.getOwnBinding(name);
  }

  hasBinding(name, noGlobals) {
    if (!name) return false;
    if (this.hasOwnBinding(name)) return true;
    if (this.parentHasBinding(name, noGlobals)) return true;
    if (this.hasUid(name)) return true;
    if (!noGlobals && Scope.globals.includes(name)) return true;
    if (!noGlobals && Scope.contextVariables.includes(name)) return true;
    return false;
  }

  parentHasBinding(name, noGlobals) {
    var _this$parent;

    return (_this$parent = this.parent) == null ? void 0 : _this$parent.hasBinding(name, noGlobals);
  }

  moveBindingTo(name, scope) {
    const info = this.getBinding(name);

    if (info) {
      info.scope.removeOwnBinding(name);
      info.scope = scope;
      scope.bindings[name] = info;
    }
  }

  removeOwnBinding(name) {
    delete this.bindings[name];
  }

  removeBinding(name) {
    var _this$getBinding2;

    (_this$getBinding2 = this.getBinding(name)) == null ? void 0 : _this$getBinding2.scope.removeOwnBinding(name);
    let scope = this;

    do {
      if (scope.uids[name]) {
        scope.uids[name] = false;
      }
    } while (scope = scope.parent);
  }

}

exports.default = Scope;