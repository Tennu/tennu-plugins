const fs = require("fs");

const System = require("./plugins.js");
const Loader = require("./loader.js");
const failures = require("./failures.js");

const TennuPluginSystem = function (systemname, context) {
    const system = System(context);
    const loader = Loader(system, fs, require, systemname);

    return {
        use: loader.use,

        // Deprecated(Havvy): Use install instead.
        initialize: system.install,

        // Deprecated(Havvy): Use canInstall instead.
        isInitializable: system.canInstall,
        
        install: system.install,
        canInstall: system.canInstall,
        hasRole: system.hasRole,
        hasPlugin: system.hasPlugin,
        getPlugin: system.pluginExportsOf,
        getRole: system.roleExportsOf,

        // Deprecated(Havvy): Use addAfterInitHook instead.
        addHook: system.addAfterInitHook,

        // Deprecated(Havvy): Use addAfterInitHook instead.
        addInstanceHook: system.addAfterInitHook,

        // Deprecated(Havvy): Use addBeforeInitHook instead.
        addStaticHook: system.addBeforeInitHook,

        addAfterInitHook: system.addAfterInitHook,
        addBeforeInitHook: system.addBeforeInitHook,
        failures: failures
    };
};

TennuPluginSystem.failures = failures;

module.exports = TennuPluginSystem;