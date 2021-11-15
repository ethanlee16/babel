"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runScripts = runScripts;
const scriptTypes = ["text/jsx", "text/babel"];
let headEl;
let inlineScriptCount = 0;

function transformCode(transformFn, script) {
  let source;

  if (script.url != null) {
    source = script.url;
  } else {
    source = "Inline Babel script";
    inlineScriptCount++;

    if (inlineScriptCount > 1) {
      source += " (" + inlineScriptCount + ")";
    }
  }

  return transformFn(script.content, buildBabelOptions(script, source)).code;
}

function buildBabelOptions(script, filename) {
  let presets = script.presets;

  if (!presets) {
    if (script.type === "module") {
      presets = ["react", ["env", {
        targets: {
          esmodules: true
        },
        modules: false
      }]];
    } else {
      presets = ["react", "env"];
    }
  }

  return {
    filename,
    presets,
    plugins: script.plugins || ["proposal-class-properties", "proposal-object-rest-spread", "transform-flow-strip-types"],
    sourceMaps: "inline",
    sourceFileName: filename
  };
}

function run(transformFn, script) {
  const scriptEl = document.createElement("script");

  if (script.type) {
    scriptEl.setAttribute("type", script.type);
  }

  scriptEl.text = transformCode(transformFn, script);
  headEl.appendChild(scriptEl);
}

function load(url, successCallback, errorCallback) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);

  if ("overrideMimeType" in xhr) {
    xhr.overrideMimeType("text/plain");
  }

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 0 || xhr.status === 200) {
        successCallback(xhr.responseText);
      } else {
        errorCallback();
        throw new Error("Could not load " + url);
      }
    }
  };

  return xhr.send(null);
}

function getPluginsOrPresetsFromScript(script, attributeName) {
  const rawValue = script.getAttribute(attributeName);

  if (rawValue === "") {
    return [];
  }

  if (!rawValue) {
    return null;
  }

  return rawValue.split(",").map(item => item.trim());
}

function loadScripts(transformFn, scripts) {
  const result = [];
  const count = scripts.length;

  function check() {
    let script, i;

    for (i = 0; i < count; i++) {
      script = result[i];

      if (script.loaded && !script.executed) {
        script.executed = true;
        run(transformFn, script);
      } else if (!script.loaded && !script.error && !script.async) {
        break;
      }
    }
  }

  scripts.forEach((script, i) => {
    const scriptData = {
      async: script.hasAttribute("async"),
      type: script.getAttribute("data-type"),
      error: false,
      executed: false,
      plugins: getPluginsOrPresetsFromScript(script, "data-plugins"),
      presets: getPluginsOrPresetsFromScript(script, "data-presets")
    };

    if (script.src) {
      result[i] = Object.assign({}, scriptData, {
        content: null,
        loaded: false,
        url: script.src
      });
      load(script.src, content => {
        result[i].loaded = true;
        result[i].content = content;
        check();
      }, () => {
        result[i].error = true;
        check();
      });
    } else {
      result[i] = Object.assign({}, scriptData, {
        content: script.innerHTML,
        loaded: true,
        url: script.getAttribute("data-module") || null
      });
    }
  });
  check();
}

function runScripts(transformFn, scripts) {
  headEl = document.getElementsByTagName("head")[0];

  if (!scripts) {
    scripts = document.getElementsByTagName("script");
  }

  const jsxScripts = [];

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts.item(i);
    const type = script.type.split(";")[0];

    if (scriptTypes.indexOf(type) !== -1) {
      jsxScripts.push(script);
    }
  }

  if (jsxScripts.length === 0) {
    return;
  }

  console.warn("You are using the in-browser Babel transformer. Be sure to precompile " + "your scripts for production - https://babeljs.io/docs/setup/");
  loadScripts(transformFn, jsxScripts);
}