"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _pluginSyntaxFlow = require("@babel/plugin-syntax-flow");

var _core = require("@babel/core");

var _generator = require("@babel/generator");

var _default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion(7);

  function commentFromString(comment) {
    return typeof comment === "string" ? {
      type: "CommentBlock",
      value: comment
    } : comment;
  }

  function attachComment({
    ofPath,
    toPath,
    where = "trailing",
    optional = false,
    comments = generateComment(ofPath, optional),
    keepType = false
  }) {
    var _toPath;

    if (!((_toPath = toPath) != null && _toPath.node)) {
      toPath = ofPath.getPrevSibling();
      where = "trailing";
    }

    if (!toPath.node) {
      toPath = ofPath.getNextSibling();
      where = "leading";
    }

    if (!toPath.node) {
      toPath = ofPath.parentPath;
      where = "inner";
    }

    if (!Array.isArray(comments)) {
      comments = [comments];
    }

    comments = comments.map(commentFromString);

    if (!keepType && ofPath != null && ofPath.node) {
      const node = ofPath.node;
      const parent = ofPath.parentPath;
      const prev = ofPath.getPrevSibling();
      const next = ofPath.getNextSibling();
      const isSingleChild = !(prev.node || next.node);
      const leading = node.leadingComments;
      const trailing = node.trailingComments;

      if (isSingleChild && leading) {
        parent.addComments("inner", leading);
      }

      toPath.addComments(where, comments);
      ofPath.remove();

      if (isSingleChild && trailing) {
        parent.addComments("inner", trailing);
      }
    } else {
      toPath.addComments(where, comments);
    }
  }

  function wrapInFlowComment(path) {
    attachComment({
      ofPath: path,
      comments: generateComment(path, path.parent.optional)
    });
  }

  function generateComment(path, optional) {
    let comment = path.getSource().replace(/\*-\//g, "*-ESCAPED/").replace(/\*\//g, "*-/");
    if (optional) comment = "?" + comment;
    if (comment[0] !== ":") comment = ":: " + comment;
    return comment;
  }

  function isTypeImport(importKind) {
    return importKind === "type" || importKind === "typeof";
  }

  return {
    name: "transform-flow-comments",
    inherits: _pluginSyntaxFlow.default,
    visitor: {
      TypeCastExpression(path) {
        const {
          node
        } = path;
        attachComment({
          ofPath: path.get("typeAnnotation"),
          toPath: path.get("expression"),
          keepType: true
        });
        path.replaceWith(_core.types.parenthesizedExpression(node.expression));
      },

      Identifier(path) {
        if (path.parentPath.isFlow()) return;
        const {
          node
        } = path;

        if (node.typeAnnotation) {
          attachComment({
            ofPath: path.get("typeAnnotation"),
            toPath: path,
            optional: node.optional || node.typeAnnotation.optional
          });

          if (node.optional) {
            node.optional = false;
          }
        } else if (node.optional) {
          attachComment({
            toPath: path,
            comments: ":: ?"
          });
          node.optional = false;
        }
      },

      AssignmentPattern: {
        exit({
          node
        }) {
          const {
            left
          } = node;

          if (left.optional) {
            left.optional = false;
          }
        }

      },

      Function(path) {
        if (path.isDeclareFunction()) return;
        const {
          node
        } = path;

        if (node.typeParameters) {
          attachComment({
            ofPath: path.get("typeParameters"),
            toPath: path.get("id"),
            optional: node.typeParameters.optional
          });
        }

        if (node.returnType) {
          attachComment({
            ofPath: path.get("returnType"),
            toPath: path.get("body"),
            where: "leading",
            optional: node.returnType.typeAnnotation.optional
          });
        }
      },

      ClassProperty(path) {
        const {
          node
        } = path;

        if (!node.value) {
          wrapInFlowComment(path);
        } else if (node.typeAnnotation) {
          attachComment({
            ofPath: path.get("typeAnnotation"),
            toPath: path.get("key"),
            optional: node.typeAnnotation.optional
          });
        }
      },

      ExportNamedDeclaration(path) {
        const {
          node
        } = path;

        if (node.exportKind !== "type" && !_core.types.isFlow(node.declaration)) {
          return;
        }

        wrapInFlowComment(path);
      },

      ImportDeclaration(path) {
        const {
          node
        } = path;

        if (isTypeImport(node.importKind)) {
          wrapInFlowComment(path);
          return;
        }

        const typeSpecifiers = node.specifiers.filter(specifier => isTypeImport(specifier.importKind));
        const nonTypeSpecifiers = node.specifiers.filter(specifier => !isTypeImport(specifier.importKind));
        node.specifiers = nonTypeSpecifiers;

        if (typeSpecifiers.length > 0) {
          const typeImportNode = _core.types.cloneNode(node);

          typeImportNode.specifiers = typeSpecifiers;
          const comment = `:: ${(0, _generator.default)(typeImportNode).code}`;

          if (nonTypeSpecifiers.length > 0) {
            attachComment({
              toPath: path,
              comments: comment
            });
          } else {
            attachComment({
              ofPath: path,
              comments: comment
            });
          }
        }
      },

      ObjectPattern(path) {
        const {
          node
        } = path;

        if (node.typeAnnotation) {
          attachComment({
            ofPath: path.get("typeAnnotation"),
            toPath: path,
            optional: node.optional || node.typeAnnotation.optional
          });
        }
      },

      Flow(path) {
        wrapInFlowComment(path);
      },

      Class(path) {
        const {
          node
        } = path;
        let comments = [];

        if (node.typeParameters) {
          const typeParameters = path.get("typeParameters");
          comments.push(generateComment(typeParameters, node.typeParameters.optional));
          const trailingComments = node.typeParameters.trailingComments;

          if (trailingComments) {
            comments.push(...trailingComments);
          }

          typeParameters.remove();
        }

        if (node.superClass) {
          if (comments.length > 0) {
            attachComment({
              toPath: path.get("id"),
              comments: comments
            });
            comments = [];
          }

          if (node.superTypeParameters) {
            const superTypeParameters = path.get("superTypeParameters");
            comments.push(generateComment(superTypeParameters, superTypeParameters.node.optional));
            superTypeParameters.remove();
          }
        }

        if (node.implements) {
          const impls = path.get("implements");
          const comment = "implements " + impls.map(impl => generateComment(impl).replace(/^:: /, "")).join(", ");
          delete node["implements"];

          if (comments.length === 1) {
            comments[0] += ` ${comment}`;
          } else {
            comments.push(`:: ${comment}`);
          }
        }

        if (comments.length > 0) {
          attachComment({
            toPath: path.get("body"),
            where: "leading",
            comments: comments
          });
        }
      }

    }
  };
});

exports.default = _default;