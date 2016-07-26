module.exports = Object.freeze({
    UnmetDependency: Symbol("UnmetDependency"),
    InconsistentlyNamedPlugin: Symbol("InconsistentlyNamedPlugin"),
    NoSuchPlugin: Symbol("NoSuchPlugin"),
    NoSuchRole: Symbol("NoSuchRole"),
    CyclicicDependency: Symbol("CyclicicDependency"),
    CannotInitialize: Symbol("CannotInitialize"),
    RegistryKeyAlreadySet: Symbol("RegistryKeyAlreadySet"),
    InstanceHookAlreadyExists: Symbol("InstanceHookAlreadyExists"),
    StaticHookAlreadyExists: Symbol("StaticHookAlreadyExists"),
    PluginAlreadyExists: Symbol("PluginAlreadyExists"),
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