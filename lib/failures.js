module.exports = Object.freeze({
    // registry (private)
    RegistryKeyAlreadySet: Symbol("RegistryKeyAlreadySet"),

    // use
    CannotFindPlugin: Symbol("CannotFindPlugin"),
    UnmetDependency: Symbol("UnmetDependency"),
    InconsistentlyNamedPlugin: Symbol("InconsistentlyNamedPlugin"),
    CyclicicDependency: Symbol("CyclicicDependency"),

    // initialize
    CannotInstall: Symbol("CannotInstall"),
    PluginNotAnObject: Symbol("PluginNotAnObject"),
    InstanceHookAlreadyExists: Symbol("InstanceHookAlreadyExists"),
    StaticHookAlreadyExists: Symbol("StaticHookAlreadyExists"),

    // pluginExportsOf
    PluginNotInstalled: Symbol("PluginNotInstalled"),

    // roleExportsOf
    RoleNotInstalled: Symbol("RoleNotInstalled"),

    // validatePlugin
    validation: Object.freeze({
        NotAnObject: Symbol("NotAnObject"),
        NameNotAString: Symbol("NameNotAString"),
        RequiresNotAnArray: Symbol("RequiresNotAnArray"),
        RequiresRolesNotAnArray: Symbol("RequiresRolesNotAnArray"),
        UnfulfilledPluginDependencies: Symbol("UnfulfilledPluginDependencies"),
        UnfulfilledRoleDependencies: Symbol("UnfulfilledRoleDependencies"),
        PluginAlreadyExists: Symbol("PluginAlreadyExists"),
        RoleNotAString: Symbol("RoleNotAString"),
        RoleAlreadyExists: Symbol("RoleAlreadyExists")
    })
});