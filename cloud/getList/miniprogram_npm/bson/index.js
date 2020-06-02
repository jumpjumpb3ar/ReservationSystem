module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { __MODS__[modId].m.exports.__proto__ = m.exports.__proto__; Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; var desp = Object.getOwnPropertyDescriptor(m.exports, k); if(desp && desp.configurable) Object.defineProperty(m.exports, k, { set: function(val) { __MODS__[modId].m.exports[k] = val; }, get: function() { return __MODS__[modId].m.exports[k]; } }); }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1583600334720, function(require, module, exports) {


const Buffer = require('buffer').Buffer;
const Map = require('./map');
const Long = require('./long');
const Double = require('./double');
const Timestamp = require('./timestamp');
const ObjectId = require('./objectid');
const BSONRegExp = require('./regexp');
const BSONSymbol = require('./symbol');
const Int32 = require('./int_32');
const Code = require('./code');
const Decimal128 = require('./decimal128');
const MinKey = require('./min_key');
const MaxKey = require('./max_key');
const DBRef = require('./db_ref');
const Binary = require('./binary');
const constants = require('./constants');
const EJSON = require('./extended_json');

// Parts of the parser
const internalDeserialize = require('./parser/deserializer');
const internalSerialize = require('./parser/serializer');
const internalCalculateObjectSize = require('./parser/calculate_size');
const ensureBuffer = require('./ensure_buffer');

/**
 * @ignore
 */
// Default Max Size
const MAXSIZE = 1024 * 1024 * 17;

// Current Internal Temporary Serialization Buffer
let buffer = Buffer.alloc(MAXSIZE);

/**
 * Sets the size of the internal serialization buffer.
 *
 * @method
 * @param {number} size The desired size for the internal serialization buffer
 */
function setInternalBufferSize(size) {
  // Resize the internal serialization buffer if needed
  if (buffer.length < size) {
    buffer = Buffer.alloc(size);
  }
}

/**
 * Serialize a Javascript object.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} [options.checkKeys] the serializer will check if keys are valid.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @return {Buffer} returns the Buffer object containing the serialized object.
 */
function serialize(object, options) {
  options = options || {};
  // Unpack the options
  const checkKeys = typeof options.checkKeys === 'boolean' ? options.checkKeys : false;
  const serializeFunctions =
    typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
  const ignoreUndefined =
    typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : true;
  const minInternalBufferSize =
    typeof options.minInternalBufferSize === 'number' ? options.minInternalBufferSize : MAXSIZE;

  // Resize the internal serialization buffer if needed
  if (buffer.length < minInternalBufferSize) {
    buffer = Buffer.alloc(minInternalBufferSize);
  }

  // Attempt to serialize
  const serializationIndex = internalSerialize(
    buffer,
    object,
    checkKeys,
    0,
    0,
    serializeFunctions,
    ignoreUndefined,
    []
  );

  // Create the final buffer
  const finishedBuffer = Buffer.alloc(serializationIndex);

  // Copy into the finished buffer
  buffer.copy(finishedBuffer, 0, 0, finishedBuffer.length);

  // Return the buffer
  return finishedBuffer;
}

/**
 * Serialize a Javascript object using a predefined Buffer and index into the buffer, useful when pre-allocating the space for serialization.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Buffer} buffer the Buffer you pre-allocated to store the serialized BSON object.
 * @param {Boolean} [options.checkKeys] the serializer will check if keys are valid.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @param {Number} [options.index] the index in the buffer where we wish to start serializing into.
 * @return {Number} returns the index pointing to the last written byte in the buffer.
 */
function serializeWithBufferAndIndex(object, finalBuffer, options) {
  options = options || {};
  // Unpack the options
  const checkKeys = typeof options.checkKeys === 'boolean' ? options.checkKeys : false;
  const serializeFunctions =
    typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
  const ignoreUndefined =
    typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : true;
  const startIndex = typeof options.index === 'number' ? options.index : 0;

  // Attempt to serialize
  const serializationIndex = internalSerialize(
    buffer,
    object,
    checkKeys,
    0,
    0,
    serializeFunctions,
    ignoreUndefined
  );
  buffer.copy(finalBuffer, startIndex, 0, serializationIndex);

  // Return the index
  return startIndex + serializationIndex - 1;
}

/**
 * Deserialize data as BSON.
 *
 * @param {Buffer} buffer the buffer containing the serialized set of BSON documents.
 * @param {Object} [options.evalFunctions=false] evaluate functions in the BSON document scoped to the object deserialized.
 * @param {Object} [options.cacheFunctions=false] cache evaluated functions for reuse.
 * @param {Object} [options.cacheFunctionsCrc32=false] use a crc32 code for caching, otherwise use the string of the function.
 * @param {Object} [options.promoteLongs=true] when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 * @param {Object} [options.promoteBuffers=false] when deserializing a Binary will return it as a node.js Buffer instance.
 * @param {Object} [options.promoteValues=false] when deserializing will promote BSON values to their Node.js closest equivalent types.
 * @param {Object} [options.fieldsAsRaw=null] allow to specify if there what fields we wish to return as unserialized raw buffer.
 * @param {Object} [options.bsonRegExp=false] return BSON regular expressions as BSONRegExp instances.
 * @param {boolean} [options.allowObjectSmallerThanBufferSize=false] allows the buffer to be larger than the parsed BSON object
 * @return {Object} returns the deserialized Javascript Object.
 */
function deserialize(buffer, options) {
  buffer = ensureBuffer(buffer);
  return internalDeserialize(buffer, options);
}

/**
 * Calculate the bson size for a passed in Javascript object.
 *
 * @param {Object} object the Javascript object to calculate the BSON byte size for.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @return {Number} returns the number of bytes the BSON object will take up.
 */
function calculateObjectSize(object, options) {
  options = options || {};

  const serializeFunctions =
    typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
  const ignoreUndefined =
    typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : true;

  return internalCalculateObjectSize(object, serializeFunctions, ignoreUndefined);
}

/**
 * Deserialize stream data as BSON documents.
 *
 * @param {Buffer} data the buffer containing the serialized set of BSON documents.
 * @param {Number} startIndex the start index in the data Buffer where the deserialization is to start.
 * @param {Number} numberOfDocuments number of documents to deserialize.
 * @param {Array} documents an array where to store the deserialized documents.
 * @param {Number} docStartIndex the index in the documents array from where to start inserting documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @param {Object} [options.evalFunctions=false] evaluate functions in the BSON document scoped to the object deserialized.
 * @param {Object} [options.cacheFunctions=false] cache evaluated functions for reuse.
 * @param {Object} [options.cacheFunctionsCrc32=false] use a crc32 code for caching, otherwise use the string of the function.
 * @param {Object} [options.promoteLongs=true] when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 * @param {Object} [options.promoteBuffers=false] when deserializing a Binary will return it as a node.js Buffer instance.
 * @param {Object} [options.promoteValues=false] when deserializing will promote BSON values to their Node.js closest equivalent types.
 * @param {Object} [options.fieldsAsRaw=null] allow to specify if there what fields we wish to return as unserialized raw buffer.
 * @param {Object} [options.bsonRegExp=false] return BSON regular expressions as BSONRegExp instances.
 * @return {Number} returns the next index in the buffer after deserialization **x** numbers of documents.
 */
function deserializeStream(data, startIndex, numberOfDocuments, documents, docStartIndex, options) {
  options = Object.assign({ allowObjectSmallerThanBufferSize: true }, options);
  data = ensureBuffer(data);

  let index = startIndex;
  // Loop over all documents
  for (let i = 0; i < numberOfDocuments; i++) {
    // Find size of the document
    const size =
      data[index] | (data[index + 1] << 8) | (data[index + 2] << 16) | (data[index + 3] << 24);
    // Update options with index
    options.index = index;
    // Parse the document at this point
    documents[docStartIndex + i] = internalDeserialize(data, options);
    // Adjust index by the document size
    index = index + size;
  }

  // Return object containing end index of parsing and list of documents
  return index;
}

module.exports = {
  // constants
  // NOTE: this is done this way because rollup can't resolve an `Object.assign`ed export
  BSON_INT32_MAX: constants.BSON_INT32_MAX,
  BSON_INT32_MIN: constants.BSON_INT32_MIN,
  BSON_INT64_MAX: constants.BSON_INT64_MAX,
  BSON_INT64_MIN: constants.BSON_INT64_MIN,
  JS_INT_MAX: constants.JS_INT_MAX,
  JS_INT_MIN: constants.JS_INT_MIN,
  BSON_DATA_NUMBER: constants.BSON_DATA_NUMBER,
  BSON_DATA_STRING: constants.BSON_DATA_STRING,
  BSON_DATA_OBJECT: constants.BSON_DATA_OBJECT,
  BSON_DATA_ARRAY: constants.BSON_DATA_ARRAY,
  BSON_DATA_BINARY: constants.BSON_DATA_BINARY,
  BSON_DATA_UNDEFINED: constants.BSON_DATA_UNDEFINED,
  BSON_DATA_OID: constants.BSON_DATA_OID,
  BSON_DATA_BOOLEAN: constants.BSON_DATA_BOOLEAN,
  BSON_DATA_DATE: constants.BSON_DATA_DATE,
  BSON_DATA_NULL: constants.BSON_DATA_NULL,
  BSON_DATA_REGEXP: constants.BSON_DATA_REGEXP,
  BSON_DATA_DBPOINTER: constants.BSON_DATA_DBPOINTER,
  BSON_DATA_CODE: constants.BSON_DATA_CODE,
  BSON_DATA_SYMBOL: constants.BSON_DATA_SYMBOL,
  BSON_DATA_CODE_W_SCOPE: constants.BSON_DATA_CODE_W_SCOPE,
  BSON_DATA_INT: constants.BSON_DATA_INT,
  BSON_DATA_TIMESTAMP: constants.BSON_DATA_TIMESTAMP,
  BSON_DATA_LONG: constants.BSON_DATA_LONG,
  BSON_DATA_DECIMAL128: constants.BSON_DATA_DECIMAL128,
  BSON_DATA_MIN_KEY: constants.BSON_DATA_MIN_KEY,
  BSON_DATA_MAX_KEY: constants.BSON_DATA_MAX_KEY,
  BSON_BINARY_SUBTYPE_DEFAULT: constants.BSON_BINARY_SUBTYPE_DEFAULT,
  BSON_BINARY_SUBTYPE_FUNCTION: constants.BSON_BINARY_SUBTYPE_FUNCTION,
  BSON_BINARY_SUBTYPE_BYTE_ARRAY: constants.BSON_BINARY_SUBTYPE_BYTE_ARRAY,
  BSON_BINARY_SUBTYPE_UUID: constants.BSON_BINARY_SUBTYPE_UUID,
  BSON_BINARY_SUBTYPE_MD5: constants.BSON_BINARY_SUBTYPE_MD5,
  BSON_BINARY_SUBTYPE_USER_DEFINED: constants.BSON_BINARY_SUBTYPE_USER_DEFINED,

  // wrapped types
  Code,
  Map,
  BSONSymbol,
  DBRef,
  Binary,
  ObjectId,
  Long,
  Timestamp,
  Double,
  Int32,
  MinKey,
  MaxKey,
  BSONRegExp,
  Decimal128,

  // methods
  serialize,
  serializeWithBufferAndIndex,
  deserialize,
  calculateObjectSize,
  deserializeStream,
  setInternalBufferSize,

  // legacy support
  ObjectID: ObjectId,

  // Extended JSON
  EJSON
};

}, function(modId) {var map = {"./map":1583600334721,"./long":1583600334722,"./double":1583600334723,"./timestamp":1583600334724,"./objectid":1583600334725,"./regexp":1583600334727,"./symbol":1583600334728,"./int_32":1583600334729,"./code":1583600334730,"./decimal128":1583600334731,"./min_key":1583600334732,"./max_key":1583600334733,"./db_ref":1583600334734,"./binary":1583600334735,"./constants":1583600334736,"./extended_json":1583600334737,"./parser/deserializer":1583600334738,"./parser/serializer":1583600334740,"./parser/calculate_size":1583600334742,"./ensure_buffer":1583600334743}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334721, function(require, module, exports) {


// We have an ES6 Map available, return the native instance
if (typeof global.Map !== 'undefined') {
  module.exports = global.Map;
  module.exports.Map = global.Map;
} else {
  // We will return a polyfill
  var Map = function Map(array) {
    this._keys = [];
    this._values = {};

    for (var i = 0; i < array.length; i++) {
      if (array[i] == null) continue; // skip null and undefined
      var entry = array[i];
      var key = entry[0];
      var value = entry[1];
      // Add the key to the list of keys in order
      this._keys.push(key);
      // Add the key and value to the values dictionary with a point
      // to the location in the ordered keys list
      this._values[key] = { v: value, i: this._keys.length - 1 };
    }
  };

  Map.prototype.clear = function() {
    this._keys = [];
    this._values = {};
  };

  Map.prototype.delete = function(key) {
    var value = this._values[key];
    if (value == null) return false;
    // Delete entry
    delete this._values[key];
    // Remove the key from the ordered keys list
    this._keys.splice(value.i, 1);
    return true;
  };

  Map.prototype.entries = function() {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? [key, self._values[key].v] : undefined,
          done: key !== undefined ? false : true
        };
      }
    };
  };

  Map.prototype.forEach = function(callback, self) {
    self = self || this;

    for (var i = 0; i < this._keys.length; i++) {
      var key = this._keys[i];
      // Call the forEach callback
      callback.call(self, this._values[key].v, key, self);
    }
  };

  Map.prototype.get = function(key) {
    return this._values[key] ? this._values[key].v : undefined;
  };

  Map.prototype.has = function(key) {
    return this._values[key] != null;
  };

  Map.prototype.keys = function() {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? key : undefined,
          done: key !== undefined ? false : true
        };
      }
    };
  };

  Map.prototype.set = function(key, value) {
    if (this._values[key]) {
      this._values[key].v = value;
      return this;
    }

    // Add the key to the list of keys in order
    this._keys.push(key);
    // Add the key and value to the values dictionary with a point
    // to the location in the ordered keys list
    this._values[key] = { v: value, i: this._keys.length - 1 };
    return this;
  };

  Map.prototype.values = function() {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? self._values[key].v : undefined,
          done: key !== undefined ? false : true
        };
      }
    };
  };

  // Last ismaster
  Object.defineProperty(Map.prototype, 'size', {
    enumerable: true,
    get: function() {
      return this._keys.length;
    }
  });

  module.exports = Map;
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334722, function(require, module, exports) {

const Long = require('long');

/**
 * @ignore
 */
Long.prototype.toExtendedJSON = function(options) {
  if (options && options.relaxed) return this.toNumber();
  return { $numberLong: this.toString() };
};

/**
 * @ignore
 */
Long.fromExtendedJSON = function(doc, options) {
  const result = Long.fromString(doc.$numberLong);
  return options && options.relaxed ? result.toNumber() : result;
};

Object.defineProperty(Long.prototype, '_bsontype', { value: 'Long' });
module.exports = Long;

}, function(modId) { var map = {"long":1583600334722}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334723, function(require, module, exports) {

/**
 * A class representation of the BSON Double type.
 */
class Double {
  /**
   * Create a Double type
   *
   * @param {number|Number} value the number we want to represent as a double.
   * @return {Double}
   */
  constructor(value) {
    if (value instanceof Number) {
      value = value.valueOf();
    }

    this.value = value;
  }

  /**
   * Access the number value.
   *
   * @method
   * @return {number} returns the wrapped double number.
   */
  valueOf() {
    return this.value;
  }

  /**
   * @ignore
   */
  toJSON() {
    return this.value;
  }

  /**
   * @ignore
   */
  toExtendedJSON(options) {
    if (options && (options.legacy || (options.relaxed && isFinite(this.value)))) {
      return this.value;
    }
    return { $numberDouble: this.value.toString() };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc, options) {
    return options && options.relaxed
      ? parseFloat(doc.$numberDouble)
      : new Double(parseFloat(doc.$numberDouble));
  }
}

Object.defineProperty(Double.prototype, '_bsontype', { value: 'Double' });
module.exports = Double;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334724, function(require, module, exports) {


const Long = require('./long');

/**
 * @class
 * @param {number} low  the low (signed) 32 bits of the Timestamp.
 * @param {number} high the high (signed) 32 bits of the Timestamp.
 * @return {Timestamp}
 */
class Timestamp extends Long {
  constructor(low, high) {
    if (Long.isLong(low)) {
      super(low.low, low.high, true);
    } else {
      super(low, high, true);
    }
  }

  /**
   * Return the JSON value.
   *
   * @method
   * @return {String} the JSON representation.
   */
  toJSON() {
    return {
      $timestamp: this.toString()
    };
  }

  /**
   * Returns a Timestamp represented by the given (32-bit) integer value.
   *
   * @method
   * @param {number} value the 32-bit integer in question.
   * @return {Timestamp} the timestamp.
   */
  static fromInt(value) {
    return new Timestamp(Long.fromInt(value, true));
  }

  /**
   * Returns a Timestamp representing the given number value, provided that it is a finite number. Otherwise, zero is returned.
   *
   * @method
   * @param {number} value the number in question.
   * @return {Timestamp} the timestamp.
   */
  static fromNumber(value) {
    return new Timestamp(Long.fromNumber(value, true));
  }

  /**
   * Returns a Timestamp for the given high and low bits. Each is assumed to use 32 bits.
   *
   * @method
   * @param {number} lowBits the low 32-bits.
   * @param {number} highBits the high 32-bits.
   * @return {Timestamp} the timestamp.
   */
  static fromBits(lowBits, highBits) {
    return new Timestamp(lowBits, highBits);
  }

  /**
   * Returns a Timestamp from the given string, optionally using the given radix.
   *
   * @method
   * @param {String} str the textual representation of the Timestamp.
   * @param {number} [opt_radix] the radix in which the text is written.
   * @return {Timestamp} the timestamp.
   */
  static fromString(str, opt_radix) {
    return new Timestamp(Long.fromString(str, opt_radix, true));
  }

  /**
   * @ignore
   */
  toExtendedJSON() {
    return { $timestamp: { t: this.high >>> 0, i: this.low >>> 0 } };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc) {
    return new Timestamp(doc.$timestamp.i, doc.$timestamp.t);
  }
}

Object.defineProperty(Timestamp.prototype, '_bsontype', { value: 'Timestamp' });

Timestamp.MAX_VALUE = Timestamp.MAX_UNSIGNED_VALUE;

module.exports = Timestamp;

}, function(modId) { var map = {"./long":1583600334722}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334725, function(require, module, exports) {


const Buffer = require('buffer').Buffer;
let randomBytes = require('./parser/utils').randomBytes;
const util = require('util');
const deprecate = util.deprecate;

// constants
const PROCESS_UNIQUE = randomBytes(5);

// Regular expression that checks for hex value
const checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');
let hasBufferType = false;

// Check if buffer exists
try {
  if (Buffer && Buffer.from) hasBufferType = true;
} catch (err) {
  hasBufferType = false;
}

// Precomputed hex table enables speedy hex string conversion
const hexTable = [];
for (let i = 0; i < 256; i++) {
  hexTable[i] = (i <= 15 ? '0' : '') + i.toString(16);
}

// Lookup tables
const decodeLookup = [];
let i = 0;
while (i < 10) decodeLookup[0x30 + i] = i++;
while (i < 16) decodeLookup[0x41 - 10 + i] = decodeLookup[0x61 - 10 + i] = i++;

const _Buffer = Buffer;
function convertToHex(bytes) {
  return bytes.toString('hex');
}

function makeObjectIdError(invalidString, index) {
  const invalidCharacter = invalidString[index];
  return new TypeError(
    `ObjectId string "${invalidString}" contains invalid character "${invalidCharacter}" with character code (${invalidString.charCodeAt(
      index
    )}). All character codes for a non-hex string must be less than 256.`
  );
}

/**
 * A class representation of the BSON ObjectId type.
 */
class ObjectId {
  /**
   * Create an ObjectId type
   *
   * @param {(string|Buffer|number)} id Can be a 24 byte hex string, 12 byte binary Buffer, or a Number.
   * @property {number} generationTime The generation time of this ObjectId instance
   * @return {ObjectId} instance of ObjectId.
   */
  constructor(id) {
    // Duck-typing to support ObjectId from different npm packages
    if (id instanceof ObjectId) return id;

    // The most common usecase (blank id, new objectId instance)
    if (id == null || typeof id === 'number') {
      // Generate a new id
      this.id = ObjectId.generate(id);
      // If we are caching the hex string
      if (ObjectId.cacheHexString) this.__id = this.toString('hex');
      // Return the object
      return;
    }

    // Check if the passed in id is valid
    const valid = ObjectId.isValid(id);

    // Throw an error if it's not a valid setup
    if (!valid && id != null) {
      throw new TypeError(
        'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'
      );
    } else if (valid && typeof id === 'string' && id.length === 24 && hasBufferType) {
      return new ObjectId(Buffer.from(id, 'hex'));
    } else if (valid && typeof id === 'string' && id.length === 24) {
      return ObjectId.createFromHexString(id);
    } else if (id != null && id.length === 12) {
      // assume 12 byte string
      this.id = id;
    } else if (id != null && id.toHexString) {
      // Duck-typing to support ObjectId from different npm packages
      return ObjectId.createFromHexString(id.toHexString());
    } else {
      throw new TypeError(
        'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'
      );
    }

    if (ObjectId.cacheHexString) this.__id = this.toString('hex');
  }

  /**
   * Return the ObjectId id as a 24 byte hex string representation
   *
   * @method
   * @return {string} return the 24 byte hex string representation.
   */
  toHexString() {
    if (ObjectId.cacheHexString && this.__id) return this.__id;

    let hexString = '';
    if (!this.id || !this.id.length) {
      throw new TypeError(
        'invalid ObjectId, ObjectId.id must be either a string or a Buffer, but is [' +
          JSON.stringify(this.id) +
          ']'
      );
    }

    if (this.id instanceof _Buffer) {
      hexString = convertToHex(this.id);
      if (ObjectId.cacheHexString) this.__id = hexString;
      return hexString;
    }

    for (let i = 0; i < this.id.length; i++) {
      const hexChar = hexTable[this.id.charCodeAt(i)];
      if (typeof hexChar !== 'string') {
        throw makeObjectIdError(this.id, i);
      }
      hexString += hexChar;
    }

    if (ObjectId.cacheHexString) this.__id = hexString;
    return hexString;
  }

  /**
   * Update the ObjectId index used in generating new ObjectId's on the driver
   *
   * @method
   * @return {number} returns next index value.
   * @ignore
   */
  static getInc() {
    return (ObjectId.index = (ObjectId.index + 1) % 0xffffff);
  }

  /**
   * Generate a 12 byte id buffer used in ObjectId's
   *
   * @method
   * @param {number} [time] optional parameter allowing to pass in a second based timestamp.
   * @return {Buffer} return the 12 byte id buffer string.
   */
  static generate(time) {
    if ('number' !== typeof time) {
      time = ~~(Date.now() / 1000);
    }

    const inc = ObjectId.getInc();
    const buffer = Buffer.alloc(12);

    // 4-byte timestamp
    buffer[3] = time & 0xff;
    buffer[2] = (time >> 8) & 0xff;
    buffer[1] = (time >> 16) & 0xff;
    buffer[0] = (time >> 24) & 0xff;

    // 5-byte process unique
    buffer[4] = PROCESS_UNIQUE[0];
    buffer[5] = PROCESS_UNIQUE[1];
    buffer[6] = PROCESS_UNIQUE[2];
    buffer[7] = PROCESS_UNIQUE[3];
    buffer[8] = PROCESS_UNIQUE[4];

    // 3-byte counter
    buffer[11] = inc & 0xff;
    buffer[10] = (inc >> 8) & 0xff;
    buffer[9] = (inc >> 16) & 0xff;

    return buffer;
  }

  /**
   * Converts the id into a 24 byte hex string for printing
   *
   * @param {String} format The Buffer toString format parameter.
   * @return {String} return the 24 byte hex string representation.
   * @ignore
   */
  toString(format) {
    // Is the id a buffer then use the buffer toString method to return the format
    if (this.id && this.id.copy) {
      return this.id.toString(typeof format === 'string' ? format : 'hex');
    }

    return this.toHexString();
  }

  /**
   * Converts to its JSON representation.
   *
   * @return {String} return the 24 byte hex string representation.
   * @ignore
   */
  toJSON() {
    return this.toHexString();
  }

  /**
   * Compares the equality of this ObjectId with `otherID`.
   *
   * @method
   * @param {object} otherId ObjectId instance to compare against.
   * @return {boolean} the result of comparing two ObjectId's
   */
  equals(otherId) {
    if (otherId instanceof ObjectId) {
      return this.toString() === otherId.toString();
    }

    if (
      typeof otherId === 'string' &&
      ObjectId.isValid(otherId) &&
      otherId.length === 12 &&
      this.id instanceof _Buffer
    ) {
      return otherId === this.id.toString('binary');
    }

    if (typeof otherId === 'string' && ObjectId.isValid(otherId) && otherId.length === 24) {
      return otherId.toLowerCase() === this.toHexString();
    }

    if (typeof otherId === 'string' && ObjectId.isValid(otherId) && otherId.length === 12) {
      return otherId === this.id;
    }

    if (otherId != null && (otherId instanceof ObjectId || otherId.toHexString)) {
      return otherId.toHexString() === this.toHexString();
    }

    return false;
  }

  /**
   * Returns the generation date (accurate up to the second) that this ID was generated.
   *
   * @method
   * @return {Date} the generation date
   */
  getTimestamp() {
    const timestamp = new Date();
    const time = this.id.readUInt32BE(0);
    timestamp.setTime(Math.floor(time) * 1000);
    return timestamp;
  }

  /**
   * @ignore
   */
  static createPk() {
    return new ObjectId();
  }

  /**
   * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
   *
   * @method
   * @param {number} time an integer number representing a number of seconds.
   * @return {ObjectId} return the created ObjectId
   */
  static createFromTime(time) {
    const buffer = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    // Encode time into first 4 bytes
    buffer[3] = time & 0xff;
    buffer[2] = (time >> 8) & 0xff;
    buffer[1] = (time >> 16) & 0xff;
    buffer[0] = (time >> 24) & 0xff;
    // Return the new objectId
    return new ObjectId(buffer);
  }

  /**
   * Creates an ObjectId from a hex string representation of an ObjectId.
   *
   * @method
   * @param {string} hexString create a ObjectId from a passed in 24 byte hexstring.
   * @return {ObjectId} return the created ObjectId
   */
  static createFromHexString(string) {
    // Throw an error if it's not a valid setup
    if (typeof string === 'undefined' || (string != null && string.length !== 24)) {
      throw new TypeError(
        'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'
      );
    }

    // Use Buffer.from method if available
    if (hasBufferType) return new ObjectId(Buffer.from(string, 'hex'));

    // Calculate lengths
    const array = new _Buffer(12);

    let n = 0;
    let i = 0;
    while (i < 24) {
      array[n++] =
        (decodeLookup[string.charCodeAt(i++)] << 4) | decodeLookup[string.charCodeAt(i++)];
    }

    return new ObjectId(array);
  }

  /**
   * Checks if a value is a valid bson ObjectId
   *
   * @method
   * @param {*} id ObjectId instance to validate.
   * @return {boolean} return true if the value is a valid bson ObjectId, return false otherwise.
   */
  static isValid(id) {
    if (id == null) return false;

    if (typeof id === 'number') {
      return true;
    }

    if (typeof id === 'string') {
      return id.length === 12 || (id.length === 24 && checkForHexRegExp.test(id));
    }

    if (id instanceof ObjectId) {
      return true;
    }

    if (id instanceof _Buffer && id.length === 12) {
      return true;
    }

    // Duck-Typing detection of ObjectId like objects
    if (id.toHexString) {
      return id.id.length === 12 || (id.id.length === 24 && checkForHexRegExp.test(id.id));
    }

    return false;
  }

  /**
   * @ignore
   */
  toExtendedJSON() {
    if (this.toHexString) return { $oid: this.toHexString() };
    return { $oid: this.toString('hex') };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc) {
    return new ObjectId(doc.$oid);
  }
}

// Deprecated methods
ObjectId.get_inc = deprecate(
  () => ObjectId.getInc(),
  'Please use the static `ObjectId.getInc()` instead'
);

ObjectId.prototype.get_inc = deprecate(
  () => ObjectId.getInc(),
  'Please use the static `ObjectId.getInc()` instead'
);

ObjectId.prototype.getInc = deprecate(
  () => ObjectId.getInc(),
  'Please use the static `ObjectId.getInc()` instead'
);

ObjectId.prototype.generate = deprecate(
  time => ObjectId.generate(time),
  'Please use the static `ObjectId.generate(time)` instead'
);

/**
 * @ignore
 */
Object.defineProperty(ObjectId.prototype, 'generationTime', {
  enumerable: true,
  get: function() {
    return this.id[3] | (this.id[2] << 8) | (this.id[1] << 16) | (this.id[0] << 24);
  },
  set: function(value) {
    // Encode time into first 4 bytes
    this.id[3] = value & 0xff;
    this.id[2] = (value >> 8) & 0xff;
    this.id[1] = (value >> 16) & 0xff;
    this.id[0] = (value >> 24) & 0xff;
  }
});

/**
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @ignore
 */
ObjectId.prototype[util.inspect.custom || 'inspect'] = ObjectId.prototype.toString;

/**
 * @ignore
 */
ObjectId.index = ~~(Math.random() * 0xffffff);

// In 4.0.0 and 4.0.1, this property name was changed to ObjectId to match the class name.
// This caused interoperability problems with previous versions of the library, so in
// later builds we changed it back to ObjectID (capital D) to match legacy implementations.
Object.defineProperty(ObjectId.prototype, '_bsontype', { value: 'ObjectID' });
module.exports = ObjectId;

}, function(modId) { var map = {"./parser/utils":1583600334726}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334726, function(require, module, exports) {


/* global window */

/**
 * Normalizes our expected stringified form of a function across versions of node
 * @param {Function} fn The function to stringify
 */
function normalizedFunctionString(fn) {
  return fn.toString().replace('function(', 'function (');
}

function insecureRandomBytes(size) {
  const result = new Uint8Array(size);
  for (let i = 0; i < size; ++i) result[i] = Math.floor(Math.random() * 256);
  return result;
}

let randomBytes = insecureRandomBytes;
if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
  randomBytes = size => window.crypto.getRandomValues(new Uint8Array(size));
} else {
  try {
    randomBytes = require('crypto').randomBytes;
  } catch (e) {
    // keep the fallback
  }

  // NOTE: in transpiled cases the above require might return null/undefined
  if (randomBytes == null) {
    randomBytes = insecureRandomBytes;
  }
}

module.exports = {
  normalizedFunctionString,
  randomBytes
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334727, function(require, module, exports) {


function alphabetize(str) {
  return str
    .split('')
    .sort()
    .join('');
}

/**
 * A class representation of the BSON RegExp type.
 */
class BSONRegExp {
  /**
   * Create a RegExp type
   *
   * @param {string} pattern The regular expression pattern to match
   * @param {string} options The regular expression options
   */
  constructor(pattern, options) {
    // Execute
    this.pattern = pattern || '';
    this.options = options ? alphabetize(options) : '';

    // Validate options
    for (let i = 0; i < this.options.length; i++) {
      if (
        !(
          this.options[i] === 'i' ||
          this.options[i] === 'm' ||
          this.options[i] === 'x' ||
          this.options[i] === 'l' ||
          this.options[i] === 's' ||
          this.options[i] === 'u'
        )
      ) {
        throw new Error(`The regular expression option [${this.options[i]}] is not supported`);
      }
    }
  }

  static parseOptions(options) {
    return options
      ? options
          .split('')
          .sort()
          .join('')
      : '';
  }

  /**
   * @ignore
   */
  toExtendedJSON(options) {
    options = options || {};
    if (options.legacy) {
      return { $regex: this.pattern, $options: this.options };
    }
    return { $regularExpression: { pattern: this.pattern, options: this.options } };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc) {
    if (doc.$regex) {
      // This is for $regex query operators that have extended json values.
      if (doc.$regex._bsontype === 'BSONRegExp') {
        return doc;
      }
      return new BSONRegExp(doc.$regex, BSONRegExp.parseOptions(doc.$options));
    }
    return new BSONRegExp(
      doc.$regularExpression.pattern,
      BSONRegExp.parseOptions(doc.$regularExpression.options)
    );
  }
}

Object.defineProperty(BSONRegExp.prototype, '_bsontype', { value: 'BSONRegExp' });
module.exports = BSONRegExp;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334728, function(require, module, exports) {

/**
 * A class representation of the BSON Symbol type.
 */
class BSONSymbol {
  /**
   * Create a Symbol type
   *
   * @param {string} value the string representing the symbol.
   */
  constructor(value) {
    this.value = value;
  }

  /**
   * Access the wrapped string value.
   *
   * @method
   * @return {String} returns the wrapped string.
   */
  valueOf() {
    return this.value;
  }

  /**
   * @ignore
   */
  toString() {
    return this.value;
  }

  /**
   * @ignore
   */
  inspect() {
    return this.value;
  }

  /**
   * @ignore
   */
  toJSON() {
    return this.value;
  }

  /**
   * @ignore
   */
  toExtendedJSON() {
    return { $symbol: this.value };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc) {
    return new BSONSymbol(doc.$symbol);
  }
}

Object.defineProperty(BSONSymbol.prototype, '_bsontype', { value: 'Symbol' });
module.exports = BSONSymbol;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334729, function(require, module, exports) {

/**
 * A class representation of a BSON Int32 type.
 */
class Int32 {
  /**
   * Create an Int32 type
   *
   * @param {number|Number} value the number we want to represent as an int32.
   * @return {Int32}
   */
  constructor(value) {
    if (value instanceof Number) {
      value = value.valueOf();
    }

    this.value = value;
  }

  /**
   * Access the number value.
   *
   * @method
   * @return {number} returns the wrapped int32 number.
   */
  valueOf() {
    return this.value;
  }

  /**
   * @ignore
   */
  toJSON() {
    return this.value;
  }

  /**
   * @ignore
   */
  toExtendedJSON(options) {
    if (options && (options.relaxed || options.legacy)) return this.value;
    return { $numberInt: this.value.toString() };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc, options) {
    return options && options.relaxed ? parseInt(doc.$numberInt, 10) : new Int32(doc.$numberInt);
  }
}

Object.defineProperty(Int32.prototype, '_bsontype', { value: 'Int32' });
module.exports = Int32;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334730, function(require, module, exports) {


/**
 * A class representation of the BSON Code type.
 */
class Code {
  /**
   * Create a Code type
   *
   * @param {(string|function)} code a string or function.
   * @param {Object} [scope] an optional scope for the function.
   * @return {Code}
   */
  constructor(code, scope) {
    this.code = code;
    this.scope = scope;
  }

  /**
   * @ignore
   */
  toJSON() {
    return { scope: this.scope, code: this.code };
  }

  /**
   * @ignore
   */
  toExtendedJSON() {
    if (this.scope) {
      return { $code: this.code, $scope: this.scope };
    }

    return { $code: this.code };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc) {
    return new Code(doc.$code, doc.$scope);
  }
}

Object.defineProperty(Code.prototype, '_bsontype', { value: 'Code' });
module.exports = Code;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334731, function(require, module, exports) {


let Long = require('./long');
const Buffer = require('buffer').Buffer;

const PARSE_STRING_REGEXP = /^(\+|-)?(\d+|(\d*\.\d*))?(E|e)?([-+])?(\d+)?$/;
const PARSE_INF_REGEXP = /^(\+|-)?(Infinity|inf)$/i;
const PARSE_NAN_REGEXP = /^(\+|-)?NaN$/i;

const EXPONENT_MAX = 6111;
const EXPONENT_MIN = -6176;
const EXPONENT_BIAS = 6176;
const MAX_DIGITS = 34;

// Nan value bits as 32 bit values (due to lack of longs)
const NAN_BUFFER = [
  0x7c,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00
].reverse();
// Infinity value bits 32 bit values (due to lack of longs)
const INF_NEGATIVE_BUFFER = [
  0xf8,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00
].reverse();
const INF_POSITIVE_BUFFER = [
  0x78,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00
].reverse();

const EXPONENT_REGEX = /^([-+])?(\d+)?$/;

// Detect if the value is a digit
function isDigit(value) {
  return !isNaN(parseInt(value, 10));
}

// Divide two uint128 values
function divideu128(value) {
  const DIVISOR = Long.fromNumber(1000 * 1000 * 1000);
  let _rem = Long.fromNumber(0);

  if (!value.parts[0] && !value.parts[1] && !value.parts[2] && !value.parts[3]) {
    return { quotient: value, rem: _rem };
  }

  for (let i = 0; i <= 3; i++) {
    // Adjust remainder to match value of next dividend
    _rem = _rem.shiftLeft(32);
    // Add the divided to _rem
    _rem = _rem.add(new Long(value.parts[i], 0));
    value.parts[i] = _rem.div(DIVISOR).low;
    _rem = _rem.modulo(DIVISOR);
  }

  return { quotient: value, rem: _rem };
}

// Multiply two Long values and return the 128 bit value
function multiply64x2(left, right) {
  if (!left && !right) {
    return { high: Long.fromNumber(0), low: Long.fromNumber(0) };
  }

  const leftHigh = left.shiftRightUnsigned(32);
  const leftLow = new Long(left.getLowBits(), 0);
  const rightHigh = right.shiftRightUnsigned(32);
  const rightLow = new Long(right.getLowBits(), 0);

  let productHigh = leftHigh.multiply(rightHigh);
  let productMid = leftHigh.multiply(rightLow);
  let productMid2 = leftLow.multiply(rightHigh);
  let productLow = leftLow.multiply(rightLow);

  productHigh = productHigh.add(productMid.shiftRightUnsigned(32));
  productMid = new Long(productMid.getLowBits(), 0)
    .add(productMid2)
    .add(productLow.shiftRightUnsigned(32));

  productHigh = productHigh.add(productMid.shiftRightUnsigned(32));
  productLow = productMid.shiftLeft(32).add(new Long(productLow.getLowBits(), 0));

  // Return the 128 bit result
  return { high: productHigh, low: productLow };
}

function lessThan(left, right) {
  // Make values unsigned
  const uhleft = left.high >>> 0;
  const uhright = right.high >>> 0;

  // Compare high bits first
  if (uhleft < uhright) {
    return true;
  } else if (uhleft === uhright) {
    const ulleft = left.low >>> 0;
    const ulright = right.low >>> 0;
    if (ulleft < ulright) return true;
  }

  return false;
}

function invalidErr(string, message) {
  throw new TypeError(`"${string}" is not a valid Decimal128 string - ${message}`);
}

/**
 * A class representation of the BSON Decimal128 type.
 *
 * @class
 * @param {Buffer} bytes a buffer containing the raw Decimal128 bytes.
 * @return {Double}
 */
function Decimal128(bytes) {
  this.bytes = bytes;
}

/**
 * Create a Decimal128 instance from a string representation
 *
 * @method
 * @param {string} string a numeric string representation.
 * @return {Decimal128} returns a Decimal128 instance.
 */
Decimal128.fromString = function(string) {
  // Parse state tracking
  let isNegative = false;
  let sawRadix = false;
  let foundNonZero = false;

  // Total number of significant digits (no leading or trailing zero)
  let significantDigits = 0;
  // Total number of significand digits read
  let nDigitsRead = 0;
  // Total number of digits (no leading zeros)
  let nDigits = 0;
  // The number of the digits after radix
  let radixPosition = 0;
  // The index of the first non-zero in *str*
  let firstNonZero = 0;

  // Digits Array
  const digits = [0];
  // The number of digits in digits
  let nDigitsStored = 0;
  // Insertion pointer for digits
  let digitsInsert = 0;
  // The index of the first non-zero digit
  let firstDigit = 0;
  // The index of the last digit
  let lastDigit = 0;

  // Exponent
  let exponent = 0;
  // loop index over array
  let i = 0;
  // The high 17 digits of the significand
  let significandHigh = [0, 0];
  // The low 17 digits of the significand
  let significandLow = [0, 0];
  // The biased exponent
  let biasedExponent = 0;

  // Read index
  let index = 0;

  // Naively prevent against REDOS attacks.
  // TODO: implementing a custom parsing for this, or refactoring the regex would yield
  //       further gains.
  if (string.length >= 7000) {
    throw new TypeError('' + string + ' not a valid Decimal128 string');
  }

  // Results
  const stringMatch = string.match(PARSE_STRING_REGEXP);
  const infMatch = string.match(PARSE_INF_REGEXP);
  const nanMatch = string.match(PARSE_NAN_REGEXP);

  // Validate the string
  if ((!stringMatch && !infMatch && !nanMatch) || string.length === 0) {
    throw new TypeError('' + string + ' not a valid Decimal128 string');
  }

  if (stringMatch) {
    // full_match = stringMatch[0]
    // sign = stringMatch[1]

    let unsignedNumber = stringMatch[2];
    // stringMatch[3] is undefined if a whole number (ex "1", 12")
    // but defined if a number w/ decimal in it (ex "1.0, 12.2")

    let e = stringMatch[4];
    let expSign = stringMatch[5];
    let expNumber = stringMatch[6];

    // they provided e, but didn't give an exponent number. for ex "1e"
    if (e && expNumber === undefined) invalidErr(string, 'missing exponent power');

    // they provided e, but didn't give a number before it. for ex "e1"
    if (e && unsignedNumber === undefined) invalidErr(string, 'missing exponent base');

    if (e === undefined && (expSign || expNumber)) {
      invalidErr(string, 'missing e before exponent');
    }
  }

  // Get the negative or positive sign
  if (string[index] === '+' || string[index] === '-') {
    isNegative = string[index++] === '-';
  }

  // Check if user passed Infinity or NaN
  if (!isDigit(string[index]) && string[index] !== '.') {
    if (string[index] === 'i' || string[index] === 'I') {
      return new Decimal128(Buffer.from(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER));
    } else if (string[index] === 'N') {
      return new Decimal128(Buffer.from(NAN_BUFFER));
    }
  }

  // Read all the digits
  while (isDigit(string[index]) || string[index] === '.') {
    if (string[index] === '.') {
      if (sawRadix) invalidErr(string, 'contains multiple periods');

      sawRadix = true;
      index = index + 1;
      continue;
    }

    if (nDigitsStored < 34) {
      if (string[index] !== '0' || foundNonZero) {
        if (!foundNonZero) {
          firstNonZero = nDigitsRead;
        }

        foundNonZero = true;

        // Only store 34 digits
        digits[digitsInsert++] = parseInt(string[index], 10);
        nDigitsStored = nDigitsStored + 1;
      }
    }

    if (foundNonZero) nDigits = nDigits + 1;
    if (sawRadix) radixPosition = radixPosition + 1;

    nDigitsRead = nDigitsRead + 1;
    index = index + 1;
  }

  if (sawRadix && !nDigitsRead) throw new TypeError('' + string + ' not a valid Decimal128 string');

  // Read exponent if exists
  if (string[index] === 'e' || string[index] === 'E') {
    // Read exponent digits
    const match = string.substr(++index).match(EXPONENT_REGEX);

    // No digits read
    if (!match || !match[2]) return new Decimal128(Buffer.from(NAN_BUFFER));

    // Get exponent
    exponent = parseInt(match[0], 10);

    // Adjust the index
    index = index + match[0].length;
  }

  // Return not a number
  if (string[index]) return new Decimal128(Buffer.from(NAN_BUFFER));

  // Done reading input
  // Find first non-zero digit in digits
  firstDigit = 0;

  if (!nDigitsStored) {
    firstDigit = 0;
    lastDigit = 0;
    digits[0] = 0;
    nDigits = 1;
    nDigitsStored = 1;
    significantDigits = 0;
  } else {
    lastDigit = nDigitsStored - 1;
    significantDigits = nDigits;
    if (significantDigits !== 1) {
      while (string[firstNonZero + significantDigits - 1] === '0') {
        significantDigits = significantDigits - 1;
      }
    }
  }

  // Normalization of exponent
  // Correct exponent based on radix position, and shift significand as needed
  // to represent user input

  // Overflow prevention
  if (exponent <= radixPosition && radixPosition - exponent > 1 << 14) {
    exponent = EXPONENT_MIN;
  } else {
    exponent = exponent - radixPosition;
  }

  // Attempt to normalize the exponent
  while (exponent > EXPONENT_MAX) {
    // Shift exponent to significand and decrease
    lastDigit = lastDigit + 1;

    if (lastDigit - firstDigit > MAX_DIGITS) {
      // Check if we have a zero then just hard clamp, otherwise fail
      const digitsString = digits.join('');
      if (digitsString.match(/^0+$/)) {
        exponent = EXPONENT_MAX;
        break;
      }

      invalidErr(string, 'overflow');
    }
    exponent = exponent - 1;
  }

  while (exponent < EXPONENT_MIN || nDigitsStored < nDigits) {
    // Shift last digit. can only do this if < significant digits than # stored.
    if (lastDigit === 0 && significantDigits < nDigitsStored) {
      exponent = EXPONENT_MIN;
      significantDigits = 0;
      break;
    }

    if (nDigitsStored < nDigits) {
      // adjust to match digits not stored
      nDigits = nDigits - 1;
    } else {
      // adjust to round
      lastDigit = lastDigit - 1;
    }

    if (exponent < EXPONENT_MAX) {
      exponent = exponent + 1;
    } else {
      // Check if we have a zero then just hard clamp, otherwise fail
      const digitsString = digits.join('');
      if (digitsString.match(/^0+$/)) {
        exponent = EXPONENT_MAX;
        break;
      }
      invalidErr(string, 'overflow');
    }
  }

  // Round
  // We've normalized the exponent, but might still need to round.
  if (lastDigit - firstDigit + 1 < significantDigits) {
    let endOfString = nDigitsRead;

    // If we have seen a radix point, 'string' is 1 longer than we have
    // documented with ndigits_read, so inc the position of the first nonzero
    // digit and the position that digits are read to.
    if (sawRadix) {
      firstNonZero = firstNonZero + 1;
      endOfString = endOfString + 1;
    }
    // if negative, we need to increment again to account for - sign at start.
    if (isNegative) {
      firstNonZero = firstNonZero + 1;
      endOfString = endOfString + 1;
    }

    const roundDigit = parseInt(string[firstNonZero + lastDigit + 1], 10);
    let roundBit = 0;

    if (roundDigit >= 5) {
      roundBit = 1;
      if (roundDigit === 5) {
        roundBit = digits[lastDigit] % 2 === 1;
        for (i = firstNonZero + lastDigit + 2; i < endOfString; i++) {
          if (parseInt(string[i], 10)) {
            roundBit = 1;
            break;
          }
        }
      }
    }

    if (roundBit) {
      let dIdx = lastDigit;

      for (; dIdx >= 0; dIdx--) {
        if (++digits[dIdx] > 9) {
          digits[dIdx] = 0;

          // overflowed most significant digit
          if (dIdx === 0) {
            if (exponent < EXPONENT_MAX) {
              exponent = exponent + 1;
              digits[dIdx] = 1;
            } else {
              return new Decimal128(
                Buffer.from(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER)
              );
            }
          }
        }
      }
    }
  }

  // Encode significand
  // The high 17 digits of the significand
  significandHigh = Long.fromNumber(0);
  // The low 17 digits of the significand
  significandLow = Long.fromNumber(0);

  // read a zero
  if (significantDigits === 0) {
    significandHigh = Long.fromNumber(0);
    significandLow = Long.fromNumber(0);
  } else if (lastDigit - firstDigit < 17) {
    let dIdx = firstDigit;
    significandLow = Long.fromNumber(digits[dIdx++]);
    significandHigh = new Long(0, 0);

    for (; dIdx <= lastDigit; dIdx++) {
      significandLow = significandLow.multiply(Long.fromNumber(10));
      significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
    }
  } else {
    let dIdx = firstDigit;
    significandHigh = Long.fromNumber(digits[dIdx++]);

    for (; dIdx <= lastDigit - 17; dIdx++) {
      significandHigh = significandHigh.multiply(Long.fromNumber(10));
      significandHigh = significandHigh.add(Long.fromNumber(digits[dIdx]));
    }

    significandLow = Long.fromNumber(digits[dIdx++]);

    for (; dIdx <= lastDigit; dIdx++) {
      significandLow = significandLow.multiply(Long.fromNumber(10));
      significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
    }
  }

  const significand = multiply64x2(significandHigh, Long.fromString('100000000000000000'));
  significand.low = significand.low.add(significandLow);

  if (lessThan(significand.low, significandLow)) {
    significand.high = significand.high.add(Long.fromNumber(1));
  }

  // Biased exponent
  biasedExponent = exponent + EXPONENT_BIAS;
  const dec = { low: Long.fromNumber(0), high: Long.fromNumber(0) };

  // Encode combination, exponent, and significand.
  if (
    significand.high
      .shiftRightUnsigned(49)
      .and(Long.fromNumber(1))
      .equals(Long.fromNumber(1))
  ) {
    // Encode '11' into bits 1 to 3
    dec.high = dec.high.or(Long.fromNumber(0x3).shiftLeft(61));
    dec.high = dec.high.or(
      Long.fromNumber(biasedExponent).and(Long.fromNumber(0x3fff).shiftLeft(47))
    );
    dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x7fffffffffff)));
  } else {
    dec.high = dec.high.or(Long.fromNumber(biasedExponent & 0x3fff).shiftLeft(49));
    dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x1ffffffffffff)));
  }

  dec.low = significand.low;

  // Encode sign
  if (isNegative) {
    dec.high = dec.high.or(Long.fromString('9223372036854775808'));
  }

  // Encode into a buffer
  const buffer = Buffer.alloc(16);
  index = 0;

  // Encode the low 64 bits of the decimal
  // Encode low bits
  buffer[index++] = dec.low.low & 0xff;
  buffer[index++] = (dec.low.low >> 8) & 0xff;
  buffer[index++] = (dec.low.low >> 16) & 0xff;
  buffer[index++] = (dec.low.low >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = dec.low.high & 0xff;
  buffer[index++] = (dec.low.high >> 8) & 0xff;
  buffer[index++] = (dec.low.high >> 16) & 0xff;
  buffer[index++] = (dec.low.high >> 24) & 0xff;

  // Encode the high 64 bits of the decimal
  // Encode low bits
  buffer[index++] = dec.high.low & 0xff;
  buffer[index++] = (dec.high.low >> 8) & 0xff;
  buffer[index++] = (dec.high.low >> 16) & 0xff;
  buffer[index++] = (dec.high.low >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = dec.high.high & 0xff;
  buffer[index++] = (dec.high.high >> 8) & 0xff;
  buffer[index++] = (dec.high.high >> 16) & 0xff;
  buffer[index++] = (dec.high.high >> 24) & 0xff;

  // Return the new Decimal128
  return new Decimal128(buffer);
};

// Extract least significant 5 bits
const COMBINATION_MASK = 0x1f;
// Extract least significant 14 bits
const EXPONENT_MASK = 0x3fff;
// Value of combination field for Inf
const COMBINATION_INFINITY = 30;
// Value of combination field for NaN
const COMBINATION_NAN = 31;

/**
 * Create a string representation of the raw Decimal128 value
 *
 * @method
 * @return {string} returns a Decimal128 string representation.
 */
Decimal128.prototype.toString = function() {
  // Note: bits in this routine are referred to starting at 0,
  // from the sign bit, towards the coefficient.

  // bits 0 - 31
  let high;
  // bits 32 - 63
  let midh;
  // bits 64 - 95
  let midl;
  // bits 96 - 127
  let low;
  // bits 1 - 5
  let combination;
  // decoded biased exponent (14 bits)
  let biased_exponent;
  // the number of significand digits
  let significand_digits = 0;
  // the base-10 digits in the significand
  const significand = new Array(36);
  for (let i = 0; i < significand.length; i++) significand[i] = 0;
  // read pointer into significand
  let index = 0;

  // unbiased exponent
  let exponent;
  // the exponent if scientific notation is used
  let scientific_exponent;

  // true if the number is zero
  let is_zero = false;

  // the most signifcant significand bits (50-46)
  let significand_msb;
  // temporary storage for significand decoding
  let significand128 = { parts: new Array(4) };
  // indexing variables
  let j, k;

  // Output string
  const string = [];

  // Unpack index
  index = 0;

  // Buffer reference
  const buffer = this.bytes;

  // Unpack the low 64bits into a long
  low =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);
  midl =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);

  // Unpack the high 64bits into a long
  midh =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);
  high =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);

  // Unpack index
  index = 0;

  // Create the state of the decimal
  const dec = {
    low: new Long(low, midl),
    high: new Long(midh, high)
  };

  if (dec.high.lessThan(Long.ZERO)) {
    string.push('-');
  }

  // Decode combination field and exponent
  combination = (high >> 26) & COMBINATION_MASK;

  if (combination >> 3 === 3) {
    // Check for 'special' values
    if (combination === COMBINATION_INFINITY) {
      return string.join('') + 'Infinity';
    } else if (combination === COMBINATION_NAN) {
      return 'NaN';
    } else {
      biased_exponent = (high >> 15) & EXPONENT_MASK;
      significand_msb = 0x08 + ((high >> 14) & 0x01);
    }
  } else {
    significand_msb = (high >> 14) & 0x07;
    biased_exponent = (high >> 17) & EXPONENT_MASK;
  }

  exponent = biased_exponent - EXPONENT_BIAS;

  // Create string of significand digits

  // Convert the 114-bit binary number represented by
  // (significand_high, significand_low) to at most 34 decimal
  // digits through modulo and division.
  significand128.parts[0] = (high & 0x3fff) + ((significand_msb & 0xf) << 14);
  significand128.parts[1] = midh;
  significand128.parts[2] = midl;
  significand128.parts[3] = low;

  if (
    significand128.parts[0] === 0 &&
    significand128.parts[1] === 0 &&
    significand128.parts[2] === 0 &&
    significand128.parts[3] === 0
  ) {
    is_zero = true;
  } else {
    for (k = 3; k >= 0; k--) {
      let least_digits = 0;
      // Peform the divide
      let result = divideu128(significand128);
      significand128 = result.quotient;
      least_digits = result.rem.low;

      // We now have the 9 least significant digits (in base 2).
      // Convert and output to string.
      if (!least_digits) continue;

      for (j = 8; j >= 0; j--) {
        // significand[k * 9 + j] = Math.round(least_digits % 10);
        significand[k * 9 + j] = least_digits % 10;
        // least_digits = Math.round(least_digits / 10);
        least_digits = Math.floor(least_digits / 10);
      }
    }
  }

  // Output format options:
  // Scientific - [-]d.dddE(+/-)dd or [-]dE(+/-)dd
  // Regular    - ddd.ddd

  if (is_zero) {
    significand_digits = 1;
    significand[index] = 0;
  } else {
    significand_digits = 36;
    while (!significand[index]) {
      significand_digits = significand_digits - 1;
      index = index + 1;
    }
  }

  scientific_exponent = significand_digits - 1 + exponent;

  // The scientific exponent checks are dictated by the string conversion
  // specification and are somewhat arbitrary cutoffs.
  //
  // We must check exponent > 0, because if this is the case, the number
  // has trailing zeros.  However, we *cannot* output these trailing zeros,
  // because doing so would change the precision of the value, and would
  // change stored data if the string converted number is round tripped.
  if (scientific_exponent >= 34 || scientific_exponent <= -7 || exponent > 0) {
    // Scientific format

    // if there are too many significant digits, we should just be treating numbers
    // as + or - 0 and using the non-scientific exponent (this is for the "invalid
    // representation should be treated as 0/-0" spec cases in decimal128-1.json)
    if (significand_digits > 34) {
      string.push(0);
      if (exponent > 0) string.push('E+' + exponent);
      else if (exponent < 0) string.push('E' + exponent);
      return string.join('');
    }

    string.push(significand[index++]);
    significand_digits = significand_digits - 1;

    if (significand_digits) {
      string.push('.');
    }

    for (let i = 0; i < significand_digits; i++) {
      string.push(significand[index++]);
    }

    // Exponent
    string.push('E');
    if (scientific_exponent > 0) {
      string.push('+' + scientific_exponent);
    } else {
      string.push(scientific_exponent);
    }
  } else {
    // Regular format with no decimal place
    if (exponent >= 0) {
      for (let i = 0; i < significand_digits; i++) {
        string.push(significand[index++]);
      }
    } else {
      let radix_position = significand_digits + exponent;

      // non-zero digits before radix
      if (radix_position > 0) {
        for (let i = 0; i < radix_position; i++) {
          string.push(significand[index++]);
        }
      } else {
        string.push('0');
      }

      string.push('.');
      // add leading zeros after radix
      while (radix_position++ < 0) {
        string.push('0');
      }

      for (let i = 0; i < significand_digits - Math.max(radix_position - 1, 0); i++) {
        string.push(significand[index++]);
      }
    }
  }

  return string.join('');
};

Decimal128.prototype.toJSON = function() {
  return { $numberDecimal: this.toString() };
};

/**
 * @ignore
 */
Decimal128.prototype.toExtendedJSON = function() {
  return { $numberDecimal: this.toString() };
};

/**
 * @ignore
 */
Decimal128.fromExtendedJSON = function(doc) {
  return Decimal128.fromString(doc.$numberDecimal);
};

Object.defineProperty(Decimal128.prototype, '_bsontype', { value: 'Decimal128' });
module.exports = Decimal128;

}, function(modId) { var map = {"./long":1583600334722}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334732, function(require, module, exports) {

/**
 * A class representation of the BSON MinKey type.
 */
class MinKey {
  /**
   * Create a MinKey type
   *
   * @return {MinKey} A MinKey instance
   */
  constructor() {}

  /**
   * @ignore
   */
  toExtendedJSON() {
    return { $minKey: 1 };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON() {
    return new MinKey();
  }
}

Object.defineProperty(MinKey.prototype, '_bsontype', { value: 'MinKey' });
module.exports = MinKey;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334733, function(require, module, exports) {

/**
 * A class representation of the BSON MaxKey type.
 */
class MaxKey {
  /**
   * Create a MaxKey type
   *
   * @return {MaxKey} A MaxKey instance
   */
  constructor() {}

  /**
   * @ignore
   */
  toExtendedJSON() {
    return { $maxKey: 1 };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON() {
    return new MaxKey();
  }
}

Object.defineProperty(MaxKey.prototype, '_bsontype', { value: 'MaxKey' });
module.exports = MaxKey;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334734, function(require, module, exports) {


/**
 * A class representation of the BSON DBRef type.
 */
class DBRef {
  /**
   * Create a DBRef type
   *
   * @param {string} collection the collection name.
   * @param {ObjectId} oid the reference ObjectId.
   * @param {string} [db] optional db name, if omitted the reference is local to the current db.
   * @return {DBRef}
   */
  constructor(collection, oid, db, fields) {
    // check if namespace has been provided
    const parts = collection.split('.');
    if (parts.length === 2) {
      db = parts.shift();
      collection = parts.shift();
    }

    this.collection = collection;
    this.oid = oid;
    this.db = db;
    this.fields = fields || {};
  }

  /**
   * @ignore
   * @api private
   */
  toJSON() {
    const o = Object.assign(
      {
        $ref: this.collection,
        $id: this.oid
      },
      this.fields
    );

    if (this.db != null) o.$db = this.db;
    return o;
  }

  /**
   * @ignore
   */
  toExtendedJSON(options) {
    options = options || {};
    let o = {
      $ref: this.collection,
      $id: this.oid
    };

    if (options.legacy) {
      return o;
    }

    if (this.db) o.$db = this.db;
    o = Object.assign(o, this.fields);
    return o;
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc) {
    var copy = Object.assign({}, doc);
    ['$ref', '$id', '$db'].forEach(k => delete copy[k]);
    return new DBRef(doc.$ref, doc.$id, doc.$db, copy);
  }
}

Object.defineProperty(DBRef.prototype, '_bsontype', { value: 'DBRef' });
// the 1.x parser used a "namespace" property, while 4.x uses "collection". To ensure backwards
// compatibility, let's expose "namespace"
Object.defineProperty(DBRef.prototype, 'namespace', {
  get() {
    return this.collection;
  },
  set(val) {
    this.collection = val;
  },
  configurable: false
});
module.exports = DBRef;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334735, function(require, module, exports) {


const Buffer = require('buffer').Buffer;

/**
 * A class representation of the BSON Binary type.
 */
class Binary {
  /**
   * Create a Binary type
   *
   * Sub types
   *  - **BSON.BSON_BINARY_SUBTYPE_DEFAULT**, default BSON type.
   *  - **BSON.BSON_BINARY_SUBTYPE_FUNCTION**, BSON function type.
   *  - **BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY**, BSON byte array type.
   *  - **BSON.BSON_BINARY_SUBTYPE_UUID**, BSON uuid type.
   *  - **BSON.BSON_BINARY_SUBTYPE_MD5**, BSON md5 type.
   *  - **BSON.BSON_BINARY_SUBTYPE_USER_DEFINED**, BSON user defined type.
   *
   * @param {Buffer} buffer a buffer object containing the binary data.
   * @param {Number} [subType] the option binary type.
   * @return {Binary}
   */
  constructor(buffer, subType) {
    if (
      buffer != null &&
      !(typeof buffer === 'string') &&
      !Buffer.isBuffer(buffer) &&
      !(buffer instanceof Uint8Array) &&
      !Array.isArray(buffer)
    ) {
      throw new TypeError('only String, Buffer, Uint8Array or Array accepted');
    }

    this.sub_type = subType == null ? BSON_BINARY_SUBTYPE_DEFAULT : subType;
    this.position = 0;

    if (buffer != null && !(buffer instanceof Number)) {
      // Only accept Buffer, Uint8Array or Arrays
      if (typeof buffer === 'string') {
        // Different ways of writing the length of the string for the different types
        if (typeof Buffer !== 'undefined') {
          this.buffer = Buffer.from(buffer);
        } else if (typeof Uint8Array !== 'undefined' || Array.isArray(buffer)) {
          this.buffer = writeStringToArray(buffer);
        } else {
          throw new TypeError('only String, Buffer, Uint8Array or Array accepted');
        }
      } else {
        this.buffer = buffer;
      }
      this.position = buffer.length;
    } else {
      if (typeof Buffer !== 'undefined') {
        this.buffer = Buffer.alloc(Binary.BUFFER_SIZE);
      } else if (typeof Uint8Array !== 'undefined') {
        this.buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE));
      } else {
        this.buffer = new Array(Binary.BUFFER_SIZE);
      }
    }
  }

  /**
   * Updates this binary with byte_value.
   *
   * @method
   * @param {string} byte_value a single byte we wish to write.
   */
  put(byte_value) {
    // If it's a string and a has more than one character throw an error
    if (byte_value['length'] != null && typeof byte_value !== 'number' && byte_value.length !== 1)
      throw new TypeError('only accepts single character String, Uint8Array or Array');
    if ((typeof byte_value !== 'number' && byte_value < 0) || byte_value > 255)
      throw new TypeError('only accepts number in a valid unsigned byte range 0-255');

    // Decode the byte value once
    let decoded_byte = null;
    if (typeof byte_value === 'string') {
      decoded_byte = byte_value.charCodeAt(0);
    } else if (byte_value['length'] != null) {
      decoded_byte = byte_value[0];
    } else {
      decoded_byte = byte_value;
    }

    if (this.buffer.length > this.position) {
      this.buffer[this.position++] = decoded_byte;
    } else {
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
        // Create additional overflow buffer
        let buffer = Buffer.alloc(Binary.BUFFER_SIZE + this.buffer.length);
        // Combine the two buffers together
        this.buffer.copy(buffer, 0, 0, this.buffer.length);
        this.buffer = buffer;
        this.buffer[this.position++] = decoded_byte;
      } else {
        let buffer = null;
        // Create a new buffer (typed or normal array)
        if (isUint8Array(this.buffer)) {
          buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE + this.buffer.length));
        } else {
          buffer = new Array(Binary.BUFFER_SIZE + this.buffer.length);
        }

        // We need to copy all the content to the new array
        for (let i = 0; i < this.buffer.length; i++) {
          buffer[i] = this.buffer[i];
        }

        // Reassign the buffer
        this.buffer = buffer;
        // Write the byte
        this.buffer[this.position++] = decoded_byte;
      }
    }
  }

  /**
   * Writes a buffer or string to the binary.
   *
   * @method
   * @param {(Buffer|string)} string a string or buffer to be written to the Binary BSON object.
   * @param {number} offset specify the binary of where to write the content.
   * @return {null}
   */
  write(string, offset) {
    offset = typeof offset === 'number' ? offset : this.position;

    // If the buffer is to small let's extend the buffer
    if (this.buffer.length < offset + string.length) {
      let buffer = null;
      // If we are in node.js
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
        buffer = Buffer.alloc(this.buffer.length + string.length);
        this.buffer.copy(buffer, 0, 0, this.buffer.length);
      } else if (isUint8Array(this.buffer)) {
        // Create a new buffer
        buffer = new Uint8Array(new ArrayBuffer(this.buffer.length + string.length));
        // Copy the content
        for (let i = 0; i < this.position; i++) {
          buffer[i] = this.buffer[i];
        }
      }

      // Assign the new buffer
      this.buffer = buffer;
    }

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(string) && Buffer.isBuffer(this.buffer)) {
      string.copy(this.buffer, offset, 0, string.length);
      this.position =
        offset + string.length > this.position ? offset + string.length : this.position;
      // offset = string.length
    } else if (
      typeof Buffer !== 'undefined' &&
      typeof string === 'string' &&
      Buffer.isBuffer(this.buffer)
    ) {
      this.buffer.write(string, offset, 'binary');
      this.position =
        offset + string.length > this.position ? offset + string.length : this.position;
      // offset = string.length;
    } else if (isUint8Array(string) || (Array.isArray(string) && typeof string !== 'string')) {
      for (let i = 0; i < string.length; i++) {
        this.buffer[offset++] = string[i];
      }

      this.position = offset > this.position ? offset : this.position;
    } else if (typeof string === 'string') {
      for (let i = 0; i < string.length; i++) {
        this.buffer[offset++] = string.charCodeAt(i);
      }

      this.position = offset > this.position ? offset : this.position;
    }
  }

  /**
   * Reads **length** bytes starting at **position**.
   *
   * @method
   * @param {number} position read from the given position in the Binary.
   * @param {number} length the number of bytes to read.
   * @return {Buffer}
   */
  read(position, length) {
    length = length && length > 0 ? length : this.position;

    // Let's return the data based on the type we have
    if (this.buffer['slice']) {
      return this.buffer.slice(position, position + length);
    }

    // Create a buffer to keep the result
    const buffer =
      typeof Uint8Array !== 'undefined'
        ? new Uint8Array(new ArrayBuffer(length))
        : new Array(length);
    for (let i = 0; i < length; i++) {
      buffer[i] = this.buffer[position++];
    }

    // Return the buffer
    return buffer;
  }

  /**
   * Returns the value of this binary as a string.
   *
   * @method
   * @return {string}
   */
  value(asRaw) {
    asRaw = asRaw == null ? false : asRaw;

    // Optimize to serialize for the situation where the data == size of buffer
    if (
      asRaw &&
      typeof Buffer !== 'undefined' &&
      Buffer.isBuffer(this.buffer) &&
      this.buffer.length === this.position
    )
      return this.buffer;

    // If it's a node.js buffer object
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
      return asRaw
        ? this.buffer.slice(0, this.position)
        : this.buffer.toString('binary', 0, this.position);
    } else {
      if (asRaw) {
        // we support the slice command use it
        if (this.buffer['slice'] != null) {
          return this.buffer.slice(0, this.position);
        } else {
          // Create a new buffer to copy content to
          const newBuffer = isUint8Array(this.buffer)
            ? new Uint8Array(new ArrayBuffer(this.position))
            : new Array(this.position);

          // Copy content
          for (let i = 0; i < this.position; i++) {
            newBuffer[i] = this.buffer[i];
          }

          // Return the buffer
          return newBuffer;
        }
      } else {
        return convertArraytoUtf8BinaryString(this.buffer, 0, this.position);
      }
    }
  }

  /**
   * Length.
   *
   * @method
   * @return {number} the length of the binary.
   */
  length() {
    return this.position;
  }

  /**
   * @ignore
   */
  toJSON() {
    return this.buffer != null ? this.buffer.toString('base64') : '';
  }

  /**
   * @ignore
   */
  toString(format) {
    return this.buffer != null ? this.buffer.slice(0, this.position).toString(format) : '';
  }

  /**
   * @ignore
   */
  toExtendedJSON(options) {
    options = options || {};
    const base64String = Buffer.isBuffer(this.buffer)
      ? this.buffer.toString('base64')
      : Buffer.from(this.buffer).toString('base64');

    const subType = Number(this.sub_type).toString(16);
    if (options.legacy) {
      return {
        $binary: base64String,
        $type: subType.length === 1 ? '0' + subType : subType
      };
    }
    return {
      $binary: {
        base64: base64String,
        subType: subType.length === 1 ? '0' + subType : subType
      }
    };
  }

  /**
   * @ignore
   */
  static fromExtendedJSON(doc, options) {
    options = options || {};
    let data, type;
    if (options.legacy) {
      type = doc.$type ? parseInt(doc.$type, 16) : 0;
      data = Buffer.from(doc.$binary, 'base64');
    } else {
      type = doc.$binary.subType ? parseInt(doc.$binary.subType, 16) : 0;
      data = Buffer.from(doc.$binary.base64, 'base64');
    }
    return new Binary(data, type);
  }
}

