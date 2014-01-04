const path = require('path');
const format = require('util').format;
const fs_exists = require('fs').existsSync;

const here = path.resolve(__dirname, __filename);
const root = path.resolve('/');

const exists = function (path) {
    return fs_exists(path) || fs_exists(path + ".js");
};

const unary = function (fn) {
    return function (arg) {
        fn(arg);
    };
};

const zip = function () {
    const arrays = Array.prototype.slice.call(arguments);

    if (arrays.length === 0) {
        return;
    }

    const res = [];

    arrays[0].forEach(function (_element, ix) {
        res.push(arrays.map(function (array) {
            return array[ix];
        }));
    });

    return res;
};

const errors = require('./errors.js');

module.exports = function ModuleLoader (ModuleSystem) {
    function use (names) {
        names = names.filter(function (name) {
            return !modules.has(name);
        });

        const paths = names.map(unary(locate));
        const Modules = zip(paths, names).map(unary(load));

        // Would be easier with sets that support both filter and difference.
        while (Modules.length !== 0) {
            var foundInitializable = false;

            for (var ix = 0; ix < Modules.length; ix++) {
                var Module = Modules[ix];

                if (isInitializable(Module)) {
                    foundInitializable = true;
                    // FIXME: Make this function.
                    initialize(Module);
                    Modules.splice(ix, 1);
                    break;
                }
            }

            if (!foundInitializable) {
                throw determineUnmetDependencyReason(Modules);
            }
        }
    }

    function determineUnmetDependencyReason (Modules) {
        return new (errors.UnmetDependency)('Reason unknown (unimplemented)');
    }

    function tennu_require (name) {
        debug("Requiring " + name);

        if (!isLoaded(name)) {
            debug("Module not required yet. Locating");
            const load_path = locate(name);
            load(node_require(load_path));
            debug("Module located.");
        }

        return exports[name];
    }

    function locate (name) {
        const there = here, tennu_path, node_path;

        while (there !== root) {
            there = path.resolve(there, '../');

            tennu_path = path.resolve(there, 'tennu_modules', name);
            debug("Searching at: " + tennu_path);
            if (exists(tennu_path)) { return tennu_path; }

            node_path = path.resolve(there, 'node_modules', 'tennu-' + name);
            debug("Searching at: " + node_path);
            if (exists(node_path)) { return node_path; }
        }

        throw new Error("Failed to require Tennu module '" + name + "'");
    }
};