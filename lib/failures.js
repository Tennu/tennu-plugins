module.exports = Object.freeze({
    // registry (private)
    RegistryKeyAlreadySet: Symbol("RegistryKeyAlreadySet"),

    // use
    NoSuchPlugin: Symbol("NoSuchPlugin"),
    UnmetDependency: Symbol("UnmetDependency"),
    InconsistentlyNamedPlugin: Symbol("InconsistentlyNamedPlugin"),
    CyclicicDependency: Symbol("CyclicicDependency"),

    // initialize
    CannotInitialize: Symbol("CannotInitialize"),
    PluginNotAnObject: Symbol("PluginNotAnObject"),
    InstanceHookAlreadyExists: Symbol("InstanceHookAlreadyExists"),
    StaticHookAlreadyExists: Symbol("StaticHookAlreadyExists"),

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