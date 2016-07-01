// This is a bare plugin.
// It has a `name` that is the name of the plugin.
// It also has an `init` function that returns a plugin instance.
// A plugin instance has no actual required properties, so the plugin instance is an empty object.

module.exports = {
    name: "bare",
    init: function () {
        return {
        };
    },
};