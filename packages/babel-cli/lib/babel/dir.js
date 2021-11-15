"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

function _slash() {
  const data = require("slash");

  _slash = function () {
    return data;
  };

  return data;
}

function _path() {
  const data = require("path");

  _path = function () {
    return data;
  };

  return data;
}

function _fs() {
  const data = require("fs");

  _fs = function () {
    return data;
  };

  return data;
}

var util = require("./util");

const FILE_TYPE = Object.freeze({
  NON_COMPILABLE: "NON_COMPILABLE",
  COMPILED: "COMPILED",
  IGNORED: "IGNORED",
  ERR_COMPILATION: "ERR_COMPILATION"
});

function outputFileSync(filePath, data) {
  _fs().mkdirSync(_path().dirname(filePath), {
    recursive: true
  });

  _fs().writeFileSync(filePath, data);
}

async function _default({
  cliOptions,
  babelOptions
}) {
  const filenames = cliOptions.filenames;

  async function write(src, base) {
    let relative = _path().relative(base, src);

    if (!util.isCompilableExtension(relative, cliOptions.extensions)) {
      return FILE_TYPE.NON_COMPILABLE;
    }

    relative = util.withExtension(relative, cliOptions.keepFileExtension ? _path().extname(relative) : cliOptions.outFileExtension);
    const dest = getDest(relative, base);

    try {
      const res = await util.compile(src, Object.assign({}, babelOptions, {
        sourceFileName: _slash()(_path().relative(dest + "/..", src))
      }));
      if (!res) return FILE_TYPE.IGNORED;

      if (res.map && babelOptions.sourceMaps && babelOptions.sourceMaps !== "inline") {
        const mapLoc = dest + ".map";
        res.code = util.addSourceMappingUrl(res.code, mapLoc);
        res.map.file = _path().basename(relative);
        outputFileSync(mapLoc, JSON.stringify(res.map));
      }

      outputFileSync(dest, res.code);
      util.chmod(src, dest);

      if (cliOptions.verbose) {
        console.log(src + " -> " + dest);
      }

      return FILE_TYPE.COMPILED;
    } catch (err) {
      if (cliOptions.watch) {
        console.error(err);
        return FILE_TYPE.ERR_COMPILATION;
      }

      throw err;
    }
  }

  function getDest(filename, base) {
    if (cliOptions.relative) {
      return _path().join(base, cliOptions.outDir, filename);
    }

    return _path().join(cliOptions.outDir, filename);
  }

  async function handleFile(src, base) {
    const written = await write(src, base);

    if (cliOptions.copyFiles && written === FILE_TYPE.NON_COMPILABLE || cliOptions.copyIgnored && written === FILE_TYPE.IGNORED) {
      const filename = _path().relative(base, src);

      const dest = getDest(filename, base);
      outputFileSync(dest, _fs().readFileSync(src));
      util.chmod(src, dest);
    }

    return written === FILE_TYPE.COMPILED;
  }

  async function handle(filenameOrDir) {
    if (!_fs().existsSync(filenameOrDir)) return 0;

    const stat = _fs().statSync(filenameOrDir);

    if (stat.isDirectory()) {
      const dirname = filenameOrDir;
      let count = 0;
      const files = util.readdir(dirname, cliOptions.includeDotfiles);

      for (const filename of files) {
        const src = _path().join(dirname, filename);

        const written = await handleFile(src, dirname);
        if (written) count += 1;
      }

      return count;
    } else {
      const filename = filenameOrDir;
      const written = await handleFile(filename, _path().dirname(filename));
      return written ? 1 : 0;
    }
  }

  let compiledFiles = 0;
  let startTime = null;
  const logSuccess = util.debounce(function () {
    if (startTime === null) {
      return;
    }

    const diff = process.hrtime(startTime);
    console.log(`Successfully compiled ${compiledFiles} ${compiledFiles !== 1 ? "files" : "file"} with Babel (${diff[0] * 1e3 + Math.round(diff[1] / 1e6)}ms).`);
    compiledFiles = 0;
    startTime = null;
  }, 100);

  if (!cliOptions.skipInitialBuild) {
    if (cliOptions.deleteDirOnStart) {
      util.deleteDir(cliOptions.outDir);
    }

    _fs().mkdirSync(cliOptions.outDir, {
      recursive: true
    });

    startTime = process.hrtime();

    for (const filename of cliOptions.filenames) {
      compiledFiles += await handle(filename);
    }

    if (!cliOptions.quiet) {
      logSuccess();
      logSuccess.flush();
    }
  }

  if (cliOptions.watch) {
    const chokidar = util.requireChokidar();
    filenames.forEach(function (filenameOrDir) {
      const watcher = chokidar.watch(filenameOrDir, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 10
        }
      });
      let processing = 0;
      ["add", "change"].forEach(function (type) {
        watcher.on(type, async function (filename) {
          processing++;
          if (startTime === null) startTime = process.hrtime();

          try {
            await handleFile(filename, filename === filenameOrDir ? _path().dirname(filenameOrDir) : filenameOrDir);
            compiledFiles++;
          } catch (err) {
            console.error(err);
          }

          processing--;
          if (processing === 0 && !cliOptions.quiet) logSuccess();
        });
      });
    });
  }
}