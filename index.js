'use strict'

function isArguments (obj) {
  return Object.prototype.toString.call(obj) === '[object Arguments]'
}

module.exports = match

function match (obj, pattern) {
  return match_(obj, pattern, [], [])
}

try {
  match.fastEqual = require('buffertools').equals
} catch (e) {
  // whoops, nobody told buffertools it wasn't installed
}

/**
1. If the object is a string, and the pattern is a RegExp, then return
   true if `pattern.test(object)`.
2. Use loose equality (`==`) only for all other value types
   (non-objects).  `tmatch` cares more about shape and contents than
   type. This step will also catch functions, with the useful
   (default) property that only references to the same function are
   considered equal.  'Ware the halting problem!
3. `null` *is* an object – a singleton value object, in fact – so if
   either is `null`, return object == pattern.
4. Since the only way to make it this far is for `object` or `pattern`
   to be an object, if `object` or `pattern` is *not* an object,
   they're clearly not a match.
5. It's much faster to compare dates by numeric value (`.getTime()`)
   than by lexical value.
6. Compare RegExps by their components, not the objects themselves.
7. The parts of an arguments list most people care about are the
   arguments themselves, not the callee, which you shouldn't be
   looking at anyway.
8. Objects are more complex:
   1. Return `true` if `object` and `pattern` both have no properties.
   2. Ensure that cyclical references don't blow up the stack.
   3. Ensure that all the key names in `pattern` exist in `object`.
   4. Ensure that all of the associated values match, recursively.
*/

function match_ (obj, pattern, ca, cb) {
  /*eslint eqeqeq:0*/
  if (typeof obj !== 'object' && typeof pattern !== 'object' && obj == pattern) {
    return true

  } else if (obj === null || pattern === null) {
    return obj == pattern

  } else if (typeof obj === 'string' && pattern instanceof RegExp) {
    return pattern.test(obj)

  } else if (typeof obj !== 'object' || typeof pattern !== 'object') {
    return false

  } else if (Buffer.isBuffer(obj) && Buffer.isBuffer(pattern)) {
    if (obj.equals) {
      return obj.equals(pattern)
    } else if (match.fastEqual) {
      return match.fastEqual.call(obj, pattern)
    } else {
      if (obj.length !== pattern.length) return false

      for (var j = 0; j < obj.length; j++) if (obj[j] != pattern[j]) return false

      return true
    }

  } else if (obj instanceof Date && pattern instanceof Date) {
    return obj.getTime() === pattern.getTime()

  } else if (obj instanceof RegExp && pattern instanceof RegExp) {
    return obj.source === pattern.source &&
    obj.global === pattern.global &&
    obj.multiline === pattern.multiline &&
    obj.lastIndex === pattern.lastIndex &&
    obj.ignoreCase === pattern.ignoreCase

  } else if (isArguments(obj) || isArguments(pattern)) {
    var slice = Array.prototype.slice
    return match_(slice.call(obj), slice.call(pattern), ca, cb)

  } else {
    // both are objects.  interesting case!
    var kobj = Object.keys(obj)
    var kpat = Object.keys(pattern)

    // don't bother with stack acrobatics if there's nothing there
    if (kobj.length === 0 && kpat.length === 0) return true

    // ok for the object to have extra fields, but not the pattern
    if (kobj.length < kpat.length) return false

    // if we've seen this exact pattern and object already, then
    // it means that pattern and obj have matching cyclicalness
    // however, non-cyclical patterns can match cyclical objects
    var cal = ca.length
    while (cal--) if (ca[cal] === obj && cb[cal] === pattern) return true
    ca.push(obj); cb.push(pattern)

    var key
    for (var l = kpat.length - 1; l >= 0; l--) {
      key = kpat[l]
      if (!match_(obj[key], pattern[key], ca, cb)) return false
    }

    ca.pop(); cb.pop()

    return true
  }
}