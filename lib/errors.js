// Thrown when a module cannot be loaded because another module cannot be loaded.
function UnmetDependency (message) {
    this.message = message;
    this.stack = new Error().stack;
};

UnmetDependency.prototype = Object.create(Error.prototype);
UnmetDependency.prototype.constructor = UnmetDependency;

// Thrown when a module cannot be found.
function NoSuchPlugin (message, name, paths) {
    UnmetDependency.call(this, message);
    this.name = name;
    this.paths = paths;
};

NoSuchPlugin.prototype = Object.create(UnmetDependency.prototype);
NoSuchPlugin.prototype.constructor = NoSuchPlugin;

// Thrown when a module known only by its role cannot be found.
function NoSuchRole (message, role) {
    UnmetDependency.call(this, message);
    this.role = role;
};

NoSuchRole.prototype = Object.create(UnmetDependency.prototype);
NoSuchRole.prototype.constructor = NoSuchRole;

// Thrown when multiple modules depend upon each other.
function CyclicicDependency (message, names) {
    UnmetDependency.call(this, message);
    this.names = names;
};

CyclicicDependency.prototype = Object.create(UnmetDependency.prototype);
CyclicicDependency.prototype.constructor = CyclicicDependency;

// Thrown when a module cannot be initialized.
function PluginInitializationError (message, module) {
    this.message = message;
    this.stack = new Error().stack;
    this.module = module;
};

PluginInitializationError.prototype = Object.create(Error.prototype);
PluginInitializationError.prototype.constructor = PluginInitializationError;

function RegistryKeyAlreadySet (message) {
    this.message = message;
    this.stack = new Error().stack;
};

RegistryKeyAlreadySet.prototype = Object.create(Error.prototype);
RegistryKeyAlreadySet.prototype.constructor = RegistryKeyAlreadySet;

// Thrown when a module tries to define an already existing hook.
function HookAlreadyExists (message, hook) {
    RegistryKeyAlreadySet.call(this, message);
    this.hook = hook;
};

HookAlreadyExists.prototype = Object.create(RegistryKeyAlreadySet.prototype);
HookAlreadyExists.prototype.constructor = HookAlreadyExists;

function RoleAlreadyExists (message, role) {
    RegistryKeyAlreadySet.call(this);
    this.role = role;
};

RoleAlreadyExists.prototype = Object.create(RegistryKeyAlreadySet.prototype);
RoleAlreadyExists.prototype.constructor = RoleAlreadyExists;

function PluginAlreadyExists (message, role) {
    RegistryKeyAlreadySet.call(this);
    this.role = role;
};

PluginAlreadyExists.prototype = Object.create(RegistryKeyAlreadySet.prototype);
PluginAlreadyExists.prototype.constructor = PluginAlreadyExists;

module.exports = {
    UnmetDependency: UnmetDependency,
    NoSuchPlugin: NoSuchPlugin,
    NoSuchRole: NoSuchRole,
    CyclicicDependency: CyclicicDependency,
    PluginInitializationError: PluginInitializationError,
    RegistryKeyAlreadySet: RegistryKeyAlreadySet,
    HookAlreadyExists: HookAlreadyExists,
    PluginAlreadyExists: PluginAlreadyExists
};