/**
 * Binary default subtype
 * @ignore
 */
const BSON_BINARY_SUBTYPE_DEFAULT = 0;

function isUint8Array(obj) {
  return Object.prototype.toString.call(obj) === '[object Uint8Array]';
}

/**
 * @ignore
 */
function writeStringToArray(data) {
  // Create a buffer
  const buffer =
    typeof Uint8Array !== 'undefined'
      ? new Uint8Array(new ArrayBuffer(data.length))
      : new Array(data.length);

  // Write the content to the buffer
  for (let i = 0; i < data.length; i++) {
    buffer[i] = data.charCodeAt(i);
  }
  // Write the string to the buffer
  return buffer;
}

/**
 * Convert Array ot Uint8Array to Binary String
 *
 * @ignore
 */
function convertArraytoUtf8BinaryString(byteArray, startIndex, endIndex) {
  let result = '';
  for (let i = startIndex; i < endIndex; i++) {
    result = result + String.fromCharCode(byteArray[i]);
  }

  return result;
}

Binary.BUFFER_SIZE = 256;

/**
 * Default BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_DEFAULT = 0;
/**
 * Function BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_FUNCTION = 1;
/**
 * Byte Array BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_BYTE_ARRAY = 2;
/**
 * OLD UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID_OLD = 3;
/**
 * UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID = 4;
/**
 * MD5 BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_MD5 = 5;
/**
 * User BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_USER_DEFINED = 128;

Object.defineProperty(Binary.prototype, '_bsontype', { value: 'Binary' });
module.exports = Binary;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334736, function(require, module, exports) {


module.exports = {
  // BSON MAX VALUES
  BSON_INT32_MAX: 0x7fffffff,
  BSON_INT32_MIN: -0x80000000,

  BSON_INT64_MAX: Math.pow(2, 63) - 1,
  BSON_INT64_MIN: -Math.pow(2, 63),

  // JS MAX PRECISE VALUES
  JS_INT_MAX: 0x20000000000000, // Any integer up to 2^53 can be precisely represented by a double.
  JS_INT_MIN: -0x20000000000000, // Any integer down to -2^53 can be precisely represented by a double.

  /**
   * Number BSON Type
   *
   * @classconstant BSON_DATA_NUMBER
   **/
  BSON_DATA_NUMBER: 1,

  /**
   * String BSON Type
   *
   * @classconstant BSON_DATA_STRING
   **/
  BSON_DATA_STRING: 2,

  /**
   * Object BSON Type
   *
   * @classconstant BSON_DATA_OBJECT
   **/
  BSON_DATA_OBJECT: 3,

  /**
   * Array BSON Type
   *
   * @classconstant BSON_DATA_ARRAY
   **/
  BSON_DATA_ARRAY: 4,

  /**
   * Binary BSON Type
   *
   * @classconstant BSON_DATA_BINARY
   **/
  BSON_DATA_BINARY: 5,

  /**
   * Binary BSON Type
   *
   * @classconstant BSON_DATA_UNDEFINED
   **/
  BSON_DATA_UNDEFINED: 6,

  /**
   * ObjectId BSON Type
   *
   * @classconstant BSON_DATA_OID
   **/
  BSON_DATA_OID: 7,

  /**
   * Boolean BSON Type
   *
   * @classconstant BSON_DATA_BOOLEAN
   **/
  BSON_DATA_BOOLEAN: 8,

  /**
   * Date BSON Type
   *
   * @classconstant BSON_DATA_DATE
   **/
  BSON_DATA_DATE: 9,

  /**
   * null BSON Type
   *
   * @classconstant BSON_DATA_NULL
   **/
  BSON_DATA_NULL: 10,

  /**
   * RegExp BSON Type
   *
   * @classconstant BSON_DATA_REGEXP
   **/
  BSON_DATA_REGEXP: 11,

  /**
   * Code BSON Type
   *
   * @classconstant BSON_DATA_DBPOINTER
   **/
  BSON_DATA_DBPOINTER: 12,

  /**
   * Code BSON Type
   *
   * @classconstant BSON_DATA_CODE
   **/
  BSON_DATA_CODE: 13,

  /**
   * Symbol BSON Type
   *
   * @classconstant BSON_DATA_SYMBOL
   **/
  BSON_DATA_SYMBOL: 14,

  /**
   * Code with Scope BSON Type
   *
   * @classconstant BSON_DATA_CODE_W_SCOPE
   **/
  BSON_DATA_CODE_W_SCOPE: 15,

  /**
   * 32 bit Integer BSON Type
   *
   * @classconstant BSON_DATA_INT
   **/
  BSON_DATA_INT: 16,

  /**
   * Timestamp BSON Type
   *
   * @classconstant BSON_DATA_TIMESTAMP
   **/
  BSON_DATA_TIMESTAMP: 17,

  /**
   * Long BSON Type
   *
   * @classconstant BSON_DATA_LONG
   **/
  BSON_DATA_LONG: 18,

  /**
   * Long BSON Type
   *
   * @classconstant BSON_DATA_DECIMAL128
   **/
  BSON_DATA_DECIMAL128: 19,

  /**
   * MinKey BSON Type
   *
   * @classconstant BSON_DATA_MIN_KEY
   **/
  BSON_DATA_MIN_KEY: 0xff,

  /**
   * MaxKey BSON Type
   *
   * @classconstant BSON_DATA_MAX_KEY
   **/
  BSON_DATA_MAX_KEY: 0x7f,

  /**
   * Binary Default Type
   *
   * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
   **/
  BSON_BINARY_SUBTYPE_DEFAULT: 0,

  /**
   * Binary Function Type
   *
   * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
   **/
  BSON_BINARY_SUBTYPE_FUNCTION: 1,

  /**
   * Binary Byte Array Type
   *
   * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
   **/
  BSON_BINARY_SUBTYPE_BYTE_ARRAY: 2,

  /**
   * Binary UUID Type
   *
   * @classconstant BSON_BINARY_SUBTYPE_UUID
   **/
  BSON_BINARY_SUBTYPE_UUID: 3,

  /**
   * Binary MD5 Type
   *
   * @classconstant BSON_BINARY_SUBTYPE_MD5
   **/
  BSON_BINARY_SUBTYPE_MD5: 4,

  /**
   * Binary User Defined Type
   *
   * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
   **/
  BSON_BINARY_SUBTYPE_USER_DEFINED: 128
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334737, function(require, module, exports) {


// const Buffer = require('buffer').Buffer;
// const Map = require('./map');
const Long = require('./long');
const Double = require('./double');
const Timestamp = require('./timestamp');
const ObjectId = require('./objectid');
const BSONRegExp = require('./regexp');
const Symbol = require('./symbol');
const Int32 = require('./int_32');
const Code = require('./code');
const Decimal128 = require('./decimal128');
const MinKey = require('./min_key');
const MaxKey = require('./max_key');
const DBRef = require('./db_ref');
const Binary = require('./binary');

/**
 * @namespace EJSON
 */

// all the types where we don't need to do any special processing and can just pass the EJSON
//straight to type.fromExtendedJSON
const keysToCodecs = {
  $oid: ObjectId,
  $binary: Binary,
  $symbol: Symbol,
  $numberInt: Int32,
  $numberDecimal: Decimal128,
  $numberDouble: Double,
  $numberLong: Long,
  $minKey: MinKey,
  $maxKey: MaxKey,
  $regex: BSONRegExp,
  $regularExpression: BSONRegExp,
  $timestamp: Timestamp
};

function deserializeValue(self, key, value, options) {
  if (typeof value === 'number') {
    if (options.relaxed || options.legacy) {
      return value;
    }

    // if it's an integer, should interpret as smallest BSON integer
    // that can represent it exactly. (if out of range, interpret as double.)
    if (Math.floor(value) === value) {
      if (value >= BSON_INT32_MIN && value <= BSON_INT32_MAX) return new Int32(value);
      if (value >= BSON_INT64_MIN && value <= BSON_INT64_MAX) return new Long.fromNumber(value);
    }

    // If the number is a non-integer or out of integer range, should interpret as BSON Double.
    return new Double(value);
  }

  // from here on out we're looking for bson types, so bail if its not an object
  if (value == null || typeof value !== 'object') return value;

  // upgrade deprecated undefined to null
  if (value.$undefined) return null;

  const keys = Object.keys(value).filter(k => k.startsWith('$') && value[k] != null);
  for (let i = 0; i < keys.length; i++) {
    let c = keysToCodecs[keys[i]];
    if (c) return c.fromExtendedJSON(value, options);
  }

  if (value.$date != null) {
    const d = value.$date;
    const date = new Date();

    if (options.legacy) {
      if (typeof d === 'number') date.setTime(d);
      else if (typeof d === 'string') date.setTime(Date.parse(d));
    } else {
      if (typeof d === 'string') date.setTime(Date.parse(d));
      else if (Long.isLong(d)) date.setTime(d.toNumber());
      else if (typeof d === 'number' && options.relaxed) date.setTime(d);
    }
    return date;
  }

  if (value.$code != null) {
    let copy = Object.assign({}, value);
    if (value.$scope) {
      copy.$scope = deserializeValue(self, null, value.$scope);
    }

    return Code.fromExtendedJSON(value);
  }

  if (value.$ref != null || value.$dbPointer != null) {
    let v = value.$ref ? value : value.$dbPointer;

    // we run into this in a "degenerate EJSON" case (with $id and $ref order flipped)
    // because of the order JSON.parse goes through the document
    if (v instanceof DBRef) return v;

    const dollarKeys = Object.keys(v).filter(k => k.startsWith('$'));
    let valid = true;
    dollarKeys.forEach(k => {
      if (['$ref', '$id', '$db'].indexOf(k) === -1) valid = false;
    });

    // only make DBRef if $ keys are all valid
    if (valid) return DBRef.fromExtendedJSON(v);
  }

  return value;
}

/**
 * Parse an Extended JSON string, constructing the JavaScript value or object described by that
 * string.
 *
 * @memberof EJSON
 * @param {string} text
 * @param {object} [options] Optional settings
 * @param {boolean} [options.relaxed=true] Attempt to return native JS types where possible, rather than BSON types (if true)
 * @return {object}
 *
 * @example
 * const { EJSON } = require('bson');
 * const text = '{ "int32": { "$numberInt": "10" } }';
 *
 * // prints { int32: { [String: '10'] _bsontype: 'Int32', value: '10' } }
 * console.log(EJSON.parse(text, { relaxed: false }));
 *
 * // prints { int32: 10 }
 * console.log(EJSON.parse(text));
 */
function parse(text, options) {
  options = Object.assign({}, { relaxed: true, legacy: false }, options);

  // relaxed implies not strict
  if (typeof options.relaxed === 'boolean') options.strict = !options.relaxed;
  if (typeof options.strict === 'boolean') options.relaxed = !options.strict;

  return JSON.parse(text, (key, value) => deserializeValue(this, key, value, options));
}

//
// Serializer
//

// MAX INT32 boundaries
const BSON_INT32_MAX = 0x7fffffff,
  BSON_INT32_MIN = -0x80000000,
  BSON_INT64_MAX = 0x7fffffffffffffff,
  BSON_INT64_MIN = -0x8000000000000000;

/**
 * Converts a BSON document to an Extended JSON string, optionally replacing values if a replacer
 * function is specified or optionally including only the specified properties if a replacer array
 * is specified.
 *
 * @memberof EJSON
 * @param {object} value The value to convert to extended JSON
 * @param {function|array} [replacer] A function that alters the behavior of the stringification process, or an array of String and Number objects that serve as a whitelist for selecting/filtering the properties of the value object to be included in the JSON string. If this value is null or not provided, all properties of the object are included in the resulting JSON string
 * @param {string|number} [space] A String or Number object that's used to insert white space into the output JSON string for readability purposes.
 * @param {object} [options] Optional settings
 * @param {boolean} [options.relaxed=true] Enabled Extended JSON's `relaxed` mode
 * @param {boolean} [options.legacy=false] Output using the Extended JSON v1 spec
 * @returns {string}
 *
 * @example
 * const { EJSON } = require('bson');
 * const Int32 = require('mongodb').Int32;
 * const doc = { int32: new Int32(10) };
 *
 * // prints '{"int32":{"$numberInt":"10"}}'
 * console.log(EJSON.stringify(doc, { relaxed: false }));
 *
 * // prints '{"int32":10}'
 * console.log(EJSON.stringify(doc));
 */
function stringify(value, replacer, space, options) {
  if (space != null && typeof space === 'object') {
    options = space;
    space = 0;
  }
  if (replacer != null && typeof replacer === 'object' && !Array.isArray(replacer)) {
    options = replacer;
    replacer = null;
    space = 0;
  }
  options = Object.assign({}, { relaxed: true, legacy: false }, options);

  const doc = Array.isArray(value)
    ? serializeArray(value, options)
    : serializeDocument(value, options);

  return JSON.stringify(doc, replacer, space);
}

/**
 * Serializes an object to an Extended JSON string, and reparse it as a JavaScript object.
 *
 * @memberof EJSON
 * @param {object} bson The object to serialize
 * @param {object} [options] Optional settings passed to the `stringify` function
 * @return {object}
 */
function serialize(bson, options) {
  options = options || {};
  return JSON.parse(stringify(bson, options));
}

/**
 * Deserializes an Extended JSON object into a plain JavaScript object with native/BSON types
 *
 * @memberof EJSON
 * @param {object} ejson The Extended JSON object to deserialize
 * @param {object} [options] Optional settings passed to the parse method
 * @return {object}
 */
function deserialize(ejson, options) {
  options = options || {};
  return parse(JSON.stringify(ejson), options);
}

function serializeArray(array, options) {
  return array.map(v => serializeValue(v, options));
}

function getISOString(date) {
  const isoStr = date.toISOString();
  // we should only show milliseconds in timestamp if they're non-zero
  return date.getUTCMilliseconds() !== 0 ? isoStr : isoStr.slice(0, -5) + 'Z';
}

function serializeValue(value, options) {
  if (Array.isArray(value)) return serializeArray(value, options);

  if (value === undefined) return null;

  if (value instanceof Date) {
    let dateNum = value.getTime(),
      // is it in year range 1970-9999?
      inRange = dateNum > -1 && dateNum < 253402318800000;

    if (options.legacy) {
      return options.relaxed && inRange
        ? { $date: value.getTime() }
        : { $date: getISOString(value) };
    }
    return options.relaxed && inRange
      ? { $date: getISOString(value) }
      : { $date: { $numberLong: value.getTime().toString() } };
  }

  if (typeof value === 'number' && !options.relaxed) {
    // it's an integer
    if (Math.floor(value) === value) {
      let int32Range = value >= BSON_INT32_MIN && value <= BSON_INT32_MAX,
        int64Range = value >= BSON_INT64_MIN && value <= BSON_INT64_MAX;

      // interpret as being of the smallest BSON integer type that can represent the number exactly
      if (int32Range) return { $numberInt: value.toString() };
      if (int64Range) return { $numberLong: value.toString() };
    }
    return { $numberDouble: value.toString() };
  }

  if (value instanceof RegExp) {
    let flags = value.flags;
    if (flags === undefined) {
      flags = value.toString().match(/[gimuy]*$/)[0];
    }

    const rx = new BSONRegExp(value.source, flags);
    return rx.toExtendedJSON(options);
  }

  if (value != null && typeof value === 'object') return serializeDocument(value, options);
  return value;
}

const BSON_TYPE_MAPPINGS = {
  Binary: o => new Binary(o.value(), o.subtype),
  Code: o => new Code(o.code, o.scope),
  DBRef: o => new DBRef(o.collection || o.namespace, o.oid, o.db, o.fields), // "namespace" for 1.x library backwards compat
  Decimal128: o => new Decimal128(o.bytes),
  Double: o => new Double(o.value),
  Int32: o => new Int32(o.value),
  Long: o =>
    Long.fromBits(
      // underscore variants for 1.x backwards compatibility
      o.low != null ? o.low : o.low_,
      o.low != null ? o.high : o.high_,
      o.low != null ? o.unsigned : o.unsigned_
    ),
  MaxKey: () => new MaxKey(),
  MinKey: () => new MinKey(),
  ObjectID: o => new ObjectId(o),
  ObjectId: o => new ObjectId(o), // support 4.0.0/4.0.1 before _bsontype was reverted back to ObjectID
  BSONRegExp: o => new BSONRegExp(o.pattern, o.options),
  Symbol: o => new Symbol(o.value),
  Timestamp: o => Timestamp.fromBits(o.low, o.high)
};

function serializeDocument(doc, options) {
  if (doc == null || typeof doc !== 'object') throw new Error('not an object instance');

  const bsontype = doc._bsontype;
  if (typeof bsontype === 'undefined') {
    // It's a regular object. Recursively serialize its property values.
    const _doc = {};
    for (let name in doc) {
      _doc[name] = serializeValue(doc[name], options);
    }
    return _doc;
  } else if (typeof bsontype === 'string') {
    // the "document" is really just a BSON type object
    let _doc = doc;
    if (typeof _doc.toExtendedJSON !== 'function') {
      // There's no EJSON serialization function on the object. It's probably an
      // object created by a previous version of this library (or another library)
      // that's duck-typing objects to look like they were generated by this library).
      // Copy the object into this library's version of that type.
      const mapper = BSON_TYPE_MAPPINGS[bsontype];
      if (!mapper) {
        throw new TypeError('Unrecognized or invalid _bsontype: ' + bsontype);
      }
      _doc = mapper(_doc);
    }

    // Two BSON types may have nested objects that may need to be serialized too
    if (bsontype === 'Code' && _doc.scope) {
      _doc = new Code(_doc.code, serializeValue(_doc.scope, options));
    } else if (bsontype === 'DBRef' && _doc.oid) {
      _doc = new DBRef(_doc.collection, serializeValue(_doc.oid, options), _doc.db, _doc.fields);
    }

    return _doc.toExtendedJSON(options);
  } else {
    throw new Error('_bsontype must be a string, but was: ' + typeof bsontype);
  }
}

module.exports = {
  parse,
  deserialize,
  serialize,
  stringify
};

}, function(modId) { var map = {"./long":1583600334722,"./double":1583600334723,"./timestamp":1583600334724,"./objectid":1583600334725,"./regexp":1583600334727,"./symbol":1583600334728,"./int_32":1583600334729,"./code":1583600334730,"./decimal128":1583600334731,"./min_key":1583600334732,"./max_key":1583600334733,"./db_ref":1583600334734,"./binary":1583600334735}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334738, function(require, module, exports) {


const Buffer = require('buffer').Buffer;
const Long = require('../long');
const Double = require('../double');
const Timestamp = require('../timestamp');
const ObjectId = require('../objectid');
const Code = require('../code');
const MinKey = require('../min_key');
const MaxKey = require('../max_key');
const Decimal128 = require('../decimal128');
const Int32 = require('../int_32');
const DBRef = require('../db_ref');
const BSONRegExp = require('../regexp');
const Binary = require('../binary');
const constants = require('../constants');
const validateUtf8 = require('../validate_utf8').validateUtf8;

// Internal long versions
const JS_INT_MAX_LONG = Long.fromNumber(constants.JS_INT_MAX);
const JS_INT_MIN_LONG = Long.fromNumber(constants.JS_INT_MIN);

const functionCache = {};

function deserialize(buffer, options, isArray) {
  options = options == null ? {} : options;
  const index = options && options.index ? options.index : 0;
  // Read the document size
  const size =
    buffer[index] |
    (buffer[index + 1] << 8) |
    (buffer[index + 2] << 16) |
    (buffer[index + 3] << 24);

  if (size < 5) {
    throw new Error(`bson size must be >= 5, is ${size}`);
  }

  if (options.allowObjectSmallerThanBufferSize && buffer.length < size) {
    throw new Error(`buffer length ${buffer.length} must be >= bson size ${size}`);
  }

  if (!options.allowObjectSmallerThanBufferSize && buffer.length !== size) {
    throw new Error(`buffer length ${buffer.length} must === bson size ${size}`);
  }

  if (size + index > buffer.length) {
    throw new Error(
      `(bson size ${size} + options.index ${index} must be <= buffer length ${Buffer.byteLength(
        buffer
      )})`
    );
  }

  // Illegal end value
  if (buffer[index + size - 1] !== 0) {
    throw new Error("One object, sized correctly, with a spot for an EOO, but the EOO isn't 0x00");
  }

  // Start deserializtion
  return deserializeObject(buffer, index, options, isArray);
}

function deserializeObject(buffer, index, options, isArray) {
  const evalFunctions = options['evalFunctions'] == null ? false : options['evalFunctions'];
  const cacheFunctions = options['cacheFunctions'] == null ? false : options['cacheFunctions'];
  const cacheFunctionsCrc32 =
    options['cacheFunctionsCrc32'] == null ? false : options['cacheFunctionsCrc32'];

  if (!cacheFunctionsCrc32) var crc32 = null;

  const fieldsAsRaw = options['fieldsAsRaw'] == null ? null : options['fieldsAsRaw'];

  // Return raw bson buffer instead of parsing it
  const raw = options['raw'] == null ? false : options['raw'];

  // Return BSONRegExp objects instead of native regular expressions
  const bsonRegExp = typeof options['bsonRegExp'] === 'boolean' ? options['bsonRegExp'] : false;

  // Controls the promotion of values vs wrapper classes
  const promoteBuffers = options['promoteBuffers'] == null ? false : options['promoteBuffers'];
  const promoteLongs = options['promoteLongs'] == null ? true : options['promoteLongs'];
  const promoteValues = options['promoteValues'] == null ? true : options['promoteValues'];

  // Set the start index
  let startIndex = index;

  // Validate that we have at least 4 bytes of buffer
  if (buffer.length < 5) throw new Error('corrupt bson message < 5 bytes long');

  // Read the document size
  const size =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);

  // Ensure buffer is valid size
  if (size < 5 || size > buffer.length) throw new Error('corrupt bson message');

  // Create holding object
  const object = isArray ? [] : {};
  // Used for arrays to skip having to perform utf8 decoding
  let arrayIndex = 0;
  let done = false;

  // While we have more left data left keep parsing
  while (!done) {
    // Read the type
    const elementType = buffer[index++];

    // If we get a zero it's the last byte, exit
    if (elementType === 0) break;

    // Get the start search index
    let i = index;
    // Locate the end of the c string
    while (buffer[i] !== 0x00 && i < buffer.length) {
      i++;
    }

    // If are at the end of the buffer there is a problem with the document
    if (i >= Buffer.byteLength(buffer)) throw new Error('Bad BSON Document: illegal CString');
    const name = isArray ? arrayIndex++ : buffer.toString('utf8', index, i);

    index = i + 1;

    if (elementType === constants.BSON_DATA_STRING) {
      const stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');

      if (!validateUtf8(buffer, index, index + stringSize - 1)) {
        throw new Error('Invalid UTF-8 string in BSON document');
      }

      const s = buffer.toString('utf8', index, index + stringSize - 1);

      object[name] = s;
      index = index + stringSize;
    } else if (elementType === constants.BSON_DATA_OID) {
      const oid = Buffer.alloc(12);
      buffer.copy(oid, 0, index, index + 12);
      object[name] = new ObjectId(oid);
      index = index + 12;
    } else if (elementType === constants.BSON_DATA_INT && promoteValues === false) {
      object[name] = new Int32(
        buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24)
      );
    } else if (elementType === constants.BSON_DATA_INT) {
      object[name] =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
    } else if (elementType === constants.BSON_DATA_NUMBER && promoteValues === false) {
      object[name] = new Double(buffer.readDoubleLE(index));
      index = index + 8;
    } else if (elementType === constants.BSON_DATA_NUMBER) {
      object[name] = buffer.readDoubleLE(index);
      index = index + 8;
    } else if (elementType === constants.BSON_DATA_DATE) {
      const lowBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      const highBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      object[name] = new Date(new Long(lowBits, highBits).toNumber());
    } else if (elementType === constants.BSON_DATA_BOOLEAN) {
      if (buffer[index] !== 0 && buffer[index] !== 1) throw new Error('illegal boolean type value');
      object[name] = buffer[index++] === 1;
    } else if (elementType === constants.BSON_DATA_OBJECT) {
      const _index = index;
      const objectSize =
        buffer[index] |
        (buffer[index + 1] << 8) |
        (buffer[index + 2] << 16) |
        (buffer[index + 3] << 24);
      if (objectSize <= 0 || objectSize > buffer.length - index)
        throw new Error('bad embedded document length in bson');

      // We have a raw value
      if (raw) {
        object[name] = buffer.slice(index, index + objectSize);
      } else {
        object[name] = deserializeObject(buffer, _index, options, false);
      }

      index = index + objectSize;
    } else if (elementType === constants.BSON_DATA_ARRAY) {
      const _index = index;
      const objectSize =
        buffer[index] |
        (buffer[index + 1] << 8) |
        (buffer[index + 2] << 16) |
        (buffer[index + 3] << 24);
      let arrayOptions = options;

      // Stop index
      const stopIndex = index + objectSize;

      // All elements of array to be returned as raw bson
      if (fieldsAsRaw && fieldsAsRaw[name]) {
        arrayOptions = {};
        for (let n in options) arrayOptions[n] = options[n];
        arrayOptions['raw'] = true;
      }

      object[name] = deserializeObject(buffer, _index, arrayOptions, true);
      index = index + objectSize;

      if (buffer[index - 1] !== 0) throw new Error('invalid array terminator byte');
      if (index !== stopIndex) throw new Error('corrupted array bson');
    } else if (elementType === constants.BSON_DATA_UNDEFINED) {
      object[name] = undefined;
    } else if (elementType === constants.BSON_DATA_NULL) {
      object[name] = null;
    } else if (elementType === constants.BSON_DATA_LONG) {
      // Unpack the low and high bits
      const lowBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      const highBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      const long = new Long(lowBits, highBits);
      // Promote the long if possible
      if (promoteLongs && promoteValues === true) {
        object[name] =
          long.lessThanOrEqual(JS_INT_MAX_LONG) && long.greaterThanOrEqual(JS_INT_MIN_LONG)
            ? long.toNumber()
            : long;
      } else {
        object[name] = long;
      }
    } else if (elementType === constants.BSON_DATA_DECIMAL128) {
      // Buffer to contain the decimal bytes
      const bytes = Buffer.alloc(16);
      // Copy the next 16 bytes into the bytes buffer
      buffer.copy(bytes, 0, index, index + 16);
      // Update index
      index = index + 16;
      // Assign the new Decimal128 value
      const decimal128 = new Decimal128(bytes);
      // If we have an alternative mapper use that
      object[name] = decimal128.toObject ? decimal128.toObject() : decimal128;
    } else if (elementType === constants.BSON_DATA_BINARY) {
      let binarySize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      const totalBinarySize = binarySize;
      const subType = buffer[index++];

      // Did we have a negative binary size, throw
      if (binarySize < 0) throw new Error('Negative binary type element size found');

      // Is the length longer than the document
      if (binarySize > Buffer.byteLength(buffer))
        throw new Error('Binary type size larger than document size');

      // Decode as raw Buffer object if options specifies it
      if (buffer['slice'] != null) {
        // If we have subtype 2 skip the 4 bytes for the size
        if (subType === Binary.SUBTYPE_BYTE_ARRAY) {
          binarySize =
            buffer[index++] |
            (buffer[index++] << 8) |
            (buffer[index++] << 16) |
            (buffer[index++] << 24);
          if (binarySize < 0)
            throw new Error('Negative binary type element size found for subtype 0x02');
          if (binarySize > totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to long binary size');
          if (binarySize < totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to short binary size');
        }

        if (promoteBuffers && promoteValues) {
          object[name] = buffer.slice(index, index + binarySize);
        } else {
          object[name] = new Binary(buffer.slice(index, index + binarySize), subType);
        }
      } else {
        const _buffer =
          typeof Uint8Array !== 'undefined'
            ? new Uint8Array(new ArrayBuffer(binarySize))
            : new Array(binarySize);
        // If we have subtype 2 skip the 4 bytes for the size
        if (subType === Binary.SUBTYPE_BYTE_ARRAY) {
          binarySize =
            buffer[index++] |
            (buffer[index++] << 8) |
            (buffer[index++] << 16) |
            (buffer[index++] << 24);
          if (binarySize < 0)
            throw new Error('Negative binary type element size found for subtype 0x02');
          if (binarySize > totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to long binary size');
          if (binarySize < totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to short binary size');
        }

        // Copy the data
        for (i = 0; i < binarySize; i++) {
          _buffer[i] = buffer[index + i];
        }

        if (promoteBuffers && promoteValues) {
          object[name] = _buffer;
        } else {
          object[name] = new Binary(_buffer, subType);
        }
      }

      // Update the index
      index = index + binarySize;
    } else if (elementType === constants.BSON_DATA_REGEXP && bsonRegExp === false) {
      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      const source = buffer.toString('utf8', index, i);
      // Create the regexp
      index = i + 1;

      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      const regExpOptions = buffer.toString('utf8', index, i);
      index = i + 1;

      // For each option add the corresponding one for javascript
      const optionsArray = new Array(regExpOptions.length);

      // Parse options
      for (i = 0; i < regExpOptions.length; i++) {
        switch (regExpOptions[i]) {
          case 'm':
            optionsArray[i] = 'm';
            break;
          case 's':
            optionsArray[i] = 'g';
            break;
          case 'i':
            optionsArray[i] = 'i';
            break;
        }
      }

      object[name] = new RegExp(source, optionsArray.join(''));
    } else if (elementType === constants.BSON_DATA_REGEXP && bsonRegExp === true) {
      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      const source = buffer.toString('utf8', index, i);
      index = i + 1;

      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      const regExpOptions = buffer.toString('utf8', index, i);
      index = i + 1;

      // Set the object
      object[name] = new BSONRegExp(source, regExpOptions);
    } else if (elementType === constants.BSON_DATA_SYMBOL) {
      const stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');
      // symbol is deprecated - upgrade to string.
      object[name] = buffer.toString('utf8', index, index + stringSize - 1);
      index = index + stringSize;
    } else if (elementType === constants.BSON_DATA_TIMESTAMP) {
      const lowBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      const highBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);

      object[name] = new Timestamp(lowBits, highBits);
    } else if (elementType === constants.BSON_DATA_MIN_KEY) {
      object[name] = new MinKey();
    } else if (elementType === constants.BSON_DATA_MAX_KEY) {
      object[name] = new MaxKey();
    } else if (elementType === constants.BSON_DATA_CODE) {
      const stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');
      const functionString = buffer.toString('utf8', index, index + stringSize - 1);

      // If we are evaluating the functions
      if (evalFunctions) {
        // If we have cache enabled let's look for the md5 of the function in the cache
        if (cacheFunctions) {
          const hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
          // Got to do this to avoid V8 deoptimizing the call due to finding eval
          object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
        } else {
          object[name] = isolateEval(functionString);
        }
      } else {
        object[name] = new Code(functionString);
      }

      // Update parse index position
      index = index + stringSize;
    } else if (elementType === constants.BSON_DATA_CODE_W_SCOPE) {
      const totalSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);

      // Element cannot be shorter than totalSize + stringSize + documentSize + terminator
      if (totalSize < 4 + 4 + 4 + 1) {
        throw new Error('code_w_scope total size shorter minimum expected length');
      }

      // Get the code string size
      const stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      // Check if we have a valid string
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');

      // Javascript function
      const functionString = buffer.toString('utf8', index, index + stringSize - 1);
      // Update parse index position
      index = index + stringSize;
      // Parse the element
      const _index = index;
      // Decode the size of the object document
      const objectSize =
        buffer[index] |
        (buffer[index + 1] << 8) |
        (buffer[index + 2] << 16) |
        (buffer[index + 3] << 24);
      // Decode the scope object
      const scopeObject = deserializeObject(buffer, _index, options, false);
      // Adjust the index
      index = index + objectSize;

      // Check if field length is to short
      if (totalSize < 4 + 4 + objectSize + stringSize) {
        throw new Error('code_w_scope total size is to short, truncating scope');
      }

      // Check if totalSize field is to long
      if (totalSize > 4 + 4 + objectSize + stringSize) {
        throw new Error('code_w_scope total size is to long, clips outer document');
      }

      // If we are evaluating the functions
      if (evalFunctions) {
        // If we have cache enabled let's look for the md5 of the function in the cache
        if (cacheFunctions) {
          const hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
          // Got to do this to avoid V8 deoptimizing the call due to finding eval
          object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
        } else {
          object[name] = isolateEval(functionString);
        }

        object[name].scope = scopeObject;
      } else {
        object[name] = new Code(functionString, scopeObject);
      }
    } else if (elementType === constants.BSON_DATA_DBPOINTER) {
      // Get the code string size
      const stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      // Check if we have a valid string
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');
      // Namespace
      if (!validateUtf8(buffer, index, index + stringSize - 1)) {
        throw new Error('Invalid UTF-8 string in BSON document');
      }
      const namespace = buffer.toString('utf8', index, index + stringSize - 1);
      // Update parse index position
      index = index + stringSize;

      // Read the oid
      const oidBuffer = Buffer.alloc(12);
      buffer.copy(oidBuffer, 0, index, index + 12);
      const oid = new ObjectId(oidBuffer);

      // Update the index
      index = index + 12;

      // Upgrade to DBRef type
      object[name] = new DBRef(namespace, oid);
    } else {
      throw new Error(
        'Detected unknown BSON type ' +
          elementType.toString(16) +
          ' for fieldname "' +
          name +
          '", are you using the latest BSON parser?'
      );
    }
  }

  // Check if the deserialization was against a valid array/object
  if (size !== index - startIndex) {
    if (isArray) throw new Error('corrupt array bson');
    throw new Error('corrupt object bson');
  }

  // check if object's $ keys are those of a DBRef
  const dollarKeys = Object.keys(object).filter(k => k.startsWith('$'));
  let valid = true;
  dollarKeys.forEach(k => {
    if (['$ref', '$id', '$db'].indexOf(k) === -1) valid = false;
  });

  // if a $key not in "$ref", "$id", "$db", don't make a DBRef
  if (!valid) return object;

  if (object['$id'] != null && object['$ref'] != null) {
    let copy = Object.assign({}, object);
    delete copy.$ref;
    delete copy.$id;
    delete copy.$db;
    return new DBRef(object.$ref, object.$id, object.$db || null, copy);
  }

  return object;
}

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
function isolateEvalWithHash(functionCache, hash, functionString, object) {
  // Contains the value we are going to set
  let value = null;

  // Check for cache hit, eval if missing and return cached function
  if (functionCache[hash] == null) {
    eval('value = ' + functionString);
    functionCache[hash] = value;
  }

  // Set the object
  return functionCache[hash].bind(object);
}

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
function isolateEval(functionString) {
  // Contains the value we are going to set
  let value = null;
  // Eval the function
  eval('value = ' + functionString);
  return value;
}

module.exports = deserialize;

}, function(modId) { var map = {"../long":1583600334722,"../double":1583600334723,"../timestamp":1583600334724,"../objectid":1583600334725,"../code":1583600334730,"../min_key":1583600334732,"../max_key":1583600334733,"../decimal128":1583600334731,"../int_32":1583600334729,"../db_ref":1583600334734,"../regexp":1583600334727,"../binary":1583600334735,"../constants":1583600334736,"../validate_utf8":1583600334739}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334739, function(require, module, exports) {


const FIRST_BIT = 0x80;
const FIRST_TWO_BITS = 0xc0;
const FIRST_THREE_BITS = 0xe0;
const FIRST_FOUR_BITS = 0xf0;
const FIRST_FIVE_BITS = 0xf8;

const TWO_BIT_CHAR = 0xc0;
const THREE_BIT_CHAR = 0xe0;
const FOUR_BIT_CHAR = 0xf0;
const CONTINUING_CHAR = 0x80;

/**
 * Determines if the passed in bytes are valid utf8
 * @param {Buffer|Uint8Array} bytes An array of 8-bit bytes. Must be indexable and have length property
 * @param {Number} start The index to start validating
 * @param {Number} end The index to end validating
 * @returns {boolean} True if valid utf8
 */
function validateUtf8(bytes, start, end) {
  let continuation = 0;

  for (let i = start; i < end; i += 1) {
    const byte = bytes[i];

    if (continuation) {
      if ((byte & FIRST_TWO_BITS) !== CONTINUING_CHAR) {
        return false;
      }
      continuation -= 1;
    } else if (byte & FIRST_BIT) {
      if ((byte & FIRST_THREE_BITS) === TWO_BIT_CHAR) {
        continuation = 1;
      } else if ((byte & FIRST_FOUR_BITS) === THREE_BIT_CHAR) {
        continuation = 2;
      } else if ((byte & FIRST_FIVE_BITS) === FOUR_BIT_CHAR) {
        continuation = 3;
      } else {
        return false;
      }
    }
  }

  return !continuation;
}

module.exports.validateUtf8 = validateUtf8;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334740, function(require, module, exports) {


const Buffer = require('buffer').Buffer;
const writeIEEE754 = require('../float_parser').writeIEEE754;
const Long = require('../long');
const Map = require('../map');
const Binary = require('../binary');
const constants = require('../constants');
const normalizedFunctionString = require('./utils').normalizedFunctionString;

const regexp = /\x00/; // eslint-disable-line no-control-regex
const ignoreKeys = new Set(['$db', '$ref', '$id', '$clusterTime']);

// To ensure that 0.4 of node works correctly
const isDate = function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
};

const isRegExp = function isRegExp(d) {
  return Object.prototype.toString.call(d) === '[object RegExp]';
};

function serializeString(buffer, key, value, index, isArray) {
  // Encode String type
  buffer[index++] = constants.BSON_DATA_STRING;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes + 1;
  buffer[index - 1] = 0;
  // Write the string
  const size = buffer.write(value, index + 4, 'utf8');
  // Write the size of the string to buffer
  buffer[index + 3] = ((size + 1) >> 24) & 0xff;
  buffer[index + 2] = ((size + 1) >> 16) & 0xff;
  buffer[index + 1] = ((size + 1) >> 8) & 0xff;
  buffer[index] = (size + 1) & 0xff;
  // Update index
  index = index + 4 + size;
  // Write zero
  buffer[index++] = 0;
  return index;
}

function serializeNumber(buffer, key, value, index, isArray) {
  // We have an integer value
  if (
    Math.floor(value) === value &&
    value >= constants.JS_INT_MIN &&
    value <= constants.JS_INT_MAX
  ) {
    // If the value fits in 32 bits encode as int, if it fits in a double
    // encode it as a double, otherwise long
    if (value >= constants.BSON_INT32_MIN && value <= constants.BSON_INT32_MAX) {
      // Set int type 32 bits or less
      buffer[index++] = constants.BSON_DATA_INT;
      // Number of written bytes
      const numberOfWrittenBytes = !isArray
        ? buffer.write(key, index, 'utf8')
        : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      // Write the int value
      buffer[index++] = value & 0xff;
      buffer[index++] = (value >> 8) & 0xff;
      buffer[index++] = (value >> 16) & 0xff;
      buffer[index++] = (value >> 24) & 0xff;
    } else if (value >= constants.JS_INT_MIN && value <= constants.JS_INT_MAX) {
      // Encode as double
      buffer[index++] = constants.BSON_DATA_NUMBER;
      // Number of written bytes
      const numberOfWrittenBytes = !isArray
        ? buffer.write(key, index, 'utf8')
        : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      // Write float
      writeIEEE754(buffer, value, index, 'little', 52, 8);
      // Ajust index
      index = index + 8;
    } else {
      // Set long type
      buffer[index++] = constants.BSON_DATA_LONG;
      // Number of written bytes
      const numberOfWrittenBytes = !isArray
        ? buffer.write(key, index, 'utf8')
        : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      const longVal = Long.fromNumber(value);
      const lowBits = longVal.getLowBits();
      const highBits = longVal.getHighBits();
      // Encode low bits
      buffer[index++] = lowBits & 0xff;
      buffer[index++] = (lowBits >> 8) & 0xff;
      buffer[index++] = (lowBits >> 16) & 0xff;
      buffer[index++] = (lowBits >> 24) & 0xff;
      // Encode high bits
      buffer[index++] = highBits & 0xff;
      buffer[index++] = (highBits >> 8) & 0xff;
      buffer[index++] = (highBits >> 16) & 0xff;
      buffer[index++] = (highBits >> 24) & 0xff;
    }
  } else {
    // Encode as double
    buffer[index++] = constants.BSON_DATA_NUMBER;
    // Number of written bytes
    const numberOfWrittenBytes = !isArray
      ? buffer.write(key, index, 'utf8')
      : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;
    // Write float
    writeIEEE754(buffer, value, index, 'little', 52, 8);
    // Ajust index
    index = index + 8;
  }

  return index;
}

function serializeNull(buffer, key, value, index, isArray) {
  // Set long type
  buffer[index++] = constants.BSON_DATA_NULL;

  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  return index;
}

function serializeBoolean(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_BOOLEAN;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Encode the boolean value
  buffer[index++] = value ? 1 : 0;
  return index;
}

function serializeDate(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_DATE;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write the date
  const dateInMilis = Long.fromNumber(value.getTime());
  const lowBits = dateInMilis.getLowBits();
  const highBits = dateInMilis.getHighBits();
  // Encode low bits
  buffer[index++] = lowBits & 0xff;
  buffer[index++] = (lowBits >> 8) & 0xff;
  buffer[index++] = (lowBits >> 16) & 0xff;
  buffer[index++] = (lowBits >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = highBits & 0xff;
  buffer[index++] = (highBits >> 8) & 0xff;
  buffer[index++] = (highBits >> 16) & 0xff;
  buffer[index++] = (highBits >> 24) & 0xff;
  return index;
}

function serializeRegExp(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_REGEXP;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  if (value.source && value.source.match(regexp) != null) {
    throw Error('value ' + value.source + ' must not contain null bytes');
  }
  // Adjust the index
  index = index + buffer.write(value.source, index, 'utf8');
  // Write zero
  buffer[index++] = 0x00;
  // Write the parameters
  if (value.ignoreCase) buffer[index++] = 0x69; // i
  if (value.global) buffer[index++] = 0x73; // s
  if (value.multiline) buffer[index++] = 0x6d; // m

  // Add ending zero
  buffer[index++] = 0x00;
  return index;
}

function serializeBSONRegExp(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_REGEXP;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Check the pattern for 0 bytes
  if (value.pattern.match(regexp) != null) {
    // The BSON spec doesn't allow keys with null bytes because keys are
    // null-terminated.
    throw Error('pattern ' + value.pattern + ' must not contain null bytes');
  }

  // Adjust the index
  index = index + buffer.write(value.pattern, index, 'utf8');
  // Write zero
  buffer[index++] = 0x00;
  // Write the options
  index =
    index +
    buffer.write(
      value.options
        .split('')
        .sort()
        .join(''),
      index,
      'utf8'
    );
  // Add ending zero
  buffer[index++] = 0x00;
  return index;
}

function serializeMinMax(buffer, key, value, index, isArray) {
  // Write the type of either min or max key
  if (value === null) {
    buffer[index++] = constants.BSON_DATA_NULL;
  } else if (value._bsontype === 'MinKey') {
    buffer[index++] = constants.BSON_DATA_MIN_KEY;
  } else {
    buffer[index++] = constants.BSON_DATA_MAX_KEY;
  }

  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  return index;
}

function serializeObjectId(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_OID;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write the objectId into the shared buffer
  if (typeof value.id === 'string') {
    buffer.write(value.id, index, 'binary');
  } else if (value.id && value.id.copy) {
    value.id.copy(buffer, index, 0, 12);
  } else {
    throw new TypeError('object [' + JSON.stringify(value) + '] is not a valid ObjectId');
  }

  // Ajust index
  return index + 12;
}

function serializeBuffer(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_BINARY;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Get size of the buffer (current write point)
  const size = value.length;
  // Write the size of the string to buffer
  buffer[index++] = size & 0xff;
  buffer[index++] = (size >> 8) & 0xff;
  buffer[index++] = (size >> 16) & 0xff;
  buffer[index++] = (size >> 24) & 0xff;
  // Write the default subtype
  buffer[index++] = constants.BSON_BINARY_SUBTYPE_DEFAULT;
  // Copy the content form the binary field to the buffer
  value.copy(buffer, index, 0, size);
  // Adjust the index
  index = index + size;
  return index;
}

function serializeObject(
  buffer,
  key,
  value,
  index,
  checkKeys,
  depth,
  serializeFunctions,
  ignoreUndefined,
  isArray,
  path
) {
  for (let i = 0; i < path.length; i++) {
    if (path[i] === value) throw new Error('cyclic dependency detected');
  }

  // Push value to stack
  path.push(value);
  // Write the type
  buffer[index++] = Array.isArray(value) ? constants.BSON_DATA_ARRAY : constants.BSON_DATA_OBJECT;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  const endIndex = serializeInto(
    buffer,
    value,
    checkKeys,
    index,
    depth + 1,
    serializeFunctions,
    ignoreUndefined,
    path
  );
  // Pop stack
  path.pop();
  return endIndex;
}

function serializeDecimal128(buffer, key, value, index, isArray) {
  buffer[index++] = constants.BSON_DATA_DECIMAL128;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the data from the value
  value.bytes.copy(buffer, index, 0, 16);
  return index + 16;
}

function serializeLong(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] =
    value._bsontype === 'Long' ? constants.BSON_DATA_LONG : constants.BSON_DATA_TIMESTAMP;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the date
  const lowBits = value.getLowBits();
  const highBits = value.getHighBits();
  // Encode low bits
  buffer[index++] = lowBits & 0xff;
  buffer[index++] = (lowBits >> 8) & 0xff;
  buffer[index++] = (lowBits >> 16) & 0xff;
  buffer[index++] = (lowBits >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = highBits & 0xff;
  buffer[index++] = (highBits >> 8) & 0xff;
  buffer[index++] = (highBits >> 16) & 0xff;
  buffer[index++] = (highBits >> 24) & 0xff;
  return index;
}

function serializeInt32(buffer, key, value, index, isArray) {
  // Set int type 32 bits or less
  buffer[index++] = constants.BSON_DATA_INT;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the int value
  buffer[index++] = value & 0xff;
  buffer[index++] = (value >> 8) & 0xff;
  buffer[index++] = (value >> 16) & 0xff;
  buffer[index++] = (value >> 24) & 0xff;
  return index;
}

function serializeDouble(buffer, key, value, index, isArray) {
  // Encode as double
  buffer[index++] = constants.BSON_DATA_NUMBER;

  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write float
  writeIEEE754(buffer, value.value, index, 'little', 52, 8);

  // Adjust index
  index = index + 8;
  return index;
}

function serializeFunction(buffer, key, value, index, checkKeys, depth, isArray) {
  buffer[index++] = constants.BSON_DATA_CODE;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Function string
  const functionString = normalizedFunctionString(value);

  // Write the string
  const size = buffer.write(functionString, index + 4, 'utf8') + 1;
  // Write the size of the string to buffer
  buffer[index] = size & 0xff;
  buffer[index + 1] = (size >> 8) & 0xff;
  buffer[index + 2] = (size >> 16) & 0xff;
  buffer[index + 3] = (size >> 24) & 0xff;
  // Update index
  index = index + 4 + size - 1;
  // Write zero
  buffer[index++] = 0;
  return index;
}

function serializeCode(
  buffer,
  key,
  value,
  index,
  checkKeys,
  depth,
  serializeFunctions,
  ignoreUndefined,
  isArray
) {
  if (value.scope && typeof value.scope === 'object') {
    // Write the type
    buffer[index++] = constants.BSON_DATA_CODE_W_SCOPE;
    // Number of written bytes
    const numberOfWrittenBytes = !isArray
      ? buffer.write(key, index, 'utf8')
      : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;

    // Starting index
    let startIndex = index;

    // Serialize the function
    // Get the function string
    const functionString = typeof value.code === 'string' ? value.code : value.code.toString();
    // Index adjustment
    index = index + 4;
    // Write string into buffer
    const codeSize = buffer.write(functionString, index + 4, 'utf8') + 1;
    // Write the size of the string to buffer
    buffer[index] = codeSize & 0xff;
    buffer[index + 1] = (codeSize >> 8) & 0xff;
    buffer[index + 2] = (codeSize >> 16) & 0xff;
    buffer[index + 3] = (codeSize >> 24) & 0xff;
    // Write end 0
    buffer[index + 4 + codeSize - 1] = 0;
    // Write the
    index = index + codeSize + 4;

    //
    // Serialize the scope value
    const endIndex = serializeInto(
      buffer,
      value.scope,
      checkKeys,
      index,
      depth + 1,
      serializeFunctions,
      ignoreUndefined
    );
    index = endIndex - 1;

    // Writ the total
    const totalSize = endIndex - startIndex;

    // Write the total size of the object
    buffer[startIndex++] = totalSize & 0xff;
    buffer[startIndex++] = (totalSize >> 8) & 0xff;
    buffer[startIndex++] = (totalSize >> 16) & 0xff;
    buffer[startIndex++] = (totalSize >> 24) & 0xff;
    // Write trailing zero
    buffer[index++] = 0;
  } else {
    buffer[index++] = constants.BSON_DATA_CODE;
    // Number of written bytes
    const numberOfWrittenBytes = !isArray
      ? buffer.write(key, index, 'utf8')
      : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;
    // Function string
    const functionString = value.code.toString();
    // Write the string
    const size = buffer.write(functionString, index + 4, 'utf8') + 1;
    // Write the size of the string to buffer
    buffer[index] = size & 0xff;
    buffer[index + 1] = (size >> 8) & 0xff;
    buffer[index + 2] = (size >> 16) & 0xff;
    buffer[index + 3] = (size >> 24) & 0xff;
    // Update index
    index = index + 4 + size - 1;
    // Write zero
    buffer[index++] = 0;
  }

  return index;
}

function serializeBinary(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_BINARY;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Extract the buffer
  const data = value.value(true);
  // Calculate size
  let size = value.position;
  // Add the deprecated 02 type 4 bytes of size to total
  if (value.sub_type === Binary.SUBTYPE_BYTE_ARRAY) size = size + 4;
  // Write the size of the string to buffer
  buffer[index++] = size & 0xff;
  buffer[index++] = (size >> 8) & 0xff;
  buffer[index++] = (size >> 16) & 0xff;
  buffer[index++] = (size >> 24) & 0xff;
  // Write the subtype to the buffer
  buffer[index++] = value.sub_type;

  // If we have binary type 2 the 4 first bytes are the size
  if (value.sub_type === Binary.SUBTYPE_BYTE_ARRAY) {
    size = size - 4;
    buffer[index++] = size & 0xff;
    buffer[index++] = (size >> 8) & 0xff;
    buffer[index++] = (size >> 16) & 0xff;
    buffer[index++] = (size >> 24) & 0xff;
  }

  // Write the data to the object
  data.copy(buffer, index, 0, value.position);
  // Adjust the index
  index = index + value.position;
  return index;
}

function serializeSymbol(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_SYMBOL;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the string
  const size = buffer.write(value.value, index + 4, 'utf8') + 1;
  // Write the size of the string to buffer
  buffer[index] = size & 0xff;
  buffer[index + 1] = (size >> 8) & 0xff;
  buffer[index + 2] = (size >> 16) & 0xff;
  buffer[index + 3] = (size >> 24) & 0xff;
  // Update index
  index = index + 4 + size - 1;
  // Write zero
  buffer[index++] = 0x00;
  return index;
}

function serializeDBRef(buffer, key, value, index, depth, serializeFunctions, isArray) {
  // Write the type
  buffer[index++] = constants.BSON_DATA_OBJECT;
  // Number of written bytes
  const numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  let startIndex = index;
  let endIndex;
  let output = {
    $ref: value.collection || value.namespace, // "namespace" was what library 1.x called "collection"
    $id: value.oid
  };

  if (value.db != null) output.$db = value.db;

  output = Object.assign(output, value.fields);
  endIndex = serializeInto(buffer, output, false, index, depth + 1, serializeFunctions);

  // Calculate object size
  const size = endIndex - startIndex;
  // Write the size
  buffer[startIndex++] = size & 0xff;
  buffer[startIndex++] = (size >> 8) & 0xff;
  buffer[startIndex++] = (size >> 16) & 0xff;
  buffer[startIndex++] = (size >> 24) & 0xff;
  // Set index
  return endIndex;
}

function serializeInto(
  buffer,
  object,
  checkKeys,
  startingIndex,
  depth,
  serializeFunctions,
  ignoreUndefined,
  path
) {
  startingIndex = startingIndex || 0;
  path = path || [];

  // Push the object to the path
  path.push(object);

  // Start place to serialize into
  let index = startingIndex + 4;

  // Special case isArray
  if (Array.isArray(object)) {
    // Get object keys
    for (let i = 0; i < object.length; i++) {
      let key = '' + i;
      let value = object[i];

      // Is there an override value
      if (value && value.toBSON) {
        if (typeof value.toBSON !== 'function') throw new TypeError('toBSON is not a function');
        value = value.toBSON();
      }

      const type = typeof value;
      if (type === 'string') {
        index = serializeString(buffer, key, value, index, true);
      } else if (type === 'number') {
        index = serializeNumber(buffer, key, value, index, true);
      } else if (type === 'boolean') {
        index = serializeBoolean(buffer, key, value, index, true);
      } else if (value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index, true);
      } else if (value === undefined) {
        index = serializeNull(buffer, key, value, index, true);
      } else if (value === null) {
        index = serializeNull(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'ObjectId' || value['_bsontype'] === 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index, true);
      } else if (Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index, true);
      } else if (value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index, true);
      } else if (type === 'object' && value['_bsontype'] == null) {
        index = serializeObject(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          true,
          path
        );
      } else if (type === 'object' && value['_bsontype'] === 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Long' || value['_bsontype'] === 'Timestamp') {
        index = serializeLong(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Double') {
        index = serializeDouble(buffer, key, value, index, true);
      } else if (typeof value === 'function' && serializeFunctions) {
        index = serializeFunction(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          true
        );
      } else if (value['_bsontype'] === 'Code') {
        index = serializeCode(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          true
        );
      } else if (value['_bsontype'] === 'Binary') {
        index = serializeBinary(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Symbol') {
        index = serializeSymbol(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions, true);
      } else if (value['_bsontype'] === 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Int32') {
        index = serializeInt32(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'MinKey' || value['_bsontype'] === 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index, true);
      } else if (typeof value['_bsontype'] !== 'undefined') {
        throw new TypeError('Unrecognized or invalid _bsontype: ' + value['_bsontype']);
      }
    }
  } else if (object instanceof Map) {
    const iterator = object.entries();
    let done = false;

    while (!done) {
      // Unpack the next entry
      const entry = iterator.next();
      done = entry.done;
      // Are we done, then skip and terminate
      if (done) continue;

      // Get the entry values
      const key = entry.value[0];
      const value = entry.value[1];

      // Check the type of the value
      const type = typeof value;

      // Check the key and throw error if it's illegal
      if (typeof key === 'string' && !ignoreKeys.has(key)) {
        if (key.match(regexp) != null) {
          // The BSON spec doesn't allow keys with null bytes because keys are
          // null-terminated.
          throw Error('key ' + key + ' must not contain null bytes');
        }

        if (checkKeys) {
          if ('$' === key[0]) {
            throw Error('key ' + key + " must not start with '$'");
          } else if (~key.indexOf('.')) {
            throw Error('key ' + key + " must not contain '.'");
          }
        }
      }

      if (type === 'string') {
        index = serializeString(buffer, key, value, index);
      } else if (type === 'number') {
        index = serializeNumber(buffer, key, value, index);
      } else if (type === 'boolean') {
        index = serializeBoolean(buffer, key, value, index);
      } else if (value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index);
      } else if (value === null || (value === undefined && ignoreUndefined === false)) {
        index = serializeNull(buffer, key, value, index);
      } else if (value['_bsontype'] === 'ObjectId' || value['_bsontype'] === 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index);
      } else if (Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index);
      } else if (value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index);
      } else if (type === 'object' && value['_bsontype'] == null) {
        index = serializeObject(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          false,
          path
        );
      } else if (type === 'object' && value['_bsontype'] === 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Long' || value['_bsontype'] === 'Timestamp') {
        index = serializeLong(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Double') {
        index = serializeDouble(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Code') {
        index = serializeCode(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined
        );
      } else if (typeof value === 'function' && serializeFunctions) {
        index = serializeFunction(buffer, key, value, index, checkKeys, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'Binary') {
        index = serializeBinary(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Symbol') {
        index = serializeSymbol(buffer, key, value, index);
      } else if (value['_bsontype'] === 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Int32') {
        index = serializeInt32(buffer, key, value, index);
      } else if (value['_bsontype'] === 'MinKey' || value['_bsontype'] === 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index);
      } else if (typeof value['_bsontype'] !== 'undefined') {
        throw new TypeError('Unrecognized or invalid _bsontype: ' + value['_bsontype']);
      }
    }
  } else {
    // Did we provide a custom serialization method
    if (object.toBSON) {
      if (typeof object.toBSON !== 'function') throw new TypeError('toBSON is not a function');
      object = object.toBSON();
      if (object != null && typeof object !== 'object')
        throw new TypeError('toBSON function did not return an object');
    }

    // Iterate over all the keys
    for (let key in object) {
      let value = object[key];
      // Is there an override value
      if (value && value.toBSON) {
        if (typeof value.toBSON !== 'function') throw new TypeError('toBSON is not a function');
        value = value.toBSON();
      }

      // Check the type of the value
      const type = typeof value;

      // Check the key and throw error if it's illegal
      if (typeof key === 'string' && !ignoreKeys.has(key)) {
        if (key.match(regexp) != null) {
          // The BSON spec doesn't allow keys with null bytes because keys are
          // null-terminated.
          throw Error('key ' + key + ' must not contain null bytes');
        }

        if (checkKeys) {
          if ('$' === key[0]) {
            throw Error('key ' + key + " must not start with '$'");
          } else if (~key.indexOf('.')) {
            throw Error('key ' + key + " must not contain '.'");
          }
        }
      }

      if (type === 'string') {
        index = serializeString(buffer, key, value, index);
      } else if (type === 'number') {
        index = serializeNumber(buffer, key, value, index);
      } else if (type === 'boolean') {
        index = serializeBoolean(buffer, key, value, index);
      } else if (value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index);
      } else if (value === undefined) {
        if (ignoreUndefined === false) index = serializeNull(buffer, key, value, index);
      } else if (value === null) {
        index = serializeNull(buffer, key, value, index);
      } else if (value['_bsontype'] === 'ObjectId' || value['_bsontype'] === 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index);
      } else if (Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index);
      } else if (value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index);
      } else if (type === 'object' && value['_bsontype'] == null) {
        index = serializeObject(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          false,
          path
        );
      } else if (type === 'object' && value['_bsontype'] === 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Long' || value['_bsontype'] === 'Timestamp') {
        index = serializeLong(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Double') {
        index = serializeDouble(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Code') {
        index = serializeCode(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined
        );
      } else if (typeof value === 'function' && serializeFunctions) {
        index = serializeFunction(buffer, key, value, index, checkKeys, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'Binary') {
        index = serializeBinary(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Symbol') {
        index = serializeSymbol(buffer, key, value, index);
      } else if (value['_bsontype'] === 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Int32') {
        index = serializeInt32(buffer, key, value, index);
      } else if (value['_bsontype'] === 'MinKey' || value['_bsontype'] === 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index);
      } else if (typeof value['_bsontype'] !== 'undefined') {
        throw new TypeError('Unrecognized or invalid _bsontype: ' + value['_bsontype']);
      }
    }
  }

  // Remove the path
  path.pop();

  // Final padding byte for object
  buffer[index++] = 0x00;

  // Final size
  const size = index - startingIndex;
  // Write the size of the object
  buffer[startingIndex++] = size & 0xff;
  buffer[startingIndex++] = (size >> 8) & 0xff;
  buffer[startingIndex++] = (size >> 16) & 0xff;
  buffer[startingIndex++] = (size >> 24) & 0xff;
  return index;
}

module.exports = serializeInto;

}, function(modId) { var map = {"../float_parser":1583600334741,"../long":1583600334722,"../map":1583600334721,"../binary":1583600334735,"../constants":1583600334736,"./utils":1583600334726}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334741, function(require, module, exports) {

// Copyright (c) 2008, Fair Oaks Labs, Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
//
//  * Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
//  * Neither the name of Fair Oaks Labs, Inc. nor the names of its contributors
//    may be used to endorse or promote products derived from this software
//    without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
//
//
// Modifications to writeIEEE754 to support negative zeroes made by Brian White

function readIEEE754(buffer, offset, endian, mLen, nBytes) {
  let e,
    m,
    bBE = endian === 'big',
    eLen = nBytes * 8 - mLen - 1,
    eMax = (1 << eLen) - 1,
    eBias = eMax >> 1,
    nBits = -7,
    i = bBE ? 0 : nBytes - 1,
    d = bBE ? 1 : -1,
    s = buffer[offset + i];

  i += d;

  e = s & ((1 << -nBits) - 1);
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << -nBits) - 1);
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
}

