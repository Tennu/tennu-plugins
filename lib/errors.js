// Thrown when a module cannot be loaded because another module cannot be loaded.
const UnmetDependency = function (message) {
    Error.call(this, message);
};

UnmetDependency.prototype = new Error();

// Thrown when a module cannot be found.
const NoSuchModule = function (message, name, paths) {
    UnmetDependency.call(this, message);
    this.name = name;
    this.paths = paths;
};

NoSuchModule.prototype = new UnmetDependency();

// Thrown when a module known only by its role cannot be found.
const NoSuchRole = function (message, role) {
    UnmetDependency.call(this, message);
    this.role = role;
};

NoSuchRole.prototype = new UnmetDependency();

// Thrown when multiple modules depend upon each other.
const CyclicicDependency = function (message, names) {
    UnmetDependency.call(this, message);
    this.names = names;
};

CyclicDependency.prototype = new UnmetDependency();

// Thrown when a module cannot be initialized.
const ModuleInitializationError = function (message, module) {
    Error.call(this, message);
    this.module = module;
};

ModuleInitializationError.prototype = new Error();

const RegistryKeyAlreadySet = function (message) {
    Error.call(this, message);
};

RegistryKeyAlreadySet.prototype = new Error();

// Thrown when a module tries to define an already existing hook.
const HookAlreadyExists = function(message, hook) {
    RegistryKeyAlreadySet.call(this, message);
    this.hook = hook;
};

HookAlreadyExists.prototype = new RegistryKeyAlreadySet();

const RoleAlreadyExists = function (message, role) {
    RegistryKeyAlreadySet.call(this);
    this.role = role;
};

RoleAlreadyExists.prototype = new RegistryKeyAlreadySet();

module.exports = {
    UnmetDependency: UnmetDependency,
    NoSuchModule: NoSuchModule,
    NoSuchRole: NoSuchRole,
    CyclicicDependency: CyclicicDependency,
    ModuleInitializationError: ModuleInitializationError,
    RegistryKeyAlreadySet: RegistryKeyAlreadySet
    HookAlreadyExists: HookAlreadyExists
};