const resolvepath = require("path").resolve;
const format = require("util").format;
const inspect = require("util").inspect;

const Result = require("r-result");
const Ok = Result.Ok;
const Fail = Result.Fail;

const failures = require("./failures");

const root = resolvepath("/");

const zip = function () {
    const arrays = Array.prototype.slice.call(arguments);

    const res = [];

    if (arrays.length === 0) {
        return res;
    }

    arrays[0].forEach(function (_element, ix) {
        res.push(arrays.map(function (array) {
            return array[ix];
        }));
    });

    return res;
};

function resultAllShortCircuiting (array, mapperIntoResult) {
    return array.reduce(function (mapResult, element) {
        return mapResult.andThen(function (mapped) {
            const singleResult = mapperIntoResult(element);
            if (singleResult.isOk()) {
                mapped.push(singleResult.ok());
                return Ok(mapped);
            } else {
                return singleResult;
            }
        });
    }, Ok([]));
}

module.exports = function PluginLoader (pluginSystem, fs, require, systemname) {
    function exists (path) {
        return fs.existsSync(path + ".js") || fs.existsSync(path);
    }

    function use (pluginNames, path) {
        if (typeof path !== "string") {
            throw new TypeError("Path must be a string. Given " + typeof path + " instead.");
        }

        const names = pluginNames.filter(function (name) {
            // TODO(Havvy): Log something here.
            const hasPlugin = pluginSystem.hasPlugin(name);
            return !hasPlugin;
        });

        return resultAllShortCircuiting(names, function (name) {
            return locate(name, path);
        })
        .andThen(function (paths) {
            const Plugins = zip(paths, names).map(load);

            return resultAllShortCircuiting(zip(paths, names), load);
        })
        .andThen(function (Plugins) {
            // TODO(Havvy): Should order plugins in order of initialization.
            //              This would let us figure out why the plugins that
            //              are left could not be initialized without initializing
            //              them first.

            // Would be more readable with sets that support filter, difference, and some.

            // Note(Havvy): We'll be traversing Plugins backwards in the for loop below
            //              so that we don't step over ourselves while splicing.
            //              But we don't want to change the order we actually traverse,
            //              so we reverse the Plugins list here.
            Plugins.reverse();
            while (Plugins.length !== 0) {
                var foundInitializable = false;

                for (var ix = Plugins.length - 1; ix >= 0; ix -= 1) {
                    var Plugin = Plugins[ix];

                    if (pluginSystem.isInitializable(Plugin).canInitialize) {
                        foundInitializable = true;
                        pluginSystem.initialize(Plugin)
                        Plugins.splice(ix, 1);
                    }
                }

                if (!foundInitializable) {
                    return determineUnmetDependencyReason(Plugins);
                }
            }

            return Ok();
        })
        .andThen(function (/* array of undefined */) {
            return Ok();
        });
    }

    function load (data) {
        const path = data[0];
        const name = data[1];

        const instance = require(path);

        if (typeof instance !== "object") {
            return Fail({
                failureReason: failures.NotAPlugin,
                message: format("Plugin must be an object. Given %s for %s at %s", typeof instance, data[1], data[0])
            });
        }
        
        if (instance.name === undefined) {
            // (Havvy): Should this be deprecated?
            instance.name = name;
        } else if (instance.name !== name) {
            return new Fail({
                failureReason: failures.InconsistentlyNamedPlugin,
                message: format("Tried to load plugin '%'. Loaded plugin named '%s' instead.", name, instance.name),
                path: path
            });
        }

        return Ok(instance);
    }

    function determineUnmetDependencyReason (Plugins) {
        return Fail({
            failureReason: failures.UnmetDependency,
            message: "Reason unknown (unimplemented)"
        });
    }

    function locate (name, path) {
        var filepath;
        const paths = parentPaths(path);

        for (var ix = 0; ix < paths.length; ix++) {
            var cursor = paths[ix];

            filepath = resolvepath(cursor, format("%s_plugins", systemname), name);
            if (exists(filepath)) return Ok(filepath);

            filepath = resolvepath(cursor, "node_modules", systemname + "-" + name);
            if (exists(filepath)) return Ok(filepath);
        }

        return Fail({
            failureReason: failures.NoSuchPlugin,
            message: format("Failed to locate plugin '%s'", name),
            name: name,
            paths: paths
        });
    }

    function parentPaths (path) {
        const res = [];
        var there = path;

        while (there !== root) {
            res.push(there);
            there = resolvepath(there, "../");
        }

        res.push(root);

        return res;
    }

    return {
        use: use,
    }
};