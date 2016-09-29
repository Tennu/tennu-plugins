"use strict";

const resolvepath = require("path").resolve;
const format = require("util").format;
const inspect = require("util").inspect;

const Result = require("r-result");
const Ok = Result.Ok;
const Fail = Result.Fail;

const failures = require("./failures");

const helpers = require("./helpers");
const zip = helpers.zip;
const collectResultArray = helpers.collectResultArray;
const bindr = helpers.bindr;
const aType = helpers.aType;

const root = resolvepath("/");

module.exports = function PluginLoader (pluginSystem, fs, require, systemname) {
    const exists = function exists (path) {
        return fs.existsSync(path + ".js") || fs.existsSync(path);
    }

    const use = function use (pluginNames, path) {
        const failures = use.failures;

        if (typeof path !== "string") {
            throw new TypeError(`Path must be a string. Given ${typeof path} instead.`);
        }

        return collectResultArray(pluginNames, bindr(locate, [path]))
        .andThen(function loadPluginFactories (paths) {
            return collectResultArray(zip(paths, pluginNames), load);
        })
        .andThen(function validatePluginFactoryCheck (pluginFactories) {
            return collectResultArray(pluginFactories, function (pluginFactory) {
                return pluginSystem.validatePluginFactory(pluginFactory)
                .mapFail(function (innerFailure) {
                    return {
                        failureType: failures.ValidatePluginFactoryFailed,
                        message: "An invalid plugin factory was loaded.",
                        innerFailure,
                        innerFailureTypes: pluginSystem.validatePluginFactory.failures
                    };
                });
            });
        })
        .andThen(function canInstallCheck (pluginFactories) {
            const toInstall = [];
            const pluginInToInstall = new Map(pluginFactories.map(function (pluginFactory) {
                return [pluginFactory, false];
            }));

            const find = function (name, dependencyType, alreadyTrying) {
                for (const pluginFactory of pluginFactories) {
                    if (pluginFactory[dependencyType] === name) {
                        if (alreadyTrying.indexOf(pluginFactory) !== -1) {
                            return Fail({
                                failureType: failures.CyclicicDependency,
                                message: "Two or more plugins depend on each other cyclicicly.",
                                dependencies: alreadyTrying
                            });
                        }

                        return Ok(pluginFactory);
                    }
                }

                return Fail({
                    failureType: failures.UnmetDependency,
                    message: `Plugin with ${dependencyType} of '${name}' required but neither installed nor in to be installed list.`,
                    dependencyType,
                    dependencyName: name
                });
            };

            const tryAddDependenciesAndSelfToInstall = function (pluginFactory, alreadyTrying, dependencyType, dependencies) {
                const alreadyTryingPlusSelf = alreadyTrying.concat(pluginFactory);

                return collectResultArray(dependencies, function (name) {
                    return find(name, dependencyType, alreadyTryingPlusSelf)
                    .andThen(function (pluginFactory) {
                        return tryAddToInstall(pluginFactory, alreadyTryingPlusSelf);
                    });
                }).andThen(function (_array_of_undefined) {
                    return tryAddToInstall(pluginFactory, alreadyTrying);
                });
            };

            const tryAddToInstall = function (pluginFactory, alreadyTrying) {
                const UnfulfilledPluginDependencies = pluginSystem.canInstallWith.failures.UnfulfilledPluginDependencies;
                const UnfulfilledRoleDependencies = pluginSystem.canInstallWith.failures.UnfulfilledRoleDependencies;

                // TODO(Havvy): This is an abstraction leak. Hide it behind a function.
                if (pluginInToInstall.get(pluginFactory)) {
                    return Ok();
                }

                return pluginSystem.canInstallWith(pluginFactory, toInstall).match({
                    Ok(pluginFactory) {
                        toInstall.push(pluginFactory);
                        pluginInToInstall.set(pluginFactory, true);
                        return Ok();
                    },

                    Fail(canInstallFailure) {
                        if (canInstallFailure.failureType === UnfulfilledPluginDependencies) {
                            return tryAddDependenciesAndSelfToInstall(
                                pluginFactory,
                                alreadyTrying,
                                "name",
                                canInstallFailure.unfulfilledRequirements
                            );
                        } else if (canInstallFailure.failureType === UnfulfilledRoleDependencies) {
                            return tryAddDependenciesAndSelfToInstall(
                                pluginFactory,
                                alreadyTrying,
                                "role",
                                canInstallFailure.unfulfilledRoleRequirements
                            );
                        } else {
                            return Fail({
                                failureType: failures.CanInstallFailed,
                                message: `The plugin '${pluginFactory.name}' cannot be installed.`,
                                innerFailure: canInstallFailure,
                                innerFailureTypes: pluginSystem.canInstallWith.failures,
                                pluginFactory
                            });
                        }
                    }
                });
            };

            return collectResultArray(pluginFactories, function (pluginFactory) {
                return tryAddToInstall(pluginFactory, []);
            })
            .map(function (_) {
                return toInstall;
            });
        })
        .andThen(function (pluginFactories) {
            return collectResultArray(pluginFactories, function (pluginFactory) {
                return pluginSystem.install(pluginFactory).mapFail(function (installFailure) {
                    return {
                        failureType: failures.InstallFailed,
                        message: `Installing the plugin '${pluginFactory.name}' failed.`,
                        innerFailure: installFailure,
                        innerFailureTypes: pluginSystem.install.failures,
                        pluginFactory
                    }
                });
            });
        })
        .map(function (_exports) {
            return undefined;
        });
    };

    use.failures = failures.use;

    function load (data) {
        const path = data[0];
        const name = data[1];

        const instance = require(path);
        
        // NOTE(Havvy): Non-objects / null values will be caught in canInstall.
        //              As such, we just ignore that they are wrong here. 
        if (typeof instance === "object" && instance !== null) {
            if (instance.name === undefined) {
                // (Havvy): Should this be deprecated?
                instance.name = name;
            } else if (instance.name !== name) {
                return new Fail({
                    failureType: failures.InconsistentlyNamedPlugin,
                    message: `Tried to load plugin '${name}'. Loaded plugin named '${instance.name}' instead.`,
                    path
                });
            }
        }

        return Ok(instance);
    }

    function locate (name, path) {
        let filepath;
        const paths = parentPaths(path);

        for (let ix = 0; ix < paths.length; ix++) {
            const cursor = paths[ix];

            filepath = resolvepath(cursor, format("%s_plugins", systemname), name);
            if (exists(filepath)) return Ok(filepath);

            filepath = resolvepath(cursor, "node_modules", systemname + "-" + name);
            if (exists(filepath)) return Ok(filepath);
        }

        return Fail({
            failureType: failures.CannotFindPlugin,
            message: format("Failed to locate plugin '%s'", name),
            name,
            paths
        });
    }

    function parentPaths (path) {
        const res = [];
        let there = path;

        while (there !== root) {
            res.push(there);
            there = resolvepath(there, "../");
        }

        res.push(root);

        return res;
    }

    return {
        use,
    }
};