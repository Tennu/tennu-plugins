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
        PluginFactoryNotAnObject: Symbol("PluginFactoryNotAnObject"),
        PluginRequiresNotAnArray: Symbol("RequiresNotAnArray"),
        PluginRequiresRolesNotAnArray: Symbol("RequiresRolesNotAnArray"),
        HasUnfulfilledPluginDependencies: Symbol("HasUnfulfilledPluginDependencies"),
        HasUnfulfilledRoleDependencies: Symbol("HasUnfulfilledRoleDependencies"),
        NameNotAString: Symbol("NameNotAString"),
        PluginAlreadyExists: Symbol("PluginAlreadyExists"),
        RoleNotAString: Symbol("RoleNotAString"),
        RoleAlreadyExists: Symbol("RoleAlreadyExists")
    })
});