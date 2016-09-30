"use strict";

const format = require('util').format;

const Result = require("r-result");
const Ok = Result.Ok;
const Fail = Result.Fail;

const Registry = require("./registry");

const failures = require("./failures");

const helpers = require("./helpers");
const aType = helpers.aType;

const PluginSystem = function (context) {
    const plugins = Registry();
    const roles = Registry();
    const beforeInitHooks = Registry();
    const afterInitHooks = Registry();

    // Fn(hook: String | Symbol, fn: Fn(any) -> void) -> void
    const addAfterInitHook = function addAfterInitHook (hook, fn) {
        if (!(typeof hook === "string" || typeof hook === "symbol")) {
            throw new TypeError(`Hook's name must be string or symbol. Given ${atype(hook)} instead.`);
        }

        if (typeof fn !== "function") {
            throw new TypeError(`Hook's function argument is not a function. Given ${atype(fn)} instead.`);
        }

        const setAfterInitHookResult = afterInitHooks.set(hook, fn);

        return setAfterInitHookResult.mapFail(function (failure) {
            // NOTE(Havvy): Assuming that Registry.set only ever returns on failure type here.
            return {
                failureType: failures.AfterInitHookAlreadyExists,
                message: `Tried to set afterInit hook '${hook}', but a plugin already has that afterInit hook.`,
                hook
            };
        });
    };

    addAfterInitHook.failures = failures.addAfterInitHook;

    // Fn(hook: String | Symbol, fn: Fn(any) -> void) -> void
    const addBeforeInitHook = function addBeforeInitHook (hook, fn) {
        const failures = addBeforeInitHook.failures;

        if (!(typeof hook === "string" || typeof hook === "symbol")) {
            throw new TypeError("Hook's name must be string or symbol. Given ${atype(hook)} instead.")
        }

        if (typeof fn !== "function") {
            throw new TypeError("Hook's function argument is not a function. Given ${atype(fn)} instead.");
        }

        const setBeforeInitHookResult = beforeInitHooks.set(hook, fn)

        return setBeforeInitHookResult.mapFail(function (failure) {
            return {
                failureType: failures.BeforeInitHookAlreadyExists,
                message: `Tried to set beforeInit hook '${hook}', but a plugin already has that beforeInit hook.`,
                hook
            };
        });
    }

    addBeforeInitHook.failures = failures.addBeforeInitHook;

    // Fn(PluginFactory) -> Result<PluginFactory, InvalidPluginFactoryReason>
    const validatePluginFactory = function validatePluginFactory (pluginFactory) {
        const failures = validatePluginFactory.failures;

        if (typeof pluginFactory !== "object" || pluginFactory === null) {
            return Fail({
                failureType: failures.NotAnObject,
                message: `PluginFactory must be an object. Was given ${aType(pluginFactory)} instead.`
            });
        }

        if (typeof pluginFactory.name !== "string") {
            return Fail({
                failureType: failures.NameNotAString,
                message: `PluginFactory 'name' property must be a string. Was given ${aType(pluginFactory.name)} instead.`
            });
        }

        const role = pluginFactory.role;
        if (["string", "undefined"].indexOf(typeof role) === -1) {
            return Fail({
                failureType: failures.RoleNotAString,
                message: `PluginFactory 'role' property must be a string or not defined when the plugin does not declare a role. Was given ${aType(pluginFactory.role)} instead.`,
            });
        }

        const requires = pluginFactory.requires;
        if (!Array.isArray(requires) && typeof requires !== "undefined") {
            return Fail({
                failureType: failures.RequiresNotAnArray,
                message: `PluginFactory 'requires' property must be an array of strings (the required plugins' names) or not defined when the plugin does not require other plugins. Was given ${aType(pluginFactory.requires)} instead.`,
            });
        }

        const requiresRoles = pluginFactory.requiresRoles;
        if (!Array.isArray(requiresRoles) && typeof requiresRoles !== "undefined") {
            return Fail({
                failureType: failures.RequiresRolesNotAnArray,
                message: `PluginFactory 'requiresRoles' property must be an array of strings (the required roles' names) or not defined when the plugin does not require other roles. Was given ${aType(PluginFactory.requiresRoles)} instead.`,
            });
        }

        return Ok(pluginFactory)
    };

    validatePluginFactory.failures = failures.validatePluginFactory;

    // canInstall(pluginFactory: PluginFactory)) -> Result<PluginFactory, CannotInstallReason>
    const canInstall = function canInstall (pluginFactory) {
        return canInstallWith(pluginFactory, []);
    }

    canInstall.failures = failures.canInstall;

    // canInstallWith(pluginFactory: PluginFactory, assumedPlugins: [PluginFactory]) -> Result<PluginFactory, CannotInstallReason>
    // Says if a plugin could be installed if we also assumed the Plugins in
    // the second list were also installed.
    // WHY(Havvy): This function is used by `use` in loader.js because we want
    //             to know which plugins cannot be installed due to missing
    //             dependencies that aren't in the list passed to `use`.
    const canInstallWith = function canInstallWith (pluginFactory, assumedPlugins) {
        const failures = canInstallWith.failures;

        if (plugins.has(pluginFactory.name) || assumedPlugins.some(function (assumedPluginFactory) {
            return assumedPluginFactory.name === pluginFactory.name;
        })) {
            return Fail({
                failureType: failures.PluginAlreadyInstalled,
                message: `A plugin with the name '${pluginFactory.name}' has already been installed.`
            })
        }

        if (pluginFactory.role) {
            if (roles.has(pluginFactory.role)) {
                return Fail({
                    failureType: failures.RoleAlreadyInstalled,
                    message: `A plugin with the role '${pluginFactory.role}' has already been installed.`
                    // Can't actually get the name of the plugin at this point
                    // without changing the system to store that map...
                })
            }

            const maybePlugin = assumedPlugins.find(function (assumedPluginFactory) {
                return pluginFactory.role === assumedPluginFactory.role;
            });

            if (maybePlugin !== undefined) {
                return Fail({
                    failureType: failures.RoleAlreadyInstalled,
                    message: `The plugins '${pluginFactory.name}' and '${maybePlugin.name}' both want to install the role '${pluginFactory.role}'.`,
                });
            }
        }

        if (pluginFactory.requires) {
            const unfulfilledRequirements = pluginFactory.requires.filter(function (requirement) {
                return !plugins.has(requirement) && !assumedPlugins.some(function (pluginFactory) {
                    return pluginFactory.name === requirement;
                });
            });

            if (unfulfilledRequirements.length > 0) {
                return Fail({
                    failureType: failures.UnfulfilledPluginDependencies,
                    message: `Unfulfilled required plugins. Please provide these plugins first: ${unfulfilledRequirements.join(", ")}`,
                    unfulfilledRequirements
                });
            }
        }

        if (pluginFactory.requiresRoles) {
            const unfulfilledRoleRequirements = pluginFactory.requiresRoles.filter(function (requirement) {
                return !roles.has(requirement)&& !assumedPlugins.some(function (assumedPluginFactory) {
                    return assumedPluginFactory.role === requirement;
                });
            });

            if (unfulfilledRoleRequirements.length > 0) {
                return Fail({
                    failureType: failures.UnfulfilledRoleDependencies,
                    message: `Unfulfilled required roles. Please provide these roles first: ${unfulfilledRoleRequirements.join(", ")}`,
                    unfulfilledRoleRequirements
                });
            }
        }

        return Ok(pluginFactory);
    };

    canInstallWith.failures = failures.canInstall;

    const dependencies = function dependencies (pluginFactory) {
        var res = {};

        if (pluginFactory.requires) {
            pluginFactory.requires.forEach(function (dependency) {
                res[dependency] = plugins.get(dependency).exports;
            });
        }

        if (pluginFactory.requiresRoles) {
            pluginFactory.requiresRoles.forEach(function (role) {
                res[role] = roles.get(role).exports;
            });
        }

        return res;
    }

    const install = function install (pluginFactory) {
        return canInstall(pluginFactory).match({
            Ok(pluginFactory) {
                return unsafeInstall(pluginFactory);
            },

            Fail(cannotInstallReason) {
                return Fail({
                    failureType: failures.install.CanInstallFailed,
                    message: `The plugin '${pluginFactory.name}' cannot be installed.`,
                    innerFailure: cannotInstallReason,
                    innerFailureTypes: canInstall.failures,
                    pluginFactory
                });
            }
        });
    };

    install.failures = failures.install;

    // NOTE(Havvy): This is unsafe specifically because it does not
    //              first check that the pluginFactory can be installed
    //              into the system.
    function unsafeInstall (pluginFactory) {
        const failures = unsafeInstall.failures;

        // Apply beforeInit hooks.
        beforeInitHooks.forEach(function (hook, fn) {
            if (pluginFactory.hasOwnProperty(hook)) {
                fn(pluginFactory.name, pluginFactory[hook]);
            }
        });

        // Create plugin.
        const plugin = pluginFactory.init(context, dependencies(pluginFactory));

        if (typeof plugin !== "object" || plugin === null) {
            return Fail({
                failureType: failures.PluginNotAnObject,
                message: `Plugin '${pluginFactory.name}' must be an object. Init function returned \`${String(plugin)}\`, ${aType(plugin)}, instead.`,
                pluginFactory
            });
        }

        // Add afterInit hooks.
        // NOTE(Havvy): This is deprecated, but most plugins use it.
        if (plugin.hooks) {
            const addAfterInitHooksResult = Object.keys(plugin.hooks)
            .reduce(function (addAfterInitHookResult, hook) {
                return addAfterInitHookResult.andThen(function () {
                    return addAfterInitHook(hook, plugin.hooks[hook])
                });
            }, Ok());

            if (addAfterInitHooksResult.isFail()) {
                return addAfterInitHooksResult;
            }
        }

        if (plugin.afterInitHooks) {
            const addAfterInitHooksResult = Object.keys(plugin.afterInitHooks)
            .reduce(function (addAfterInitHookResult, hook) {
                return addAfterInitHookResult.andThen(function () {
                    return addAfterInitHook(hook, plugin.afterInitHooks[hook])
                });
            }, Ok());

            if (addAfterInitHooksResult.isFail()) {
                return addAfterInitHooksResult;
            }
        }

        // Add beforeInit hooks.
        if (plugin.beforeInitHooks) {
            const addBeforeInitHooksResult = Object.keys(plugin.beforeInitHooks)
            .reduce(function (addBeforeInitHookResult, hook) {
                return addBeforeInitHookResult.andThen(function () {
                    return addBeforeInitHook(hook, plugin.beforeInitHooks[hook])
                });
            }, Ok());

            if (addBeforeInitHooksResult.isFail()) {
                return addBeforeInitHooksResult;
            }
        }

        // NOTE(Havvy): This is deprecated, but no point not allowing it.
        if (plugin.staticHooks) {
            const addBeforeInitHooksResult = Object.keys(plugin.staticHooks)
            .reduce(function (addBeforeInitHookResult, hook) {
                return addBeforeInitHookResult.andThen(function () {
                    return addBeforeInitHook(hook, plugin.staticHooks[hook])
                });
            }, Ok());

            if (addBeforeInitHooksResult.isFail()) {
                return addBeforeInitHooksResult;
            }
        }

        // Apply afterInit hooks.
        afterInitHooks.forEach(function (hook, fn) {
            if (plugin.hasOwnProperty(hook)) {
                fn(pluginFactory.name, plugin[hook]);
            }
        });

        // Register plugin.
        // Note(Havvy): These cannot return a Fail() because
        // `canInstall` would have already said so.
        plugins.set(pluginFactory.name, plugin);
        if (pluginFactory.role) {
            roles.set(pluginFactory.role, plugin);
        }

        return Ok(plugin.exports);
    }

    unsafeInstall.failures = failures.install;

    const pluginExportsOf = function pluginExportsOf (name) {
        if (plugins.has(name)) {
            return Ok(plugins.get(name).exports);
        } else {
            return Fail({
                failureType: pluginExportsOf.failures.PluginNotInstalled,
                message: `Cannot get exports from '${name}'. Plugin not installed.`,
                name
            });
        }
    };

    pluginExportsOf.failures = failures.pluginExportsOf;

    const roleExportsOf = function roleExportsOf (name) {
        if (roles.has(name)) {
            return Ok(roles.get(name).exports);
        } else {
            return Fail({
                failureType: failures.roleExportsOf.RoleNotInstalled,
                message: `Cannot get exports from role '${name}'. Role not installed.`,
                name
            });
        }
    };

    roleExportsOf.failures = failures.roleExportsOf;

    return {
        install: install,
        unsafeInstall: unsafeInstall,
        validatePluginFactory: validatePluginFactory,
        canInstall: canInstall,
        canInstallWith: canInstallWith,
        hasPlugin: plugins.has,
        hasRole: roles.has,
        pluginExportsOf: pluginExportsOf,
        roleExportsOf: roleExportsOf,
        loadedNames: plugins.keys,
        addAfterInitHook: addAfterInitHook,
        addBeforeInitHook: addBeforeInitHook
    };
}

module.exports = PluginSystem;