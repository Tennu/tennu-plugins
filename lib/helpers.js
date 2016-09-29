const Result = require("r-result");
const Ok = Result.Ok;
const Fail = Result.Fail;

const zip = function () {
    const arrays = Array.prototype.slice.call(arguments);

    const res = [];

    if (arrays.length === 0) {
        return res;
    }

    arrays[0].forEach(function (_element, ix) {
        res.push(arrays.map(function (array) {
            return array[ix];
        }));
    });

    return res;
};

/// Fn([T], Fn(T) -> Result<U, F>) -> Result<[U], F>
const collectResultArray = function (array, mapperIntoResult) {
    return array.reduce(function (mapResult, element) {
        return mapResult.andThen(function (mapped) {
            const singleResult = mapperIntoResult(element);

            return singleResult.andThen(function (mappedElement) {
                mapped.push(mappedElement);
                // NOTE(Havvy): Logically, we should return Ok(mapped) here,
                //              but that's what mapResult is at this point,
                //              because we pushed to the array in contains
                //              instead of creating a brand new value to be wrapped.
                //              So to avoid creating `array.length` Ok() values,
                //              this just lets us reuse one value.
                return mapResult;
            });
        });
    }, Ok([]));
}

// Binds the last `n` arguments of a function where `n` is the length of `args`.
const bindr = function (fn, args) {
    return function () {
        return fn.apply(null, Array.prototype.slice.call(arguments).concat(args));
    };
};

// Prefixes the type of the value with an 'a' when applicable.
// Also treats arrays differently from other objects, because, you know...
const aType = function (value) {
    if (value === null) {
        return "null";
    }

    if (value === undefined) {
        return undefined;
    }

    if (Array.isArray(value)) {
        return "an array";
    }

    const type = typeof value;

    if (type === "object") {
        return "an object";
    } else {
        return `a ${type}`;
    }
};

module.exports = {
    zip, collectResultArray, bindr, aType
};

