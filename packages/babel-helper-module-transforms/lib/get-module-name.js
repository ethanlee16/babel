"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getModuleName;

if (!process.env.BABEL_8_BREAKING) {
  const originalGetModuleName = getModuleName;

  exports.default = getModuleName = function getModuleName(rootOpts, pluginOpts) {
    return originalGetModuleName(rootOpts, {
      moduleId: pluginOpts.moduleId ?? rootOpts.moduleId,
      moduleIds: pluginOpts.moduleIds ?? rootOpts.moduleIds,
      getModuleId: pluginOpts.getModuleId ?? rootOpts.getModuleId,
      moduleRoot: pluginOpts.moduleRoot ?? rootOpts.moduleRoot
    });
  };
}

function getModuleName(rootOpts, pluginOpts) {
  const {
    filename,
    filenameRelative = filename,
    sourceRoot = pluginOpts.moduleRoot
  } = rootOpts;
  const {
    moduleId,
    moduleIds = !!moduleId,
    getModuleId,
    moduleRoot = sourceRoot
  } = pluginOpts;
  if (!moduleIds) return null;

  if (moduleId != null && !getModuleId) {
    return moduleId;
  }

  let moduleName = moduleRoot != null ? moduleRoot + "/" : "";

  if (filenameRelative) {
    const sourceRootReplacer = sourceRoot != null ? new RegExp("^" + sourceRoot + "/?") : "";
    moduleName += filenameRelative.replace(sourceRootReplacer, "").replace(/\.(\w*?)$/, "");
  }

  moduleName = moduleName.replace(/\\/g, "/");

  if (getModuleId) {
    return getModuleId(moduleName) || moduleName;
  } else {
    return moduleName;
  }
}