function writeIEEE754(buffer, value, offset, endian, mLen, nBytes) {
  let e,
    m,
    c,
    bBE = endian === 'big',
    eLen = nBytes * 8 - mLen - 1,
    eMax = (1 << eLen) - 1,
    eBias = eMax >> 1,
    rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
    i = bBE ? nBytes - 1 : 0,
    d = bBE ? -1 : 1,
    s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  if (isNaN(value)) m = 0;

  while (mLen >= 8) {
    buffer[offset + i] = m & 0xff;
    i += d;
    m /= 256;
    mLen -= 8;
  }

  e = (e << mLen) | m;

  if (isNaN(value)) e += 8;

  eLen += mLen;

  while (eLen > 0) {
    buffer[offset + i] = e & 0xff;
    i += d;
    e /= 256;
    eLen -= 8;
  }

  buffer[offset + i - d] |= s * 128;
}

module.exports = {
  readIEEE754,
  writeIEEE754
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334742, function(require, module, exports) {


const Buffer = require('buffer').Buffer;
const Binary = require('../binary');
const normalizedFunctionString = require('./utils').normalizedFunctionString;
const constants = require('../constants');

// To ensure that 0.4 of node works correctly
function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
}

function calculateObjectSize(object, serializeFunctions, ignoreUndefined) {
  let totalLength = 4 + 1;

  if (Array.isArray(object)) {
    for (let i = 0; i < object.length; i++) {
      totalLength += calculateElement(
        i.toString(),
        object[i],
        serializeFunctions,
        true,
        ignoreUndefined
      );
    }
  } else {
    // If we have toBSON defined, override the current object

    if (object.toBSON) {
      object = object.toBSON();
    }

    // Calculate size
    for (let key in object) {
      totalLength += calculateElement(key, object[key], serializeFunctions, false, ignoreUndefined);
    }
  }

  return totalLength;
}

/**
 * @ignore
 * @api private
 */
function calculateElement(name, value, serializeFunctions, isArray, ignoreUndefined) {
  // If we have toBSON defined, override the current object
  if (value && value.toBSON) {
    value = value.toBSON();
  }

  switch (typeof value) {
    case 'string':
      return 1 + Buffer.byteLength(name, 'utf8') + 1 + 4 + Buffer.byteLength(value, 'utf8') + 1;
    case 'number':
      if (
        Math.floor(value) === value &&
        value >= constants.JS_INT_MIN &&
        value <= constants.JS_INT_MAX
      ) {
        if (value >= constants.BSON_INT32_MIN && value <= constants.BSON_INT32_MAX) {
          // 32 bit
          return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (4 + 1);
        } else {
          return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
        }
      } else {
        // 64 bit
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
      }
    case 'undefined':
      if (isArray || !ignoreUndefined)
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + 1;
      return 0;
    case 'boolean':
      return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (1 + 1);
    case 'object':
      if (value == null || value['_bsontype'] === 'MinKey' || value['_bsontype'] === 'MaxKey') {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + 1;
      } else if (value['_bsontype'] === 'ObjectId' || value['_bsontype'] === 'ObjectID') {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (12 + 1);
      } else if (value instanceof Date || isDate(value)) {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (1 + 4 + 1) + value.length
        );
      } else if (
        value['_bsontype'] === 'Long' ||
        value['_bsontype'] === 'Double' ||
        value['_bsontype'] === 'Timestamp'
      ) {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
      } else if (value['_bsontype'] === 'Decimal128') {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (16 + 1);
      } else if (value['_bsontype'] === 'Code') {
        // Calculate size depending on the availability of a scope
        if (value.scope != null && Object.keys(value.scope).length > 0) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            4 +
            Buffer.byteLength(value.code.toString(), 'utf8') +
            1 +
            calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined)
          );
        } else {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            Buffer.byteLength(value.code.toString(), 'utf8') +
            1
          );
        }
      } else if (value['_bsontype'] === 'Binary') {
        // Check what kind of subtype we have
        if (value.sub_type === Binary.SUBTYPE_BYTE_ARRAY) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            (value.position + 1 + 4 + 1 + 4)
          );
        } else {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (value.position + 1 + 4 + 1)
          );
        }
      } else if (value['_bsontype'] === 'Symbol') {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          Buffer.byteLength(value.value, 'utf8') +
          4 +
          1 +
          1
        );
      } else if (value['_bsontype'] === 'DBRef') {
        // Set up correct object for serialization
        const ordered_values = Object.assign(
          {
            $ref: value.collection,
            $id: value.oid
          },
          value.fields
        );

        // Add db reference if it exists
        if (value.db != null) {
          ordered_values['$db'] = value.db;
        }

        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          calculateObjectSize(ordered_values, serializeFunctions, ignoreUndefined)
        );
      } else if (
        value instanceof RegExp ||
        Object.prototype.toString.call(value) === '[object RegExp]'
      ) {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          Buffer.byteLength(value.source, 'utf8') +
          1 +
          (value.global ? 1 : 0) +
          (value.ignoreCase ? 1 : 0) +
          (value.multiline ? 1 : 0) +
          1
        );
      } else if (value['_bsontype'] === 'BSONRegExp') {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          Buffer.byteLength(value.pattern, 'utf8') +
          1 +
          Buffer.byteLength(value.options, 'utf8') +
          1
        );
      } else {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          calculateObjectSize(value, serializeFunctions, ignoreUndefined) +
          1
        );
      }
    case 'function':
      // WTF for 0.4.X where typeof /someregexp/ === 'function'
      if (
        value instanceof RegExp ||
        Object.prototype.toString.call(value) === '[object RegExp]' ||
        String.call(value) === '[object RegExp]'
      ) {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          Buffer.byteLength(value.source, 'utf8') +
          1 +
          (value.global ? 1 : 0) +
          (value.ignoreCase ? 1 : 0) +
          (value.multiline ? 1 : 0) +
          1
        );
      } else {
        if (serializeFunctions && value.scope != null && Object.keys(value.scope).length > 0) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            4 +
            Buffer.byteLength(normalizedFunctionString(value), 'utf8') +
            1 +
            calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined)
          );
        } else if (serializeFunctions) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            Buffer.byteLength(normalizedFunctionString(value), 'utf8') +
            1
          );
        }
      }
  }

  return 0;
}

module.exports = calculateObjectSize;

}, function(modId) { var map = {"../binary":1583600334735,"./utils":1583600334726,"../constants":1583600334736}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1583600334743, function(require, module, exports) {


const Buffer = require('buffer').Buffer;

/**
 * Makes sure that, if a Uint8Array is passed in, it is wrapped in a Buffer.
 *
 * @param {Buffer|Uint8Array} potentialBuffer The potential buffer
 * @returns {Buffer} the input if potentialBuffer is a buffer, or a buffer that
 * wraps a passed in Uint8Array
 * @throws {TypeError} If anything other than a Buffer or Uint8Array is passed in
 */
module.exports = function ensureBuffer(potentialBuffer) {
  if (potentialBuffer instanceof Buffer) {
    return potentialBuffer;
  }

  if (potentialBuffer instanceof Uint8Array) {
    return Buffer.from(potentialBuffer.buffer);
  }

  throw new TypeError('Must use either Buffer or Uint8Array');
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1583600334720);
})()
//# sourceMappingURL=index.js.map