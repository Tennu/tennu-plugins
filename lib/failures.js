const CanInstallFailed = Symbol("CanInstallFailed");
const InstanceHookAlreadyExists = Symbol("InstanceHookAlreadyExists");
const StaticHookAlreadyExists = Symbol("StaticHookAlreadyExists");

module.exports = Object.freeze({
    // registry (private)
    RegistryKeyAlreadySet: Symbol("RegistryKeyAlreadySet"),

    validatePluginFactory: Object.freeze({
        NotAnObject: Symbol("NotAnObject"),
        NameNotAString: Symbol("NameNotAString"),
        RequiresNotAnArray: Symbol("RequiresNotAnArray"),
        RequiresRolesNotAnArray: Symbol("RequiresRolesNotAnArray"),
        RoleNotAString: Symbol("RoleNotAString"),
    }),

    canInstall: Object.freeze({
        UnfulfilledPluginDependencies: Symbol("UnfulfilledPluginDependencies"),
        UnfulfilledRoleDependencies: Symbol("UnfulfilledRoleDependencies"),
        PluginAlreadyInstalled: Symbol("PluginAlreadyInstalled"),
        RoleAlreadyInstalled: Symbol("RoleAlreadyInstalled")
    }),

    install: Object.freeze({
        CanInstallFailed: CanInstallFailed,
        PluginNotAnObject: Symbol("PluginNotAnObject"),
        InstanceHookAlreadyExists,
        StaticHookAlreadyExists
    }),

    use: Object.freeze({
        CannotFindPlugin: Symbol("CannotFindPlugin"),
        InconsistentlyNamedPlugin: Symbol("InconsistentlyNamedPlugin"),
        UnmetDependency: Symbol("UnmetDependency"),
        CyclicicDependency: Symbol("CyclicicDependency"),
        ValidatePluginFactoryFailed: Symbol("ValidatePluginFactoryFailed"),
        CanInstallFailed: CanInstallFailed,
        InstallFailed: Symbol("InstallFailed")
    }),

    pluginExportsOf: Object.freeze({
        PluginNotInstalled: Symbol("PluginNotInstalled")
    }),

    roleExportsOf: Object.freeze({
        RoleNotInstalled: Symbol("RoleNotInstalled")
    }),

    addInstanceHook: Object.freeze({
        InstanceHookAlreadyExists
    }),

    addStaticHook: Object.freeze({
        StaticHookAlreadyExists
    })
});