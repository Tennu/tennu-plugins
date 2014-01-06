const System = require('./modules.js');
const Loader = require('./loader.js');
const errors = require('./errors.js');
const fs = require('fs');

const TennuModules = function (systemname, context) {
    const system = System(context);
    const loader = Loader(system, fs, require, systemname);

    return {
        use: loader.use,
        initialize: system.initialize,
        isInitializable: system.isInitializable,
        hasRole: system.hasRole,
        hasModule: system.hasModule,
        addHook: system.addHook
    };
};

[
    'UnmetDependency',
    'NoSuchModule',
    'NoSuchRole',
    'CyclicicDependency',
    'ModuleInitializationError',
    'RegistryKeyAlreadySet',
    'HookAlreadyExists',
    'RoleAlreadyExists',
    'ModuleAlreadyExists'
].forEach(function (error) {
    TennuModules[error] = errors[error];
});

module.exports = TennuModules;