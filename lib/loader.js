"use strict";

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

function collectResultArray (array, mapperIntoResult) {
    return array.reduce(function (mapResult, element) {
        return mapResult.andThen(function (mapped) {
            const singleResult = mapperIntoResult(element);
            if (singleResult.isOk()) {
                mapped.push(singleResult.ok());
                // NOTE(Havvy): Logically, we should return Ok(mapped) here,
                //              but that's what mapResult is at this point,
                //              because we pushed to the array in contains
                //              instead of creating a brand new value to be wrapped.
                //              So to avoid creating `array.length` Ok() values,
                //              this just lets us reuse one value.
                return mapResult;
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

        return collectResultArray(names, function (name) {
            return locate(name, path);
        })
        .andThen(function (paths) {
            const Plugins = zip(paths, names).map(load);

            return collectResultArray(zip(paths, names), load);
        })
        .andThen(function (Plugins) {
            const toInitialize = [];
            const pluginInToInitialize = new Map(Plugins.map(function (Plugin) {
                return [Plugin, false];
            }));

            const find = function (name, type, alreadyTrying) {
                for (const Plugin of Plugins) {
                    // NOTE(Havvy): We don't actually know whether a Plugin is an object here or not.
                    //              If it's not, we'll catch it later when we try to initialize that.
                    if (typeof Plugin === "object" && Plugin[type] === name) {
                        if (alreadyTrying.indexOf(Plugin) !== -1) {
                            return Fail({
                                failureType: failures.CyclicicDependency,
                                message: "Two or more plugins depend on each other cyclicicly.",
                                dependencies: alreadyTrying
                            });
                        }

                        return Ok(Plugin);
                    }
                }

                return Fail({
                    failureType: failures.UnmetDependency,
                    message: `Plugin with ${type} of '${name}' required but neither initialized nor in to be initialized list.`,
                    dependencyType: type,
                    dependencyName: name
                });
            }

            const tryAddToInitialize = function (Plugin, alreadyTrying) {
                if (pluginInToInitialize.get(Plugin)) {
                    return Ok();
                }

                const validation = pluginSystem.isInitializableWith(Plugin, toInitialize);

                if (validation.canInitialize) {
                    toInitialize.push(Plugin);
                    pluginInToInitialize.set(Plugin, true);
                    return Ok();
                }

                if (validation.failureReason === failures.validation.HasUnfulfilledPluginDependencies) {
                    const alreadyTryingWithSelf = alreadyTrying.concat(Plugin);

                    // Try to add all named dependencies and then try to add this dependency again.
                    return collectResultArray(validation.namesNeeded, function (name) {
                        return find(name, "name", alreadyTryingWithSelf)
                        .andThen(function (Plugin) {
                            return tryAddToInitialize(Plugin, alreadyTryingWithSelf);
                        });
                    }).andThen(function (_array_of_undefined) {
                        return tryAddToInitialize(Plugin, alreadyTrying);
                    });
                }
                
                if (validation.failureReason === failures.validation.HasUnfulfilledRoleDependencies) {
                    const alreadyTryingWithSelf = alreadyTrying.concat(Plugin);

                    // Try to add all role dependencies and then try to add this dependency again.
                    return collectResultArray(validation.rolesNeeded, function (role) {
                        return find(role, "role", alreadyTryingWithSelf)
                        .andThen(function (Plugin) {
                            return tryAddToInitialize(Plugin, alreadyTryingWithSelf);
                        });
                    }).andThen(function (_array_of_undefined) {
                        return tryAddToInitialize(Plugin, alreadyTrying);
                    });
                }

                return Fail({
                    failureReason: failures.CannotInitialize,
                    message: "The plugin cannot be initialized. For why, check the validationFailure.",
                    validationFailure: validation,
                    pluginFactory: Plugin
                });
            }

            for (const Plugin of Plugins) {
                const result = tryAddToInitialize(Plugin, []);

                if (result.isFail()) {
                    return result;
                }
            }

            return Ok(toInitialize);
        })
        .andThen(function (Plugins) {
            return collectResultArray(Plugins, function (Plugin) {
                return pluginSystem.initialize(Plugin);
            });
        })
        .map(function (_array_of_undefined) {
            return undefined;
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