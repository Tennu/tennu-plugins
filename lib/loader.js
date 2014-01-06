const resolvepath = require('path').resolve;
const format = require('util').format;
const inspect = require('util').inspect;
const root = resolvepath('/');

const unary = function (fn) {
    return function (arg) {
        return fn(arg);
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

module.exports = function ModuleLoader (moduleSystem, fs, require, systemname) {
    function exists (path) {
        return fs.existsSync(path + ".js") || fs.existsSync(path);
    }

    function use (_names, path) {
        if (typeof path !== 'string') {
            throw new TypeError('Path must be a string. Given ' + typeof path + ' instead.');
        }

        const names = _names.filter(function (name) {
            return !moduleSystem.hasModule(name);
        });

        const paths = names.map(function (name) {
            return locate(name, path)
        });

        const Modules = zip(paths, names).map(unary(load));

        // Would be easier with sets that support filter, difference, and some.
        while (Modules.length !== 0) {
            var foundInitializable = false;

            for (var ix = 0; ix < Modules.length; ix++) {
                var Module = Modules[ix];

                if (moduleSystem.isInitializable(Module)) {
                    foundInitializable = true;
                    moduleSystem.initialize(Module);
                    Modules.splice(ix, 1);
                    ix -= 1;
                }
            }

            if (!foundInitializable) {
                throw determineUnmetDependencyReason(Modules);
            }
        }
    }

    function load (data) {
        const path = data[0];
        const name = data[1];

        const instance = require(path);
        instance.name = name;

        return instance;
    }

    function determineUnmetDependencyReason (Modules) {
        return new (errors.UnmetDependency)('Reason unknown (unimplemented)');
    }

    function locate (name, _path) {
        var filepath;
        const paths = parentPaths(_path);

        for (var ix = 0; ix < paths.length; ix++) {
            var cursor = paths[ix];

            filepath = resolvepath(cursor, format('%s_modules', systemname), name);
            if (exists(filepath)) return filepath;

            filepath = resolvepath(cursor, 'node_modules', 'tennu-' + name);
            if (exists(filepath)) return filepath;
        }

        throw new (errors.NoSuchModule)(format("Failed to locate module '%s'", name), name, paths);
    }

    function parentPaths (path) {
        const res = [];
        var there = path;

        while (there !== root) {
            there = resolvepath(there, '../');
            res.push(there);
        }

        res.push(root);

        return res;
    }

    return {
        use: use,
    }
};