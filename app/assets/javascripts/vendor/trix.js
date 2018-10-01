/*
Trix 0.11.1
Copyright © 2018 Basecamp, LLC
http://trix-editor.org/
 */

(function() {


}).call(this);
(function() {
  var Set;

  if (window.Set == null) {
    window.Set = Set = (function() {
      function Set() {
        this.clear();
      }

      Set.prototype.clear = function() {
        return this.values = [];
      };

      Set.prototype.has = function(value) {
        return this.values.indexOf(value) !== -1;
      };

      Set.prototype.add = function(value) {
        if (!this.has(value)) {
          this.values.push(value);
        }
        return this;
      };

      Set.prototype["delete"] = function(value) {
        var index;
        if ((index = this.values.indexOf(value)) === -1) {
          return false;
        } else {
          this.values.splice(index, 1);
          return true;
        }
      };

      Set.prototype.forEach = function() {
        var ref;
        return (ref = this.values).forEach.apply(ref, arguments);
      };

      return Set;

    })();
  }

}).call(this);
(function (root) {

  // Store setTimeout reference so promise-polyfill will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var setTimeoutFunc = setTimeout;

  function noop() {
  }

  // Use polyfill for setImmediate for performance gains
  var asap = (typeof setImmediate === 'function' && setImmediate) ||
    function (fn) {
      setTimeoutFunc(fn, 1);
    };

  var onUnhandledRejection = function onUnhandledRejection(err) {
    if (typeof console !== 'undefined' && console) {
      console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
  };

  // Polyfill for Function.prototype.bind
  function bind(fn, thisArg) {
    return function () {
      fn.apply(thisArg, arguments);
    };
  }

  function Promise(fn) {
    if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function') throw new TypeError('not a function');
    this._state = 0;
    this._handled = false;
    this._value = undefined;
    this._deferreds = [];

    doResolve(fn, this);
  }

  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    asap(function () {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }

  function resolve(self, newValue) {
    try {
      // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then;
        if (newValue instanceof Promise) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === 'function') {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }

  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }

  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      setTimeout(function() {
        if (!self._handled) {
          onUnhandledRejection(self._value);
        }
      }, 1);
    }
    
    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }

  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(function (value) {
        if (done) return;
        done = true;
        resolve(self, value);
      }, function (reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      });
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype.then = function (onFulfilled, onRejected) {
    var prom = new Promise(noop);
    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };

  Promise.all = function (arr) {
    var args = Array.prototype.slice.call(arr);

    return new Promise(function (resolve, reject) {
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(val, function (val) {
                res(i, val);
              }, reject);
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.resolve = function (value) {
    if (value && typeof value === 'object' && value.constructor === Promise) {
      return value;
    }

    return new Promise(function (resolve) {
      resolve(value);
    });
  };

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
      for (var i = 0, len = values.length; i < len; i++) {
        values[i].then(resolve, reject);
      }
    });
  };

  /**
   * Set the immediate function to execute callbacks
   * @param fn {function} Function to execute
   * @private
   */
  Promise._setImmediateFn = function _setImmediateFn(fn) {
    asap = fn;
  };
  
  Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
    onUnhandledRejection = fn;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Promise;
  } else if (!root.Promise) {
    root.Promise = Promise;
  }

})(this);
/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// @version 0.7.22
if (typeof WeakMap === "undefined") {
  (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;
    var WeakMap = function() {
      this.name = "__st" + (Math.random() * 1e9 >>> 0) + (counter++ + "__");
    };
    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key) entry[1] = value; else defineProperty(key, this.name, {
          value: [ key, value ],
          writable: true
        });
        return this;
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
      },
      "delete": function(key) {
        var entry = key[this.name];
        if (!entry || entry[0] !== key) return false;
        entry[0] = entry[1] = undefined;
        return true;
      },
      has: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        return entry[0] === key;
      }
    };
    window.WeakMap = WeakMap;
  })();
}

(function(global) {
  if (global.JsMutationObserver) {
    return;
  }
  var registrationsTable = new WeakMap();
  var setImmediate;
  if (/Trident|Edge/.test(navigator.userAgent)) {
    setImmediate = setTimeout;
  } else if (window.setImmediate) {
    setImmediate = window.setImmediate;
  } else {
    var setImmediateQueue = [];
    var sentinel = String(Math.random());
    window.addEventListener("message", function(e) {
      if (e.data === sentinel) {
        var queue = setImmediateQueue;
        setImmediateQueue = [];
        queue.forEach(function(func) {
          func();
        });
      }
    });
    setImmediate = function(func) {
      setImmediateQueue.push(func);
      window.postMessage(sentinel, "*");
    };
  }
  var isScheduled = false;
  var scheduledObservers = [];
  function scheduleCallback(observer) {
    scheduledObservers.push(observer);
    if (!isScheduled) {
      isScheduled = true;
      setImmediate(dispatchCallbacks);
    }
  }
  function wrapIfNeeded(node) {
    return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(node) || node;
  }
  function dispatchCallbacks() {
    isScheduled = false;
    var observers = scheduledObservers;
    scheduledObservers = [];
    observers.sort(function(o1, o2) {
      return o1.uid_ - o2.uid_;
    });
    var anyNonEmpty = false;
    observers.forEach(function(observer) {
      var queue = observer.takeRecords();
      removeTransientObserversFor(observer);
      if (queue.length) {
        observer.callback_(queue, observer);
        anyNonEmpty = true;
      }
    });
    if (anyNonEmpty) dispatchCallbacks();
  }
  function removeTransientObserversFor(observer) {
    observer.nodes_.forEach(function(node) {
      var registrations = registrationsTable.get(node);
      if (!registrations) return;
      registrations.forEach(function(registration) {
        if (registration.observer === observer) registration.removeTransientObservers();
      });
    });
  }
  function forEachAncestorAndObserverEnqueueRecord(target, callback) {
    for (var node = target; node; node = node.parentNode) {
      var registrations = registrationsTable.get(node);
      if (registrations) {
        for (var j = 0; j < registrations.length; j++) {
          var registration = registrations[j];
          var options = registration.options;
          if (node !== target && !options.subtree) continue;
          var record = callback(options);
          if (record) registration.enqueue(record);
        }
      }
    }
  }
  var uidCounter = 0;
  function JsMutationObserver(callback) {
    this.callback_ = callback;
    this.nodes_ = [];
    this.records_ = [];
    this.uid_ = ++uidCounter;
  }
  JsMutationObserver.prototype = {
    observe: function(target, options) {
      target = wrapIfNeeded(target);
      if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
        throw new SyntaxError();
      }
      var registrations = registrationsTable.get(target);
      if (!registrations) registrationsTable.set(target, registrations = []);
      var registration;
      for (var i = 0; i < registrations.length; i++) {
        if (registrations[i].observer === this) {
          registration = registrations[i];
          registration.removeListeners();
          registration.options = options;
          break;
        }
      }
      if (!registration) {
        registration = new Registration(this, target, options);
        registrations.push(registration);
        this.nodes_.push(target);
      }
      registration.addListeners();
    },
    disconnect: function() {
      this.nodes_.forEach(function(node) {
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          var registration = registrations[i];
          if (registration.observer === this) {
            registration.removeListeners();
            registrations.splice(i, 1);
            break;
          }
        }
      }, this);
      this.records_ = [];
    },
    takeRecords: function() {
      var copyOfRecords = this.records_;
      this.records_ = [];
      return copyOfRecords;
    }
  };
  function MutationRecord(type, target) {
    this.type = type;
    this.target = target;
    this.addedNodes = [];
    this.removedNodes = [];
    this.previousSibling = null;
    this.nextSibling = null;
    this.attributeName = null;
    this.attributeNamespace = null;
    this.oldValue = null;
  }
  function copyMutationRecord(original) {
    var record = new MutationRecord(original.type, original.target);
    record.addedNodes = original.addedNodes.slice();
    record.removedNodes = original.removedNodes.slice();
    record.previousSibling = original.previousSibling;
    record.nextSibling = original.nextSibling;
    record.attributeName = original.attributeName;
    record.attributeNamespace = original.attributeNamespace;
    record.oldValue = original.oldValue;
    return record;
  }
  var currentRecord, recordWithOldValue;
  function getRecord(type, target) {
    return currentRecord = new MutationRecord(type, target);
  }
  function getRecordWithOldValue(oldValue) {
    if (recordWithOldValue) return recordWithOldValue;
    recordWithOldValue = copyMutationRecord(currentRecord);
    recordWithOldValue.oldValue = oldValue;
    return recordWithOldValue;
  }
  function clearRecords() {
    currentRecord = recordWithOldValue = undefined;
  }
  function recordRepresentsCurrentMutation(record) {
    return record === recordWithOldValue || record === currentRecord;
  }
  function selectRecord(lastRecord, newRecord) {
    if (lastRecord === newRecord) return lastRecord;
    if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord)) return recordWithOldValue;
    return null;
  }
  function Registration(observer, target, options) {
    this.observer = observer;
    this.target = target;
    this.options = options;
    this.transientObservedNodes = [];
  }
  Registration.prototype = {
    enqueue: function(record) {
      var records = this.observer.records_;
      var length = records.length;
      if (records.length > 0) {
        var lastRecord = records[length - 1];
        var recordToReplaceLast = selectRecord(lastRecord, record);
        if (recordToReplaceLast) {
          records[length - 1] = recordToReplaceLast;
          return;
        }
      } else {
        scheduleCallback(this.observer);
      }
      records[length] = record;
    },
    addListeners: function() {
      this.addListeners_(this.target);
    },
    addListeners_: function(node) {
      var options = this.options;
      if (options.attributes) node.addEventListener("DOMAttrModified", this, true);
      if (options.characterData) node.addEventListener("DOMCharacterDataModified", this, true);
      if (options.childList) node.addEventListener("DOMNodeInserted", this, true);
      if (options.childList || options.subtree) node.addEventListener("DOMNodeRemoved", this, true);
    },
    removeListeners: function() {
      this.removeListeners_(this.target);
    },
    removeListeners_: function(node) {
      var options = this.options;
      if (options.attributes) node.removeEventListener("DOMAttrModified", this, true);
      if (options.characterData) node.removeEventListener("DOMCharacterDataModified", this, true);
      if (options.childList) node.removeEventListener("DOMNodeInserted", this, true);
      if (options.childList || options.subtree) node.removeEventListener("DOMNodeRemoved", this, true);
    },
    addTransientObserver: function(node) {
      if (node === this.target) return;
      this.addListeners_(node);
      this.transientObservedNodes.push(node);
      var registrations = registrationsTable.get(node);
      if (!registrations) registrationsTable.set(node, registrations = []);
      registrations.push(this);
    },
    removeTransientObservers: function() {
      var transientObservedNodes = this.transientObservedNodes;
      this.transientObservedNodes = [];
      transientObservedNodes.forEach(function(node) {
        this.removeListeners_(node);
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          if (registrations[i] === this) {
            registrations.splice(i, 1);
            break;
          }
        }
      }, this);
    },
    handleEvent: function(e) {
      e.stopImmediatePropagation();
      switch (e.type) {
       case "DOMAttrModified":
        var name = e.attrName;
        var namespace = e.relatedNode.namespaceURI;
        var target = e.target;
        var record = new getRecord("attributes", target);
        record.attributeName = name;
        record.attributeNamespace = namespace;
        var oldValue = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;
        forEachAncestorAndObserverEnqueueRecord(target, function(options) {
          if (!options.attributes) return;
          if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
            return;
          }
          if (options.attributeOldValue) return getRecordWithOldValue(oldValue);
          return record;
        });
        break;

       case "DOMCharacterDataModified":
        var target = e.target;
        var record = getRecord("characterData", target);
        var oldValue = e.prevValue;
        forEachAncestorAndObserverEnqueueRecord(target, function(options) {
          if (!options.characterData) return;
          if (options.characterDataOldValue) return getRecordWithOldValue(oldValue);
          return record;
        });
        break;

       case "DOMNodeRemoved":
        this.addTransientObserver(e.target);

       case "DOMNodeInserted":
        var changedNode = e.target;
        var addedNodes, removedNodes;
        if (e.type === "DOMNodeInserted") {
          addedNodes = [ changedNode ];
          removedNodes = [];
        } else {
          addedNodes = [];
          removedNodes = [ changedNode ];
        }
        var previousSibling = changedNode.previousSibling;
        var nextSibling = changedNode.nextSibling;
        var record = getRecord("childList", e.target.parentNode);
        record.addedNodes = addedNodes;
        record.removedNodes = removedNodes;
        record.previousSibling = previousSibling;
        record.nextSibling = nextSibling;
        forEachAncestorAndObserverEnqueueRecord(e.relatedNode, function(options) {
          if (!options.childList) return;
          return record;
        });
      }
      clearRecords();
    }
  };
  global.JsMutationObserver = JsMutationObserver;
  if (!global.MutationObserver) {
    global.MutationObserver = JsMutationObserver;
    JsMutationObserver._isPolyfilled = true;
  }
})(self);

(function(scope) {
  "use strict";
  if (!window.performance) {
    var start = Date.now();
    window.performance = {
      now: function() {
        return Date.now() - start;
      }
    };
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function() {
      var nativeRaf = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
      return nativeRaf ? function(callback) {
        return nativeRaf(function() {
          callback(performance.now());
        });
      } : function(callback) {
        return window.setTimeout(callback, 1e3 / 60);
      };
    }();
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function() {
      return window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function(id) {
        clearTimeout(id);
      };
    }();
  }
  var workingDefaultPrevented = function() {
    var e = document.createEvent("Event");
    e.initEvent("foo", true, true);
    e.preventDefault();
    return e.defaultPrevented;
  }();
  if (!workingDefaultPrevented) {
    var origPreventDefault = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function() {
      if (!this.cancelable) {
        return;
      }
      origPreventDefault.call(this);
      Object.defineProperty(this, "defaultPrevented", {
        get: function() {
          return true;
        },
        configurable: true
      });
    };
  }
  var isIE = /Trident/.test(navigator.userAgent);
  if (!window.CustomEvent || isIE && typeof window.CustomEvent !== "function") {
    window.CustomEvent = function(inType, params) {
      params = params || {};
      var e = document.createEvent("CustomEvent");
      e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
      return e;
    };
    window.CustomEvent.prototype = window.Event.prototype;
  }
  if (!window.Event || isIE && typeof window.Event !== "function") {
    var origEvent = window.Event;
    window.Event = function(inType, params) {
      params = params || {};
      var e = document.createEvent("Event");
      e.initEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable));
      return e;
    };
    window.Event.prototype = origEvent.prototype;
  }
})(window.WebComponents);

window.CustomElements = window.CustomElements || {
  flags: {}
};

(function(scope) {
  var flags = scope.flags;
  var modules = [];
  var addModule = function(module) {
    modules.push(module);
  };
  var initializeModules = function() {
    modules.forEach(function(module) {
      module(scope);
    });
  };
  scope.addModule = addModule;
  scope.initializeModules = initializeModules;
  scope.hasNative = Boolean(document.registerElement);
  scope.isIE = /Trident/.test(navigator.userAgent);
  scope.useNative = !flags.register && scope.hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || window.HTMLImports.useNative);
})(window.CustomElements);

window.CustomElements.addModule(function(scope) {
  var IMPORT_LINK_TYPE = window.HTMLImports ? window.HTMLImports.IMPORT_LINK_TYPE : "none";
  function forSubtree(node, cb) {
    findAllElements(node, function(e) {
      if (cb(e)) {
        return true;
      }
      forRoots(e, cb);
    });
    forRoots(node, cb);
  }
  function findAllElements(node, find, data) {
    var e = node.firstElementChild;
    if (!e) {
      e = node.firstChild;
      while (e && e.nodeType !== Node.ELEMENT_NODE) {
        e = e.nextSibling;
      }
    }
    while (e) {
      if (find(e, data) !== true) {
        findAllElements(e, find, data);
      }
      e = e.nextElementSibling;
    }
    return null;
  }
  function forRoots(node, cb) {
    var root = node.shadowRoot;
    while (root) {
      forSubtree(root, cb);
      root = root.olderShadowRoot;
    }
  }
  function forDocumentTree(doc, cb) {
    _forDocumentTree(doc, cb, []);
  }
  function _forDocumentTree(doc, cb, processingDocuments) {
    doc = window.wrap(doc);
    if (processingDocuments.indexOf(doc) >= 0) {
      return;
    }
    processingDocuments.push(doc);
    var imports = doc.querySelectorAll("link[rel=" + IMPORT_LINK_TYPE + "]");
    for (var i = 0, l = imports.length, n; i < l && (n = imports[i]); i++) {
      if (n.import) {
        _forDocumentTree(n.import, cb, processingDocuments);
      }
    }
    cb(doc);
  }
  scope.forDocumentTree = forDocumentTree;
  scope.forSubtree = forSubtree;
});

window.CustomElements.addModule(function(scope) {
  var flags = scope.flags;
  var forSubtree = scope.forSubtree;
  var forDocumentTree = scope.forDocumentTree;
  function addedNode(node, isAttached) {
    return added(node, isAttached) || addedSubtree(node, isAttached);
  }
  function added(node, isAttached) {
    if (scope.upgrade(node, isAttached)) {
      return true;
    }
    if (isAttached) {
      attached(node);
    }
  }
  function addedSubtree(node, isAttached) {
    forSubtree(node, function(e) {
      if (added(e, isAttached)) {
        return true;
      }
    });
  }
  var hasThrottledAttached = window.MutationObserver._isPolyfilled && flags["throttle-attached"];
  scope.hasPolyfillMutations = hasThrottledAttached;
  scope.hasThrottledAttached = hasThrottledAttached;
  var isPendingMutations = false;
  var pendingMutations = [];
  function deferMutation(fn) {
    pendingMutations.push(fn);
    if (!isPendingMutations) {
      isPendingMutations = true;
      setTimeout(takeMutations);
    }
  }
  function takeMutations() {
    isPendingMutations = false;
    var $p = pendingMutations;
    for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
      p();
    }
    pendingMutations = [];
  }
  function attached(element) {
    if (hasThrottledAttached) {
      deferMutation(function() {
        _attached(element);
      });
    } else {
      _attached(element);
    }
  }
  function _attached(element) {
    if (element.__upgraded__ && !element.__attached) {
      element.__attached = true;
      if (element.attachedCallback) {
        element.attachedCallback();
      }
    }
  }
  function detachedNode(node) {
    detached(node);
    forSubtree(node, function(e) {
      detached(e);
    });
  }
  function detached(element) {
    if (hasThrottledAttached) {
      deferMutation(function() {
        _detached(element);
      });
    } else {
      _detached(element);
    }
  }
  function _detached(element) {
    if (element.__upgraded__ && element.__attached) {
      element.__attached = false;
      if (element.detachedCallback) {
        element.detachedCallback();
      }
    }
  }
  function inDocument(element) {
    var p = element;
    var doc = window.wrap(document);
    while (p) {
      if (p == doc) {
        return true;
      }
      p = p.parentNode || p.nodeType === Node.DOCUMENT_FRAGMENT_NODE && p.host;
    }
  }
  function watchShadow(node) {
    if (node.shadowRoot && !node.shadowRoot.__watched) {
      flags.dom && console.log("watching shadow-root for: ", node.localName);
      var root = node.shadowRoot;
      while (root) {
        observe(root);
        root = root.olderShadowRoot;
      }
    }
  }
  function handler(root, mutations) {
    if (flags.dom) {
      var mx = mutations[0];
      if (mx && mx.type === "childList" && mx.addedNodes) {
        if (mx.addedNodes) {
          var d = mx.addedNodes[0];
          while (d && d !== document && !d.host) {
            d = d.parentNode;
          }
          var u = d && (d.URL || d._URL || d.host && d.host.localName) || "";
          u = u.split("/?").shift().split("/").pop();
        }
      }
      console.group("mutations (%d) [%s]", mutations.length, u || "");
    }
    var isAttached = inDocument(root);
    mutations.forEach(function(mx) {
      if (mx.type === "childList") {
        forEach(mx.addedNodes, function(n) {
          if (!n.localName) {
            return;
          }
          addedNode(n, isAttached);
        });
        forEach(mx.removedNodes, function(n) {
          if (!n.localName) {
            return;
          }
          detachedNode(n);
        });
      }
    });
    flags.dom && console.groupEnd();
  }
  function takeRecords(node) {
    node = window.wrap(node);
    if (!node) {
      node = window.wrap(document);
    }
    while (node.parentNode) {
      node = node.parentNode;
    }
    var observer = node.__observer;
    if (observer) {
      handler(node, observer.takeRecords());
      takeMutations();
    }
  }
  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
  function observe(inRoot) {
    if (inRoot.__observer) {
      return;
    }
    var observer = new MutationObserver(handler.bind(this, inRoot));
    observer.observe(inRoot, {
      childList: true,
      subtree: true
    });
    inRoot.__observer = observer;
  }
  function upgradeDocument(doc) {
    doc = window.wrap(doc);
    flags.dom && console.group("upgradeDocument: ", doc.baseURI.split("/").pop());
    var isMainDocument = doc === window.wrap(document);
    addedNode(doc, isMainDocument);
    observe(doc);
    flags.dom && console.groupEnd();
  }
  function upgradeDocumentTree(doc) {
    forDocumentTree(doc, upgradeDocument);
  }
  var originalCreateShadowRoot = Element.prototype.createShadowRoot;
  if (originalCreateShadowRoot) {
    Element.prototype.createShadowRoot = function() {
      var root = originalCreateShadowRoot.call(this);
      window.CustomElements.watchShadow(this);
      return root;
    };
  }
  scope.watchShadow = watchShadow;
  scope.upgradeDocumentTree = upgradeDocumentTree;
  scope.upgradeDocument = upgradeDocument;
  scope.upgradeSubtree = addedSubtree;
  scope.upgradeAll = addedNode;
  scope.attached = attached;
  scope.takeRecords = takeRecords;
});

window.CustomElements.addModule(function(scope) {
  var flags = scope.flags;
  function upgrade(node, isAttached) {
    if (node.localName === "template") {
      if (window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
        HTMLTemplateElement.decorate(node);
      }
    }
    if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
      var is = node.getAttribute("is");
      var definition = scope.getRegisteredDefinition(node.localName) || scope.getRegisteredDefinition(is);
      if (definition) {
        if (is && definition.tag == node.localName || !is && !definition.extends) {
          return upgradeWithDefinition(node, definition, isAttached);
        }
      }
    }
  }
  function upgradeWithDefinition(element, definition, isAttached) {
    flags.upgrade && console.group("upgrade:", element.localName);
    if (definition.is) {
      element.setAttribute("is", definition.is);
    }
    implementPrototype(element, definition);
    element.__upgraded__ = true;
    created(element);
    if (isAttached) {
      scope.attached(element);
    }
    scope.upgradeSubtree(element, isAttached);
    flags.upgrade && console.groupEnd();
    return element;
  }
  function implementPrototype(element, definition) {
    if (Object.__proto__) {
      element.__proto__ = definition.prototype;
    } else {
      customMixin(element, definition.prototype, definition.native);
      element.__proto__ = definition.prototype;
    }
  }
  function customMixin(inTarget, inSrc, inNative) {
    var used = {};
    var p = inSrc;
    while (p !== inNative && p !== HTMLElement.prototype) {
      var keys = Object.getOwnPropertyNames(p);
      for (var i = 0, k; k = keys[i]; i++) {
        if (!used[k]) {
          Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k));
          used[k] = 1;
        }
      }
      p = Object.getPrototypeOf(p);
    }
  }
  function created(element) {
    if (element.createdCallback) {
      element.createdCallback();
    }
  }
  scope.upgrade = upgrade;
  scope.upgradeWithDefinition = upgradeWithDefinition;
  scope.implementPrototype = implementPrototype;
});

window.CustomElements.addModule(function(scope) {
  var isIE = scope.isIE;
  var upgradeDocumentTree = scope.upgradeDocumentTree;
  var upgradeAll = scope.upgradeAll;
  var upgradeWithDefinition = scope.upgradeWithDefinition;
  var implementPrototype = scope.implementPrototype;
  var useNative = scope.useNative;
  function register(name, options) {
    var definition = options || {};
    if (!name) {
      throw new Error("document.registerElement: first argument `name` must not be empty");
    }
    if (name.indexOf("-") < 0) {
      throw new Error("document.registerElement: first argument ('name') must contain a dash ('-'). Argument provided was '" + String(name) + "'.");
    }
    if (isReservedTag(name)) {
      throw new Error("Failed to execute 'registerElement' on 'Document': Registration failed for type '" + String(name) + "'. The type name is invalid.");
    }
    if (getRegisteredDefinition(name)) {
      throw new Error("DuplicateDefinitionError: a type with name '" + String(name) + "' is already registered");
    }
    if (!definition.prototype) {
      definition.prototype = Object.create(HTMLElement.prototype);
    }
    definition.__name = name.toLowerCase();
    if (definition.extends) {
      definition.extends = definition.extends.toLowerCase();
    }
    definition.lifecycle = definition.lifecycle || {};
    definition.ancestry = ancestry(definition.extends);
    resolveTagName(definition);
    resolvePrototypeChain(definition);
    overrideAttributeApi(definition.prototype);
    registerDefinition(definition.__name, definition);
    definition.ctor = generateConstructor(definition);
    definition.ctor.prototype = definition.prototype;
    definition.prototype.constructor = definition.ctor;
    if (scope.ready) {
      upgradeDocumentTree(document);
    }
    return definition.ctor;
  }
  function overrideAttributeApi(prototype) {
    if (prototype.setAttribute._polyfilled) {
      return;
    }
    var setAttribute = prototype.setAttribute;
    prototype.setAttribute = function(name, value) {
      changeAttribute.call(this, name, value, setAttribute);
    };
    var removeAttribute = prototype.removeAttribute;
    prototype.removeAttribute = function(name) {
      changeAttribute.call(this, name, null, removeAttribute);
    };
    prototype.setAttribute._polyfilled = true;
  }
  function changeAttribute(name, value, operation) {
    name = name.toLowerCase();
    var oldValue = this.getAttribute(name);
    operation.apply(this, arguments);
    var newValue = this.getAttribute(name);
    if (this.attributeChangedCallback && newValue !== oldValue) {
      this.attributeChangedCallback(name, oldValue, newValue);
    }
  }
  function isReservedTag(name) {
    for (var i = 0; i < reservedTagList.length; i++) {
      if (name === reservedTagList[i]) {
        return true;
      }
    }
  }
  var reservedTagList = [ "annotation-xml", "color-profile", "font-face", "font-face-src", "font-face-uri", "font-face-format", "font-face-name", "missing-glyph" ];
  function ancestry(extnds) {
    var extendee = getRegisteredDefinition(extnds);
    if (extendee) {
      return ancestry(extendee.extends).concat([ extendee ]);
    }
    return [];
  }
  function resolveTagName(definition) {
    var baseTag = definition.extends;
    for (var i = 0, a; a = definition.ancestry[i]; i++) {
      baseTag = a.is && a.tag;
    }
    definition.tag = baseTag || definition.__name;
    if (baseTag) {
      definition.is = definition.__name;
    }
  }
  function resolvePrototypeChain(definition) {
    if (!Object.__proto__) {
      var nativePrototype = HTMLElement.prototype;
      if (definition.is) {
        var inst = document.createElement(definition.tag);
        nativePrototype = Object.getPrototypeOf(inst);
      }
      var proto = definition.prototype, ancestor;
      var foundPrototype = false;
      while (proto) {
        if (proto == nativePrototype) {
          foundPrototype = true;
        }
        ancestor = Object.getPrototypeOf(proto);
        if (ancestor) {
          proto.__proto__ = ancestor;
        }
        proto = ancestor;
      }
      if (!foundPrototype) {
        console.warn(definition.tag + " prototype not found in prototype chain for " + definition.is);
      }
      definition.native = nativePrototype;
    }
  }
  function instantiate(definition) {
    return upgradeWithDefinition(domCreateElement(definition.tag), definition);
  }
  var registry = {};
  function getRegisteredDefinition(name) {
    if (name) {
      return registry[name.toLowerCase()];
    }
  }
  function registerDefinition(name, definition) {
    registry[name] = definition;
  }
  function generateConstructor(definition) {
    return function() {
      return instantiate(definition);
    };
  }
  var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  function createElementNS(namespace, tag, typeExtension) {
    if (namespace === HTML_NAMESPACE) {
      return createElement(tag, typeExtension);
    } else {
      return domCreateElementNS(namespace, tag);
    }
  }
  function createElement(tag, typeExtension) {
    if (tag) {
      tag = tag.toLowerCase();
    }
    if (typeExtension) {
      typeExtension = typeExtension.toLowerCase();
    }
    var definition = getRegisteredDefinition(typeExtension || tag);
    if (definition) {
      if (tag == definition.tag && typeExtension == definition.is) {
        return new definition.ctor();
      }
      if (!typeExtension && !definition.is) {
        return new definition.ctor();
      }
    }
    var element;
    if (typeExtension) {
      element = createElement(tag);
      element.setAttribute("is", typeExtension);
      return element;
    }
    element = domCreateElement(tag);
    if (tag.indexOf("-") >= 0) {
      implementPrototype(element, HTMLElement);
    }
    return element;
  }
  var domCreateElement = document.createElement.bind(document);
  var domCreateElementNS = document.createElementNS.bind(document);
  var isInstance;
  if (!Object.__proto__ && !useNative) {
    isInstance = function(obj, ctor) {
      if (obj instanceof ctor) {
        return true;
      }
      var p = obj;
      while (p) {
        if (p === ctor.prototype) {
          return true;
        }
        p = p.__proto__;
      }
      return false;
    };
  } else {
    isInstance = function(obj, base) {
      return obj instanceof base;
    };
  }
  function wrapDomMethodToForceUpgrade(obj, methodName) {
    var orig = obj[methodName];
    obj[methodName] = function() {
      var n = orig.apply(this, arguments);
      upgradeAll(n);
      return n;
    };
  }
  wrapDomMethodToForceUpgrade(Node.prototype, "cloneNode");
  wrapDomMethodToForceUpgrade(document, "importNode");
  document.registerElement = register;
  document.createElement = createElement;
  document.createElementNS = createElementNS;
  scope.registry = registry;
  scope.instanceof = isInstance;
  scope.reservedTagList = reservedTagList;
  scope.getRegisteredDefinition = getRegisteredDefinition;
  document.register = document.registerElement;
});

(function(scope) {
  var useNative = scope.useNative;
  var initializeModules = scope.initializeModules;
  var isIE = scope.isIE;
  if (useNative) {
    var nop = function() {};
    scope.watchShadow = nop;
    scope.upgrade = nop;
    scope.upgradeAll = nop;
    scope.upgradeDocumentTree = nop;
    scope.upgradeSubtree = nop;
    scope.takeRecords = nop;
    scope.instanceof = function(obj, base) {
      return obj instanceof base;
    };
  } else {
    initializeModules();
  }
  var upgradeDocumentTree = scope.upgradeDocumentTree;
  var upgradeDocument = scope.upgradeDocument;
  if (!window.wrap) {
    if (window.ShadowDOMPolyfill) {
      window.wrap = window.ShadowDOMPolyfill.wrapIfNeeded;
      window.unwrap = window.ShadowDOMPolyfill.unwrapIfNeeded;
    } else {
      window.wrap = window.unwrap = function(node) {
        return node;
      };
    }
  }
  if (window.HTMLImports) {
    window.HTMLImports.__importsParsingHook = function(elt) {
      if (elt.import) {
        upgradeDocument(wrap(elt.import));
      }
    };
  }
  function bootstrap() {
    upgradeDocumentTree(window.wrap(document));
    window.CustomElements.ready = true;
    var requestAnimationFrame = window.requestAnimationFrame || function(f) {
      setTimeout(f, 16);
    };
    requestAnimationFrame(function() {
      setTimeout(function() {
        window.CustomElements.readyTime = Date.now();
        if (window.HTMLImports) {
          window.CustomElements.elapsed = window.CustomElements.readyTime - window.HTMLImports.readyTime;
        }
        document.dispatchEvent(new CustomEvent("WebComponentsReady", {
          bubbles: true
        }));
      });
    });
  }
  if (document.readyState === "complete" || scope.flags.eager) {
    bootstrap();
  } else if (document.readyState === "interactive" && !window.attachEvent && (!window.HTMLImports || window.HTMLImports.ready)) {
    bootstrap();
  } else {
    var loadEvent = window.HTMLImports && !window.HTMLImports.ready ? "HTMLImportsLoaded" : "DOMContentLoaded";
    window.addEventListener(loadEvent, bootstrap);
  }
})(window.CustomElements);
(function() {


}).call(this);

(function() {
  var context = this;

  (function() {
    (function() {
      this.Trix = {
        VERSION: "0.11.1",
        ZERO_WIDTH_SPACE: "\uFEFF",
        NON_BREAKING_SPACE: "\u00A0",
        OBJECT_REPLACEMENT_CHARACTER: "\uFFFC",
        config: {}
      };

    }).call(this);
  }).call(context);

  var Trix = context.Trix;

  (function() {
    (function() {
      Trix.BasicObject = (function() {
        var apply, parseProxyMethodExpression, proxyMethodExpressionPattern;

        function BasicObject() {}

        BasicObject.proxyMethod = function(expression) {
          var name, optional, ref, toMethod, toProperty;
          ref = parseProxyMethodExpression(expression), name = ref.name, toMethod = ref.toMethod, toProperty = ref.toProperty, optional = ref.optional;
          return this.prototype[name] = function() {
            var object, subject;
            object = toMethod != null ? optional ? typeof this[toMethod] === "function" ? this[toMethod]() : void 0 : this[toMethod]() : toProperty != null ? this[toProperty] : void 0;
            if (optional) {
              subject = object != null ? object[name] : void 0;
              if (subject != null) {
                return apply.call(subject, object, arguments);
              }
            } else {
              subject = object[name];
              return apply.call(subject, object, arguments);
            }
          };
        };

        parseProxyMethodExpression = function(expression) {
          var args, match;
          if (!(match = expression.match(proxyMethodExpressionPattern))) {
            throw new Error("can't parse @proxyMethod expression: " + expression);
          }
          args = {
            name: match[4]
          };
          if (match[2] != null) {
            args.toMethod = match[1];
          } else {
            args.toProperty = match[1];
          }
          if (match[3] != null) {
            args.optional = true;
          }
          return args;
        };

        apply = Function.prototype.apply;

        proxyMethodExpressionPattern = /^(.+?)(\(\))?(\?)?\.(.+?)$/;

        return BasicObject;

      })();

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.Object = (function(superClass) {
        var id;

        extend(Object, superClass);

        id = 0;

        Object.fromJSONString = function(jsonString) {
          return this.fromJSON(JSON.parse(jsonString));
        };

        function Object() {
          this.id = ++id;
        }

        Object.prototype.hasSameConstructorAs = function(object) {
          return this.constructor === (object != null ? object.constructor : void 0);
        };

        Object.prototype.isEqualTo = function(object) {
          return this === object;
        };

        Object.prototype.inspect = function() {
          var contents, key, value;
          contents = (function() {
            var ref, ref1, results;
            ref1 = (ref = this.contentsForInspection()) != null ? ref : {};
            results = [];
            for (key in ref1) {
              value = ref1[key];
              results.push(key + "=" + value);
            }
            return results;
          }).call(this);
          return "#<" + this.constructor.name + ":" + this.id + (contents.length ? " " + (contents.join(", ")) : "") + ">";
        };

        Object.prototype.contentsForInspection = function() {};

        Object.prototype.toJSONString = function() {
          return JSON.stringify(this);
        };

        Object.prototype.toUTF16String = function() {
          return Trix.UTF16String.box(this);
        };

        Object.prototype.getCacheKey = function() {
          return this.id.toString();
        };

        return Object;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      Trix.extend = function(properties) {
        var key, value;
        for (key in properties) {
          value = properties[key];
          this[key] = value;
        }
        return this;
      };

    }).call(this);
    (function() {
      Trix.extend({
        defer: function(fn) {
          return setTimeout(fn, 1);
        }
      });

    }).call(this);
    (function() {
      var utf16StringDifference, utf16StringDifferences;

      Trix.extend({
        normalizeSpaces: function(string) {
          return string.replace(RegExp("" + Trix.ZERO_WIDTH_SPACE, "g"), "").replace(RegExp("" + Trix.NON_BREAKING_SPACE, "g"), " ");
        },
        normalizeNewlines: function(string) {
          return string.replace(/\r\n/g, "\n");
        },
        breakableWhitespacePattern: RegExp("[^\\S" + Trix.NON_BREAKING_SPACE + "]"),
        squishBreakableWhitespace: function(string) {
          return string.replace(RegExp("" + Trix.breakableWhitespacePattern.source, "g"), " ").replace(/\ {2,}/g, " ");
        },
        summarizeStringChange: function(oldString, newString) {
          var added, ref, ref1, removed;
          oldString = Trix.UTF16String.box(oldString);
          newString = Trix.UTF16String.box(newString);
          if (newString.length < oldString.length) {
            ref = utf16StringDifferences(oldString, newString), removed = ref[0], added = ref[1];
          } else {
            ref1 = utf16StringDifferences(newString, oldString), added = ref1[0], removed = ref1[1];
          }
          return {
            added: added,
            removed: removed
          };
        }
      });

      utf16StringDifferences = function(a, b) {
        var codepoints, diffA, diffB, length, offset;
        if (a.isEqualTo(b)) {
          return ["", ""];
        }
        diffA = utf16StringDifference(a, b);
        length = diffA.utf16String.length;
        diffB = length ? ((offset = diffA.offset, diffA), codepoints = a.codepoints.slice(0, offset).concat(a.codepoints.slice(offset + length)), utf16StringDifference(b, Trix.UTF16String.fromCodepoints(codepoints))) : utf16StringDifference(b, a);
        return [diffA.utf16String.toString(), diffB.utf16String.toString()];
      };

      utf16StringDifference = function(a, b) {
        var leftIndex, rightIndexA, rightIndexB;
        leftIndex = 0;
        rightIndexA = a.length;
        rightIndexB = b.length;
        while (leftIndex < rightIndexA && a.charAt(leftIndex).isEqualTo(b.charAt(leftIndex))) {
          leftIndex++;
        }
        while (rightIndexA > leftIndex + 1 && a.charAt(rightIndexA - 1).isEqualTo(b.charAt(rightIndexB - 1))) {
          rightIndexA--;
          rightIndexB--;
        }
        return {
          utf16String: a.slice(leftIndex, rightIndexA),
          offset: leftIndex
        };
      };

    }).call(this);
    (function() {
      Trix.extend({
        copyObject: function(object) {
          var key, result, value;
          if (object == null) {
            object = {};
          }
          result = {};
          for (key in object) {
            value = object[key];
            result[key] = value;
          }
          return result;
        },
        objectsAreEqual: function(a, b) {
          var key, value;
          if (a == null) {
            a = {};
          }
          if (b == null) {
            b = {};
          }
          if (Object.keys(a).length !== Object.keys(b).length) {
            return false;
          }
          for (key in a) {
            value = a[key];
            if (value !== b[key]) {
              return false;
            }
          }
          return true;
        }
      });

    }).call(this);
    (function() {
      var slice = [].slice;

      Trix.extend({
        arraysAreEqual: function(a, b) {
          var i, index, len, value;
          if (a == null) {
            a = [];
          }
          if (b == null) {
            b = [];
          }
          if (a.length !== b.length) {
            return false;
          }
          for (index = i = 0, len = a.length; i < len; index = ++i) {
            value = a[index];
            if (value !== b[index]) {
              return false;
            }
          }
          return true;
        },
        arrayStartsWith: function(a, b) {
          if (a == null) {
            a = [];
          }
          if (b == null) {
            b = [];
          }
          return Trix.arraysAreEqual(a.slice(0, b.length), b);
        },
        spliceArray: function() {
          var args, array, result;
          array = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
          result = array.slice(0);
          result.splice.apply(result, args);
          return result;
        },
        summarizeArrayChange: function(oldArray, newArray) {
          var added, currentValues, existingValues, i, j, k, len, len1, len2, removed, value;
          if (oldArray == null) {
            oldArray = [];
          }
          if (newArray == null) {
            newArray = [];
          }
          added = [];
          removed = [];
          existingValues = new Set;
          for (i = 0, len = oldArray.length; i < len; i++) {
            value = oldArray[i];
            existingValues.add(value);
          }
          currentValues = new Set;
          for (j = 0, len1 = newArray.length; j < len1; j++) {
            value = newArray[j];
            currentValues.add(value);
            if (!existingValues.has(value)) {
              added.push(value);
            }
          }
          for (k = 0, len2 = oldArray.length; k < len2; k++) {
            value = oldArray[k];
            if (!currentValues.has(value)) {
              removed.push(value);
            }
          }
          return {
            added: added,
            removed: removed
          };
        }
      });

    }).call(this);
    (function() {
      var allAttributeNames, blockAttributeNames, listAttributeNames, textAttributeNames;

      allAttributeNames = null;

      blockAttributeNames = null;

      textAttributeNames = null;

      listAttributeNames = null;

      Trix.extend({
        getAllAttributeNames: function() {
          return allAttributeNames != null ? allAttributeNames : allAttributeNames = Trix.getTextAttributeNames().concat(Trix.getBlockAttributeNames());
        },
        getBlockConfig: function(attributeName) {
          return Trix.config.blockAttributes[attributeName];
        },
        getBlockAttributeNames: function() {
          return blockAttributeNames != null ? blockAttributeNames : blockAttributeNames = Object.keys(Trix.config.blockAttributes);
        },
        getTextConfig: function(attributeName) {
          return Trix.config.textAttributes[attributeName];
        },
        getTextAttributeNames: function() {
          return textAttributeNames != null ? textAttributeNames : textAttributeNames = Object.keys(Trix.config.textAttributes);
        },
        getListAttributeNames: function() {
          var key, listAttribute;
          return listAttributeNames != null ? listAttributeNames : listAttributeNames = (function() {
            var ref, results;
            ref = Trix.config.blockAttributes;
            results = [];
            for (key in ref) {
              listAttribute = ref[key].listAttribute;
              if (listAttribute != null) {
                results.push(listAttribute);
              }
            }
            return results;
          })();
        }
      });

    }).call(this);
    (function() {
      var html, match, ref, ref1, ref2,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      html = document.documentElement;

      match = (ref = (ref1 = (ref2 = html.matchesSelector) != null ? ref2 : html.webkitMatchesSelector) != null ? ref1 : html.msMatchesSelector) != null ? ref : html.mozMatchesSelector;

      Trix.extend({
        handleEvent: function(eventName, arg) {
          var callback, element, handler, inPhase, matchingSelector, onElement, preventDefault, ref3, selector, times, useCapture, withCallback;
          ref3 = arg != null ? arg : {}, onElement = ref3.onElement, matchingSelector = ref3.matchingSelector, withCallback = ref3.withCallback, inPhase = ref3.inPhase, preventDefault = ref3.preventDefault, times = ref3.times;
          element = onElement != null ? onElement : html;
          selector = matchingSelector;
          callback = withCallback;
          useCapture = inPhase === "capturing";
          handler = function(event) {
            var target;
            if ((times != null) && --times === 0) {
              handler.destroy();
            }
            target = Trix.findClosestElementFromNode(event.target, {
              matchingSelector: selector
            });
            if (target != null) {
              if (withCallback != null) {
                withCallback.call(target, event, target);
              }
              if (preventDefault) {
                return event.preventDefault();
              }
            }
          };
          handler.destroy = function() {
            return element.removeEventListener(eventName, handler, useCapture);
          };
          element.addEventListener(eventName, handler, useCapture);
          return handler;
        },
        handleEventOnce: function(eventName, options) {
          if (options == null) {
            options = {};
          }
          options.times = 1;
          return Trix.handleEvent(eventName, options);
        },
        triggerEvent: function(eventName, arg) {
          var attributes, bubbles, cancelable, element, event, onElement, ref3;
          ref3 = arg != null ? arg : {}, onElement = ref3.onElement, bubbles = ref3.bubbles, cancelable = ref3.cancelable, attributes = ref3.attributes;
          element = onElement != null ? onElement : html;
          bubbles = bubbles !== false;
          cancelable = cancelable !== false;
          event = document.createEvent("Events");
          event.initEvent(eventName, bubbles, cancelable);
          if (attributes != null) {
            Trix.extend.call(event, attributes);
          }
          return element.dispatchEvent(event);
        },
        elementMatchesSelector: function(element, selector) {
          if ((element != null ? element.nodeType : void 0) === 1) {
            return match.call(element, selector);
          }
        },
        findClosestElementFromNode: function(node, arg) {
          var matchingSelector, ref3, untilNode;
          ref3 = arg != null ? arg : {}, matchingSelector = ref3.matchingSelector, untilNode = ref3.untilNode;
          while (!((node == null) || node.nodeType === Node.ELEMENT_NODE)) {
            node = node.parentNode;
          }
          if (node == null) {
            return;
          }
          if (matchingSelector != null) {
            if (node.closest && (untilNode == null)) {
              return node.closest(matchingSelector);
            } else {
              while (node && node !== untilNode) {
                if (Trix.elementMatchesSelector(node, matchingSelector)) {
                  return node;
                }
                node = node.parentNode;
              }
            }
          } else {
            return node;
          }
        },
        findInnerElement: function(element) {
          while (element != null ? element.firstElementChild : void 0) {
            element = element.firstElementChild;
          }
          return element;
        },
        innerElementIsActive: function(element) {
          return document.activeElement !== element && Trix.elementContainsNode(element, document.activeElement);
        },
        elementContainsNode: function(element, node) {
          if (!(element && node)) {
            return;
          }
          while (node) {
            if (node === element) {
              return true;
            }
            node = node.parentNode;
          }
        },
        findNodeFromContainerAndOffset: function(container, offset) {
          var ref3;
          if (!container) {
            return;
          }
          if (container.nodeType === Node.TEXT_NODE) {
            return container;
          } else if (offset === 0) {
            return (ref3 = container.firstChild) != null ? ref3 : container;
          } else {
            return container.childNodes.item(offset - 1);
          }
        },
        findElementFromContainerAndOffset: function(container, offset) {
          var node;
          node = Trix.findNodeFromContainerAndOffset(container, offset);
          return Trix.findClosestElementFromNode(node);
        },
        findChildIndexOfNode: function(node) {
          var childIndex;
          if (!(node != null ? node.parentNode : void 0)) {
            return;
          }
          childIndex = 0;
          while (node = node.previousSibling) {
            childIndex++;
          }
          return childIndex;
        },
        walkTree: function(tree, arg) {
          var expandEntityReferences, onlyNodesOfType, ref3, usingFilter, whatToShow;
          ref3 = arg != null ? arg : {}, onlyNodesOfType = ref3.onlyNodesOfType, usingFilter = ref3.usingFilter, expandEntityReferences = ref3.expandEntityReferences;
          whatToShow = (function() {
            switch (onlyNodesOfType) {
              case "element":
                return NodeFilter.SHOW_ELEMENT;
              case "text":
                return NodeFilter.SHOW_TEXT;
              case "comment":
                return NodeFilter.SHOW_COMMENT;
              default:
                return NodeFilter.SHOW_ALL;
            }
          })();
          return document.createTreeWalker(tree, whatToShow, usingFilter != null ? usingFilter : null, expandEntityReferences === true);
        },
        tagName: function(element) {
          var ref3;
          return element != null ? (ref3 = element.tagName) != null ? ref3.toLowerCase() : void 0 : void 0;
        },
        makeElement: function(tagName, options) {
          var className, element, i, key, len, ref3, ref4, ref5, ref6, value;
          if (options == null) {
            options = {};
          }
          if (typeof tagName === "object") {
            options = tagName;
            tagName = options.tagName;
          } else {
            options = {
              attributes: options
            };
          }
          element = document.createElement(tagName);
          if (options.editable != null) {
            if (options.attributes == null) {
              options.attributes = {};
            }
            options.attributes.contenteditable = options.editable;
          }
          if (options.attributes) {
            ref3 = options.attributes;
            for (key in ref3) {
              value = ref3[key];
              element.setAttribute(key, value);
            }
          }
          if (options.style) {
            ref4 = options.style;
            for (key in ref4) {
              value = ref4[key];
              element.style[key] = value;
            }
          }
          if (options.data) {
            ref5 = options.data;
            for (key in ref5) {
              value = ref5[key];
              element.dataset[key] = value;
            }
          }
          if (options.className) {
            ref6 = options.className.split(" ");
            for (i = 0, len = ref6.length; i < len; i++) {
              className = ref6[i];
              element.classList.add(className);
            }
          }
          if (options.textContent) {
            element.textContent = options.textContent;
          }
          return element;
        },
        getBlockTagNames: function() {
          var key, value;
          return Trix.blockTagNames != null ? Trix.blockTagNames : Trix.blockTagNames = (function() {
            var ref3, results;
            ref3 = Trix.config.blockAttributes;
            results = [];
            for (key in ref3) {
              value = ref3[key];
              results.push(value.tagName);
            }
            return results;
          })();
        },
        nodeIsBlockContainer: function(node) {
          return Trix.nodeIsBlockStartComment(node != null ? node.firstChild : void 0);
        },
        nodeProbablyIsBlockContainer: function(node) {
          var ref3, ref4;
          return (ref3 = Trix.tagName(node), indexOf.call(Trix.getBlockTagNames(), ref3) >= 0) && (ref4 = Trix.tagName(node.firstChild), indexOf.call(Trix.getBlockTagNames(), ref4) < 0);
        },
        nodeIsBlockStart: function(node, arg) {
          var strict;
          strict = (arg != null ? arg : {
            strict: true
          }).strict;
          if (strict) {
            return Trix.nodeIsBlockStartComment(node);
          } else {
            return Trix.nodeIsBlockStartComment(node) || (!Trix.nodeIsBlockStartComment(node.firstChild) && Trix.nodeProbablyIsBlockContainer(node));
          }
        },
        nodeIsBlockStartComment: function(node) {
          return Trix.nodeIsCommentNode(node) && (node != null ? node.data : void 0) === "block";
        },
        nodeIsCommentNode: function(node) {
          return (node != null ? node.nodeType : void 0) === Node.COMMENT_NODE;
        },
        nodeIsCursorTarget: function(node) {
          if (!node) {
            return;
          }
          if (Trix.nodeIsTextNode(node)) {
            return node.data === Trix.ZERO_WIDTH_SPACE;
          } else {
            return Trix.nodeIsCursorTarget(node.firstChild);
          }
        },
        nodeIsAttachmentElement: function(node) {
          return Trix.elementMatchesSelector(node, Trix.AttachmentView.attachmentSelector);
        },
        nodeIsEmptyTextNode: function(node) {
          return Trix.nodeIsTextNode(node) && (node != null ? node.data : void 0) === "";
        },
        nodeIsTextNode: function(node) {
          return (node != null ? node.nodeType : void 0) === Node.TEXT_NODE;
        }
      });

    }).call(this);
    (function() {
      var copyObject, copyValue, normalizeRange, objectsAreEqual, rangeValuesAreEqual;

      copyObject = Trix.copyObject, objectsAreEqual = Trix.objectsAreEqual;

      Trix.extend({
        normalizeRange: normalizeRange = function(range) {
          var ref;
          if (range == null) {
            return;
          }
          if (!Array.isArray(range)) {
            range = [range, range];
          }
          return [copyValue(range[0]), copyValue((ref = range[1]) != null ? ref : range[0])];
        },
        rangeIsCollapsed: function(range) {
          var end, ref, start;
          if (range == null) {
            return;
          }
          ref = normalizeRange(range), start = ref[0], end = ref[1];
          return rangeValuesAreEqual(start, end);
        },
        rangesAreEqual: function(leftRange, rightRange) {
          var leftEnd, leftStart, ref, ref1, rightEnd, rightStart;
          if (!((leftRange != null) && (rightRange != null))) {
            return;
          }
          ref = normalizeRange(leftRange), leftStart = ref[0], leftEnd = ref[1];
          ref1 = normalizeRange(rightRange), rightStart = ref1[0], rightEnd = ref1[1];
          return rangeValuesAreEqual(leftStart, rightStart) && rangeValuesAreEqual(leftEnd, rightEnd);
        }
      });

      copyValue = function(value) {
        if (typeof value === "number") {
          return value;
        } else {
          return copyObject(value);
        }
      };

      rangeValuesAreEqual = function(left, right) {
        if (typeof left === "number") {
          return left === right;
        } else {
          return objectsAreEqual(left, right);
        }
      };

    }).call(this);
    (function() {
      var defaults, insertStyleElementForTagName, installDefaultCSSForTagName, rewriteFunctionsAsValues;

      defaults = {
        extendsTagName: "div",
        css: "%t { display: block; }"
      };

      Trix.registerElement = function(tagName, definition) {
        var constructor, defaultCSS, extendedPrototype, extendsTagName, properties, prototype, ref;
        if (definition == null) {
          definition = {};
        }
        tagName = tagName.toLowerCase();
        properties = rewriteFunctionsAsValues(definition);
        extendsTagName = (ref = properties.extendsTagName) != null ? ref : defaults.extendsTagName;
        delete properties.extendsTagName;
        defaultCSS = properties.defaultCSS;
        delete properties.defaultCSS;
        if ((defaultCSS != null) && extendsTagName === defaults.extendsTagName) {
          defaultCSS += "\n" + defaults.css;
        } else {
          defaultCSS = defaults.css;
        }
        installDefaultCSSForTagName(defaultCSS, tagName);
        extendedPrototype = Object.getPrototypeOf(document.createElement(extendsTagName));
        extendedPrototype.__super__ = extendedPrototype;
        prototype = Object.create(extendedPrototype, properties);
        constructor = document.registerElement(tagName, {
          prototype: prototype
        });
        Object.defineProperty(prototype, "constructor", {
          value: constructor
        });
        return constructor;
      };

      installDefaultCSSForTagName = function(defaultCSS, tagName) {
        var styleElement;
        styleElement = insertStyleElementForTagName(tagName);
        return styleElement.textContent = defaultCSS.replace(/%t/g, tagName);
      };

      insertStyleElementForTagName = function(tagName) {
        var element;
        element = document.createElement("style");
        element.setAttribute("type", "text/css");
        element.setAttribute("data-tag-name", tagName.toLowerCase());
        document.head.insertBefore(element, document.head.firstChild);
        return element;
      };

      rewriteFunctionsAsValues = function(definition) {
        var key, object, value;
        object = {};
        for (key in definition) {
          value = definition[key];
          object[key] = typeof value === "function" ? {
            value: value
          } : value;
        }
        return object;
      };

    }).call(this);
    (function() {
      var domRangeIsPrivate, nodeIsPrivate;

      Trix.extend({
        getDOMSelection: function() {
          var selection;
          selection = window.getSelection();
          if (selection.rangeCount > 0) {
            return selection;
          }
        },
        getDOMRange: function() {
          var domRange, ref;
          if (domRange = (ref = Trix.getDOMSelection()) != null ? ref.getRangeAt(0) : void 0) {
            if (!domRangeIsPrivate(domRange)) {
              return domRange;
            }
          }
        },
        setDOMRange: function(domRange) {
          var selection;
          selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(domRange);
          return Trix.selectionChangeObserver.update();
        }
      });

      domRangeIsPrivate = function(domRange) {
        return nodeIsPrivate(domRange.startContainer) || nodeIsPrivate(domRange.endContainer);
      };

      nodeIsPrivate = function(node) {
        return !Object.getPrototypeOf(node);
      };

    }).call(this);
    (function() {


    }).call(this);
    (function() {
      var arraysAreEqual,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      arraysAreEqual = Trix.arraysAreEqual;

      Trix.Hash = (function(superClass) {
        var box, copy, merge, object, unbox;

        extend(Hash, superClass);

        Hash.fromCommonAttributesOfObjects = function(objects) {
          var hash, i, keys, len, object, ref;
          if (objects == null) {
            objects = [];
          }
          if (!objects.length) {
            return new this;
          }
          hash = box(objects[0]);
          keys = hash.getKeys();
          ref = objects.slice(1);
          for (i = 0, len = ref.length; i < len; i++) {
            object = ref[i];
            keys = hash.getKeysCommonToHash(box(object));
            hash = hash.slice(keys);
          }
          return hash;
        };

        Hash.box = function(values) {
          return box(values);
        };

        function Hash(values) {
          if (values == null) {
            values = {};
          }
          this.values = copy(values);
          Hash.__super__.constructor.apply(this, arguments);
        }

        Hash.prototype.add = function(key, value) {
          return this.merge(object(key, value));
        };

        Hash.prototype.remove = function(key) {
          return new Trix.Hash(copy(this.values, key));
        };

        Hash.prototype.get = function(key) {
          return this.values[key];
        };

        Hash.prototype.has = function(key) {
          return key in this.values;
        };

        Hash.prototype.merge = function(values) {
          return new Trix.Hash(merge(this.values, unbox(values)));
        };

        Hash.prototype.slice = function(keys) {
          var i, key, len, values;
          values = {};
          for (i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            if (this.has(key)) {
              values[key] = this.values[key];
            }
          }
          return new Trix.Hash(values);
        };

        Hash.prototype.getKeys = function() {
          return Object.keys(this.values);
        };

        Hash.prototype.getKeysCommonToHash = function(hash) {
          var i, key, len, ref, results;
          hash = box(hash);
          ref = this.getKeys();
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            key = ref[i];
            if (this.values[key] === hash.values[key]) {
              results.push(key);
            }
          }
          return results;
        };

        Hash.prototype.isEqualTo = function(values) {
          return arraysAreEqual(this.toArray(), box(values).toArray());
        };

        Hash.prototype.isEmpty = function() {
          return this.getKeys().length === 0;
        };

        Hash.prototype.toArray = function() {
          var key, result, value;
          return (this.array != null ? this.array : this.array = ((function() {
            var ref;
            result = [];
            ref = this.values;
            for (key in ref) {
              value = ref[key];
              result.push(key, value);
            }
            return result;
          }).call(this))).slice(0);
        };

        Hash.prototype.toObject = function() {
          return copy(this.values);
        };

        Hash.prototype.toJSON = function() {
          return this.toObject();
        };

        Hash.prototype.contentsForInspection = function() {
          return {
            values: JSON.stringify(this.values)
          };
        };

        object = function(key, value) {
          var result;
          result = {};
          result[key] = value;
          return result;
        };

        merge = function(object, values) {
          var key, result, value;
          result = copy(object);
          for (key in values) {
            value = values[key];
            result[key] = value;
          }
          return result;
        };

        copy = function(object, keyToRemove) {
          var i, key, len, result, sortedKeys;
          result = {};
          sortedKeys = Object.keys(object).sort();
          for (i = 0, len = sortedKeys.length; i < len; i++) {
            key = sortedKeys[i];
            if (key !== keyToRemove) {
              result[key] = object[key];
            }
          }
          return result;
        };

        box = function(object) {
          if (object instanceof Trix.Hash) {
            return object;
          } else {
            return new Trix.Hash(object);
          }
        };

        unbox = function(object) {
          if (object instanceof Trix.Hash) {
            return object.values;
          } else {
            return object;
          }
        };

        return Hash;

      })(Trix.Object);

    }).call(this);
    (function() {
      Trix.ObjectGroup = (function() {
        ObjectGroup.groupObjects = function(ungroupedObjects, arg) {
          var asTree, base, depth, group, i, len, object, objects, ref;
          if (ungroupedObjects == null) {
            ungroupedObjects = [];
          }
          ref = arg != null ? arg : {}, depth = ref.depth, asTree = ref.asTree;
          if (asTree) {
            if (depth == null) {
              depth = 0;
            }
          }
          objects = [];
          for (i = 0, len = ungroupedObjects.length; i < len; i++) {
            object = ungroupedObjects[i];
            if (group) {
              if ((typeof object.canBeGrouped === "function" ? object.canBeGrouped(depth) : void 0) && (typeof (base = group[group.length - 1]).canBeGroupedWith === "function" ? base.canBeGroupedWith(object, depth) : void 0)) {
                group.push(object);
                continue;
              } else {
                objects.push(new this(group, {
                  depth: depth,
                  asTree: asTree
                }));
                group = null;
              }
            }
            if (typeof object.canBeGrouped === "function" ? object.canBeGrouped(depth) : void 0) {
              group = [object];
            } else {
              objects.push(object);
            }
          }
          if (group) {
            objects.push(new this(group, {
              depth: depth,
              asTree: asTree
            }));
          }
          return objects;
        };

        function ObjectGroup(objects1, arg) {
          var asTree, depth;
          this.objects = objects1 != null ? objects1 : [];
          depth = arg.depth, asTree = arg.asTree;
          if (asTree) {
            this.depth = depth;
            this.objects = this.constructor.groupObjects(this.objects, {
              asTree: asTree,
              depth: this.depth + 1
            });
          }
        }

        ObjectGroup.prototype.getObjects = function() {
          return this.objects;
        };

        ObjectGroup.prototype.getDepth = function() {
          return this.depth;
        };

        ObjectGroup.prototype.getCacheKey = function() {
          var i, keys, len, object, ref;
          keys = ["objectGroup"];
          ref = this.getObjects();
          for (i = 0, len = ref.length; i < len; i++) {
            object = ref[i];
            keys.push(object.getCacheKey());
          }
          return keys.join("/");
        };

        return ObjectGroup;

      })();

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.ObjectMap = (function(superClass) {
        extend(ObjectMap, superClass);

        function ObjectMap(objects) {
          var base, hash, i, len, object;
          if (objects == null) {
            objects = [];
          }
          this.objects = {};
          for (i = 0, len = objects.length; i < len; i++) {
            object = objects[i];
            hash = JSON.stringify(object);
            if ((base = this.objects)[hash] == null) {
              base[hash] = object;
            }
          }
        }

        ObjectMap.prototype.find = function(object) {
          var hash;
          hash = JSON.stringify(object);
          return this.objects[hash];
        };

        return ObjectMap;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      Trix.ElementStore = (function() {
        var getKey;

        function ElementStore(elements) {
          this.reset(elements);
        }

        ElementStore.prototype.add = function(element) {
          var key;
          key = getKey(element);
          return this.elements[key] = element;
        };

        ElementStore.prototype.remove = function(element) {
          var key, value;
          key = getKey(element);
          if (value = this.elements[key]) {
            delete this.elements[key];
            return value;
          }
        };

        ElementStore.prototype.reset = function(elements) {
          var element, i, len;
          if (elements == null) {
            elements = [];
          }
          this.elements = {};
          for (i = 0, len = elements.length; i < len; i++) {
            element = elements[i];
            this.add(element);
          }
          return elements;
        };

        getKey = function(element) {
          return element.dataset.trixStoreKey;
        };

        return ElementStore;

      })();

    }).call(this);
    (function() {


    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.Operation = (function(superClass) {
        extend(Operation, superClass);

        function Operation() {
          return Operation.__super__.constructor.apply(this, arguments);
        }

        Operation.prototype.isPerforming = function() {
          return this.performing === true;
        };

        Operation.prototype.hasPerformed = function() {
          return this.performed === true;
        };

        Operation.prototype.hasSucceeded = function() {
          return this.performed && this.succeeded;
        };

        Operation.prototype.hasFailed = function() {
          return this.performed && !this.succeeded;
        };

        Operation.prototype.getPromise = function() {
          return this.promise != null ? this.promise : this.promise = new Promise((function(_this) {
            return function(resolve, reject) {
              _this.performing = true;
              return _this.perform(function(succeeded, result) {
                _this.succeeded = succeeded;
                _this.performing = false;
                _this.performed = true;
                if (_this.succeeded) {
                  return resolve(result);
                } else {
                  return reject(result);
                }
              });
            };
          })(this));
        };

        Operation.prototype.perform = function(callback) {
          return callback(false);
        };

        Operation.prototype.release = function() {
          var ref;
          if ((ref = this.promise) != null) {
            if (typeof ref.cancel === "function") {
              ref.cancel();
            }
          }
          this.promise = null;
          this.performing = null;
          this.performed = null;
          return this.succeeded = null;
        };

        Operation.proxyMethod("getPromise().then");

        Operation.proxyMethod("getPromise().catch");

        return Operation;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var hasArrayFrom, hasStringCodePointAt, hasStringFromCodePoint, ucs2decode, ucs2encode,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.UTF16String = (function(superClass) {
        extend(UTF16String, superClass);

        UTF16String.box = function(value) {
          if (value == null) {
            value = "";
          }
          if (value instanceof this) {
            return value;
          } else {
            return this.fromUCS2String(value != null ? value.toString() : void 0);
          }
        };

        UTF16String.fromUCS2String = function(ucs2String) {
          return new this(ucs2String, ucs2decode(ucs2String));
        };

        UTF16String.fromCodepoints = function(codepoints) {
          return new this(ucs2encode(codepoints), codepoints);
        };

        function UTF16String(ucs2String1, codepoints1) {
          this.ucs2String = ucs2String1;
          this.codepoints = codepoints1;
          this.length = this.codepoints.length;
          this.ucs2Length = this.ucs2String.length;
        }

        UTF16String.prototype.offsetToUCS2Offset = function(offset) {
          return ucs2encode(this.codepoints.slice(0, Math.max(0, offset))).length;
        };

        UTF16String.prototype.offsetFromUCS2Offset = function(ucs2Offset) {
          return ucs2decode(this.ucs2String.slice(0, Math.max(0, ucs2Offset))).length;
        };

        UTF16String.prototype.slice = function() {
          var ref;
          return this.constructor.fromCodepoints((ref = this.codepoints).slice.apply(ref, arguments));
        };

        UTF16String.prototype.charAt = function(offset) {
          return this.slice(offset, offset + 1);
        };

        UTF16String.prototype.isEqualTo = function(value) {
          return this.constructor.box(value).ucs2String === this.ucs2String;
        };

        UTF16String.prototype.toJSON = function() {
          return this.ucs2String;
        };

        UTF16String.prototype.getCacheKey = function() {
          return this.ucs2String;
        };

        UTF16String.prototype.toString = function() {
          return this.ucs2String;
        };

        return UTF16String;

      })(Trix.BasicObject);

      hasArrayFrom = (typeof Array.from === "function" ? Array.from("\ud83d\udc7c").length : void 0) === 1;

      hasStringCodePointAt = (typeof " ".codePointAt === "function" ? " ".codePointAt(0) : void 0) != null;

      hasStringFromCodePoint = (typeof String.fromCodePoint === "function" ? String.fromCodePoint(32, 128124) : void 0) === " \ud83d\udc7c";

      if (hasArrayFrom && hasStringCodePointAt) {
        ucs2decode = function(string) {
          return Array.from(string).map(function(char) {
            return char.codePointAt(0);
          });
        };
      } else {
        ucs2decode = function(string) {
          var counter, extra, length, output, value;
          output = [];
          counter = 0;
          length = string.length;
          while (counter < length) {
            value = string.charCodeAt(counter++);
            if ((0xD800 <= value && value <= 0xDBFF) && counter < length) {
              extra = string.charCodeAt(counter++);
              if ((extra & 0xFC00) === 0xDC00) {
                value = ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
              } else {
                counter--;
              }
            }
            output.push(value);
          }
          return output;
        };
      }

      if (hasStringFromCodePoint) {
        ucs2encode = function(array) {
          return String.fromCodePoint.apply(String, array);
        };
      } else {
        ucs2encode = function(array) {
          var characters, output, value;
          characters = (function() {
            var i, len, results;
            results = [];
            for (i = 0, len = array.length; i < len; i++) {
              value = array[i];
              output = "";
              if (value > 0xFFFF) {
                value -= 0x10000;
                output += String.fromCharCode(value >>> 10 & 0x3FF | 0xD800);
                value = 0xDC00 | value & 0x3FF;
              }
              results.push(output + String.fromCharCode(value));
            }
            return results;
          })();
          return characters.join("");
        };
      }

    }).call(this);
    (function() {


    }).call(this);
    (function() {


    }).call(this);
    (function() {
      Trix.config.lang = {
        bold: "Bold",
        bullets: "Bullets",
        byte: "Byte",
        bytes: "Bytes",
        captionPlaceholder: "Add a caption…",
        code: "Code",
        heading1: "Heading",
        indent: "Increase Level",
        italic: "Italic",
        link: "Link",
        numbers: "Numbers",
        outdent: "Decrease Level",
        quote: "Quote",
        redo: "Redo",
        remove: "Remove",
        strike: "Strikethrough",
        undo: "Undo",
        unlink: "Unlink",
        urlPlaceholder: "Enter a URL…",
        GB: "GB",
        KB: "KB",
        MB: "MB",
        PB: "PB",
        TB: "TB"
      };

    }).call(this);
    (function() {
      Trix.config.css = {
        attachment: "attachment",
        attachmentProgress: "attachment__progress",
        attachmentName: "attachment__name",
        attachmentSize: "attachment__size",
        attachmentRemove: "attachment__remove",
        attachmentCaption: "attachment__caption",
        attachmentCaptionEditor: "attachment__caption-editor"
      };

    }).call(this);
    (function() {
      var attributes;

      Trix.config.blockAttributes = attributes = {
        "default": {
          tagName: "div",
          parse: false
        },
        quote: {
          tagName: "blockquote",
          nestable: true
        },
        heading1: {
          tagName: "h1",
          terminal: true,
          breakOnReturn: true,
          group: false
        },
        code: {
          tagName: "pre",
          terminal: true,
          text: {
            plaintext: true
          }
        },
        bulletList: {
          tagName: "ul",
          parse: false
        },
        bullet: {
          tagName: "li",
          listAttribute: "bulletList",
          group: false,
          nestable: true,
          test: function(element) {
            return Trix.tagName(element.parentNode) === attributes[this.listAttribute].tagName;
          }
        },
        numberList: {
          tagName: "ol",
          parse: false
        },
        number: {
          tagName: "li",
          listAttribute: "numberList",
          group: false,
          nestable: true,
          test: function(element) {
            return Trix.tagName(element.parentNode) === attributes[this.listAttribute].tagName;
          }
        }
      };

    }).call(this);
    (function() {
      var lang, sizes;

      lang = Trix.config.lang;

      sizes = [lang.bytes, lang.KB, lang.MB, lang.GB, lang.TB, lang.PB];

      Trix.config.fileSize = {
        prefix: "IEC",
        precision: 2,
        formatter: function(number) {
          var base, exp, humanSize, string, withoutInsignificantZeros;
          switch (number) {
            case 0:
              return "0 " + lang.bytes;
            case 1:
              return "1 " + lang.byte;
            default:
              base = (function() {
                switch (this.prefix) {
                  case "SI":
                    return 1000;
                  case "IEC":
                    return 1024;
                }
              }).call(this);
              exp = Math.floor(Math.log(number) / Math.log(base));
              humanSize = number / Math.pow(base, exp);
              string = humanSize.toFixed(this.precision);
              withoutInsignificantZeros = string.replace(/0*$/, "").replace(/\.$/, "");
              return withoutInsignificantZeros + " " + sizes[exp];
          }
        }
      };

    }).call(this);
    (function() {
      Trix.config.textAttributes = {
        bold: {
          tagName: "strong",
          inheritable: true,
          parser: function(element) {
            var style;
            style = window.getComputedStyle(element);
            return style["fontWeight"] === "bold" || style["fontWeight"] >= 600;
          }
        },
        italic: {
          tagName: "em",
          inheritable: true,
          parser: function(element) {
            var style;
            style = window.getComputedStyle(element);
            return style["fontStyle"] === "italic";
          }
        },
        href: {
          groupTagName: "a",
          parser: function(element) {
            var attachmentSelector, link, matchingSelector;
            attachmentSelector = Trix.AttachmentView.attachmentSelector;
            matchingSelector = "a:not(" + attachmentSelector + ")";
            if (link = Trix.findClosestElementFromNode(element, {
              matchingSelector: matchingSelector
            })) {
              return link.getAttribute("href");
            }
          }
        },
        strike: {
          tagName: "del",
          inheritable: true
        },
        frozen: {
          style: {
            "backgroundColor": "highlight"
          }
        }
      };

    }).call(this);
    (function() {
      var blockCommentPattern, serializedAttributesAttribute, serializedAttributesSelector, unserializableAttributeNames, unserializableElementSelector;

      unserializableElementSelector = "[data-trix-serialize=false]";

      unserializableAttributeNames = ["contenteditable", "data-trix-id", "data-trix-store-key", "data-trix-mutable", "data-trix-placeholder", "tabindex"];

      serializedAttributesAttribute = "data-trix-serialized-attributes";

      serializedAttributesSelector = "[" + serializedAttributesAttribute + "]";

      blockCommentPattern = new RegExp("<!--block-->", "g");

      Trix.extend({
        serializers: {
          "application/json": function(serializable) {
            var document;
            if (serializable instanceof Trix.Document) {
              document = serializable;
            } else if (serializable instanceof HTMLElement) {
              document = Trix.Document.fromHTML(serializable.innerHTML);
            } else {
              throw new Error("unserializable object");
            }
            return document.toSerializableDocument().toJSONString();
          },
          "text/html": function(serializable) {
            var attribute, attributes, el, element, i, j, k, l, len, len1, len2, len3, name, ref, ref1, ref2, value;
            if (serializable instanceof Trix.Document) {
              element = Trix.DocumentView.render(serializable);
            } else if (serializable instanceof HTMLElement) {
              element = serializable.cloneNode(true);
            } else {
              throw new Error("unserializable object");
            }
            ref = element.querySelectorAll(unserializableElementSelector);
            for (i = 0, len = ref.length; i < len; i++) {
              el = ref[i];
              el.parentNode.removeChild(el);
            }
            for (j = 0, len1 = unserializableAttributeNames.length; j < len1; j++) {
              attribute = unserializableAttributeNames[j];
              ref1 = element.querySelectorAll("[" + attribute + "]");
              for (k = 0, len2 = ref1.length; k < len2; k++) {
                el = ref1[k];
                el.removeAttribute(attribute);
              }
            }
            ref2 = element.querySelectorAll(serializedAttributesSelector);
            for (l = 0, len3 = ref2.length; l < len3; l++) {
              el = ref2[l];
              try {
                attributes = JSON.parse(el.getAttribute(serializedAttributesAttribute));
                el.removeAttribute(serializedAttributesAttribute);
                for (name in attributes) {
                  value = attributes[name];
                  el.setAttribute(name, value);
                }
              } catch (_error) {}
            }
            return element.innerHTML.replace(blockCommentPattern, "");
          }
        },
        deserializers: {
          "application/json": function(string) {
            return Trix.Document.fromJSONString(string);
          },
          "text/html": function(string) {
            return Trix.Document.fromHTML(string);
          }
        },
        serializeToContentType: function(serializable, contentType) {
          var serializer;
          if (serializer = Trix.serializers[contentType]) {
            return serializer(serializable);
          } else {
            throw new Error("unknown content type: " + contentType);
          }
        },
        deserializeFromContentType: function(string, contentType) {
          var deserializer;
          if (deserializer = Trix.deserializers[contentType]) {
            return deserializer(string);
          } else {
            throw new Error("unknown content type: " + contentType);
          }
        }
      });

    }).call(this);
    (function() {
      var lang;

      lang = Trix.config.lang;

      Trix.config.toolbar = {
        getDefaultHTML: function() {
          return "<div class=\"trix-button-row\">\n  <span class=\"trix-button-group trix-button-group--text-tools\" data-trix-button-group=\"text-tools\">\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-bold\" data-trix-attribute=\"bold\" data-trix-key=\"b\" title=\"" + lang.bold + "\" tabindex=\"-1\">" + lang.bold + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-italic\" data-trix-attribute=\"italic\" data-trix-key=\"i\" title=\"" + lang.italic + "\" tabindex=\"-1\">" + lang.italic + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-strike\" data-trix-attribute=\"strike\" title=\"" + lang.strike + "\" tabindex=\"-1\">" + lang.strike + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-link\" data-trix-attribute=\"href\" data-trix-action=\"link\" data-trix-key=\"k\" title=\"" + lang.link + "\" tabindex=\"-1\">" + lang.link + "</button>\n  </span>\n\n  <span class=\"trix-button-group trix-button-group--block-tools\" data-trix-button-group=\"block-tools\">\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-heading-1\" data-trix-attribute=\"heading1\" title=\"" + lang.heading1 + "\" tabindex=\"-1\">" + lang.heading1 + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-quote\" data-trix-attribute=\"quote\" title=\"" + lang.quote + "\" tabindex=\"-1\">" + lang.quote + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-code\" data-trix-attribute=\"code\" title=\"" + lang.code + "\" tabindex=\"-1\">" + lang.code + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-bullet-list\" data-trix-attribute=\"bullet\" title=\"" + lang.bullets + "\" tabindex=\"-1\">" + lang.bullets + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-number-list\" data-trix-attribute=\"number\" title=\"" + lang.numbers + "\" tabindex=\"-1\">" + lang.numbers + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-decrease-nesting-level\" data-trix-action=\"decreaseNestingLevel\" title=\"" + lang.outdent + "\" tabindex=\"-1\">" + lang.outdent + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-increase-nesting-level\" data-trix-action=\"increaseNestingLevel\" title=\"" + lang.indent + "\" tabindex=\"-1\">" + lang.indent + "</button>\n  </span>\n\n  <span class=\"trix-button-group trix-button-group--history-tools\" data-trix-button-group=\"history-tools\">\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-undo\" data-trix-action=\"undo\" data-trix-key=\"z\" title=\"" + lang.undo + "\" tabindex=\"-1\">" + lang.undo + "</button>\n    <button type=\"button\" class=\"trix-button trix-button--icon trix-button--icon-redo\" data-trix-action=\"redo\" data-trix-key=\"shift+z\" title=\"" + lang.redo + "\" tabindex=\"-1\">" + lang.redo + "</button>\n  </span>\n</div>\n\n<div class=\"trix-dialogs\" data-trix-dialogs>\n  <div class=\"trix-dialog trix-dialog--link\" data-trix-dialog=\"href\" data-trix-dialog-attribute=\"href\">\n    <div class=\"trix-dialog__link-fields\">\n      <input type=\"url\" name=\"href\" class=\"trix-input trix-input--dialog\" placeholder=\"" + lang.urlPlaceholder + "\" required data-trix-input>\n      <div class=\"trix-button-group\">\n        <input type=\"button\" class=\"trix-button trix-button--dialog\" value=\"" + lang.link + "\" data-trix-method=\"setAttribute\">\n        <input type=\"button\" class=\"trix-button trix-button--dialog\" value=\"" + lang.unlink + "\" data-trix-method=\"removeAttribute\">\n      </div>\n    </div>\n  </div>\n</div>";
        }
      };

    }).call(this);
    (function() {
      Trix.config.undoInterval = 5000;

    }).call(this);
    (function() {
      Trix.config.attachments = {
        preview: {
          caption: {
            name: true,
            size: true
          }
        },
        file: {
          caption: {
            size: true
          }
        }
      };

    }).call(this);
    (function() {


    }).call(this);
    (function() {
      Trix.registerElement("trix-toolbar", {
        defaultCSS: "%t {\n  white-space: nowrap;\n}\n\n%t [data-trix-dialog] {\n  display: none;\n}\n\n%t [data-trix-dialog][data-trix-active] {\n  display: block;\n}\n\n%t [data-trix-dialog] [data-trix-validate]:invalid {\n  background-color: #ffdddd;\n}",
        createdCallback: function() {
          if (this.innerHTML === "") {
            return this.innerHTML = Trix.config.toolbar.getDefaultHTML();
          }
        }
      });

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      Trix.ObjectView = (function(superClass) {
        extend(ObjectView, superClass);

        function ObjectView(object1, options1) {
          this.object = object1;
          this.options = options1 != null ? options1 : {};
          this.childViews = [];
          this.rootView = this;
        }

        ObjectView.prototype.getNodes = function() {
          var i, len, node, ref, results;
          if (this.nodes == null) {
            this.nodes = this.createNodes();
          }
          ref = this.nodes;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            node = ref[i];
            results.push(node.cloneNode(true));
          }
          return results;
        };

        ObjectView.prototype.invalidate = function() {
          var ref;
          this.nodes = null;
          return (ref = this.parentView) != null ? ref.invalidate() : void 0;
        };

        ObjectView.prototype.invalidateViewForObject = function(object) {
          var ref;
          return (ref = this.findViewForObject(object)) != null ? ref.invalidate() : void 0;
        };

        ObjectView.prototype.findOrCreateCachedChildView = function(viewClass, object, options) {
          var view;
          if (view = this.getCachedViewForObject(object)) {
            this.recordChildView(view);
          } else {
            view = this.createChildView.apply(this, arguments);
            this.cacheViewForObject(view, object);
          }
          return view;
        };

        ObjectView.prototype.createChildView = function(viewClass, object, options) {
          var view;
          if (options == null) {
            options = {};
          }
          if (object instanceof Trix.ObjectGroup) {
            options.viewClass = viewClass;
            viewClass = Trix.ObjectGroupView;
          }
          view = new viewClass(object, options);
          return this.recordChildView(view);
        };

        ObjectView.prototype.recordChildView = function(view) {
          view.parentView = this;
          view.rootView = this.rootView;
          if (indexOf.call(this.childViews, view) < 0) {
            this.childViews.push(view);
          }
          return view;
        };

        ObjectView.prototype.getAllChildViews = function() {
          var childView, i, len, ref, views;
          views = [];
          ref = this.childViews;
          for (i = 0, len = ref.length; i < len; i++) {
            childView = ref[i];
            views.push(childView);
            views = views.concat(childView.getAllChildViews());
          }
          return views;
        };

        ObjectView.prototype.findElement = function() {
          return this.findElementForObject(this.object);
        };

        ObjectView.prototype.findElementForObject = function(object) {
          var id;
          if (id = object != null ? object.id : void 0) {
            return this.rootView.element.querySelector("[data-trix-id='" + id + "']");
          }
        };

        ObjectView.prototype.findViewForObject = function(object) {
          var i, len, ref, view;
          ref = this.getAllChildViews();
          for (i = 0, len = ref.length; i < len; i++) {
            view = ref[i];
            if (view.object === object) {
              return view;
            }
          }
        };

        ObjectView.prototype.getViewCache = function() {
          if (this.rootView === this) {
            if (this.isViewCachingEnabled()) {
              return this.viewCache != null ? this.viewCache : this.viewCache = {};
            }
          } else {
            return this.rootView.getViewCache();
          }
        };

        ObjectView.prototype.isViewCachingEnabled = function() {
          return this.shouldCacheViews !== false;
        };

        ObjectView.prototype.enableViewCaching = function() {
          return this.shouldCacheViews = true;
        };

        ObjectView.prototype.disableViewCaching = function() {
          return this.shouldCacheViews = false;
        };

        ObjectView.prototype.getCachedViewForObject = function(object) {
          var ref;
          return (ref = this.getViewCache()) != null ? ref[object.getCacheKey()] : void 0;
        };

        ObjectView.prototype.cacheViewForObject = function(view, object) {
          var ref;
          return (ref = this.getViewCache()) != null ? ref[object.getCacheKey()] = view : void 0;
        };

        ObjectView.prototype.garbageCollectCachedViews = function() {
          var cache, key, objectKeys, results, view, views;
          if (cache = this.getViewCache()) {
            views = this.getAllChildViews().concat(this);
            objectKeys = (function() {
              var i, len, results;
              results = [];
              for (i = 0, len = views.length; i < len; i++) {
                view = views[i];
                results.push(view.object.getCacheKey());
              }
              return results;
            })();
            results = [];
            for (key in cache) {
              if (indexOf.call(objectKeys, key) < 0) {
                results.push(delete cache[key]);
              }
            }
            return results;
          }
        };

        return ObjectView;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.ObjectGroupView = (function(superClass) {
        extend(ObjectGroupView, superClass);

        function ObjectGroupView() {
          ObjectGroupView.__super__.constructor.apply(this, arguments);
          this.objectGroup = this.object;
          this.viewClass = this.options.viewClass;
          delete this.options.viewClass;
        }

        ObjectGroupView.prototype.getChildViews = function() {
          var i, len, object, ref;
          if (!this.childViews.length) {
            ref = this.objectGroup.getObjects();
            for (i = 0, len = ref.length; i < len; i++) {
              object = ref[i];
              this.findOrCreateCachedChildView(this.viewClass, object, this.options);
            }
          }
          return this.childViews;
        };

        ObjectGroupView.prototype.createNodes = function() {
          var element, i, j, len, len1, node, ref, ref1, view;
          element = this.createContainerElement();
          ref = this.getChildViews();
          for (i = 0, len = ref.length; i < len; i++) {
            view = ref[i];
            ref1 = view.getNodes();
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              node = ref1[j];
              element.appendChild(node);
            }
          }
          return [element];
        };

        ObjectGroupView.prototype.createContainerElement = function(depth) {
          if (depth == null) {
            depth = this.objectGroup.getDepth();
          }
          return this.getChildViews()[0].createContainerElement(depth);
        };

        return ObjectGroupView;

      })(Trix.ObjectView);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.Controller = (function(superClass) {
        extend(Controller, superClass);

        function Controller() {
          return Controller.__super__.constructor.apply(this, arguments);
        }

        return Controller;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var findClosestElementFromNode, nodeIsBlockStartComment, nodeIsEmptyTextNode, normalizeSpaces, summarizeStringChange, tagName,
        bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      findClosestElementFromNode = Trix.findClosestElementFromNode, nodeIsEmptyTextNode = Trix.nodeIsEmptyTextNode, nodeIsBlockStartComment = Trix.nodeIsBlockStartComment, normalizeSpaces = Trix.normalizeSpaces, summarizeStringChange = Trix.summarizeStringChange, tagName = Trix.tagName;

      Trix.MutationObserver = (function(superClass) {
        var getTextForNodes, mutableAttributeName, mutableSelector, options;

        extend(MutationObserver, superClass);

        mutableAttributeName = "data-trix-mutable";

        mutableSelector = "[" + mutableAttributeName + "]";

        options = {
          attributes: true,
          childList: true,
          characterData: true,
          characterDataOldValue: true,
          subtree: true
        };

        function MutationObserver(element) {
          this.element = element;
          this.didMutate = bind(this.didMutate, this);
          this.observer = new window.MutationObserver(this.didMutate);
          this.start();
        }

        MutationObserver.prototype.start = function() {
          this.reset();
          return this.observer.observe(this.element, options);
        };

        MutationObserver.prototype.stop = function() {
          return this.observer.disconnect();
        };

        MutationObserver.prototype.didMutate = function(mutations) {
          var ref, ref1;
          (ref = this.mutations).push.apply(ref, this.findSignificantMutations(mutations));
          if (this.mutations.length) {
            if ((ref1 = this.delegate) != null) {
              if (typeof ref1.elementDidMutate === "function") {
                ref1.elementDidMutate(this.getMutationSummary());
              }
            }
            return this.reset();
          }
        };

        MutationObserver.prototype.reset = function() {
          return this.mutations = [];
        };

        MutationObserver.prototype.findSignificantMutations = function(mutations) {
          var i, len, mutation, results;
          results = [];
          for (i = 0, len = mutations.length; i < len; i++) {
            mutation = mutations[i];
            if (this.mutationIsSignificant(mutation)) {
              results.push(mutation);
            }
          }
          return results;
        };

        MutationObserver.prototype.mutationIsSignificant = function(mutation) {
          var i, len, node, ref;
          ref = this.nodesModifiedByMutation(mutation);
          for (i = 0, len = ref.length; i < len; i++) {
            node = ref[i];
            if (this.nodeIsSignificant(node)) {
              return true;
            }
          }
          return false;
        };

        MutationObserver.prototype.nodeIsSignificant = function(node) {
          return node !== this.element && !this.nodeIsMutable(node) && !nodeIsEmptyTextNode(node);
        };

        MutationObserver.prototype.nodeIsMutable = function(node) {
          return findClosestElementFromNode(node, {
            matchingSelector: mutableSelector
          });
        };

        MutationObserver.prototype.nodesModifiedByMutation = function(mutation) {
          var nodes;
          nodes = [];
          switch (mutation.type) {
            case "attributes":
              if (mutation.attributeName !== mutableAttributeName) {
                nodes.push(mutation.target);
              }
              break;
            case "characterData":
              nodes.push(mutation.target.parentNode);
              nodes.push(mutation.target);
              break;
            case "childList":
              nodes.push.apply(nodes, mutation.addedNodes);
              nodes.push.apply(nodes, mutation.removedNodes);
          }
          return nodes;
        };

        MutationObserver.prototype.getMutationSummary = function() {
          return this.getTextMutationSummary();
        };

        MutationObserver.prototype.getTextMutationSummary = function() {
          var added, addition, additions, deleted, deletions, i, len, ref, ref1, summary, textChanges;
          ref = this.getTextChangesFromCharacterData(), additions = ref.additions, deletions = ref.deletions;
          textChanges = this.getTextChangesFromChildList();
          ref1 = textChanges.additions;
          for (i = 0, len = ref1.length; i < len; i++) {
            addition = ref1[i];
            if (indexOf.call(additions, addition) < 0) {
              additions.push(addition);
            }
          }
          deletions.push.apply(deletions, textChanges.deletions);
          summary = {};
          if (added = additions.join("")) {
            summary.textAdded = added;
          }
          if (deleted = deletions.join("")) {
            summary.textDeleted = deleted;
          }
          return summary;
        };

        MutationObserver.prototype.getMutationsByType = function(type) {
          var i, len, mutation, ref, results;
          ref = this.mutations;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            mutation = ref[i];
            if (mutation.type === type) {
              results.push(mutation);
            }
          }
          return results;
        };

        MutationObserver.prototype.getTextChangesFromChildList = function() {
          var addedNodes, i, index, len, mutation, ref, removedNodes, singleBlockCommentRemoved, text, textAdded, textRemoved;
          addedNodes = [];
          removedNodes = [];
          ref = this.getMutationsByType("childList");
          for (i = 0, len = ref.length; i < len; i++) {
            mutation = ref[i];
            addedNodes.push.apply(addedNodes, mutation.addedNodes);
            removedNodes.push.apply(removedNodes, mutation.removedNodes);
          }
          singleBlockCommentRemoved = addedNodes.length === 0 && removedNodes.length === 1 && nodeIsBlockStartComment(removedNodes[0]);
          if (singleBlockCommentRemoved) {
            textAdded = [];
            textRemoved = ["\n"];
          } else {
            textAdded = getTextForNodes(addedNodes);
            textRemoved = getTextForNodes(removedNodes);
          }
          return {
            additions: (function() {
              var j, len1, results;
              results = [];
              for (index = j = 0, len1 = textAdded.length; j < len1; index = ++j) {
                text = textAdded[index];
                if (text !== textRemoved[index]) {
                  results.push(normalizeSpaces(text));
                }
              }
              return results;
            })(),
            deletions: (function() {
              var j, len1, results;
              results = [];
              for (index = j = 0, len1 = textRemoved.length; j < len1; index = ++j) {
                text = textRemoved[index];
                if (text !== textAdded[index]) {
                  results.push(normalizeSpaces(text));
                }
              }
              return results;
            })()
          };
        };

        MutationObserver.prototype.getTextChangesFromCharacterData = function() {
          var added, characterMutations, endMutation, newString, oldString, ref, removed, startMutation;
          characterMutations = this.getMutationsByType("characterData");
          if (characterMutations.length) {
            startMutation = characterMutations[0], endMutation = characterMutations[characterMutations.length - 1];
            oldString = normalizeSpaces(startMutation.oldValue);
            newString = normalizeSpaces(endMutation.target.data);
            ref = summarizeStringChange(oldString, newString), added = ref.added, removed = ref.removed;
          }
          return {
            additions: added ? [added] : [],
            deletions: removed ? [removed] : []
          };
        };

        getTextForNodes = function(nodes) {
          var i, len, node, text;
          if (nodes == null) {
            nodes = [];
          }
          text = [];
          for (i = 0, len = nodes.length; i < len; i++) {
            node = nodes[i];
            switch (node.nodeType) {
              case Node.TEXT_NODE:
                text.push(node.data);
                break;
              case Node.ELEMENT_NODE:
                if (tagName(node) === "br") {
                  text.push("\n");
                } else {
                  text.push.apply(text, getTextForNodes(node.childNodes));
                }
            }
          }
          return text;
        };

        return MutationObserver;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.FileVerificationOperation = (function(superClass) {
        extend(FileVerificationOperation, superClass);

        function FileVerificationOperation(file) {
          this.file = file;
        }

        FileVerificationOperation.prototype.perform = function(callback) {
          var reader;
          reader = new FileReader;
          reader.onerror = function() {
            return callback(false);
          };
          reader.onload = (function(_this) {
            return function() {
              reader.onerror = null;
              try {
                reader.abort();
              } catch (_error) {}
              return callback(true, _this.file);
            };
          })(this);
          return reader.readAsArrayBuffer(this.file);
        };

        return FileVerificationOperation;

      })(Trix.Operation);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.CompositionInput = (function(superClass) {
        extend(CompositionInput, superClass);

        function CompositionInput(inputController) {
          var ref;
          this.inputController = inputController;
          ref = this.inputController, this.responder = ref.responder, this.delegate = ref.delegate, this.inputSummary = ref.inputSummary;
          this.data = {};
        }

        CompositionInput.prototype.start = function(data) {
          var ref, ref1;
          this.data.start = data;
          if (this.inputSummary.eventName === "keypress" && this.inputSummary.textAdded) {
            if ((ref = this.responder) != null) {
              ref.deleteInDirection("left");
            }
          }
          if (!this.selectionIsExpanded()) {
            this.insertPlaceholder();
            this.requestRender();
          }
          return this.range = (ref1 = this.responder) != null ? ref1.getSelectedRange() : void 0;
        };

        CompositionInput.prototype.update = function(data) {
          var range;
          this.data.update = data;
          if (range = this.selectPlaceholder()) {
            this.forgetPlaceholder();
            return this.range = range;
          }
        };

        CompositionInput.prototype.end = function(data) {
          var ref, ref1, ref2, ref3;
          this.data.end = data;
          this.forgetPlaceholder();
          if (this.canApplyToDocument()) {
            this.setInputSummary({
              preferDocument: true
            });
            if ((ref = this.delegate) != null) {
              ref.inputControllerWillPerformTyping();
            }
            if ((ref1 = this.responder) != null) {
              ref1.setSelectedRange(this.range);
            }
            if ((ref2 = this.responder) != null) {
              ref2.insertString(this.data.end);
            }
            return (ref3 = this.responder) != null ? ref3.setSelectedRange(this.range[0] + this.data.end.length) : void 0;
          } else if ((this.data.start != null) || (this.data.update != null)) {
            this.requestReparse();
            return this.inputController.reset();
          }
        };

        CompositionInput.prototype.getEndData = function() {
          return this.data.end;
        };

        CompositionInput.prototype.isEnded = function() {
          return this.getEndData() != null;
        };

        CompositionInput.prototype.canApplyToDocument = function() {
          var ref, ref1;
          return ((ref = this.data.start) != null ? ref.length : void 0) === 0 && ((ref1 = this.data.end) != null ? ref1.length : void 0) > 0 && (this.range != null);
        };

        CompositionInput.proxyMethod("inputController.setInputSummary");

        CompositionInput.proxyMethod("inputController.requestRender");

        CompositionInput.proxyMethod("inputController.requestReparse");

        CompositionInput.proxyMethod("responder?.selectionIsExpanded");

        CompositionInput.proxyMethod("responder?.insertPlaceholder");

        CompositionInput.proxyMethod("responder?.selectPlaceholder");

        CompositionInput.proxyMethod("responder?.forgetPlaceholder");

        return CompositionInput;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var dataTransferIsPlainText, dataTransferIsWritable, extensionForFile, handleEvent, hasStringCodePointAt, innerElementIsActive, keyEventIsKeyboardCommand, keyEventIsPasteAndMatchStyleShortcut, keyEventIsWebInspectorShortcut, makeElement, objectsAreEqual, pasteEventIsCrippledSafariHTMLPaste, stringFromKeyEvent, tagName, testTransferData,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      handleEvent = Trix.handleEvent, makeElement = Trix.makeElement, innerElementIsActive = Trix.innerElementIsActive, objectsAreEqual = Trix.objectsAreEqual, tagName = Trix.tagName;

      Trix.InputController = (function(superClass) {
        var pastedFileCount;

        extend(InputController, superClass);

        pastedFileCount = 0;

        InputController.keyNames = {
          "8": "backspace",
          "9": "tab",
          "13": "return",
          "37": "left",
          "39": "right",
          "46": "delete",
          "68": "d",
          "72": "h",
          "79": "o"
        };

        function InputController(element1) {
          var eventName;
          this.element = element1;
          this.resetInputSummary();
          this.mutationObserver = new Trix.MutationObserver(this.element);
          this.mutationObserver.delegate = this;
          for (eventName in this.events) {
            handleEvent(eventName, {
              onElement: this.element,
              withCallback: this.handlerFor(eventName),
              inPhase: "capturing"
            });
          }
        }

        InputController.prototype.handlerFor = function(eventName) {
          return (function(_this) {
            return function(event) {
              return _this.handleInput(function() {
                if (!innerElementIsActive(this.element)) {
                  this.eventName = eventName;
                  return this.events[eventName].call(this, event);
                }
              });
            };
          })(this);
        };

        InputController.prototype.setInputSummary = function(summary) {
          var key, value;
          if (summary == null) {
            summary = {};
          }
          this.inputSummary.eventName = this.eventName;
          for (key in summary) {
            value = summary[key];
            this.inputSummary[key] = value;
          }
          return this.inputSummary;
        };

        InputController.prototype.resetInputSummary = function() {
          return this.inputSummary = {};
        };

        InputController.prototype.reset = function() {
          this.resetInputSummary();
          return Trix.selectionChangeObserver.reset();
        };

        InputController.prototype.editorWillSyncDocumentView = function() {
          return this.mutationObserver.stop();
        };

        InputController.prototype.editorDidSyncDocumentView = function() {
          return this.mutationObserver.start();
        };

        InputController.prototype.requestRender = function() {
          var ref;
          return (ref = this.delegate) != null ? typeof ref.inputControllerDidRequestRender === "function" ? ref.inputControllerDidRequestRender() : void 0 : void 0;
        };

        InputController.prototype.requestReparse = function() {
          var ref;
          if ((ref = this.delegate) != null) {
            if (typeof ref.inputControllerDidRequestReparse === "function") {
              ref.inputControllerDidRequestReparse();
            }
          }
          return this.requestRender();
        };

        InputController.prototype.elementDidMutate = function(mutationSummary) {
          var ref;
          if (this.isComposing()) {
            return (ref = this.delegate) != null ? typeof ref.inputControllerDidAllowUnhandledInput === "function" ? ref.inputControllerDidAllowUnhandledInput() : void 0 : void 0;
          } else {
            return this.handleInput(function() {
              if (this.mutationIsSignificant(mutationSummary)) {
                if (this.mutationIsExpected(mutationSummary)) {
                  this.requestRender();
                } else {
                  this.requestReparse();
                }
              }
              return this.reset();
            });
          }
        };

        InputController.prototype.mutationIsExpected = function(arg) {
          var mutationAdditionMatchesSummary, mutationDeletionMatchesSummary, offset, range, ref, singleUnexpectedNewline, textAdded, textDeleted, unexpectedNewlineAddition, unexpectedNewlineDeletion;
          textAdded = arg.textAdded, textDeleted = arg.textDeleted;
          if (this.inputSummary.preferDocument) {
            return true;
          }
          mutationAdditionMatchesSummary = textAdded != null ? textAdded === this.inputSummary.textAdded : !this.inputSummary.textAdded;
          mutationDeletionMatchesSummary = textDeleted != null ? this.inputSummary.didDelete : !this.inputSummary.didDelete;
          unexpectedNewlineAddition = (textAdded === "\n" || textAdded === " \n") && !mutationAdditionMatchesSummary;
          unexpectedNewlineDeletion = textDeleted === "\n" && !mutationDeletionMatchesSummary;
          singleUnexpectedNewline = (unexpectedNewlineAddition && !unexpectedNewlineDeletion) || (unexpectedNewlineDeletion && !unexpectedNewlineAddition);
          if (singleUnexpectedNewline) {
            if (range = this.getSelectedRange()) {
              offset = unexpectedNewlineAddition ? textAdded.replace(/\n$/, "").length || -1 : (textAdded != null ? textAdded.length : void 0) || 1;
              if ((ref = this.responder) != null ? ref.positionIsBlockBreak(range[1] + offset) : void 0) {
                return true;
              }
            }
          }
          return mutationAdditionMatchesSummary && mutationDeletionMatchesSummary;
        };

        InputController.prototype.mutationIsSignificant = function(mutationSummary) {
          var composedEmptyString, ref, textChanged;
          textChanged = Object.keys(mutationSummary).length > 0;
          composedEmptyString = ((ref = this.compositionInput) != null ? ref.getEndData() : void 0) === "";
          return textChanged || !composedEmptyString;
        };

        InputController.prototype.attachFiles = function(files) {
          var file, operations;
          operations = (function() {
            var i, len, results;
            results = [];
            for (i = 0, len = files.length; i < len; i++) {
              file = files[i];
              results.push(new Trix.FileVerificationOperation(file));
            }
            return results;
          })();
          return Promise.all(operations).then((function(_this) {
            return function(files) {
              return _this.handleInput(function() {
                var ref, ref1;
                if ((ref = this.delegate) != null) {
                  ref.inputControllerWillAttachFiles();
                }
                if ((ref1 = this.responder) != null) {
                  ref1.insertFiles(files);
                }
                return this.requestRender();
              });
            };
          })(this));
        };

        InputController.prototype.events = {
          keydown: function(event) {
            var character, context, i, keyName, keys, len, modifier, ref, ref1;
            if (!this.isComposing()) {
              this.resetInputSummary();
            }
            if (keyName = this.constructor.keyNames[event.keyCode]) {
              context = this.keys;
              ref = ["ctrl", "alt", "shift", "meta"];
              for (i = 0, len = ref.length; i < len; i++) {
                modifier = ref[i];
                if (!event[modifier + "Key"]) {
                  continue;
                }
                if (modifier === "ctrl") {
                  modifier = "control";
                }
                context = context != null ? context[modifier] : void 0;
              }
              if ((context != null ? context[keyName] : void 0) != null) {
                this.setInputSummary({
                  keyName: keyName
                });
                Trix.selectionChangeObserver.reset();
                context[keyName].call(this, event);
              }
            }
            if (keyEventIsKeyboardCommand(event)) {
              if (character = String.fromCharCode(event.keyCode).toLowerCase()) {
                keys = (function() {
                  var j, len1, ref1, results;
                  ref1 = ["alt", "shift"];
                  results = [];
                  for (j = 0, len1 = ref1.length; j < len1; j++) {
                    modifier = ref1[j];
                    if (event[modifier + "Key"]) {
                      results.push(modifier);
                    }
                  }
                  return results;
                })();
                keys.push(character);
                if ((ref1 = this.delegate) != null ? ref1.inputControllerDidReceiveKeyboardCommand(keys) : void 0) {
                  return event.preventDefault();
                }
              }
            }
          },
          keypress: function(event) {
            var ref, ref1, string;
            if (this.inputSummary.eventName != null) {
              return;
            }
            if ((event.metaKey || event.ctrlKey) && !event.altKey) {
              return;
            }
            if (keyEventIsWebInspectorShortcut(event)) {
              return;
            }
            if (keyEventIsPasteAndMatchStyleShortcut(event)) {
              return;
            }
            if (string = stringFromKeyEvent(event)) {
              if ((ref = this.delegate) != null) {
                ref.inputControllerWillPerformTyping();
              }
              if ((ref1 = this.responder) != null) {
                ref1.insertString(string);
              }
              return this.setInputSummary({
                textAdded: string,
                didDelete: this.selectionIsExpanded()
              });
            }
          },
          textInput: function(event) {
            var data, range, ref, textAdded;
            data = event.data;
            textAdded = this.inputSummary.textAdded;
            if (textAdded && textAdded !== data && textAdded.toUpperCase() === data) {
              range = this.getSelectedRange();
              this.setSelectedRange([range[0], range[1] + textAdded.length]);
              if ((ref = this.responder) != null) {
                ref.insertString(data);
              }
              this.setInputSummary({
                textAdded: data
              });
              return this.setSelectedRange(range);
            }
          },
          dragenter: function(event) {
            return event.preventDefault();
          },
          dragstart: function(event) {
            var ref, target;
            target = event.target;
            this.serializeSelectionToDataTransfer(event.dataTransfer);
            this.draggedRange = this.getSelectedRange();
            return (ref = this.delegate) != null ? typeof ref.inputControllerDidStartDrag === "function" ? ref.inputControllerDidStartDrag() : void 0 : void 0;
          },
          dragover: function(event) {
            var draggingPoint, ref;
            if (this.draggedRange || this.canAcceptDataTransfer(event.dataTransfer)) {
              event.preventDefault();
              draggingPoint = {
                x: event.clientX,
                y: event.clientY
              };
              if (!objectsAreEqual(draggingPoint, this.draggingPoint)) {
                this.draggingPoint = draggingPoint;
                return (ref = this.delegate) != null ? typeof ref.inputControllerDidReceiveDragOverPoint === "function" ? ref.inputControllerDidReceiveDragOverPoint(this.draggingPoint) : void 0 : void 0;
              }
            }
          },
          dragend: function(event) {
            var ref;
            if ((ref = this.delegate) != null) {
              if (typeof ref.inputControllerDidCancelDrag === "function") {
                ref.inputControllerDidCancelDrag();
              }
            }
            this.draggedRange = null;
            return this.draggingPoint = null;
          },
          drop: function(event) {
            var document, documentJSON, files, point, ref, ref1, ref2, ref3, ref4;
            event.preventDefault();
            files = (ref = event.dataTransfer) != null ? ref.files : void 0;
            point = {
              x: event.clientX,
              y: event.clientY
            };
            if ((ref1 = this.responder) != null) {
              ref1.setLocationRangeFromPointRange(point);
            }
            if (files != null ? files.length : void 0) {
              this.attachFiles(files);
            } else if (this.draggedRange) {
              if ((ref2 = this.delegate) != null) {
                ref2.inputControllerWillMoveText();
              }
              if ((ref3 = this.responder) != null) {
                ref3.moveTextFromRange(this.draggedRange);
              }
              this.draggedRange = null;
              this.requestRender();
            } else if (documentJSON = event.dataTransfer.getData("application/x-trix-document")) {
              document = Trix.Document.fromJSONString(documentJSON);
              if ((ref4 = this.responder) != null) {
                ref4.insertDocument(document);
              }
              this.requestRender();
            }
            this.draggedRange = null;
            return this.draggingPoint = null;
          },
          cut: function(event) {
            var ref, ref1;
            if ((ref = this.responder) != null ? ref.selectionIsExpanded() : void 0) {
              if (this.serializeSelectionToDataTransfer(event.clipboardData)) {
                event.preventDefault();
              }
              if ((ref1 = this.delegate) != null) {
                ref1.inputControllerWillCutText();
              }
              this.deleteInDirection("backward");
              if (event.defaultPrevented) {
                return this.requestRender();
              }
            }
          },
          copy: function(event) {
            var ref;
            if ((ref = this.responder) != null ? ref.selectionIsExpanded() : void 0) {
              if (this.serializeSelectionToDataTransfer(event.clipboardData)) {
                return event.preventDefault();
              }
            }
          },
          paste: function(event) {
            var clipboard, extension, file, href, html, name, paste, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9;
            clipboard = (ref = event.clipboardData) != null ? ref : event.testClipboardData;
            paste = {
              clipboard: clipboard
            };
            if ((clipboard == null) || pasteEventIsCrippledSafariHTMLPaste(event)) {
              this.getPastedHTMLUsingHiddenElement((function(_this) {
                return function(html) {
                  var ref1, ref2, ref3;
                  paste.type = "text/html";
                  paste.html = html;
                  if ((ref1 = _this.delegate) != null) {
                    ref1.inputControllerWillPaste(paste);
                  }
                  if ((ref2 = _this.responder) != null) {
                    ref2.insertHTML(paste.html);
                  }
                  _this.requestRender();
                  return (ref3 = _this.delegate) != null ? ref3.inputControllerDidPaste(paste) : void 0;
                };
              })(this));
              return;
            }
            if (href = clipboard.getData("URL")) {
              paste.type = "URL";
              paste.href = href;
              if (name = clipboard.getData("public.url-name")) {
                paste.string = Trix.squishBreakableWhitespace(name).trim();
              } else {
                paste.string = href;
              }
              if ((ref1 = this.delegate) != null) {
                ref1.inputControllerWillPaste(paste);
              }
              this.setInputSummary({
                textAdded: paste.string,
                didDelete: this.selectionIsExpanded()
              });
              if ((ref2 = this.responder) != null) {
                ref2.insertText(Trix.Text.textForStringWithAttributes(paste.string, {
                  href: paste.href
                }));
              }
              this.requestRender();
              if ((ref3 = this.delegate) != null) {
                ref3.inputControllerDidPaste(paste);
              }
            } else if (dataTransferIsPlainText(clipboard)) {
              paste.type = "text/plain";
              paste.string = clipboard.getData("text/plain");
              if ((ref4 = this.delegate) != null) {
                ref4.inputControllerWillPaste(paste);
              }
              this.setInputSummary({
                textAdded: paste.string,
                didDelete: this.selectionIsExpanded()
              });
              if ((ref5 = this.responder) != null) {
                ref5.insertString(paste.string);
              }
              this.requestRender();
              if ((ref6 = this.delegate) != null) {
                ref6.inputControllerDidPaste(paste);
              }
            } else if (html = clipboard.getData("text/html")) {
              paste.type = "text/html";
              paste.html = html;
              if ((ref7 = this.delegate) != null) {
                ref7.inputControllerWillPaste(paste);
              }
              if ((ref8 = this.responder) != null) {
                ref8.insertHTML(paste.html);
              }
              this.requestRender();
              if ((ref9 = this.delegate) != null) {
                ref9.inputControllerDidPaste(paste);
              }
            } else if (indexOf.call(clipboard.types, "Files") >= 0) {
              if (file = (ref10 = clipboard.items) != null ? (ref11 = ref10[0]) != null ? typeof ref11.getAsFile === "function" ? ref11.getAsFile() : void 0 : void 0 : void 0) {
                if (!file.name && (extension = extensionForFile(file))) {
                  file.name = "pasted-file-" + (++pastedFileCount) + "." + extension;
                }
                paste.type = "File";
                paste.file = file;
                if ((ref12 = this.delegate) != null) {
                  ref12.inputControllerWillAttachFiles();
                }
                if ((ref13 = this.responder) != null) {
                  ref13.insertFile(paste.file);
                }
                this.requestRender();
                if ((ref14 = this.delegate) != null) {
                  ref14.inputControllerDidPaste(paste);
                }
              }
            }
            return event.preventDefault();
          },
          compositionstart: function(event) {
            return this.getCompositionInput().start(event.data);
          },
          compositionupdate: function(event) {
            return this.getCompositionInput().update(event.data);
          },
          compositionend: function(event) {
            return this.getCompositionInput().end(event.data);
          },
          input: function(event) {
            return event.stopPropagation();
          }
        };

        InputController.prototype.keys = {
          backspace: function(event) {
            var ref;
            if ((ref = this.delegate) != null) {
              ref.inputControllerWillPerformTyping();
            }
            return this.deleteInDirection("backward", event);
          },
          "delete": function(event) {
            var ref;
            if ((ref = this.delegate) != null) {
              ref.inputControllerWillPerformTyping();
            }
            return this.deleteInDirection("forward", event);
          },
          "return": function(event) {
            var ref, ref1;
            this.setInputSummary({
              preferDocument: true
            });
            if ((ref = this.delegate) != null) {
              ref.inputControllerWillPerformTyping();
            }
            return (ref1 = this.responder) != null ? ref1.insertLineBreak() : void 0;
          },
          tab: function(event) {
            var ref, ref1;
            if ((ref = this.responder) != null ? ref.canIncreaseNestingLevel() : void 0) {
              if ((ref1 = this.responder) != null) {
                ref1.increaseNestingLevel();
              }
              this.requestRender();
              return event.preventDefault();
            }
          },
          left: function(event) {
            var ref;
            if (this.selectionIsInCursorTarget()) {
              event.preventDefault();
              return (ref = this.responder) != null ? ref.moveCursorInDirection("backward") : void 0;
            }
          },
          right: function(event) {
            var ref;
            if (this.selectionIsInCursorTarget()) {
              event.preventDefault();
              return (ref = this.responder) != null ? ref.moveCursorInDirection("forward") : void 0;
            }
          },
          control: {
            d: function(event) {
              var ref;
              if ((ref = this.delegate) != null) {
                ref.inputControllerWillPerformTyping();
              }
              return this.deleteInDirection("forward", event);
            },
            h: function(event) {
              var ref;
              if ((ref = this.delegate) != null) {
                ref.inputControllerWillPerformTyping();
              }
              return this.deleteInDirection("backward", event);
            },
            o: function(event) {
              var ref, ref1;
              event.preventDefault();
              if ((ref = this.delegate) != null) {
                ref.inputControllerWillPerformTyping();
              }
              if ((ref1 = this.responder) != null) {
                ref1.insertString("\n", {
                  updatePosition: false
                });
              }
              return this.requestRender();
            }
          },
          shift: {
            "return": function(event) {
              var ref, ref1;
              if ((ref = this.delegate) != null) {
                ref.inputControllerWillPerformTyping();
              }
              if ((ref1 = this.responder) != null) {
                ref1.insertString("\n");
              }
              this.requestRender();
              return event.preventDefault();
            },
            tab: function(event) {
              var ref, ref1;
              if ((ref = this.responder) != null ? ref.canDecreaseNestingLevel() : void 0) {
                if ((ref1 = this.responder) != null) {
                  ref1.decreaseNestingLevel();
                }
                this.requestRender();
                return event.preventDefault();
              }
            },
            left: function(event) {
              if (this.selectionIsInCursorTarget()) {
                event.preventDefault();
                return this.expandSelectionInDirection("backward");
              }
            },
            right: function(event) {
              if (this.selectionIsInCursorTarget()) {
                event.preventDefault();
                return this.expandSelectionInDirection("forward");
              }
            }
          },
          alt: {
            backspace: function(event) {
              var ref;
              this.setInputSummary({
                preferDocument: false
              });
              return (ref = this.delegate) != null ? ref.inputControllerWillPerformTyping() : void 0;
            }
          },
          meta: {
            backspace: function(event) {
              var ref;
              this.setInputSummary({
                preferDocument: false
              });
              return (ref = this.delegate) != null ? ref.inputControllerWillPerformTyping() : void 0;
            }
          }
        };

        InputController.prototype.handleInput = function(callback) {
          var ref, ref1;
          try {
            if ((ref = this.delegate) != null) {
              ref.inputControllerWillHandleInput();
            }
            return callback.call(this);
          } finally {
            if ((ref1 = this.delegate) != null) {
              ref1.inputControllerDidHandleInput();
            }
          }
        };

        InputController.prototype.getCompositionInput = function() {
          if (this.isComposing()) {
            return this.compositionInput;
          } else {
            return this.compositionInput = new Trix.CompositionInput(this);
          }
        };

        InputController.prototype.isComposing = function() {
          return (this.compositionInput != null) && !this.compositionInput.isEnded();
        };

        InputController.prototype.deleteInDirection = function(direction, event) {
          var ref;
          if (((ref = this.responder) != null ? ref.deleteInDirection(direction) : void 0) === false) {
            if (event) {
              event.preventDefault();
              return this.requestRender();
            }
          } else {
            return this.setInputSummary({
              didDelete: true
            });
          }
        };

        InputController.prototype.serializeSelectionToDataTransfer = function(dataTransfer) {
          var document, ref;
          if (!dataTransferIsWritable(dataTransfer)) {
            return;
          }
          document = (ref = this.responder) != null ? ref.getSelectedDocument().toSerializableDocument() : void 0;
          dataTransfer.setData("application/x-trix-document", JSON.stringify(document));
          dataTransfer.setData("text/html", Trix.DocumentView.render(document).innerHTML);
          dataTransfer.setData("text/plain", document.toString().replace(/\n$/, ""));
          return true;
        };

        InputController.prototype.canAcceptDataTransfer = function(dataTransfer) {
          var i, len, ref, ref1, type, types;
          types = {};
          ref1 = (ref = dataTransfer != null ? dataTransfer.types : void 0) != null ? ref : [];
          for (i = 0, len = ref1.length; i < len; i++) {
            type = ref1[i];
            types[type] = true;
          }
          return types["Files"] || types["application/x-trix-document"] || types["text/html"] || types["text/plain"];
        };

        InputController.prototype.getPastedHTMLUsingHiddenElement = function(callback) {
          var element, selectedRange, style;
          selectedRange = this.getSelectedRange();
          style = {
            position: "absolute",
            left: window.pageXOffset + "px",
            top: window.pageYOffset + "px",
            opacity: 0
          };
          element = makeElement({
            style: style,
            tagName: "div",
            editable: true
          });
          document.body.appendChild(element);
          element.focus();
          return requestAnimationFrame((function(_this) {
            return function() {
              var html;
              html = element.innerHTML;
              document.body.removeChild(element);
              _this.setSelectedRange(selectedRange);
              return callback(html);
            };
          })(this));
        };

        InputController.proxyMethod("responder?.getSelectedRange");

        InputController.proxyMethod("responder?.setSelectedRange");

        InputController.proxyMethod("responder?.expandSelectionInDirection");

        InputController.proxyMethod("responder?.selectionIsInCursorTarget");

        InputController.proxyMethod("responder?.selectionIsExpanded");

        return InputController;

      })(Trix.BasicObject);

      extensionForFile = function(file) {
        var ref, ref1;
        return (ref = file.type) != null ? (ref1 = ref.match(/\/(\w+)$/)) != null ? ref1[1] : void 0 : void 0;
      };

      hasStringCodePointAt = (typeof " ".codePointAt === "function" ? " ".codePointAt(0) : void 0) != null;

      stringFromKeyEvent = function(event) {
        var code;
        if (event.key && hasStringCodePointAt && event.key.codePointAt(0) === event.keyCode) {
          return event.key;
        } else {
          if (event.which === null) {
            code = event.keyCode;
          } else if (event.which !== 0 && event.charCode !== 0) {
            code = event.charCode;
          }
          if (code != null) {
            return Trix.UTF16String.fromCodepoints([code]).toString();
          }
        }
      };

      keyEventIsWebInspectorShortcut = function(event) {
        return event.metaKey && event.altKey && !event.shiftKey && event.keyCode === 94;
      };

      keyEventIsPasteAndMatchStyleShortcut = function(event) {
        return event.metaKey && event.altKey && event.shiftKey && event.keyCode === 9674;
      };

      keyEventIsKeyboardCommand = function(event) {
        if (/Mac|^iP/.test(navigator.platform)) {
          return event.metaKey;
        } else {
          return event.ctrlKey;
        }
      };

      pasteEventIsCrippledSafariHTMLPaste = function(event) {
        var hasPasteboardFlavor, hasReadableDynamicData, i, isExternalHTMLPaste, isExternalRichTextPaste, len, mightBePasteAndMatchStyle, paste, ref, type;
        if (paste = event.clipboardData) {
          if (indexOf.call(paste.types, "text/html") >= 0) {
            ref = paste.types;
            for (i = 0, len = ref.length; i < len; i++) {
              type = ref[i];
              hasPasteboardFlavor = /^CorePasteboardFlavorType/.test(type);
              hasReadableDynamicData = /^dyn\./.test(type) && paste.getData(type);
              mightBePasteAndMatchStyle = hasPasteboardFlavor || hasReadableDynamicData;
              if (mightBePasteAndMatchStyle) {
                return true;
              }
            }
            return false;
          } else {
            isExternalHTMLPaste = indexOf.call(paste.types, "com.apple.webarchive") >= 0;
            isExternalRichTextPaste = indexOf.call(paste.types, "com.apple.flat-rtfd") >= 0;
            return isExternalHTMLPaste || isExternalRichTextPaste;
          }
        }
      };

      dataTransferIsPlainText = function(dataTransfer) {
        var element, html, text;
        text = dataTransfer.getData("text/plain");
        html = dataTransfer.getData("text/html");
        if (text && html) {
          element = makeElement("div");
          element.innerHTML = html;
          if (element.textContent === text) {
            return !element.querySelector(":not(meta)");
          }
        } else {
          return text != null ? text.length : void 0;
        }
      };

      testTransferData = {
        "application/x-trix-feature-detection": "test"
      };

      dataTransferIsWritable = function(dataTransfer) {
        var key, value;
        if ((dataTransfer != null ? dataTransfer.setData : void 0) == null) {
          return;
        }
        for (key in testTransferData) {
          value = testTransferData[key];
          if (!(function() {
            try {
              dataTransfer.setData(key, value);
              return dataTransfer.getData(key) === value;
            } catch (_error) {}
          })()) {
            return;
          }
        }
        return true;
      };

    }).call(this);
    (function() {
      var css, handleEvent, keyNames, lang, makeElement, ref, tagName,
        bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      handleEvent = Trix.handleEvent, makeElement = Trix.makeElement, tagName = Trix.tagName;

      keyNames = Trix.InputController.keyNames;

      ref = Trix.config, lang = ref.lang, css = ref.css;

      Trix.AttachmentEditorController = (function(superClass) {
        var undoable;

        extend(AttachmentEditorController, superClass);

        function AttachmentEditorController(attachmentPiece, element, container) {
          this.attachmentPiece = attachmentPiece;
          this.element = element;
          this.container = container;
          this.didBlurCaption = bind(this.didBlurCaption, this);
          this.didChangeCaption = bind(this.didChangeCaption, this);
          this.didInputCaption = bind(this.didInputCaption, this);
          this.didKeyDownCaption = bind(this.didKeyDownCaption, this);
          this.didClickCaption = bind(this.didClickCaption, this);
          this.didClickRemoveButton = bind(this.didClickRemoveButton, this);
          this.attachment = this.attachmentPiece.attachment;
          if (tagName(this.element) === "a") {
            this.element = this.element.firstChild;
          }
          this.install();
        }

        undoable = function(fn) {
          return function() {
            var commands;
            commands = fn.apply(this, arguments);
            commands["do"]();
            if (this.undos == null) {
              this.undos = [];
            }
            return this.undos.push(commands.undo);
          };
        };

        AttachmentEditorController.prototype.install = function() {
          this.makeElementMutable();
          if (this.attachment.isPreviewable()) {
            this.makeCaptionEditable();
          }
          return this.addRemoveButton();
        };

        AttachmentEditorController.prototype.uninstall = function() {
          var ref1, undo;
          this.savePendingCaption();
          while (undo = this.undos.pop()) {
            undo();
          }
          return (ref1 = this.delegate) != null ? ref1.didUninstallAttachmentEditor(this) : void 0;
        };

        AttachmentEditorController.prototype.savePendingCaption = function() {
          var caption, ref1, ref2;
          if (this.pendingCaption != null) {
            caption = this.pendingCaption;
            this.pendingCaption = null;
            if (caption) {
              return (ref1 = this.delegate) != null ? typeof ref1.attachmentEditorDidRequestUpdatingAttributesForAttachment === "function" ? ref1.attachmentEditorDidRequestUpdatingAttributesForAttachment({
                caption: caption
              }, this.attachment) : void 0 : void 0;
            } else {
              return (ref2 = this.delegate) != null ? typeof ref2.attachmentEditorDidRequestRemovingAttributeForAttachment === "function" ? ref2.attachmentEditorDidRequestRemovingAttributeForAttachment("caption", this.attachment) : void 0 : void 0;
            }
          }
        };

        AttachmentEditorController.prototype.makeElementMutable = undoable(function() {
          return {
            "do": (function(_this) {
              return function() {
                return _this.element.dataset.trixMutable = true;
              };
            })(this),
            undo: (function(_this) {
              return function() {
                return delete _this.element.dataset.trixMutable;
              };
            })(this)
          };
        });

        AttachmentEditorController.prototype.makeCaptionEditable = undoable(function() {
          var figcaption, handler;
          figcaption = this.element.querySelector("figcaption");
          handler = null;
          return {
            "do": (function(_this) {
              return function() {
                return handler = handleEvent("click", {
                  onElement: figcaption,
                  withCallback: _this.didClickCaption,
                  inPhase: "capturing"
                });
              };
            })(this),
            undo: (function(_this) {
              return function() {
                return handler.destroy();
              };
            })(this)
          };
        });

        AttachmentEditorController.prototype.addRemoveButton = undoable(function() {
          var removeButton;
          removeButton = makeElement({
            tagName: "button",
            textContent: lang.remove,
            className: css.attachmentRemove + " " + css.attachmentRemove + "--icon",
            attributes: {
              type: "button",
              title: lang.remove
            },
            data: {
              trixMutable: true
            }
          });
          handleEvent("click", {
            onElement: removeButton,
            withCallback: this.didClickRemoveButton
          });
          return {
            "do": (function(_this) {
              return function() {
                return _this.element.appendChild(removeButton);
              };
            })(this),
            undo: (function(_this) {
              return function() {
                return _this.element.removeChild(removeButton);
              };
            })(this)
          };
        });

        AttachmentEditorController.prototype.editCaption = undoable(function() {
          var autoresize, editingFigcaption, figcaption, textarea, textareaClone;
          textarea = makeElement({
            tagName: "textarea",
            className: css.attachmentCaptionEditor,
            attributes: {
              placeholder: lang.captionPlaceholder
            }
          });
          textarea.value = this.attachmentPiece.getCaption();
          textareaClone = textarea.cloneNode();
          textareaClone.classList.add("trix-autoresize-clone");
          autoresize = function() {
            textareaClone.value = textarea.value;
            return textarea.style.height = textareaClone.scrollHeight + "px";
          };
          handleEvent("keydown", {
            onElement: textarea,
            withCallback: this.didKeyDownCaption
          });
          handleEvent("input", {
            onElement: textarea,
            withCallback: this.didInputCaption
          });
          handleEvent("change", {
            onElement: textarea,
            withCallback: this.didChangeCaption
          });
          handleEvent("blur", {
            onElement: textarea,
            withCallback: this.didBlurCaption
          });
          figcaption = this.element.querySelector("figcaption");
          editingFigcaption = figcaption.cloneNode();
          return {
            "do": function() {
              figcaption.style.display = "none";
              editingFigcaption.appendChild(textarea);
              editingFigcaption.appendChild(textareaClone);
              editingFigcaption.classList.add(css.attachmentCaption + "--editing");
              figcaption.parentElement.insertBefore(editingFigcaption, figcaption);
              autoresize();
              return textarea.focus();
            },
            undo: function() {
              editingFigcaption.parentNode.removeChild(editingFigcaption);
              return figcaption.style.display = null;
            }
          };
        });

        AttachmentEditorController.prototype.didClickRemoveButton = function(event) {
          var ref1;
          event.preventDefault();
          event.stopPropagation();
          return (ref1 = this.delegate) != null ? ref1.attachmentEditorDidRequestRemovalOfAttachment(this.attachment) : void 0;
        };

        AttachmentEditorController.prototype.didClickCaption = function(event) {
          event.preventDefault();
          return this.editCaption();
        };

        AttachmentEditorController.prototype.didKeyDownCaption = function(event) {
          var ref1;
          if (keyNames[event.keyCode] === "return") {
            event.preventDefault();
            this.savePendingCaption();
            return (ref1 = this.delegate) != null ? typeof ref1.attachmentEditorDidRequestDeselectingAttachment === "function" ? ref1.attachmentEditorDidRequestDeselectingAttachment(this.attachment) : void 0 : void 0;
          }
        };

        AttachmentEditorController.prototype.didInputCaption = function(event) {
          return this.pendingCaption = event.target.value.replace(/\s/g, " ").trim();
        };

        AttachmentEditorController.prototype.didChangeCaption = function(event) {
          return this.savePendingCaption();
        };

        AttachmentEditorController.prototype.didBlurCaption = function(event) {
          return this.savePendingCaption();
        };

        return AttachmentEditorController;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var css, htmlContainsTagName, makeElement,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      makeElement = Trix.makeElement;

      css = Trix.config.css;

      Trix.AttachmentView = (function(superClass) {
        var createCursorTarget;

        extend(AttachmentView, superClass);

        AttachmentView.attachmentSelector = "[data-trix-attachment]";

        function AttachmentView() {
          AttachmentView.__super__.constructor.apply(this, arguments);
          this.attachment = this.object;
          this.attachment.uploadProgressDelegate = this;
          this.attachmentPiece = this.options.piece;
        }

        AttachmentView.prototype.createContentNodes = function() {
          return [];
        };

        AttachmentView.prototype.createNodes = function() {
          var attributes, data, element, figure, href, i, key, len, node, ref, value;
          figure = makeElement({
            tagName: "figure",
            className: this.getClassName()
          });
          if (this.attachment.hasContent()) {
            figure.innerHTML = this.attachment.getContent();
          } else {
            ref = this.createContentNodes();
            for (i = 0, len = ref.length; i < len; i++) {
              node = ref[i];
              figure.appendChild(node);
            }
          }
          figure.appendChild(this.createCaptionElement());
          data = {
            trixAttachment: JSON.stringify(this.attachment),
            trixContentType: this.attachment.getContentType(),
            trixId: this.attachment.id
          };
          attributes = this.attachmentPiece.getAttributesForAttachment();
          if (!attributes.isEmpty()) {
            data.trixAttributes = JSON.stringify(attributes);
          }
          if (this.attachment.isPending()) {
            this.progressElement = makeElement({
              tagName: "progress",
              attributes: {
                "class": css.attachmentProgress,
                value: this.attachment.getUploadProgress(),
                max: 100
              },
              data: {
                trixMutable: true,
                trixStoreKey: ["progressElement", this.attachment.id].join("/")
              }
            });
            figure.appendChild(this.progressElement);
            data.trixSerialize = false;
          }
          if (href = this.getHref()) {
            element = makeElement("a", {
              href: href,
              tabindex: -1
            });
            element.appendChild(figure);
          } else {
            element = figure;
          }
          for (key in data) {
            value = data[key];
            element.dataset[key] = value;
          }
          element.setAttribute("contenteditable", false);
          return [createCursorTarget("left"), element, createCursorTarget("right")];
        };

        AttachmentView.prototype.createCaptionElement = function() {
          var caption, config, figcaption, name, nameElement, size, sizeElement;
          figcaption = makeElement({
            tagName: "figcaption",
            className: css.attachmentCaption
          });
          if (caption = this.attachmentPiece.getCaption()) {
            figcaption.classList.add(css.attachmentCaption + "--edited");
            figcaption.textContent = caption;
          } else {
            config = this.getCaptionConfig();
            if (config.name) {
              name = this.attachment.getFilename();
            }
            if (config.size) {
              size = this.attachment.getFormattedFilesize();
            }
            if (name) {
              nameElement = makeElement({
                tagName: "span",
                className: css.attachmentName,
                textContent: name
              });
              figcaption.appendChild(nameElement);
            }
            if (size) {
              if (name) {
                figcaption.appendChild(document.createTextNode(" "));
              }
              sizeElement = makeElement({
                tagName: "span",
                className: css.attachmentSize,
                textContent: size
              });
              figcaption.appendChild(sizeElement);
            }
          }
          return figcaption;
        };

        AttachmentView.prototype.getClassName = function() {
          var extension, names;
          names = [css.attachment, css.attachment + "--" + (this.attachment.getType())];
          if (extension = this.attachment.getExtension()) {
            names.push(css.attachment + "--" + extension);
          }
          return names.join(" ");
        };

        AttachmentView.prototype.getHref = function() {
          if (!htmlContainsTagName(this.attachment.getContent(), "a")) {
            return this.attachment.getHref();
          }
        };

        AttachmentView.prototype.getCaptionConfig = function() {
          var config, ref, type;
          type = this.attachment.getType();
          config = Trix.copyObject((ref = Trix.config.attachments[type]) != null ? ref.caption : void 0);
          if (type === "file") {
            config.name = true;
          }
          return config;
        };

        AttachmentView.prototype.findProgressElement = function() {
          var ref;
          return (ref = this.findElement()) != null ? ref.querySelector("progress") : void 0;
        };

        createCursorTarget = function(name) {
          return makeElement({
            tagName: "span",
            textContent: Trix.ZERO_WIDTH_SPACE,
            data: {
              trixCursorTarget: name,
              trixSerialize: false
            }
          });
        };

        AttachmentView.prototype.attachmentDidChangeUploadProgress = function() {
          var ref, value;
          value = this.attachment.getUploadProgress();
          return (ref = this.findProgressElement()) != null ? ref.value = value : void 0;
        };

        return AttachmentView;

      })(Trix.ObjectView);

      htmlContainsTagName = function(html, tagName) {
        var div;
        div = makeElement("div");
        div.innerHTML = html != null ? html : "";
        return div.querySelector(tagName);
      };

    }).call(this);
    (function() {
      var makeElement,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      makeElement = Trix.makeElement;

      Trix.PreviewableAttachmentView = (function(superClass) {
        extend(PreviewableAttachmentView, superClass);

        function PreviewableAttachmentView() {
          PreviewableAttachmentView.__super__.constructor.apply(this, arguments);
          this.attachment.previewDelegate = this;
        }

        PreviewableAttachmentView.prototype.createContentNodes = function() {
          this.image = makeElement({
            tagName: "img",
            attributes: {
              src: ""
            },
            data: {
              trixMutable: true
            }
          });
          this.refresh(this.image);
          return [this.image];
        };

        PreviewableAttachmentView.prototype.createCaptionElement = function() {
          var figcaption;
          figcaption = PreviewableAttachmentView.__super__.createCaptionElement.apply(this, arguments);
          if (!figcaption.textContent) {
            figcaption.setAttribute("data-trix-placeholder", Trix.config.lang.captionPlaceholder);
          }
          return figcaption;
        };

        PreviewableAttachmentView.prototype.refresh = function(image) {
          var ref;
          if (image == null) {
            image = (ref = this.findElement()) != null ? ref.querySelector("img") : void 0;
          }
          if (image) {
            return this.updateAttributesForImage(image);
          }
        };

        PreviewableAttachmentView.prototype.updateAttributesForImage = function(image) {
          var height, previewURL, serializedAttributes, storeKey, url, width;
          url = this.attachment.getURL();
          previewURL = this.attachment.getPreviewURL();
          image.src = previewURL || url;
          if (previewURL === url) {
            image.removeAttribute("data-trix-serialized-attributes");
          } else {
            serializedAttributes = JSON.stringify({
              src: url
            });
            image.setAttribute("data-trix-serialized-attributes", serializedAttributes);
          }
          width = this.attachment.getWidth();
          height = this.attachment.getHeight();
          if (width != null) {
            image.width = width;
          }
          if (height != null) {
            image.height = height;
          }
          storeKey = ["imageElement", this.attachment.id, image.src, image.width, image.height].join("/");
          return image.dataset.trixStoreKey = storeKey;
        };

        PreviewableAttachmentView.prototype.attachmentDidChangeAttributes = function() {
          this.refresh(this.image);
          return this.refresh();
        };

        return PreviewableAttachmentView;

      })(Trix.AttachmentView);

    }).call(this);
    (function() {
      var findInnerElement, getTextConfig, makeElement,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      makeElement = Trix.makeElement, findInnerElement = Trix.findInnerElement, getTextConfig = Trix.getTextConfig;

      Trix.PieceView = (function(superClass) {
        var nbsp;

        extend(PieceView, superClass);

        function PieceView() {
          var ref;
          PieceView.__super__.constructor.apply(this, arguments);
          this.piece = this.object;
          this.attributes = this.piece.getAttributes();
          ref = this.options, this.textConfig = ref.textConfig, this.context = ref.context;
          if (this.piece.attachment) {
            this.attachment = this.piece.attachment;
          } else {
            this.string = this.piece.toString();
          }
        }

        PieceView.prototype.createNodes = function() {
          var element, i, innerElement, len, node, nodes;
          nodes = this.attachment ? this.createAttachmentNodes() : this.createStringNodes();
          if (element = this.createElement()) {
            innerElement = findInnerElement(element);
            for (i = 0, len = nodes.length; i < len; i++) {
              node = nodes[i];
              innerElement.appendChild(node);
            }
            nodes = [element];
          }
          return nodes;
        };

        PieceView.prototype.createAttachmentNodes = function() {
          var constructor, view;
          constructor = this.attachment.isPreviewable() ? Trix.PreviewableAttachmentView : Trix.AttachmentView;
          view = this.createChildView(constructor, this.piece.attachment, {
            piece: this.piece
          });
          return view.getNodes();
        };

        PieceView.prototype.createStringNodes = function() {
          var element, i, index, len, length, node, nodes, ref, ref1, substring;
          if ((ref = this.textConfig) != null ? ref.plaintext : void 0) {
            return [document.createTextNode(this.string)];
          } else {
            nodes = [];
            ref1 = this.string.split("\n");
            for (index = i = 0, len = ref1.length; i < len; index = ++i) {
              substring = ref1[index];
              if (index > 0) {
                element = makeElement("br");
                nodes.push(element);
              }
              if (length = substring.length) {
                node = document.createTextNode(this.preserveSpaces(substring));
                nodes.push(node);
              }
            }
            return nodes;
          }
        };

        PieceView.prototype.createElement = function() {
          var config, element, innerElement, key, pendingElement, ref, ref1, styles, value;
          styles = {};
          ref = this.attributes;
          for (key in ref) {
            value = ref[key];
            if (!(config = getTextConfig(key))) {
              continue;
            }
            if (config.tagName) {
              pendingElement = makeElement(config.tagName);
              if (innerElement) {
                innerElement.appendChild(pendingElement);
                innerElement = pendingElement;
              } else {
                element = innerElement = pendingElement;
              }
            }
            if (config.styleProperty) {
              styles[config.styleProperty] = value;
            }
            if (config.style) {
              ref1 = config.style;
              for (key in ref1) {
                value = ref1[key];
                styles[key] = value;
              }
            }
          }
          if (Object.keys(styles).length) {
            if (element == null) {
              element = makeElement("span");
            }
            for (key in styles) {
              value = styles[key];
              element.style[key] = value;
            }
          }
          return element;
        };

        PieceView.prototype.createContainerElement = function() {
          var attributes, config, key, ref, value;
          ref = this.attributes;
          for (key in ref) {
            value = ref[key];
            if (config = getTextConfig(key)) {
              if (config.groupTagName) {
                attributes = {};
                attributes[key] = value;
                return makeElement(config.groupTagName, attributes);
              }
            }
          }
        };

        nbsp = Trix.NON_BREAKING_SPACE;

        PieceView.prototype.preserveSpaces = function(string) {
          if (this.context.isLast) {
            string = string.replace(/\ $/, nbsp);
          }
          string = string.replace(/(\S)\ {3}(\S)/g, "$1 " + nbsp + " $2").replace(/\ {2}/g, nbsp + " ").replace(/\ {2}/g, " " + nbsp);
          if (this.context.isFirst || this.context.followsWhitespace) {
            string = string.replace(/^\ /, nbsp);
          }
          return string;
        };

        return PieceView;

      })(Trix.ObjectView);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.TextView = (function(superClass) {
        var endsWithWhitespace;

        extend(TextView, superClass);

        function TextView() {
          TextView.__super__.constructor.apply(this, arguments);
          this.text = this.object;
          this.textConfig = this.options.textConfig;
        }

        TextView.prototype.createNodes = function() {
          var context, i, index, lastIndex, len, nodes, piece, pieces, previousPiece, view;
          nodes = [];
          pieces = Trix.ObjectGroup.groupObjects(this.getPieces());
          lastIndex = pieces.length - 1;
          for (index = i = 0, len = pieces.length; i < len; index = ++i) {
            piece = pieces[index];
            context = {};
            if (index === 0) {
              context.isFirst = true;
            }
            if (index === lastIndex) {
              context.isLast = true;
            }
            if (endsWithWhitespace(previousPiece)) {
              context.followsWhitespace = true;
            }
            view = this.findOrCreateCachedChildView(Trix.PieceView, piece, {
              textConfig: this.textConfig,
              context: context
            });
            nodes.push.apply(nodes, view.getNodes());
            previousPiece = piece;
          }
          return nodes;
        };

        TextView.prototype.getPieces = function() {
          var i, len, piece, ref, results;
          ref = this.text.getPieces();
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            piece = ref[i];
            if (!piece.hasAttribute("blockBreak")) {
              results.push(piece);
            }
          }
          return results;
        };

        endsWithWhitespace = function(piece) {
          return /\s$/.test(piece != null ? piece.toString() : void 0);
        };

        return TextView;

      })(Trix.ObjectView);

    }).call(this);
    (function() {
      var getBlockConfig, makeElement,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      makeElement = Trix.makeElement, getBlockConfig = Trix.getBlockConfig;

      Trix.BlockView = (function(superClass) {
        extend(BlockView, superClass);

        function BlockView() {
          BlockView.__super__.constructor.apply(this, arguments);
          this.block = this.object;
          this.attributes = this.block.getAttributes();
        }

        BlockView.prototype.createNodes = function() {
          var comment, element, i, len, node, nodes, ref, textConfig, textView;
          comment = document.createComment("block");
          nodes = [comment];
          if (this.block.isEmpty()) {
            nodes.push(makeElement("br"));
          } else {
            textConfig = (ref = getBlockConfig(this.block.getLastAttribute())) != null ? ref.text : void 0;
            textView = this.findOrCreateCachedChildView(Trix.TextView, this.block.text, {
              textConfig: textConfig
            });
            nodes.push.apply(nodes, textView.getNodes());
            if (this.shouldAddExtraNewlineElement()) {
              nodes.push(makeElement("br"));
            }
          }
          if (this.attributes.length) {
            return nodes;
          } else {
            element = makeElement(Trix.config.blockAttributes["default"].tagName);
            for (i = 0, len = nodes.length; i < len; i++) {
              node = nodes[i];
              element.appendChild(node);
            }
            return [element];
          }
        };

        BlockView.prototype.createContainerElement = function(depth) {
          var attribute, config;
          attribute = this.attributes[depth];
          config = getBlockConfig(attribute);
          return makeElement(config.tagName);
        };

        BlockView.prototype.shouldAddExtraNewlineElement = function() {
          return /\n\n$/.test(this.block.toString());
        };

        return BlockView;

      })(Trix.ObjectView);

    }).call(this);
    (function() {
      var defer, makeElement,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      defer = Trix.defer, makeElement = Trix.makeElement;

      Trix.DocumentView = (function(superClass) {
        var elementsHaveEqualHTML, findStoredElements, ignoreSpaces;

        extend(DocumentView, superClass);

        DocumentView.render = function(document) {
          var element, view;
          element = makeElement("div");
          view = new this(document, {
            element: element
          });
          view.render();
          view.sync();
          return element;
        };

        function DocumentView() {
          DocumentView.__super__.constructor.apply(this, arguments);
          this.element = this.options.element;
          this.elementStore = new Trix.ElementStore;
          this.setDocument(this.object);
        }

        DocumentView.prototype.setDocument = function(document) {
          if (!document.isEqualTo(this.document)) {
            return this.document = this.object = document;
          }
        };

        DocumentView.prototype.render = function() {
          var i, len, node, object, objects, results, view;
          this.childViews = [];
          this.shadowElement = makeElement("div");
          if (!this.document.isEmpty()) {
            objects = Trix.ObjectGroup.groupObjects(this.document.getBlocks(), {
              asTree: true
            });
            results = [];
            for (i = 0, len = objects.length; i < len; i++) {
              object = objects[i];
              view = this.findOrCreateCachedChildView(Trix.BlockView, object);
              results.push((function() {
                var j, len1, ref, results1;
                ref = view.getNodes();
                results1 = [];
                for (j = 0, len1 = ref.length; j < len1; j++) {
                  node = ref[j];
                  results1.push(this.shadowElement.appendChild(node));
                }
                return results1;
              }).call(this));
            }
            return results;
          }
        };

        DocumentView.prototype.isSynced = function() {
          return elementsHaveEqualHTML(this.shadowElement, this.element);
        };

        DocumentView.prototype.sync = function() {
          var fragment;
          fragment = this.createDocumentFragmentForSync();
          while (this.element.lastChild) {
            this.element.removeChild(this.element.lastChild);
          }
          this.element.appendChild(fragment);
          return this.didSync();
        };

        DocumentView.prototype.didSync = function() {
          this.elementStore.reset(findStoredElements(this.element));
          return defer((function(_this) {
            return function() {
              return _this.garbageCollectCachedViews();
            };
          })(this));
        };

        DocumentView.prototype.createDocumentFragmentForSync = function() {
          var element, fragment, i, j, len, len1, node, ref, ref1, storedElement;
          fragment = document.createDocumentFragment();
          ref = this.shadowElement.childNodes;
          for (i = 0, len = ref.length; i < len; i++) {
            node = ref[i];
            fragment.appendChild(node.cloneNode(true));
          }
          ref1 = findStoredElements(fragment);
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            element = ref1[j];
            if (storedElement = this.elementStore.remove(element)) {
              element.parentNode.replaceChild(storedElement, element);
            }
          }
          return fragment;
        };

        findStoredElements = function(element) {
          return element.querySelectorAll("[data-trix-store-key]");
        };

        elementsHaveEqualHTML = function(element, otherElement) {
          return ignoreSpaces(element.innerHTML) === ignoreSpaces(otherElement.innerHTML);
        };

        ignoreSpaces = function(html) {
          return html.replace(/&nbsp;/g, " ");
        };

        return DocumentView;

      })(Trix.ObjectView);

    }).call(this);
    (function() {
      var attachmentSelector, defer, handleEvent, innerElementIsActive,
        bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      handleEvent = Trix.handleEvent, innerElementIsActive = Trix.innerElementIsActive, defer = Trix.defer;

      attachmentSelector = Trix.AttachmentView.attachmentSelector;

      Trix.CompositionController = (function(superClass) {
        extend(CompositionController, superClass);

        function CompositionController(element1, composition) {
          this.element = element1;
          this.composition = composition;
          this.didClickAttachment = bind(this.didClickAttachment, this);
          this.didBlur = bind(this.didBlur, this);
          this.didFocus = bind(this.didFocus, this);
          this.documentView = new Trix.DocumentView(this.composition.document, {
            element: this.element
          });
          handleEvent("focus", {
            onElement: this.element,
            withCallback: this.didFocus
          });
          handleEvent("blur", {
            onElement: this.element,
            withCallback: this.didBlur
          });
          handleEvent("click", {
            onElement: this.element,
            matchingSelector: "a[contenteditable=false]",
            preventDefault: true
          });
          handleEvent("mousedown", {
            onElement: this.element,
            matchingSelector: attachmentSelector,
            withCallback: this.didClickAttachment
          });
          handleEvent("click", {
            onElement: this.element,
            matchingSelector: "a" + attachmentSelector,
            preventDefault: true
          });
        }

        CompositionController.prototype.didFocus = function(event) {
          var perform, ref, ref1;
          perform = (function(_this) {
            return function() {
              var ref;
              if (!_this.focused) {
                _this.focused = true;
                return (ref = _this.delegate) != null ? typeof ref.compositionControllerDidFocus === "function" ? ref.compositionControllerDidFocus() : void 0 : void 0;
              }
            };
          })(this);
          return (ref = (ref1 = this.blurPromise) != null ? ref1.then(perform) : void 0) != null ? ref : perform();
        };

        CompositionController.prototype.didBlur = function(event) {
          return this.blurPromise = new Promise((function(_this) {
            return function(resolve) {
              return defer(function() {
                var ref;
                if (!innerElementIsActive(_this.element)) {
                  _this.focused = null;
                  if ((ref = _this.delegate) != null) {
                    if (typeof ref.compositionControllerDidBlur === "function") {
                      ref.compositionControllerDidBlur();
                    }
                  }
                }
                _this.blurPromise = null;
                return resolve();
              });
            };
          })(this));
        };

        CompositionController.prototype.didClickAttachment = function(event, target) {
          var attachment, ref;
          attachment = this.findAttachmentForElement(target);
          return (ref = this.delegate) != null ? typeof ref.compositionControllerDidSelectAttachment === "function" ? ref.compositionControllerDidSelectAttachment(attachment) : void 0 : void 0;
        };

        CompositionController.prototype.getSerializableElement = function() {
          if (this.isEditingAttachment()) {
            return this.documentView.shadowElement;
          } else {
            return this.element;
          }
        };

        CompositionController.prototype.render = function() {
          var ref, ref1, ref2;
          if (this.revision !== this.composition.revision) {
            this.documentView.setDocument(this.composition.document);
            this.documentView.render();
            this.revision = this.composition.revision;
          }
          if (this.canSyncDocumentView() && !this.documentView.isSynced()) {
            if ((ref = this.delegate) != null) {
              if (typeof ref.compositionControllerWillSyncDocumentView === "function") {
                ref.compositionControllerWillSyncDocumentView();
              }
            }
            this.documentView.sync();
            if ((ref1 = this.delegate) != null) {
              if (typeof ref1.compositionControllerDidSyncDocumentView === "function") {
                ref1.compositionControllerDidSyncDocumentView();
              }
            }
          }
          return (ref2 = this.delegate) != null ? typeof ref2.compositionControllerDidRender === "function" ? ref2.compositionControllerDidRender() : void 0 : void 0;
        };

        CompositionController.prototype.rerenderViewForObject = function(object) {
          this.invalidateViewForObject(object);
          return this.render();
        };

        CompositionController.prototype.invalidateViewForObject = function(object) {
          return this.documentView.invalidateViewForObject(object);
        };

        CompositionController.prototype.isViewCachingEnabled = function() {
          return this.documentView.isViewCachingEnabled();
        };

        CompositionController.prototype.enableViewCaching = function() {
          return this.documentView.enableViewCaching();
        };

        CompositionController.prototype.disableViewCaching = function() {
          return this.documentView.disableViewCaching();
        };

        CompositionController.prototype.refreshViewCache = function() {
          return this.documentView.garbageCollectCachedViews();
        };

        CompositionController.prototype.isEditingAttachment = function() {
          return this.attachmentEditor != null;
        };

        CompositionController.prototype.installAttachmentEditorForAttachment = function(attachment) {
          var attachmentPiece, element, ref;
          if (((ref = this.attachmentEditor) != null ? ref.attachment : void 0) === attachment) {
            return;
          }
          if (!(element = this.documentView.findElementForObject(attachment))) {
            return;
          }
          this.uninstallAttachmentEditor();
          attachmentPiece = this.composition.document.getAttachmentPieceForAttachment(attachment);
          this.attachmentEditor = new Trix.AttachmentEditorController(attachmentPiece, element, this.element);
          return this.attachmentEditor.delegate = this;
        };

        CompositionController.prototype.uninstallAttachmentEditor = function() {
          var ref;
          return (ref = this.attachmentEditor) != null ? ref.uninstall() : void 0;
        };

        CompositionController.prototype.editAttachmentCaption = function() {
          var ref;
          return (ref = this.attachmentEditor) != null ? ref.editCaption() : void 0;
        };

        CompositionController.prototype.didUninstallAttachmentEditor = function() {
          this.attachmentEditor = null;
          return this.render();
        };

        CompositionController.prototype.attachmentEditorDidRequestUpdatingAttributesForAttachment = function(attributes, attachment) {
          var ref;
          if ((ref = this.delegate) != null) {
            if (typeof ref.compositionControllerWillUpdateAttachment === "function") {
              ref.compositionControllerWillUpdateAttachment(attachment);
            }
          }
          return this.composition.updateAttributesForAttachment(attributes, attachment);
        };

        CompositionController.prototype.attachmentEditorDidRequestRemovingAttributeForAttachment = function(attribute, attachment) {
          var ref;
          if ((ref = this.delegate) != null) {
            if (typeof ref.compositionControllerWillUpdateAttachment === "function") {
              ref.compositionControllerWillUpdateAttachment(attachment);
            }
          }
          return this.composition.removeAttributeForAttachment(attribute, attachment);
        };

        CompositionController.prototype.attachmentEditorDidRequestRemovalOfAttachment = function(attachment) {
          var ref;
          return (ref = this.delegate) != null ? typeof ref.compositionControllerDidRequestRemovalOfAttachment === "function" ? ref.compositionControllerDidRequestRemovalOfAttachment(attachment) : void 0 : void 0;
        };

        CompositionController.prototype.attachmentEditorDidRequestDeselectingAttachment = function(attachment) {
          var ref;
          return (ref = this.delegate) != null ? typeof ref.compositionControllerDidRequestDeselectingAttachment === "function" ? ref.compositionControllerDidRequestDeselectingAttachment(attachment) : void 0 : void 0;
        };

        CompositionController.prototype.canSyncDocumentView = function() {
          return !this.isEditingAttachment();
        };

        CompositionController.prototype.findAttachmentForElement = function(element) {
          return this.composition.document.getAttachmentById(parseInt(element.dataset.trixId, 10));
        };

        return CompositionController;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var findClosestElementFromNode, handleEvent, triggerEvent,
        bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      handleEvent = Trix.handleEvent, triggerEvent = Trix.triggerEvent, findClosestElementFromNode = Trix.findClosestElementFromNode;

      Trix.ToolbarController = (function(superClass) {
        var actionButtonSelector, activeDialogSelector, attributeButtonSelector, dialogButtonSelector, dialogInputSelector, dialogSelector, getActionName, getAttributeName, getDialogName, getInputForDialog, toolbarButtonSelector;

        extend(ToolbarController, superClass);

        attributeButtonSelector = "[data-trix-attribute]";

        actionButtonSelector = "[data-trix-action]";

        toolbarButtonSelector = attributeButtonSelector + ", " + actionButtonSelector;

        dialogSelector = "[data-trix-dialog]";

        activeDialogSelector = dialogSelector + "[data-trix-active]";

        dialogButtonSelector = dialogSelector + " [data-trix-method]";

        dialogInputSelector = dialogSelector + " [data-trix-input]";

        function ToolbarController(element1) {
          this.element = element1;
          this.didKeyDownDialogInput = bind(this.didKeyDownDialogInput, this);
          this.didClickDialogButton = bind(this.didClickDialogButton, this);
          this.didClickAttributeButton = bind(this.didClickAttributeButton, this);
          this.didClickActionButton = bind(this.didClickActionButton, this);
          this.attributes = {};
          this.actions = {};
          this.resetDialogInputs();
          handleEvent("mousedown", {
            onElement: this.element,
            matchingSelector: actionButtonSelector,
            withCallback: this.didClickActionButton
          });
          handleEvent("mousedown", {
            onElement: this.element,
            matchingSelector: attributeButtonSelector,
            withCallback: this.didClickAttributeButton
          });
          handleEvent("click", {
            onElement: this.element,
            matchingSelector: toolbarButtonSelector,
            preventDefault: true
          });
          handleEvent("click", {
            onElement: this.element,
            matchingSelector: dialogButtonSelector,
            withCallback: this.didClickDialogButton
          });
          handleEvent("keydown", {
            onElement: this.element,
            matchingSelector: dialogInputSelector,
            withCallback: this.didKeyDownDialogInput
          });
        }

        ToolbarController.prototype.didClickActionButton = function(event, element) {
          var actionName, ref, ref1;
          if ((ref = this.delegate) != null) {
            ref.toolbarDidClickButton();
          }
          event.preventDefault();
          actionName = getActionName(element);
          if (this.getDialog(actionName)) {
            return this.toggleDialog(actionName);
          } else {
            return (ref1 = this.delegate) != null ? ref1.toolbarDidInvokeAction(actionName) : void 0;
          }
        };

        ToolbarController.prototype.didClickAttributeButton = function(event, element) {
          var attributeName, ref, ref1;
          if ((ref = this.delegate) != null) {
            ref.toolbarDidClickButton();
          }
          event.preventDefault();
          attributeName = getAttributeName(element);
          if (this.getDialog(attributeName)) {
            this.toggleDialog(attributeName);
          } else {
            if ((ref1 = this.delegate) != null) {
              ref1.toolbarDidToggleAttribute(attributeName);
            }
          }
          return this.refreshAttributeButtons();
        };

        ToolbarController.prototype.didClickDialogButton = function(event, element) {
          var dialogElement, method;
          dialogElement = findClosestElementFromNode(element, {
            matchingSelector: dialogSelector
          });
          method = element.getAttribute("data-trix-method");
          return this[method].call(this, dialogElement);
        };

        ToolbarController.prototype.didKeyDownDialogInput = function(event, element) {
          var attribute, dialog;
          if (event.keyCode === 13) {
            event.preventDefault();
            attribute = element.getAttribute("name");
            dialog = this.getDialog(attribute);
            this.setAttribute(dialog);
          }
          if (event.keyCode === 27) {
            event.preventDefault();
            return this.hideDialog();
          }
        };

        ToolbarController.prototype.updateActions = function(actions) {
          this.actions = actions;
          return this.refreshActionButtons();
        };

        ToolbarController.prototype.refreshActionButtons = function() {
          return this.eachActionButton((function(_this) {
            return function(element, actionName) {
              return element.disabled = _this.actions[actionName] === false;
            };
          })(this));
        };

        ToolbarController.prototype.eachActionButton = function(callback) {
          var element, i, len, ref, results;
          ref = this.element.querySelectorAll(actionButtonSelector);
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            element = ref[i];
            results.push(callback(element, getActionName(element)));
          }
          return results;
        };

        ToolbarController.prototype.updateAttributes = function(attributes) {
          this.attributes = attributes;
          return this.refreshAttributeButtons();
        };

        ToolbarController.prototype.refreshAttributeButtons = function() {
          return this.eachAttributeButton((function(_this) {
            return function(element, attributeName) {
              element.disabled = _this.attributes[attributeName] === false;
              if (_this.attributes[attributeName] || _this.dialogIsVisible(attributeName)) {
                element.setAttribute("data-trix-active", "");
                return element.classList.add("trix-active");
              } else {
                element.removeAttribute("data-trix-active");
                return element.classList.remove("trix-active");
              }
            };
          })(this));
        };

        ToolbarController.prototype.eachAttributeButton = function(callback) {
          var element, i, len, ref, results;
          ref = this.element.querySelectorAll(attributeButtonSelector);
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            element = ref[i];
            results.push(callback(element, getAttributeName(element)));
          }
          return results;
        };

        ToolbarController.prototype.applyKeyboardCommand = function(keys) {
          var button, buttonKeyString, buttonKeys, i, keyString, len, ref;
          keyString = JSON.stringify(keys.sort());
          ref = this.element.querySelectorAll("[data-trix-key]");
          for (i = 0, len = ref.length; i < len; i++) {
            button = ref[i];
            buttonKeys = button.getAttribute("data-trix-key").split("+");
            buttonKeyString = JSON.stringify(buttonKeys.sort());
            if (buttonKeyString === keyString) {
              triggerEvent("mousedown", {
                onElement: button
              });
              return true;
            }
          }
          return false;
        };

        ToolbarController.prototype.dialogIsVisible = function(dialogName) {
          var element;
          if (element = this.getDialog(dialogName)) {
            return element.hasAttribute("data-trix-active");
          }
        };

        ToolbarController.prototype.toggleDialog = function(dialogName) {
          if (this.dialogIsVisible(dialogName)) {
            return this.hideDialog();
          } else {
            return this.showDialog(dialogName);
          }
        };

        ToolbarController.prototype.showDialog = function(dialogName) {
          var attributeName, disabledInput, element, i, input, len, ref, ref1, ref2, ref3;
          this.hideDialog();
          if ((ref = this.delegate) != null) {
            ref.toolbarWillShowDialog();
          }
          element = this.getDialog(dialogName);
          element.setAttribute("data-trix-active", "");
          element.classList.add("trix-active");
          ref1 = element.querySelectorAll("input[disabled]");
          for (i = 0, len = ref1.length; i < len; i++) {
            disabledInput = ref1[i];
            disabledInput.removeAttribute("disabled");
          }
          if (attributeName = getAttributeName(element)) {
            if (input = getInputForDialog(element, dialogName)) {
              input.value = (ref2 = this.attributes[attributeName]) != null ? ref2 : "";
              input.select();
            }
          }
          return (ref3 = this.delegate) != null ? ref3.toolbarDidShowDialog(dialogName) : void 0;
        };

        ToolbarController.prototype.setAttribute = function(dialogElement) {
          var attributeName, input, ref;
          attributeName = getAttributeName(dialogElement);
          input = getInputForDialog(dialogElement, attributeName);
          if (input.willValidate && !input.checkValidity()) {
            input.setAttribute("data-trix-validate", "");
            input.classList.add("trix-validate");
            return input.focus();
          } else {
            if ((ref = this.delegate) != null) {
              ref.toolbarDidUpdateAttribute(attributeName, input.value);
            }
            return this.hideDialog();
          }
        };

        ToolbarController.prototype.removeAttribute = function(dialogElement) {
          var attributeName, ref;
          attributeName = getAttributeName(dialogElement);
          if ((ref = this.delegate) != null) {
            ref.toolbarDidRemoveAttribute(attributeName);
          }
          return this.hideDialog();
        };

        ToolbarController.prototype.hideDialog = function() {
          var element, ref;
          if (element = this.element.querySelector(activeDialogSelector)) {
            element.removeAttribute("data-trix-active");
            element.classList.remove("trix-active");
            this.resetDialogInputs();
            return (ref = this.delegate) != null ? ref.toolbarDidHideDialog(getDialogName(element)) : void 0;
          }
        };

        ToolbarController.prototype.resetDialogInputs = function() {
          var i, input, len, ref, results;
          ref = this.element.querySelectorAll(dialogInputSelector);
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            input = ref[i];
            input.setAttribute("disabled", "disabled");
            input.removeAttribute("data-trix-validate");
            results.push(input.classList.remove("trix-validate"));
          }
          return results;
        };

        ToolbarController.prototype.getDialog = function(dialogName) {
          return this.element.querySelector("[data-trix-dialog=" + dialogName + "]");
        };

        getInputForDialog = function(element, attributeName) {
          if (attributeName == null) {
            attributeName = getAttributeName(element);
          }
          return element.querySelector("[data-trix-input][name='" + attributeName + "']");
        };

        getActionName = function(element) {
          return element.getAttribute("data-trix-action");
        };

        getAttributeName = function(element) {
          var ref;
          return (ref = element.getAttribute("data-trix-attribute")) != null ? ref : element.getAttribute("data-trix-dialog-attribute");
        };

        getDialogName = function(element) {
          return element.getAttribute("data-trix-dialog");
        };

        return ToolbarController;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.ImagePreloadOperation = (function(superClass) {
        extend(ImagePreloadOperation, superClass);

        function ImagePreloadOperation(url) {
          this.url = url;
        }

        ImagePreloadOperation.prototype.perform = function(callback) {
          var image;
          image = new Image;
          image.onload = (function(_this) {
            return function() {
              image.width = _this.width = image.naturalWidth;
              image.height = _this.height = image.naturalHeight;
              return callback(true, image);
            };
          })(this);
          image.onerror = function() {
            return callback(false);
          };
          return image.src = this.url;
        };

        return ImagePreloadOperation;

      })(Trix.Operation);

    }).call(this);
    (function() {
      var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.Attachment = (function(superClass) {
        extend(Attachment, superClass);

        Attachment.previewablePattern = /^image(\/(gif|png|jpe?g)|$)/;

        Attachment.attachmentForFile = function(file) {
          var attachment, attributes;
          attributes = this.attributesForFile(file);
          attachment = new this(attributes);
          attachment.setFile(file);
          return attachment;
        };

        Attachment.attributesForFile = function(file) {
          return new Trix.Hash({
            filename: file.name,
            filesize: file.size,
            contentType: file.type
          });
        };

        Attachment.fromJSON = function(attachmentJSON) {
          return new this(attachmentJSON);
        };

        function Attachment(attributes) {
          if (attributes == null) {
            attributes = {};
          }
          this.releaseFile = bind(this.releaseFile, this);
          Attachment.__super__.constructor.apply(this, arguments);
          this.attributes = Trix.Hash.box(attributes);
          this.didChangeAttributes();
        }

        Attachment.prototype.getAttribute = function(attribute) {
          return this.attributes.get(attribute);
        };

        Attachment.prototype.hasAttribute = function(attribute) {
          return this.attributes.has(attribute);
        };

        Attachment.prototype.getAttributes = function() {
          return this.attributes.toObject();
        };

        Attachment.prototype.setAttributes = function(attributes) {
          var newAttributes, ref, ref1;
          if (attributes == null) {
            attributes = {};
          }
          newAttributes = this.attributes.merge(attributes);
          if (!this.attributes.isEqualTo(newAttributes)) {
            this.attributes = newAttributes;
            this.didChangeAttributes();
            if ((ref = this.previewDelegate) != null) {
              if (typeof ref.attachmentDidChangeAttributes === "function") {
                ref.attachmentDidChangeAttributes(this);
              }
            }
            return (ref1 = this.delegate) != null ? typeof ref1.attachmentDidChangeAttributes === "function" ? ref1.attachmentDidChangeAttributes(this) : void 0 : void 0;
          }
        };

        Attachment.prototype.didChangeAttributes = function() {
          if (this.isPreviewable()) {
            return this.preloadURL();
          }
        };

        Attachment.prototype.isPending = function() {
          return (this.file != null) && !(this.getURL() || this.getHref());
        };

        Attachment.prototype.isPreviewable = function() {
          if (this.attributes.has("previewable")) {
            return this.attributes.get("previewable");
          } else {
            return this.constructor.previewablePattern.test(this.getContentType());
          }
        };

        Attachment.prototype.getType = function() {
          if (this.hasContent()) {
            return "content";
          } else if (this.isPreviewable()) {
            return "preview";
          } else {
            return "file";
          }
        };

        Attachment.prototype.getURL = function() {
          return this.attributes.get("url");
        };

        Attachment.prototype.getHref = function() {
          return this.attributes.get("href");
        };

        Attachment.prototype.getFilename = function() {
          var ref;
          return (ref = this.attributes.get("filename")) != null ? ref : "";
        };

        Attachment.prototype.getFilesize = function() {
          return this.attributes.get("filesize");
        };

        Attachment.prototype.getFormattedFilesize = function() {
          var filesize;
          filesize = this.attributes.get("filesize");
          if (typeof filesize === "number") {
            return Trix.config.fileSize.formatter(filesize);
          } else {
            return "";
          }
        };

        Attachment.prototype.getExtension = function() {
          var ref;
          return (ref = this.getFilename().match(/\.(\w+)$/)) != null ? ref[1].toLowerCase() : void 0;
        };

        Attachment.prototype.getContentType = function() {
          return this.attributes.get("contentType");
        };

        Attachment.prototype.hasContent = function() {
          return this.attributes.has("content");
        };

        Attachment.prototype.getContent = function() {
          return this.attributes.get("content");
        };

        Attachment.prototype.getWidth = function() {
          return this.attributes.get("width");
        };

        Attachment.prototype.getHeight = function() {
          return this.attributes.get("height");
        };

        Attachment.prototype.getFile = function() {
          return this.file;
        };

        Attachment.prototype.setFile = function(file1) {
          this.file = file1;
          if (this.isPreviewable()) {
            return this.preloadFile();
          }
        };

        Attachment.prototype.releaseFile = function() {
          this.releasePreloadedFile();
          return this.file = null;
        };

        Attachment.prototype.getUploadProgress = function() {
          var ref;
          return (ref = this.uploadProgress) != null ? ref : 0;
        };

        Attachment.prototype.setUploadProgress = function(value) {
          var ref;
          if (this.uploadProgress !== value) {
            this.uploadProgress = value;
            return (ref = this.uploadProgressDelegate) != null ? typeof ref.attachmentDidChangeUploadProgress === "function" ? ref.attachmentDidChangeUploadProgress(this) : void 0 : void 0;
          }
        };

        Attachment.prototype.toJSON = function() {
          return this.getAttributes();
        };

        Attachment.prototype.getCacheKey = function() {
          return [Attachment.__super__.getCacheKey.apply(this, arguments), this.attributes.getCacheKey(), this.getPreviewURL()].join("/");
        };

        Attachment.prototype.getPreviewURL = function() {
          return this.previewURL || this.preloadingURL;
        };

        Attachment.prototype.setPreviewURL = function(url) {
          var ref, ref1;
          if (url !== this.getPreviewURL()) {
            this.previewURL = url;
            if ((ref = this.previewDelegate) != null) {
              if (typeof ref.attachmentDidChangeAttributes === "function") {
                ref.attachmentDidChangeAttributes(this);
              }
            }
            return (ref1 = this.delegate) != null ? typeof ref1.attachmentDidChangePreviewURL === "function" ? ref1.attachmentDidChangePreviewURL(this) : void 0 : void 0;
          }
        };

        Attachment.prototype.preloadURL = function() {
          return this.preload(this.getURL(), this.releaseFile);
        };

        Attachment.prototype.preloadFile = function() {
          if (this.file) {
            this.fileObjectURL = URL.createObjectURL(this.file);
            return this.preload(this.fileObjectURL);
          }
        };

        Attachment.prototype.releasePreloadedFile = function() {
          if (this.fileObjectURL) {
            URL.revokeObjectURL(this.fileObjectURL);
            return this.fileObjectURL = null;
          }
        };

        Attachment.prototype.preload = function(url, callback) {
          var operation;
          if (url && url !== this.getPreviewURL()) {
            this.preloadingURL = url;
            operation = new Trix.ImagePreloadOperation(url);
            return operation.then((function(_this) {
              return function(arg) {
                var height, width;
                width = arg.width, height = arg.height;
                _this.setAttributes({
                  width: width,
                  height: height
                });
                _this.preloadingURL = null;
                _this.setPreviewURL(url);
                return typeof callback === "function" ? callback() : void 0;
              };
            })(this));
          }
        };

        return Attachment;

      })(Trix.Object);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.Piece = (function(superClass) {
        extend(Piece, superClass);

        Piece.types = {};

        Piece.registerType = function(type, constructor) {
          constructor.type = type;
          return this.types[type] = constructor;
        };

        Piece.fromJSON = function(pieceJSON) {
          var constructor;
          if (constructor = this.types[pieceJSON.type]) {
            return constructor.fromJSON(pieceJSON);
          }
        };

        function Piece(value, attributes) {
          if (attributes == null) {
            attributes = {};
          }
          Piece.__super__.constructor.apply(this, arguments);
          this.attributes = Trix.Hash.box(attributes);
        }

        Piece.prototype.copyWithAttributes = function(attributes) {
          return new this.constructor(this.getValue(), attributes);
        };

        Piece.prototype.copyWithAdditionalAttributes = function(attributes) {
          return this.copyWithAttributes(this.attributes.merge(attributes));
        };

        Piece.prototype.copyWithoutAttribute = function(attribute) {
          return this.copyWithAttributes(this.attributes.remove(attribute));
        };

        Piece.prototype.copy = function() {
          return this.copyWithAttributes(this.attributes);
        };

        Piece.prototype.getAttribute = function(attribute) {
          return this.attributes.get(attribute);
        };

        Piece.prototype.getAttributesHash = function() {
          return this.attributes;
        };

        Piece.prototype.getAttributes = function() {
          return this.attributes.toObject();
        };

        Piece.prototype.getCommonAttributes = function() {
          var attributes, keys, piece;
          if (!(piece = pieceList.getPieceAtIndex(0))) {
            return {};
          }
          attributes = piece.attributes;
          keys = attributes.getKeys();
          pieceList.eachPiece(function(piece) {
            keys = attributes.getKeysCommonToHash(piece.attributes);
            return attributes = attributes.slice(keys);
          });
          return attributes.toObject();
        };

        Piece.prototype.hasAttribute = function(attribute) {
          return this.attributes.has(attribute);
        };

        Piece.prototype.hasSameStringValueAsPiece = function(piece) {
          return (piece != null) && this.toString() === piece.toString();
        };

        Piece.prototype.hasSameAttributesAsPiece = function(piece) {
          return (piece != null) && (this.attributes === piece.attributes || this.attributes.isEqualTo(piece.attributes));
        };

        Piece.prototype.isBlockBreak = function() {
          return false;
        };

        Piece.prototype.isEqualTo = function(piece) {
          return Piece.__super__.isEqualTo.apply(this, arguments) || (this.hasSameConstructorAs(piece) && this.hasSameStringValueAsPiece(piece) && this.hasSameAttributesAsPiece(piece));
        };

        Piece.prototype.isEmpty = function() {
          return this.length === 0;
        };

        Piece.prototype.isSerializable = function() {
          return true;
        };

        Piece.prototype.toJSON = function() {
          return {
            type: this.constructor.type,
            attributes: this.getAttributes()
          };
        };

        Piece.prototype.contentsForInspection = function() {
          return {
            type: this.constructor.type,
            attributes: this.attributes.inspect()
          };
        };

        Piece.prototype.canBeGrouped = function() {
          return this.hasAttribute("href");
        };

        Piece.prototype.canBeGroupedWith = function(piece) {
          return this.getAttribute("href") === piece.getAttribute("href");
        };

        Piece.prototype.getLength = function() {
          return this.length;
        };

        Piece.prototype.canBeConsolidatedWith = function(piece) {
          return false;
        };

        return Piece;

      })(Trix.Object);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.Piece.registerType("attachment", Trix.AttachmentPiece = (function(superClass) {
        extend(AttachmentPiece, superClass);

        AttachmentPiece.fromJSON = function(pieceJSON) {
          return new this(Trix.Attachment.fromJSON(pieceJSON.attachment), pieceJSON.attributes);
        };

        function AttachmentPiece(attachment) {
          this.attachment = attachment;
          AttachmentPiece.__super__.constructor.apply(this, arguments);
          this.length = 1;
          this.ensureAttachmentExclusivelyHasAttribute("href");
        }

        AttachmentPiece.prototype.ensureAttachmentExclusivelyHasAttribute = function(attribute) {
          if (this.hasAttribute(attribute) && this.attachment.hasAttribute(attribute)) {
            return this.attributes = this.attributes.remove(attribute);
          }
        };

        AttachmentPiece.prototype.getValue = function() {
          return this.attachment;
        };

        AttachmentPiece.prototype.isSerializable = function() {
          return !this.attachment.isPending();
        };

        AttachmentPiece.prototype.getCaption = function() {
          var ref;
          return (ref = this.attributes.get("caption")) != null ? ref : "";
        };

        AttachmentPiece.prototype.getAttributesForAttachment = function() {
          return this.attributes.slice(["caption"]);
        };

        AttachmentPiece.prototype.canBeGrouped = function() {
          return AttachmentPiece.__super__.canBeGrouped.apply(this, arguments) && !this.attachment.hasAttribute("href");
        };

        AttachmentPiece.prototype.isEqualTo = function(piece) {
          var ref;
          return AttachmentPiece.__super__.isEqualTo.apply(this, arguments) && this.attachment.id === (piece != null ? (ref = piece.attachment) != null ? ref.id : void 0 : void 0);
        };

        AttachmentPiece.prototype.toString = function() {
          return Trix.OBJECT_REPLACEMENT_CHARACTER;
        };

        AttachmentPiece.prototype.toJSON = function() {
          var json;
          json = AttachmentPiece.__super__.toJSON.apply(this, arguments);
          json.attachment = this.attachment;
          return json;
        };

        AttachmentPiece.prototype.getCacheKey = function() {
          return [AttachmentPiece.__super__.getCacheKey.apply(this, arguments), this.attachment.getCacheKey()].join("/");
        };

        AttachmentPiece.prototype.toConsole = function() {
          return JSON.stringify(this.toString());
        };

        return AttachmentPiece;

      })(Trix.Piece));

    }).call(this);
    (function() {
      var normalizeNewlines,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      normalizeNewlines = Trix.normalizeNewlines;

      Trix.Piece.registerType("string", Trix.StringPiece = (function(superClass) {
        extend(StringPiece, superClass);

        StringPiece.fromJSON = function(pieceJSON) {
          return new this(pieceJSON.string, pieceJSON.attributes);
        };

        function StringPiece(string) {
          StringPiece.__super__.constructor.apply(this, arguments);
          this.string = normalizeNewlines(string);
          this.length = this.string.length;
        }

        StringPiece.prototype.getValue = function() {
          return this.string;
        };

        StringPiece.prototype.toString = function() {
          return this.string.toString();
        };

        StringPiece.prototype.isBlockBreak = function() {
          return this.toString() === "\n" && this.getAttribute("blockBreak") === true;
        };

        StringPiece.prototype.toJSON = function() {
          var result;
          result = StringPiece.__super__.toJSON.apply(this, arguments);
          result.string = this.string;
          return result;
        };

        StringPiece.prototype.canBeConsolidatedWith = function(piece) {
          return (piece != null) && this.hasSameConstructorAs(piece) && this.hasSameAttributesAsPiece(piece);
        };

        StringPiece.prototype.consolidateWith = function(piece) {
          return new this.constructor(this.toString() + piece.toString(), this.attributes);
        };

        StringPiece.prototype.splitAtOffset = function(offset) {
          var left, right;
          if (offset === 0) {
            left = null;
            right = this;
          } else if (offset === this.length) {
            left = this;
            right = null;
          } else {
            left = new this.constructor(this.string.slice(0, offset), this.attributes);
            right = new this.constructor(this.string.slice(offset), this.attributes);
          }
          return [left, right];
        };

        StringPiece.prototype.toConsole = function() {
          var string;
          string = this.string;
          if (string.length > 15) {
            string = string.slice(0, 14) + "…";
          }
          return JSON.stringify(string.toString());
        };

        return StringPiece;

      })(Trix.Piece));

    }).call(this);
    (function() {
      var spliceArray,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        slice = [].slice;

      spliceArray = Trix.spliceArray;

      Trix.SplittableList = (function(superClass) {
        var endOfRange, objectArraysAreEqual, startOfRange;

        extend(SplittableList, superClass);

        SplittableList.box = function(objects) {
          if (objects instanceof this) {
            return objects;
          } else {
            return new this(objects);
          }
        };

        function SplittableList(objects) {
          if (objects == null) {
            objects = [];
          }
          SplittableList.__super__.constructor.apply(this, arguments);
          this.objects = objects.slice(0);
          this.length = this.objects.length;
        }

        SplittableList.prototype.indexOf = function(object) {
          return this.objects.indexOf(object);
        };

        SplittableList.prototype.splice = function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return new this.constructor(spliceArray.apply(null, [this.objects].concat(slice.call(args))));
        };

        SplittableList.prototype.eachObject = function(callback) {
          var i, index, len, object, ref, results;
          ref = this.objects;
          results = [];
          for (index = i = 0, len = ref.length; i < len; index = ++i) {
            object = ref[index];
            results.push(callback(object, index));
          }
          return results;
        };

        SplittableList.prototype.insertObjectAtIndex = function(object, index) {
          return this.splice(index, 0, object);
        };

        SplittableList.prototype.insertSplittableListAtIndex = function(splittableList, index) {
          return this.splice.apply(this, [index, 0].concat(slice.call(splittableList.objects)));
        };

        SplittableList.prototype.insertSplittableListAtPosition = function(splittableList, position) {
          var index, objects, ref;
          ref = this.splitObjectAtPosition(position), objects = ref[0], index = ref[1];
          return new this.constructor(objects).insertSplittableListAtIndex(splittableList, index);
        };

        SplittableList.prototype.editObjectAtIndex = function(index, callback) {
          return this.replaceObjectAtIndex(callback(this.objects[index]), index);
        };

        SplittableList.prototype.replaceObjectAtIndex = function(object, index) {
          return this.splice(index, 1, object);
        };

        SplittableList.prototype.removeObjectAtIndex = function(index) {
          return this.splice(index, 1);
        };

        SplittableList.prototype.getObjectAtIndex = function(index) {
          return this.objects[index];
        };

        SplittableList.prototype.getSplittableListInRange = function(range) {
          var leftIndex, objects, ref, rightIndex;
          ref = this.splitObjectsAtRange(range), objects = ref[0], leftIndex = ref[1], rightIndex = ref[2];
          return new this.constructor(objects.slice(leftIndex, rightIndex + 1));
        };

        SplittableList.prototype.selectSplittableList = function(test) {
          var object, objects;
          objects = (function() {
            var i, len, ref, results;
            ref = this.objects;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              object = ref[i];
              if (test(object)) {
                results.push(object);
              }
            }
            return results;
          }).call(this);
          return new this.constructor(objects);
        };

        SplittableList.prototype.removeObjectsInRange = function(range) {
          var leftIndex, objects, ref, rightIndex;
          ref = this.splitObjectsAtRange(range), objects = ref[0], leftIndex = ref[1], rightIndex = ref[2];
          return new this.constructor(objects).splice(leftIndex, rightIndex - leftIndex + 1);
        };

        SplittableList.prototype.transformObjectsInRange = function(range, transform) {
          var index, leftIndex, object, objects, ref, rightIndex, transformedObjects;
          ref = this.splitObjectsAtRange(range), objects = ref[0], leftIndex = ref[1], rightIndex = ref[2];
          transformedObjects = (function() {
            var i, len, results;
            results = [];
            for (index = i = 0, len = objects.length; i < len; index = ++i) {
              object = objects[index];
              if ((leftIndex <= index && index <= rightIndex)) {
                results.push(transform(object));
              } else {
                results.push(object);
              }
            }
            return results;
          })();
          return new this.constructor(transformedObjects);
        };

        SplittableList.prototype.splitObjectsAtRange = function(range) {
          var leftInnerIndex, objects, offset, ref, ref1, rightOuterIndex;
          ref = this.splitObjectAtPosition(startOfRange(range)), objects = ref[0], leftInnerIndex = ref[1], offset = ref[2];
          ref1 = new this.constructor(objects).splitObjectAtPosition(endOfRange(range) + offset), objects = ref1[0], rightOuterIndex = ref1[1];
          return [objects, leftInnerIndex, rightOuterIndex - 1];
        };

        SplittableList.prototype.getObjectAtPosition = function(position) {
          var index, offset, ref;
          ref = this.findIndexAndOffsetAtPosition(position), index = ref.index, offset = ref.offset;
          return this.objects[index];
        };

        SplittableList.prototype.splitObjectAtPosition = function(position) {
          var index, leftObject, object, objects, offset, ref, ref1, rightObject, splitIndex, splitOffset;
          ref = this.findIndexAndOffsetAtPosition(position), index = ref.index, offset = ref.offset;
          objects = this.objects.slice(0);
          if (index != null) {
            if (offset === 0) {
              splitIndex = index;
              splitOffset = 0;
            } else {
              object = this.getObjectAtIndex(index);
              ref1 = object.splitAtOffset(offset), leftObject = ref1[0], rightObject = ref1[1];
              objects.splice(index, 1, leftObject, rightObject);
              splitIndex = index + 1;
              splitOffset = leftObject.getLength() - offset;
            }
          } else {
            splitIndex = objects.length;
            splitOffset = 0;
          }
          return [objects, splitIndex, splitOffset];
        };

        SplittableList.prototype.consolidate = function() {
          var i, len, object, objects, pendingObject, ref;
          objects = [];
          pendingObject = this.objects[0];
          ref = this.objects.slice(1);
          for (i = 0, len = ref.length; i < len; i++) {
            object = ref[i];
            if (typeof pendingObject.canBeConsolidatedWith === "function" ? pendingObject.canBeConsolidatedWith(object) : void 0) {
              pendingObject = pendingObject.consolidateWith(object);
            } else {
              objects.push(pendingObject);
              pendingObject = object;
            }
          }
          if (pendingObject != null) {
            objects.push(pendingObject);
          }
          return new this.constructor(objects);
        };

        SplittableList.prototype.consolidateFromIndexToIndex = function(startIndex, endIndex) {
          var consolidatedInRange, objects, objectsInRange;
          objects = this.objects.slice(0);
          objectsInRange = objects.slice(startIndex, endIndex + 1);
          consolidatedInRange = new this.constructor(objectsInRange).consolidate().toArray();
          return this.splice.apply(this, [startIndex, objectsInRange.length].concat(slice.call(consolidatedInRange)));
        };

        SplittableList.prototype.findIndexAndOffsetAtPosition = function(position) {
          var currentPosition, i, index, len, nextPosition, object, ref;
          currentPosition = 0;
          ref = this.objects;
          for (index = i = 0, len = ref.length; i < len; index = ++i) {
            object = ref[index];
            nextPosition = currentPosition + object.getLength();
            if ((currentPosition <= position && position < nextPosition)) {
              return {
                index: index,
                offset: position - currentPosition
              };
            }
            currentPosition = nextPosition;
          }
          return {
            index: null,
            offset: null
          };
        };

        SplittableList.prototype.findPositionAtIndexAndOffset = function(index, offset) {
          var currentIndex, i, len, object, position, ref;
          position = 0;
          ref = this.objects;
          for (currentIndex = i = 0, len = ref.length; i < len; currentIndex = ++i) {
            object = ref[currentIndex];
            if (currentIndex < index) {
              position += object.getLength();
            } else if (currentIndex === index) {
              position += offset;
              break;
            }
          }
          return position;
        };

        SplittableList.prototype.getEndPosition = function() {
          var object, position;
          return this.endPosition != null ? this.endPosition : this.endPosition = ((function() {
            var i, len, ref;
            position = 0;
            ref = this.objects;
            for (i = 0, len = ref.length; i < len; i++) {
              object = ref[i];
              position += object.getLength();
            }
            return position;
          }).call(this));
        };

        SplittableList.prototype.toString = function() {
          return this.objects.join("");
        };

        SplittableList.prototype.toArray = function() {
          return this.objects.slice(0);
        };

        SplittableList.prototype.toJSON = function() {
          return this.toArray();
        };

        SplittableList.prototype.isEqualTo = function(splittableList) {
          return SplittableList.__super__.isEqualTo.apply(this, arguments) || objectArraysAreEqual(this.objects, splittableList != null ? splittableList.objects : void 0);
        };

        objectArraysAreEqual = function(left, right) {
          var i, index, len, object, result;
          if (right == null) {
            right = [];
          }
          if (left.length !== right.length) {
            return false;
          }
          result = true;
          for (index = i = 0, len = left.length; i < len; index = ++i) {
            object = left[index];
            if (result && !object.isEqualTo(right[index])) {
              result = false;
            }
          }
          return result;
        };

        SplittableList.prototype.contentsForInspection = function() {
          var object;
          return {
            objects: "[" + (((function() {
              var i, len, ref, results;
              ref = this.objects;
              results = [];
              for (i = 0, len = ref.length; i < len; i++) {
                object = ref[i];
                results.push(object.inspect());
              }
              return results;
            }).call(this)).join(", ")) + "]"
          };
        };

        startOfRange = function(range) {
          return range[0];
        };

        endOfRange = function(range) {
          return range[1];
        };

        return SplittableList;

      })(Trix.Object);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.Text = (function(superClass) {
        extend(Text, superClass);

        Text.textForAttachmentWithAttributes = function(attachment, attributes) {
          var piece;
          piece = new Trix.AttachmentPiece(attachment, attributes);
          return new this([piece]);
        };

        Text.textForStringWithAttributes = function(string, attributes) {
          var piece;
          piece = new Trix.StringPiece(string, attributes);
          return new this([piece]);
        };

        Text.fromJSON = function(textJSON) {
          var pieceJSON, pieces;
          pieces = (function() {
            var i, len, results;
            results = [];
            for (i = 0, len = textJSON.length; i < len; i++) {
              pieceJSON = textJSON[i];
              results.push(Trix.Piece.fromJSON(pieceJSON));
            }
            return results;
          })();
          return new this(pieces);
        };

        function Text(pieces) {
          var piece;
          if (pieces == null) {
            pieces = [];
          }
          Text.__super__.constructor.apply(this, arguments);
          this.pieceList = new Trix.SplittableList((function() {
            var i, len, results;
            results = [];
            for (i = 0, len = pieces.length; i < len; i++) {
              piece = pieces[i];
              if (!piece.isEmpty()) {
                results.push(piece);
              }
            }
            return results;
          })());
        }

        Text.prototype.copy = function() {
          return this.copyWithPieceList(this.pieceList);
        };

        Text.prototype.copyWithPieceList = function(pieceList) {
          return new this.constructor(pieceList.consolidate().toArray());
        };

        Text.prototype.copyUsingObjectMap = function(objectMap) {
          var piece, pieces;
          pieces = (function() {
            var i, len, ref, ref1, results;
            ref = this.getPieces();
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              piece = ref[i];
              results.push((ref1 = objectMap.find(piece)) != null ? ref1 : piece);
            }
            return results;
          }).call(this);
          return new this.constructor(pieces);
        };

        Text.prototype.appendText = function(text) {
          return this.insertTextAtPosition(text, this.getLength());
        };

        Text.prototype.insertTextAtPosition = function(text, position) {
          return this.copyWithPieceList(this.pieceList.insertSplittableListAtPosition(text.pieceList, position));
        };

        Text.prototype.removeTextAtRange = function(range) {
          return this.copyWithPieceList(this.pieceList.removeObjectsInRange(range));
        };

        Text.prototype.replaceTextAtRange = function(text, range) {
          return this.removeTextAtRange(range).insertTextAtPosition(text, range[0]);
        };

        Text.prototype.moveTextFromRangeToPosition = function(range, position) {
          var length, text;
          if ((range[0] <= position && position <= range[1])) {
            return;
          }
          text = this.getTextAtRange(range);
          length = text.getLength();
          if (range[0] < position) {
            position -= length;
          }
          return this.removeTextAtRange(range).insertTextAtPosition(text, position);
        };

        Text.prototype.addAttributeAtRange = function(attribute, value, range) {
          var attributes;
          attributes = {};
          attributes[attribute] = value;
          return this.addAttributesAtRange(attributes, range);
        };

        Text.prototype.addAttributesAtRange = function(attributes, range) {
          return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range, function(piece) {
            return piece.copyWithAdditionalAttributes(attributes);
          }));
        };

        Text.prototype.removeAttributeAtRange = function(attribute, range) {
          return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range, function(piece) {
            return piece.copyWithoutAttribute(attribute);
          }));
        };

        Text.prototype.setAttributesAtRange = function(attributes, range) {
          return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range, function(piece) {
            return piece.copyWithAttributes(attributes);
          }));
        };

        Text.prototype.getAttributesAtPosition = function(position) {
          var ref, ref1;
          return (ref = (ref1 = this.pieceList.getObjectAtPosition(position)) != null ? ref1.getAttributes() : void 0) != null ? ref : {};
        };

        Text.prototype.getCommonAttributes = function() {
          var objects, piece;
          objects = (function() {
            var i, len, ref, results;
            ref = this.pieceList.toArray();
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              piece = ref[i];
              results.push(piece.getAttributes());
            }
            return results;
          }).call(this);
          return Trix.Hash.fromCommonAttributesOfObjects(objects).toObject();
        };

        Text.prototype.getCommonAttributesAtRange = function(range) {
          var ref;
          return (ref = this.getTextAtRange(range).getCommonAttributes()) != null ? ref : {};
        };

        Text.prototype.getExpandedRangeForAttributeAtOffset = function(attributeName, offset) {
          var left, length, right;
          left = right = offset;
          length = this.getLength();
          while (left > 0 && this.getCommonAttributesAtRange([left - 1, right])[attributeName]) {
            left--;
          }
          while (right < length && this.getCommonAttributesAtRange([offset, right + 1])[attributeName]) {
            right++;
          }
          return [left, right];
        };

        Text.prototype.getTextAtRange = function(range) {
          return this.copyWithPieceList(this.pieceList.getSplittableListInRange(range));
        };

        Text.prototype.getStringAtRange = function(range) {
          return this.pieceList.getSplittableListInRange(range).toString();
        };

        Text.prototype.getStringAtPosition = function(position) {
          return this.getStringAtRange([position, position + 1]);
        };

        Text.prototype.startsWithString = function(string) {
          return this.getStringAtRange([0, string.length]) === string;
        };

        Text.prototype.endsWithString = function(string) {
          var length;
          length = this.getLength();
          return this.getStringAtRange([length - string.length, length]) === string;
        };

        Text.prototype.getAttachmentPieces = function() {
          var i, len, piece, ref, results;
          ref = this.pieceList.toArray();
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            piece = ref[i];
            if (piece.attachment != null) {
              results.push(piece);
            }
          }
          return results;
        };

        Text.prototype.getAttachments = function() {
          var i, len, piece, ref, results;
          ref = this.getAttachmentPieces();
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            piece = ref[i];
            results.push(piece.attachment);
          }
          return results;
        };

        Text.prototype.getAttachmentAndPositionById = function(attachmentId) {
          var i, len, piece, position, ref, ref1;
          position = 0;
          ref = this.pieceList.toArray();
          for (i = 0, len = ref.length; i < len; i++) {
            piece = ref[i];
            if (((ref1 = piece.attachment) != null ? ref1.id : void 0) === attachmentId) {
              return {
                attachment: piece.attachment,
                position: position
              };
            }
            position += piece.length;
          }
          return {
            attachment: null,
            position: null
          };
        };

        Text.prototype.getAttachmentById = function(attachmentId) {
          var attachment, position, ref;
          ref = this.getAttachmentAndPositionById(attachmentId), attachment = ref.attachment, position = ref.position;
          return attachment;
        };

        Text.prototype.getRangeOfAttachment = function(attachment) {
          var position, ref;
          ref = this.getAttachmentAndPositionById(attachment.id), attachment = ref.attachment, position = ref.position;
          if (attachment != null) {
            return [position, position + 1];
          }
        };

        Text.prototype.updateAttributesForAttachment = function(attributes, attachment) {
          var range;
          if (range = this.getRangeOfAttachment(attachment)) {
            return this.addAttributesAtRange(attributes, range);
          } else {
            return this;
          }
        };

        Text.prototype.getLength = function() {
          return this.pieceList.getEndPosition();
        };

        Text.prototype.isEmpty = function() {
          return this.getLength() === 0;
        };

        Text.prototype.isEqualTo = function(text) {
          var ref;
          return Text.__super__.isEqualTo.apply(this, arguments) || (text != null ? (ref = text.pieceList) != null ? ref.isEqualTo(this.pieceList) : void 0 : void 0);
        };

        Text.prototype.isBlockBreak = function() {
          return this.getLength() === 1 && this.pieceList.getObjectAtIndex(0).isBlockBreak();
        };

        Text.prototype.eachPiece = function(callback) {
          return this.pieceList.eachObject(callback);
        };

        Text.prototype.getPieces = function() {
          return this.pieceList.toArray();
        };

        Text.prototype.getPieceAtPosition = function(position) {
          return this.pieceList.getObjectAtPosition(position);
        };

        Text.prototype.contentsForInspection = function() {
          return {
            pieceList: this.pieceList.inspect()
          };
        };

        Text.prototype.toSerializableText = function() {
          var pieceList;
          pieceList = this.pieceList.selectSplittableList(function(piece) {
            return piece.isSerializable();
          });
          return this.copyWithPieceList(pieceList);
        };

        Text.prototype.toString = function() {
          return this.pieceList.toString();
        };

        Text.prototype.toJSON = function() {
          return this.pieceList.toJSON();
        };

        Text.prototype.toConsole = function() {
          var piece;
          return JSON.stringify((function() {
            var i, len, ref, results;
            ref = this.pieceList.toArray();
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              piece = ref[i];
              results.push(JSON.parse(piece.toConsole()));
            }
            return results;
          }).call(this));
        };

        return Text;

      })(Trix.Object);

    }).call(this);
    (function() {
      var arraysAreEqual, getBlockAttributeNames, getBlockConfig, getListAttributeNames, spliceArray,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        slice = [].slice,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      arraysAreEqual = Trix.arraysAreEqual, spliceArray = Trix.spliceArray, getBlockConfig = Trix.getBlockConfig, getBlockAttributeNames = Trix.getBlockAttributeNames, getListAttributeNames = Trix.getListAttributeNames;

      Trix.Block = (function(superClass) {
        var addBlockBreakToText, applyBlockBreakToText, blockBreakText, expandAttribute, getLastElement, removeLastValue, textEndsInBlockBreak, unmarkBlockBreakPiece, unmarkExistingInnerBlockBreaksInText;

        extend(Block, superClass);

        Block.fromJSON = function(blockJSON) {
          var text;
          text = Trix.Text.fromJSON(blockJSON.text);
          return new this(text, blockJSON.attributes);
        };

        function Block(text, attributes) {
          if (text == null) {
            text = new Trix.Text;
          }
          if (attributes == null) {
            attributes = [];
          }
          Block.__super__.constructor.apply(this, arguments);
          this.text = applyBlockBreakToText(text);
          this.attributes = attributes;
        }

        Block.prototype.isEmpty = function() {
          return this.text.isBlockBreak();
        };

        Block.prototype.isEqualTo = function(block) {
          return Block.__super__.isEqualTo.apply(this, arguments) || (this.text.isEqualTo(block != null ? block.text : void 0) && arraysAreEqual(this.attributes, block != null ? block.attributes : void 0));
        };

        Block.prototype.copyWithText = function(text) {
          return new this.constructor(text, this.attributes);
        };

        Block.prototype.copyWithoutText = function() {
          return this.copyWithText(null);
        };

        Block.prototype.copyWithAttributes = function(attributes) {
          return new this.constructor(this.text, attributes);
        };

        Block.prototype.copyUsingObjectMap = function(objectMap) {
          var mappedText;
          if (mappedText = objectMap.find(this.text)) {
            return this.copyWithText(mappedText);
          } else {
            return this.copyWithText(this.text.copyUsingObjectMap(objectMap));
          }
        };

        Block.prototype.addAttribute = function(attribute) {
          var attributes;
          attributes = this.attributes.concat(expandAttribute(attribute));
          return this.copyWithAttributes(attributes);
        };

        Block.prototype.removeAttribute = function(attribute) {
          var attributes, listAttribute;
          listAttribute = getBlockConfig(attribute).listAttribute;
          attributes = removeLastValue(removeLastValue(this.attributes, attribute), listAttribute);
          return this.copyWithAttributes(attributes);
        };

        Block.prototype.removeLastAttribute = function() {
          return this.removeAttribute(this.getLastAttribute());
        };

        Block.prototype.getLastAttribute = function() {
          return getLastElement(this.attributes);
        };

        Block.prototype.getAttributes = function() {
          return this.attributes.slice(0);
        };

        Block.prototype.getAttributeLevel = function() {
          return this.attributes.length;
        };

        Block.prototype.getAttributeAtLevel = function(level) {
          return this.attributes[level - 1];
        };

        Block.prototype.hasAttributes = function() {
          return this.getAttributeLevel() > 0;
        };

        Block.prototype.getLastNestableAttribute = function() {
          return getLastElement(this.getNestableAttributes());
        };

        Block.prototype.getNestableAttributes = function() {
          var attribute, i, len, ref, results;
          ref = this.attributes;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            attribute = ref[i];
            if (getBlockConfig(attribute).nestable) {
              results.push(attribute);
            }
          }
          return results;
        };

        Block.prototype.getNestingLevel = function() {
          return this.getNestableAttributes().length;
        };

        Block.prototype.decreaseNestingLevel = function() {
          var attribute;
          if (attribute = this.getLastNestableAttribute()) {
            return this.removeAttribute(attribute);
          } else {
            return this;
          }
        };

        Block.prototype.increaseNestingLevel = function() {
          var attribute, attributes, index;
          if (attribute = this.getLastNestableAttribute()) {
            index = this.attributes.lastIndexOf(attribute);
            attributes = spliceArray.apply(null, [this.attributes, index + 1, 0].concat(slice.call(expandAttribute(attribute))));
            return this.copyWithAttributes(attributes);
          } else {
            return this;
          }
        };

        Block.prototype.getListItemAttributes = function() {
          var attribute, i, len, ref, results;
          ref = this.attributes;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            attribute = ref[i];
            if (getBlockConfig(attribute).listAttribute) {
              results.push(attribute);
            }
          }
          return results;
        };

        Block.prototype.isListItem = function() {
          var ref;
          return (ref = getBlockConfig(this.getLastAttribute())) != null ? ref.listAttribute : void 0;
        };

        Block.prototype.isTerminalBlock = function() {
          var ref;
          return (ref = getBlockConfig(this.getLastAttribute())) != null ? ref.terminal : void 0;
        };

        Block.prototype.breaksOnReturn = function() {
          var ref;
          return (ref = getBlockConfig(this.getLastAttribute())) != null ? ref.breakOnReturn : void 0;
        };

        Block.prototype.findLineBreakInDirectionFromPosition = function(direction, position) {
          var result, string;
          string = this.toString();
          result = (function() {
            switch (direction) {
              case "forward":
                return string.indexOf("\n", position);
              case "backward":
                return string.slice(0, position).lastIndexOf("\n");
            }
          })();
          if (result !== -1) {
            return result;
          }
        };

        Block.prototype.contentsForInspection = function() {
          return {
            text: this.text.inspect(),
            attributes: this.attributes
          };
        };

        Block.prototype.toString = function() {
          return this.text.toString();
        };

        Block.prototype.toJSON = function() {
          return {
            text: this.text,
            attributes: this.attributes
          };
        };

        Block.prototype.getLength = function() {
          return this.text.getLength();
        };

        Block.prototype.canBeConsolidatedWith = function(block) {
          return !this.hasAttributes() && !block.hasAttributes();
        };

        Block.prototype.consolidateWith = function(block) {
          var newlineText, text;
          newlineText = Trix.Text.textForStringWithAttributes("\n");
          text = this.getTextWithoutBlockBreak().appendText(newlineText);
          return this.copyWithText(text.appendText(block.text));
        };

        Block.prototype.splitAtOffset = function(offset) {
          var left, right;
          if (offset === 0) {
            left = null;
            right = this;
          } else if (offset === this.getLength()) {
            left = this;
            right = null;
          } else {
            left = this.copyWithText(this.text.getTextAtRange([0, offset]));
            right = this.copyWithText(this.text.getTextAtRange([offset, this.getLength()]));
          }
          return [left, right];
        };

        Block.prototype.getBlockBreakPosition = function() {
          return this.text.getLength() - 1;
        };

        Block.prototype.getTextWithoutBlockBreak = function() {
          if (textEndsInBlockBreak(this.text)) {
            return this.text.getTextAtRange([0, this.getBlockBreakPosition()]);
          } else {
            return this.text.copy();
          }
        };

        Block.prototype.canBeGrouped = function(depth) {
          return this.attributes[depth];
        };

        Block.prototype.canBeGroupedWith = function(otherBlock, depth) {
          var attribute, otherAttribute, otherAttributes, ref;
          otherAttributes = otherBlock.getAttributes();
          otherAttribute = otherAttributes[depth];
          attribute = this.attributes[depth];
          return attribute === otherAttribute && !(getBlockConfig(attribute).group === false && (ref = otherAttributes[depth + 1], indexOf.call(getListAttributeNames(), ref) < 0));
        };

        applyBlockBreakToText = function(text) {
          text = unmarkExistingInnerBlockBreaksInText(text);
          text = addBlockBreakToText(text);
          return text;
        };

        unmarkExistingInnerBlockBreaksInText = function(text) {
          var i, innerPieces, lastPiece, modified, piece, ref;
          modified = false;
          ref = text.getPieces(), innerPieces = 2 <= ref.length ? slice.call(ref, 0, i = ref.length - 1) : (i = 0, []), lastPiece = ref[i++];
          if (lastPiece == null) {
            return text;
          }
          innerPieces = (function() {
            var j, len, results;
            results = [];
            for (j = 0, len = innerPieces.length; j < len; j++) {
              piece = innerPieces[j];
              if (piece.isBlockBreak()) {
                modified = true;
                results.push(unmarkBlockBreakPiece(piece));
              } else {
                results.push(piece);
              }
            }
            return results;
          })();
          if (modified) {
            return new Trix.Text(slice.call(innerPieces).concat([lastPiece]));
          } else {
            return text;
          }
        };

        blockBreakText = Trix.Text.textForStringWithAttributes("\n", {
          blockBreak: true
        });

        addBlockBreakToText = function(text) {
          if (textEndsInBlockBreak(text)) {
            return text;
          } else {
            return text.appendText(blockBreakText);
          }
        };

        textEndsInBlockBreak = function(text) {
          var endText, length;
          length = text.getLength();
          if (length === 0) {
            return false;
          }
          endText = text.getTextAtRange([length - 1, length]);
          return endText.isBlockBreak();
        };

        unmarkBlockBreakPiece = function(piece) {
          return piece.copyWithoutAttribute("blockBreak");
        };

        expandAttribute = function(attribute) {
          var listAttribute;
          listAttribute = getBlockConfig(attribute).listAttribute;
          if (listAttribute != null) {
            return [listAttribute, attribute];
          } else {
            return [attribute];
          }
        };

        getLastElement = function(array) {
          return array.slice(-1)[0];
        };

        removeLastValue = function(array, value) {
          var index;
          index = array.lastIndexOf(value);
          if (index === -1) {
            return array;
          } else {
            return spliceArray(array, index, 1);
          }
        };

        return Block;

      })(Trix.Object);

    }).call(this);
    (function() {
      var nodeIsAttachmentElement, tagName, walkTree,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        slice = [].slice,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      tagName = Trix.tagName, walkTree = Trix.walkTree, nodeIsAttachmentElement = Trix.nodeIsAttachmentElement;

      Trix.HTMLSanitizer = (function(superClass) {
        var DEFAULT_ALLOWED_ATTRIBUTES, createBodyElementForHTML, elementIsRemovable;

        extend(HTMLSanitizer, superClass);

        DEFAULT_ALLOWED_ATTRIBUTES = "style href src width height class".split(" ");

        HTMLSanitizer.sanitize = function(html, options) {
          var sanitizer;
          sanitizer = new this(html, options);
          sanitizer.sanitize();
          return sanitizer;
        };

        function HTMLSanitizer(html, arg) {
          this.allowedAttributes = (arg != null ? arg : {}).allowedAttributes;
          if (this.allowedAttributes == null) {
            this.allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES;
          }
          this.body = createBodyElementForHTML(html);
        }

        HTMLSanitizer.prototype.sanitize = function() {
          return this.sanitizeElements();
        };

        HTMLSanitizer.prototype.getHTML = function() {
          return this.body.innerHTML;
        };

        HTMLSanitizer.prototype.getBody = function() {
          return this.body;
        };

        HTMLSanitizer.prototype.sanitizeElements = function() {
          var i, len, node, nodesToRemove, walker;
          walker = walkTree(this.body);
          nodesToRemove = [];
          while (walker.nextNode()) {
            node = walker.currentNode;
            switch (node.nodeType) {
              case Node.ELEMENT_NODE:
                if (elementIsRemovable(node)) {
                  nodesToRemove.push(node);
                } else {
                  this.sanitizeElement(node);
                }
                break;
              case Node.COMMENT_NODE:
                nodesToRemove.push(node);
            }
          }
          for (i = 0, len = nodesToRemove.length; i < len; i++) {
            node = nodesToRemove[i];
            node.parentNode.removeChild(node);
          }
          return this.body;
        };

        HTMLSanitizer.prototype.sanitizeElement = function(element) {
          var i, len, name, ref;
          ref = slice.call(element.attributes);
          for (i = 0, len = ref.length; i < len; i++) {
            name = ref[i].name;
            if (!(indexOf.call(this.allowedAttributes, name) >= 0 || name.indexOf("data-trix") === 0)) {
              element.removeAttribute(name);
            }
          }
          return element;
        };

        elementIsRemovable = function(element) {
          if ((element != null ? element.nodeType : void 0) !== Node.ELEMENT_NODE) {
            return;
          }
          if (nodeIsAttachmentElement(element)) {
            return;
          }
          return tagName(element) === "script" || element.getAttribute("data-trix-serialize") === "false";
        };

        createBodyElementForHTML = function(html) {
          var doc, element, i, len, ref;
          if (html == null) {
            html = "";
          }
          html = html.replace(/<\/html[^>]*>[^]*$/i, "</html>");
          doc = document.implementation.createHTMLDocument("");
          doc.documentElement.innerHTML = html;
          ref = doc.head.querySelectorAll("style");
          for (i = 0, len = ref.length; i < len; i++) {
            element = ref[i];
            doc.body.appendChild(element);
          }
          return doc.body;
        };

        return HTMLSanitizer;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var arraysAreEqual, breakableWhitespacePattern, elementContainsNode, findClosestElementFromNode, getBlockTagNames, makeElement, nodeIsAttachmentElement, normalizeSpaces, squishBreakableWhitespace, tagName, walkTree,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      arraysAreEqual = Trix.arraysAreEqual, makeElement = Trix.makeElement, tagName = Trix.tagName, getBlockTagNames = Trix.getBlockTagNames, walkTree = Trix.walkTree, findClosestElementFromNode = Trix.findClosestElementFromNode, elementContainsNode = Trix.elementContainsNode, nodeIsAttachmentElement = Trix.nodeIsAttachmentElement, normalizeSpaces = Trix.normalizeSpaces, breakableWhitespacePattern = Trix.breakableWhitespacePattern, squishBreakableWhitespace = Trix.squishBreakableWhitespace;

      Trix.HTMLParser = (function(superClass) {
        var blockForAttributes, elementCanDisplayPreformattedText, getAttachmentAttributes, getBlockElementMargin, getImageDimensions, leftTrimBreakableWhitespace, nodeEndsWithNonWhitespace, nodeFilter, pieceForAttachment, pieceForString, stringEndsWithWhitespace, stringIsAllBreakableWhitespace;

        extend(HTMLParser, superClass);

        HTMLParser.parse = function(html, options) {
          var parser;
          parser = new this(html, options);
          parser.parse();
          return parser;
        };

        function HTMLParser(html1, arg) {
          this.html = html1;
          this.referenceElement = (arg != null ? arg : {}).referenceElement;
          this.blocks = [];
          this.blockElements = [];
          this.processedElements = [];
        }

        HTMLParser.prototype.getDocument = function() {
          return Trix.Document.fromJSON(this.blocks);
        };

        HTMLParser.prototype.parse = function() {
          var html, walker;
          try {
            this.createHiddenContainer();
            html = Trix.HTMLSanitizer.sanitize(this.html).getHTML();
            this.containerElement.innerHTML = html;
            walker = walkTree(this.containerElement, {
              usingFilter: nodeFilter
            });
            while (walker.nextNode()) {
              this.processNode(walker.currentNode);
            }
            return this.translateBlockElementMarginsToNewlines();
          } finally {
            this.removeHiddenContainer();
          }
        };

        HTMLParser.prototype.createHiddenContainer = function() {
          if (this.referenceElement) {
            this.containerElement = this.referenceElement.cloneNode(false);
            this.containerElement.removeAttribute("id");
            this.containerElement.setAttribute("data-trix-internal", "");
            this.containerElement.style.display = "none";
            return this.referenceElement.parentNode.insertBefore(this.containerElement, this.referenceElement.nextSibling);
          } else {
            this.containerElement = makeElement({
              tagName: "div",
              style: {
                display: "none"
              }
            });
            return document.body.appendChild(this.containerElement);
          }
        };

        HTMLParser.prototype.removeHiddenContainer = function() {
          return this.containerElement.parentNode.removeChild(this.containerElement);
        };

        nodeFilter = function(node) {
          if (tagName(node) === "style") {
            return NodeFilter.FILTER_REJECT;
          } else {
            return NodeFilter.FILTER_ACCEPT;
          }
        };

        HTMLParser.prototype.processNode = function(node) {
          switch (node.nodeType) {
            case Node.TEXT_NODE:
              return this.processTextNode(node);
            case Node.ELEMENT_NODE:
              this.appendBlockForElement(node);
              return this.processElement(node);
          }
        };

        HTMLParser.prototype.appendBlockForElement = function(element) {
          var attributes, currentBlockContainsElement, elementIsBlockElement, parentBlockElement;
          elementIsBlockElement = this.isBlockElement(element);
          currentBlockContainsElement = elementContainsNode(this.currentBlockElement, element);
          if (elementIsBlockElement && !this.isBlockElement(element.firstChild)) {
            if (!(this.isInsignificantTextNode(element.firstChild) && this.isBlockElement(element.firstElementChild))) {
              attributes = this.getBlockAttributes(element);
              if (!(currentBlockContainsElement && arraysAreEqual(attributes, this.currentBlock.attributes))) {
                this.currentBlock = this.appendBlockForAttributesWithElement(attributes, element);
                return this.currentBlockElement = element;
              }
            }
          } else if (this.currentBlockElement && !currentBlockContainsElement && !elementIsBlockElement) {
            if (parentBlockElement = this.findParentBlockElement(element)) {
              return this.appendBlockForElement(parentBlockElement);
            } else {
              this.currentBlock = this.appendEmptyBlock();
              return this.currentBlockElement = null;
            }
          }
        };

        HTMLParser.prototype.findParentBlockElement = function(element) {
          var parentElement;
          parentElement = element.parentElement;
          while (parentElement && parentElement !== this.containerElement) {
            if (this.isBlockElement(parentElement) && indexOf.call(this.blockElements, parentElement) >= 0) {
              return parentElement;
            } else {
              parentElement = parentElement.parentElement;
            }
          }
          return null;
        };

        HTMLParser.prototype.processTextNode = function(node) {
          var ref, string;
          if (!this.isInsignificantTextNode(node)) {
            string = node.data;
            if (!elementCanDisplayPreformattedText(node.parentNode)) {
              string = squishBreakableWhitespace(string);
              if (stringEndsWithWhitespace((ref = node.previousSibling) != null ? ref.textContent : void 0)) {
                string = leftTrimBreakableWhitespace(string);
              }
            }
            return this.appendStringWithAttributes(string, this.getTextAttributes(node.parentNode));
          }
        };

        HTMLParser.prototype.processElement = function(element) {
          var attributes, key, ref, textAttributes, value;
          if (nodeIsAttachmentElement(element)) {
            attributes = getAttachmentAttributes(element);
            if (Object.keys(attributes).length) {
              textAttributes = this.getTextAttributes(element);
              this.appendAttachmentWithAttributes(attributes, textAttributes);
              element.innerHTML = "";
            }
            return this.processedElements.push(element);
          } else {
            switch (tagName(element)) {
              case "br":
                if (!(this.isExtraBR(element) || this.isBlockElement(element.nextSibling))) {
                  this.appendStringWithAttributes("\n", this.getTextAttributes(element));
                }
                return this.processedElements.push(element);
              case "img":
                attributes = {
                  url: element.getAttribute("src"),
                  contentType: "image"
                };
                ref = getImageDimensions(element);
                for (key in ref) {
                  value = ref[key];
                  attributes[key] = value;
                }
                this.appendAttachmentWithAttributes(attributes, this.getTextAttributes(element));
                return this.processedElements.push(element);
              case "tr":
                if (element.parentNode.firstChild !== element) {
                  return this.appendStringWithAttributes("\n");
                }
                break;
              case "td":
                if (element.parentNode.firstChild !== element) {
                  return this.appendStringWithAttributes(" | ");
                }
            }
          }
        };

        HTMLParser.prototype.appendBlockForAttributesWithElement = function(attributes, element) {
          var block;
          this.blockElements.push(element);
          block = blockForAttributes(attributes);
          this.blocks.push(block);
          return block;
        };

        HTMLParser.prototype.appendEmptyBlock = function() {
          return this.appendBlockForAttributesWithElement([], null);
        };

        HTMLParser.prototype.appendStringWithAttributes = function(string, attributes) {
          return this.appendPiece(pieceForString(string, attributes));
        };

        HTMLParser.prototype.appendAttachmentWithAttributes = function(attachment, attributes) {
          return this.appendPiece(pieceForAttachment(attachment, attributes));
        };

        HTMLParser.prototype.appendPiece = function(piece) {
          if (this.blocks.length === 0) {
            this.appendEmptyBlock();
          }
          return this.blocks[this.blocks.length - 1].text.push(piece);
        };

        HTMLParser.prototype.appendStringToTextAtIndex = function(string, index) {
          var piece, text;
          text = this.blocks[index].text;
          piece = text[text.length - 1];
          if ((piece != null ? piece.type : void 0) === "string") {
            return piece.string += string;
          } else {
            return text.push(pieceForString(string));
          }
        };

        HTMLParser.prototype.prependStringToTextAtIndex = function(string, index) {
          var piece, text;
          text = this.blocks[index].text;
          piece = text[0];
          if ((piece != null ? piece.type : void 0) === "string") {
            return piece.string = string + piece.string;
          } else {
            return text.unshift(pieceForString(string));
          }
        };

        pieceForString = function(string, attributes) {
          var type;
          if (attributes == null) {
            attributes = {};
          }
          type = "string";
          string = normalizeSpaces(string);
          return {
            string: string,
            attributes: attributes,
            type: type
          };
        };

        pieceForAttachment = function(attachment, attributes) {
          var type;
          if (attributes == null) {
            attributes = {};
          }
          type = "attachment";
          return {
            attachment: attachment,
            attributes: attributes,
            type: type
          };
        };

        blockForAttributes = function(attributes) {
          var text;
          if (attributes == null) {
            attributes = {};
          }
          text = [];
          return {
            text: text,
            attributes: attributes
          };
        };

        HTMLParser.prototype.getTextAttributes = function(element) {
          var attribute, attributeInheritedFromBlock, attributes, blockElement, config, i, json, key, len, ref, ref1, ref2, value;
          attributes = {};
          ref = Trix.config.textAttributes;
          for (attribute in ref) {
            config = ref[attribute];
            if (config.tagName && findClosestElementFromNode(element, {
              matchingSelector: config.tagName,
              untilNode: this.containerElement
            })) {
              attributes[attribute] = true;
            } else if (config.parser) {
              if (value = config.parser(element)) {
                attributeInheritedFromBlock = false;
                ref1 = this.findBlockElementAncestors(element);
                for (i = 0, len = ref1.length; i < len; i++) {
                  blockElement = ref1[i];
                  if (config.parser(blockElement) === value) {
                    attributeInheritedFromBlock = true;
                    break;
                  }
                }
                if (!attributeInheritedFromBlock) {
                  attributes[attribute] = value;
                }
              }
            } else if (config.styleProperty) {
              if (value = element.style[config.styleProperty]) {
                attributes[attribute] = value;
              }
            }
          }
          if (nodeIsAttachmentElement(element)) {
            if (json = element.getAttribute("data-trix-attributes")) {
              ref2 = JSON.parse(json);
              for (key in ref2) {
                value = ref2[key];
                attributes[key] = value;
              }
            }
          }
          return attributes;
        };

        HTMLParser.prototype.getBlockAttributes = function(element) {
          var attribute, attributes, config, ref;
          attributes = [];
          while (element && element !== this.containerElement) {
            ref = Trix.config.blockAttributes;
            for (attribute in ref) {
              config = ref[attribute];
              if (config.parse !== false) {
                if (tagName(element) === config.tagName) {
                  if ((typeof config.test === "function" ? config.test(element) : void 0) || !config.test) {
                    attributes.push(attribute);
                    if (config.listAttribute) {
                      attributes.push(config.listAttribute);
                    }
                  }
                }
              }
            }
            element = element.parentNode;
          }
          return attributes.reverse();
        };

        HTMLParser.prototype.findBlockElementAncestors = function(element) {
          var ancestors, ref;
          ancestors = [];
          while (element && element !== this.containerElement) {
            if (ref = tagName(element), indexOf.call(getBlockTagNames(), ref) >= 0) {
              ancestors.push(element);
            }
            element = element.parentNode;
          }
          return ancestors;
        };

        getAttachmentAttributes = function(element) {
          return JSON.parse(element.getAttribute("data-trix-attachment"));
        };

        getImageDimensions = function(element) {
          var dimensions, height, width;
          width = element.getAttribute("width");
          height = element.getAttribute("height");
          dimensions = {};
          if (width) {
            dimensions.width = parseInt(width, 10);
          }
          if (height) {
            dimensions.height = parseInt(height, 10);
          }
          return dimensions;
        };

        HTMLParser.prototype.isBlockElement = function(element) {
          var ref;
          if ((element != null ? element.nodeType : void 0) !== Node.ELEMENT_NODE) {
            return;
          }
          if (findClosestElementFromNode(element, {
            matchingSelector: "td",
            untilNode: this.containerElement
          })) {
            return;
          }
          return (ref = tagName(element), indexOf.call(getBlockTagNames(), ref) >= 0) || window.getComputedStyle(element).display === "block";
        };

        HTMLParser.prototype.isInsignificantTextNode = function(node) {
          var nextSibling, parentNode, previousSibling;
          if ((node != null ? node.nodeType : void 0) !== Node.TEXT_NODE) {
            return;
          }
          if (!stringIsAllBreakableWhitespace(node.data)) {
            return;
          }
          parentNode = node.parentNode, previousSibling = node.previousSibling, nextSibling = node.nextSibling;
          if (nodeEndsWithNonWhitespace(parentNode.previousSibling) && !this.isBlockElement(parentNode.previousSibling)) {
            return;
          }
          if (elementCanDisplayPreformattedText(parentNode)) {
            return;
          }
          return !previousSibling || this.isBlockElement(previousSibling) || !nextSibling || this.isBlockElement(nextSibling);
        };

        HTMLParser.prototype.isExtraBR = function(element) {
          return tagName(element) === "br" && this.isBlockElement(element.parentNode) && element.parentNode.lastChild === element;
        };

        elementCanDisplayPreformattedText = function(element) {
          var whiteSpace;
          whiteSpace = window.getComputedStyle(element).whiteSpace;
          return whiteSpace === "pre" || whiteSpace === "pre-wrap" || whiteSpace === "pre-line";
        };

        nodeEndsWithNonWhitespace = function(node) {
          return node && !stringEndsWithWhitespace(node.textContent);
        };

        HTMLParser.prototype.translateBlockElementMarginsToNewlines = function() {
          var block, defaultMargin, i, index, len, margin, ref, results;
          defaultMargin = this.getMarginOfDefaultBlockElement();
          ref = this.blocks;
          results = [];
          for (index = i = 0, len = ref.length; i < len; index = ++i) {
            block = ref[index];
            if (!(margin = this.getMarginOfBlockElementAtIndex(index))) {
              continue;
            }
            if (margin.top > defaultMargin.top * 2) {
              this.prependStringToTextAtIndex("\n", index);
            }
            if (margin.bottom > defaultMargin.bottom * 2) {
              results.push(this.appendStringToTextAtIndex("\n", index));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };

        HTMLParser.prototype.getMarginOfBlockElementAtIndex = function(index) {
          var element, ref;
          if (element = this.blockElements[index]) {
            if (element.textContent) {
              if (!((ref = tagName(element), indexOf.call(getBlockTagNames(), ref) >= 0) || indexOf.call(this.processedElements, element) >= 0)) {
                return getBlockElementMargin(element);
              }
            }
          }
        };

        HTMLParser.prototype.getMarginOfDefaultBlockElement = function() {
          var element;
          element = makeElement(Trix.config.blockAttributes["default"].tagName);
          this.containerElement.appendChild(element);
          return getBlockElementMargin(element);
        };

        getBlockElementMargin = function(element) {
          var style;
          style = window.getComputedStyle(element);
          if (style.display === "block") {
            return {
              top: parseInt(style.marginTop),
              bottom: parseInt(style.marginBottom)
            };
          }
        };

        leftTrimBreakableWhitespace = function(string) {
          return string.replace(RegExp("^" + breakableWhitespacePattern.source + "+"), "");
        };

        stringIsAllBreakableWhitespace = function(string) {
          return RegExp("^" + breakableWhitespacePattern.source + "*$").test(string);
        };

        stringEndsWithWhitespace = function(string) {
          return /\s$/.test(string);
        };

        return HTMLParser;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var arraysAreEqual, getBlockConfig, normalizeRange, rangeIsCollapsed,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        slice = [].slice,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      arraysAreEqual = Trix.arraysAreEqual, normalizeRange = Trix.normalizeRange, rangeIsCollapsed = Trix.rangeIsCollapsed, getBlockConfig = Trix.getBlockConfig;

      Trix.Document = (function(superClass) {
        var attributesForBlock;

        extend(Document, superClass);

        Document.fromJSON = function(documentJSON) {
          var blockJSON, blocks;
          blocks = (function() {
            var i, len, results;
            results = [];
            for (i = 0, len = documentJSON.length; i < len; i++) {
              blockJSON = documentJSON[i];
              results.push(Trix.Block.fromJSON(blockJSON));
            }
            return results;
          })();
          return new this(blocks);
        };

        Document.fromHTML = function(html, options) {
          return Trix.HTMLParser.parse(html, options).getDocument();
        };

        Document.fromString = function(string, textAttributes) {
          var text;
          text = Trix.Text.textForStringWithAttributes(string, textAttributes);
          return new this([new Trix.Block(text)]);
        };

        function Document(blocks) {
          if (blocks == null) {
            blocks = [];
          }
          Document.__super__.constructor.apply(this, arguments);
          if (blocks.length === 0) {
            blocks = [new Trix.Block];
          }
          this.blockList = Trix.SplittableList.box(blocks);
        }

        Document.prototype.isEmpty = function() {
          var block;
          return this.blockList.length === 1 && (block = this.getBlockAtIndex(0), block.isEmpty() && !block.hasAttributes());
        };

        Document.prototype.copy = function(options) {
          var blocks;
          if (options == null) {
            options = {};
          }
          blocks = options.consolidateBlocks ? this.blockList.consolidate().toArray() : this.blockList.toArray();
          return new this.constructor(blocks);
        };

        Document.prototype.copyUsingObjectsFromDocument = function(sourceDocument) {
          var objectMap;
          objectMap = new Trix.ObjectMap(sourceDocument.getObjects());
          return this.copyUsingObjectMap(objectMap);
        };

        Document.prototype.copyUsingObjectMap = function(objectMap) {
          var block, blocks, mappedBlock;
          blocks = (function() {
            var i, len, ref, results;
            ref = this.getBlocks();
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              block = ref[i];
              if (mappedBlock = objectMap.find(block)) {
                results.push(mappedBlock);
              } else {
                results.push(block.copyUsingObjectMap(objectMap));
              }
            }
            return results;
          }).call(this);
          return new this.constructor(blocks);
        };

        Document.prototype.copyWithBaseBlockAttributes = function(blockAttributes) {
          var attributes, block, blocks;
          if (blockAttributes == null) {
            blockAttributes = [];
          }
          blocks = (function() {
            var i, len, ref, results;
            ref = this.getBlocks();
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              block = ref[i];
              attributes = blockAttributes.concat(block.getAttributes());
              results.push(block.copyWithAttributes(attributes));
            }
            return results;
          }).call(this);
          return new this.constructor(blocks);
        };

        Document.prototype.replaceBlock = function(oldBlock, newBlock) {
          var index;
          index = this.blockList.indexOf(oldBlock);
          if (index === -1) {
            return this;
          }
          return new this.constructor(this.blockList.replaceObjectAtIndex(newBlock, index));
        };

        Document.prototype.insertDocumentAtRange = function(document, range) {
          var block, blockList, index, offset, position, ref, result;
          blockList = document.blockList;
          position = (range = normalizeRange(range))[0];
          ref = this.locationFromPosition(position), index = ref.index, offset = ref.offset;
          result = this;
          block = this.getBlockAtPosition(position);
          if (rangeIsCollapsed(range) && block.isEmpty() && !block.hasAttributes()) {
            result = new this.constructor(result.blockList.removeObjectAtIndex(index));
          } else if (block.getBlockBreakPosition() === offset) {
            position++;
          }
          result = result.removeTextAtRange(range);
          return new this.constructor(result.blockList.insertSplittableListAtPosition(blockList, position));
        };

        Document.prototype.mergeDocumentAtRange = function(document, range) {
          var baseBlockAttributes, blockAttributes, blockCount, firstBlock, firstText, formattedDocument, leadingBlockAttributes, position, result, startLocation, startPosition, trailingBlockAttributes;
          startPosition = (range = normalizeRange(range))[0];
          startLocation = this.locationFromPosition(startPosition);
          blockAttributes = this.getBlockAtIndex(startLocation.index).getAttributes();
          baseBlockAttributes = document.getBaseBlockAttributes();
          trailingBlockAttributes = blockAttributes.slice(-baseBlockAttributes.length);
          if (arraysAreEqual(baseBlockAttributes, trailingBlockAttributes)) {
            leadingBlockAttributes = blockAttributes.slice(0, -baseBlockAttributes.length);
            formattedDocument = document.copyWithBaseBlockAttributes(leadingBlockAttributes);
          } else {
            formattedDocument = document.copy({
              consolidateBlocks: true
            }).copyWithBaseBlockAttributes(blockAttributes);
          }
          blockCount = formattedDocument.getBlockCount();
          firstBlock = formattedDocument.getBlockAtIndex(0);
          if (arraysAreEqual(blockAttributes, firstBlock.getAttributes())) {
            firstText = firstBlock.getTextWithoutBlockBreak();
            result = this.insertTextAtRange(firstText, range);
            if (blockCount > 1) {
              formattedDocument = new this.constructor(formattedDocument.getBlocks().slice(1));
              position = startPosition + firstText.getLength();
              result = result.insertDocumentAtRange(formattedDocument, position);
            }
          } else {
            result = this.insertDocumentAtRange(formattedDocument, range);
          }
          return result;
        };

        Document.prototype.insertTextAtRange = function(text, range) {
          var document, index, offset, ref, startPosition;
          startPosition = (range = normalizeRange(range))[0];
          ref = this.locationFromPosition(startPosition), index = ref.index, offset = ref.offset;
          document = this.removeTextAtRange(range);
          return new this.constructor(document.blockList.editObjectAtIndex(index, function(block) {
            return block.copyWithText(block.text.insertTextAtPosition(text, offset));
          }));
        };

        Document.prototype.removeTextAtRange = function(range) {
          var affectedBlockCount, block, blocks, leftBlock, leftIndex, leftLocation, leftOffset, leftPosition, leftText, ref, ref1, removeRightNewline, removingLeftBlock, rightBlock, rightIndex, rightLocation, rightOffset, rightPosition, rightText, text, useRightBlock;
          ref = range = normalizeRange(range), leftPosition = ref[0], rightPosition = ref[1];
          if (rangeIsCollapsed(range)) {
            return this;
          }
          ref1 = this.locationRangeFromRange(range), leftLocation = ref1[0], rightLocation = ref1[1];
          leftIndex = leftLocation.index;
          leftOffset = leftLocation.offset;
          leftBlock = this.getBlockAtIndex(leftIndex);
          rightIndex = rightLocation.index;
          rightOffset = rightLocation.offset;
          rightBlock = this.getBlockAtIndex(rightIndex);
          removeRightNewline = rightPosition - leftPosition === 1 && leftBlock.getBlockBreakPosition() === leftOffset && rightBlock.getBlockBreakPosition() !== rightOffset && rightBlock.text.getStringAtPosition(rightOffset) === "\n";
          if (removeRightNewline) {
            blocks = this.blockList.editObjectAtIndex(rightIndex, function(block) {
              return block.copyWithText(block.text.removeTextAtRange([rightOffset, rightOffset + 1]));
            });
          } else {
            leftText = leftBlock.text.getTextAtRange([0, leftOffset]);
            rightText = rightBlock.text.getTextAtRange([rightOffset, rightBlock.getLength()]);
            text = leftText.appendText(rightText);
            removingLeftBlock = leftIndex !== rightIndex && leftOffset === 0;
            useRightBlock = removingLeftBlock && leftBlock.getAttributeLevel() >= rightBlock.getAttributeLevel();
            if (useRightBlock) {
              block = rightBlock.copyWithText(text);
            } else {
              block = leftBlock.copyWithText(text);
            }
            affectedBlockCount = rightIndex + 1 - leftIndex;
            blocks = this.blockList.splice(leftIndex, affectedBlockCount, block);
          }
          return new this.constructor(blocks);
        };

        Document.prototype.moveTextFromRangeToPosition = function(range, position) {
          var blocks, document, endPosition, firstBlock, movingRightward, ref, ref1, result, startPosition, text;
          ref = range = normalizeRange(range), startPosition = ref[0], endPosition = ref[1];
          if ((startPosition <= position && position <= endPosition)) {
            return this;
          }
          document = this.getDocumentAtRange(range);
          result = this.removeTextAtRange(range);
          movingRightward = startPosition < position;
          if (movingRightward) {
            position -= document.getLength();
          }
          if (!result.firstBlockInRangeIsEntirelySelected(range)) {
            ref1 = document.getBlocks(), firstBlock = ref1[0], blocks = 2 <= ref1.length ? slice.call(ref1, 1) : [];
            if (blocks.length === 0) {
              text = firstBlock.getTextWithoutBlockBreak();
              if (movingRightward) {
                position += 1;
              }
            } else {
              text = firstBlock.text;
            }
            result = result.insertTextAtRange(text, position);
            if (blocks.length === 0) {
              return result;
            }
            document = new this.constructor(blocks);
            position += text.getLength();
          }
          return result.insertDocumentAtRange(document, position);
        };

        Document.prototype.addAttributeAtRange = function(attribute, value, range) {
          var blockList;
          blockList = this.blockList;
          this.eachBlockAtRange(range, function(block, textRange, index) {
            return blockList = blockList.editObjectAtIndex(index, function() {
              if (getBlockConfig(attribute)) {
                return block.addAttribute(attribute, value);
              } else {
                if (textRange[0] === textRange[1]) {
                  return block;
                } else {
                  return block.copyWithText(block.text.addAttributeAtRange(attribute, value, textRange));
                }
              }
            });
          });
          return new this.constructor(blockList);
        };

        Document.prototype.addAttribute = function(attribute, value) {
          var blockList;
          blockList = this.blockList;
          this.eachBlock(function(block, index) {
            return blockList = blockList.editObjectAtIndex(index, function() {
              return block.addAttribute(attribute, value);
            });
          });
          return new this.constructor(blockList);
        };

        Document.prototype.removeAttributeAtRange = function(attribute, range) {
          var blockList;
          blockList = this.blockList;
          this.eachBlockAtRange(range, function(block, textRange, index) {
            if (getBlockConfig(attribute)) {
              return blockList = blockList.editObjectAtIndex(index, function() {
                return block.removeAttribute(attribute);
              });
            } else if (textRange[0] !== textRange[1]) {
              return blockList = blockList.editObjectAtIndex(index, function() {
                return block.copyWithText(block.text.removeAttributeAtRange(attribute, textRange));
              });
            }
          });
          return new this.constructor(blockList);
        };

        Document.prototype.updateAttributesForAttachment = function(attributes, attachment) {
          var index, range, startPosition, text;
          startPosition = (range = this.getRangeOfAttachment(attachment))[0];
          index = this.locationFromPosition(startPosition).index;
          text = this.getTextAtIndex(index);
          return new this.constructor(this.blockList.editObjectAtIndex(index, function(block) {
            return block.copyWithText(text.updateAttributesForAttachment(attributes, attachment));
          }));
        };

        Document.prototype.removeAttributeForAttachment = function(attribute, attachment) {
          var range;
          range = this.getRangeOfAttachment(attachment);
          return this.removeAttributeAtRange(attribute, range);
        };

        Document.prototype.insertBlockBreakAtRange = function(range) {
          var blocks, document, offset, startPosition;
          startPosition = (range = normalizeRange(range))[0];
          offset = this.locationFromPosition(startPosition).offset;
          document = this.removeTextAtRange(range);
          if (offset === 0) {
            blocks = [new Trix.Block];
          }
          return new this.constructor(document.blockList.insertSplittableListAtPosition(new Trix.SplittableList(blocks), startPosition));
        };

        Document.prototype.applyBlockAttributeAtRange = function(attributeName, value, range) {
          var config, document, ref, ref1;
          ref = this.expandRangeToLineBreaksAndSplitBlocks(range), document = ref.document, range = ref.range;
          config = getBlockConfig(attributeName);
          if (config.listAttribute) {
            document = document.removeLastListAttributeAtRange(range, {
              exceptAttributeName: attributeName
            });
            ref1 = document.convertLineBreaksToBlockBreaksInRange(range), document = ref1.document, range = ref1.range;
          } else if (config.terminal) {
            document = document.removeLastTerminalAttributeAtRange(range);
          } else {
            document = document.consolidateBlocksAtRange(range);
          }
          return document.addAttributeAtRange(attributeName, value, range);
        };

        Document.prototype.removeLastListAttributeAtRange = function(range, options) {
          var blockList;
          if (options == null) {
            options = {};
          }
          blockList = this.blockList;
          this.eachBlockAtRange(range, function(block, textRange, index) {
            var lastAttributeName;
            if (!(lastAttributeName = block.getLastAttribute())) {
              return;
            }
            if (!getBlockConfig(lastAttributeName).listAttribute) {
              return;
            }
            if (lastAttributeName === options.exceptAttributeName) {
              return;
            }
            return blockList = blockList.editObjectAtIndex(index, function() {
              return block.removeAttribute(lastAttributeName);
            });
          });
          return new this.constructor(blockList);
        };

        Document.prototype.removeLastTerminalAttributeAtRange = function(range) {
          var blockList;
          blockList = this.blockList;
          this.eachBlockAtRange(range, function(block, textRange, index) {
            var lastAttributeName;
            if (!(lastAttributeName = block.getLastAttribute())) {
              return;
            }
            if (!getBlockConfig(lastAttributeName).terminal) {
              return;
            }
            return blockList = blockList.editObjectAtIndex(index, function() {
              return block.removeAttribute(lastAttributeName);
            });
          });
          return new this.constructor(blockList);
        };

        Document.prototype.firstBlockInRangeIsEntirelySelected = function(range) {
          var endPosition, leftLocation, length, ref, rightLocation, startPosition;
          ref = range = normalizeRange(range), startPosition = ref[0], endPosition = ref[1];
          leftLocation = this.locationFromPosition(startPosition);
          rightLocation = this.locationFromPosition(endPosition);
          if (leftLocation.offset === 0 && leftLocation.index < rightLocation.index) {
            return true;
          } else if (leftLocation.index === rightLocation.index) {
            length = this.getBlockAtIndex(leftLocation.index).getLength();
            return leftLocation.offset === 0 && rightLocation.offset === length;
          } else {
            return false;
          }
        };

        Document.prototype.expandRangeToLineBreaksAndSplitBlocks = function(range) {
          var document, endBlock, endLocation, endPosition, position, ref, startBlock, startLocation, startPosition;
          ref = range = normalizeRange(range), startPosition = ref[0], endPosition = ref[1];
          startLocation = this.locationFromPosition(startPosition);
          endLocation = this.locationFromPosition(endPosition);
          document = this;
          startBlock = document.getBlockAtIndex(startLocation.index);
          if ((startLocation.offset = startBlock.findLineBreakInDirectionFromPosition("backward", startLocation.offset)) != null) {
            position = document.positionFromLocation(startLocation);
            document = document.insertBlockBreakAtRange([position, position + 1]);
            endLocation.index += 1;
            endLocation.offset -= document.getBlockAtIndex(startLocation.index).getLength();
            startLocation.index += 1;
          }
          startLocation.offset = 0;
          if (endLocation.offset === 0 && endLocation.index > startLocation.index) {
            endLocation.index -= 1;
            endLocation.offset = document.getBlockAtIndex(endLocation.index).getBlockBreakPosition();
          } else {
            endBlock = document.getBlockAtIndex(endLocation.index);
            if (endBlock.text.getStringAtRange([endLocation.offset - 1, endLocation.offset]) === "\n") {
              endLocation.offset -= 1;
            } else {
              endLocation.offset = endBlock.findLineBreakInDirectionFromPosition("forward", endLocation.offset);
            }
            if (endLocation.offset !== endBlock.getBlockBreakPosition()) {
              position = document.positionFromLocation(endLocation);
              document = document.insertBlockBreakAtRange([position, position + 1]);
            }
          }
          startPosition = document.positionFromLocation(startLocation);
          endPosition = document.positionFromLocation(endLocation);
          range = normalizeRange([startPosition, endPosition]);
          return {
            document: document,
            range: range
          };
        };

        Document.prototype.convertLineBreaksToBlockBreaksInRange = function(range) {
          var document, position, string;
          position = (range = normalizeRange(range))[0];
          string = this.getStringAtRange(range).slice(0, -1);
          document = this;
          string.replace(/.*?\n/g, function(match) {
            position += match.length;
            return document = document.insertBlockBreakAtRange([position - 1, position]);
          });
          return {
            document: document,
            range: range
          };
        };

        Document.prototype.consolidateBlocksAtRange = function(range) {
          var endIndex, endPosition, ref, startIndex, startPosition;
          ref = range = normalizeRange(range), startPosition = ref[0], endPosition = ref[1];
          startIndex = this.locationFromPosition(startPosition).index;
          endIndex = this.locationFromPosition(endPosition).index;
          return new this.constructor(this.blockList.consolidateFromIndexToIndex(startIndex, endIndex));
        };

        Document.prototype.getDocumentAtRange = function(range) {
          var blocks;
          range = normalizeRange(range);
          blocks = this.blockList.getSplittableListInRange(range).toArray();
          return new this.constructor(blocks);
        };

        Document.prototype.getStringAtRange = function(range) {
          var endIndex, endPosition, ref;
          ref = range = normalizeRange(range), endPosition = ref[ref.length - 1];
          if (endPosition !== this.getLength()) {
            endIndex = -1;
          }
          return this.getDocumentAtRange(range).toString().slice(0, endIndex);
        };

        Document.prototype.getBlockAtIndex = function(index) {
          return this.blockList.getObjectAtIndex(index);
        };

        Document.prototype.getBlockAtPosition = function(position) {
          var index;
          index = this.locationFromPosition(position).index;
          return this.getBlockAtIndex(index);
        };

        Document.prototype.getTextAtIndex = function(index) {
          var ref;
          return (ref = this.getBlockAtIndex(index)) != null ? ref.text : void 0;
        };

        Document.prototype.getTextAtPosition = function(position) {
          var index;
          index = this.locationFromPosition(position).index;
          return this.getTextAtIndex(index);
        };

        Document.prototype.getPieceAtPosition = function(position) {
          var index, offset, ref;
          ref = this.locationFromPosition(position), index = ref.index, offset = ref.offset;
          return this.getTextAtIndex(index).getPieceAtPosition(offset);
        };

        Document.prototype.getCharacterAtPosition = function(position) {
          var index, offset, ref;
          ref = this.locationFromPosition(position), index = ref.index, offset = ref.offset;
          return this.getTextAtIndex(index).getStringAtRange([offset, offset + 1]);
        };

        Document.prototype.getLength = function() {
          return this.blockList.getEndPosition();
        };

        Document.prototype.getBlocks = function() {
          return this.blockList.toArray();
        };

        Document.prototype.getBlockCount = function() {
          return this.blockList.length;
        };

        Document.prototype.getEditCount = function() {
          return this.editCount;
        };

        Document.prototype.eachBlock = function(callback) {
          return this.blockList.eachObject(callback);
        };

        Document.prototype.eachBlockAtRange = function(range, callback) {
          var block, endLocation, endPosition, i, index, ref, ref1, ref2, results, startLocation, startPosition, textRange;
          ref = range = normalizeRange(range), startPosition = ref[0], endPosition = ref[1];
          startLocation = this.locationFromPosition(startPosition);
          endLocation = this.locationFromPosition(endPosition);
          if (startLocation.index === endLocation.index) {
            block = this.getBlockAtIndex(startLocation.index);
            textRange = [startLocation.offset, endLocation.offset];
            return callback(block, textRange, startLocation.index);
          } else {
            results = [];
            for (index = i = ref1 = startLocation.index, ref2 = endLocation.index; ref1 <= ref2 ? i <= ref2 : i >= ref2; index = ref1 <= ref2 ? ++i : --i) {
              if (block = this.getBlockAtIndex(index)) {
                textRange = (function() {
                  switch (index) {
                    case startLocation.index:
                      return [startLocation.offset, block.text.getLength()];
                    case endLocation.index:
                      return [0, endLocation.offset];
                    default:
                      return [0, block.text.getLength()];
                  }
                })();
                results.push(callback(block, textRange, index));
              } else {
                results.push(void 0);
              }
            }
            return results;
          }
        };

        Document.prototype.getCommonAttributesAtRange = function(range) {
          var blockAttributes, startPosition, textAttributes;
          startPosition = (range = normalizeRange(range))[0];
          if (rangeIsCollapsed(range)) {
            return this.getCommonAttributesAtPosition(startPosition);
          } else {
            textAttributes = [];
            blockAttributes = [];
            this.eachBlockAtRange(range, function(block, textRange) {
              if (textRange[0] !== textRange[1]) {
                textAttributes.push(block.text.getCommonAttributesAtRange(textRange));
                return blockAttributes.push(attributesForBlock(block));
              }
            });
            return Trix.Hash.fromCommonAttributesOfObjects(textAttributes).merge(Trix.Hash.fromCommonAttributesOfObjects(blockAttributes)).toObject();
          }
        };

        Document.prototype.getCommonAttributesAtPosition = function(position) {
          var attributes, attributesLeft, block, commonAttributes, index, inheritableAttributes, key, offset, ref, value;
          ref = this.locationFromPosition(position), index = ref.index, offset = ref.offset;
          block = this.getBlockAtIndex(index);
          if (!block) {
            return {};
          }
          commonAttributes = attributesForBlock(block);
          attributes = block.text.getAttributesAtPosition(offset);
          attributesLeft = block.text.getAttributesAtPosition(offset - 1);
          inheritableAttributes = (function() {
            var ref1, results;
            ref1 = Trix.config.textAttributes;
            results = [];
            for (key in ref1) {
              value = ref1[key];
              if (value.inheritable) {
                results.push(key);
              }
            }
            return results;
          })();
          for (key in attributesLeft) {
            value = attributesLeft[key];
            if (value === attributes[key] || indexOf.call(inheritableAttributes, key) >= 0) {
              commonAttributes[key] = value;
            }
          }
          return commonAttributes;
        };

        Document.prototype.getRangeOfCommonAttributeAtPosition = function(attributeName, position) {
          var end, endOffset, index, offset, ref, ref1, start, startOffset, text;
          ref = this.locationFromPosition(position), index = ref.index, offset = ref.offset;
          text = this.getTextAtIndex(index);
          ref1 = text.getExpandedRangeForAttributeAtOffset(attributeName, offset), startOffset = ref1[0], endOffset = ref1[1];
          start = this.positionFromLocation({
            index: index,
            offset: startOffset
          });
          end = this.positionFromLocation({
            index: index,
            offset: endOffset
          });
          return normalizeRange([start, end]);
        };

        Document.prototype.getBaseBlockAttributes = function() {
          var baseBlockAttributes, blockAttributes, blockIndex, i, index, lastAttributeIndex, ref;
          baseBlockAttributes = this.getBlockAtIndex(0).getAttributes();
          for (blockIndex = i = 1, ref = this.getBlockCount(); 1 <= ref ? i < ref : i > ref; blockIndex = 1 <= ref ? ++i : --i) {
            blockAttributes = this.getBlockAtIndex(blockIndex).getAttributes();
            lastAttributeIndex = Math.min(baseBlockAttributes.length, blockAttributes.length);
            baseBlockAttributes = (function() {
              var j, ref1, results;
              results = [];
              for (index = j = 0, ref1 = lastAttributeIndex; 0 <= ref1 ? j < ref1 : j > ref1; index = 0 <= ref1 ? ++j : --j) {
                if (blockAttributes[index] !== baseBlockAttributes[index]) {
                  break;
                }
                results.push(blockAttributes[index]);
              }
              return results;
            })();
          }
          return baseBlockAttributes;
        };

        attributesForBlock = function(block) {
          var attributeName, attributes;
          attributes = {};
          if (attributeName = block.getLastAttribute()) {
            attributes[attributeName] = true;
          }
          return attributes;
        };

        Document.prototype.getAttachmentById = function(attachmentId) {
          var attachment, i, len, ref;
          ref = this.getAttachments();
          for (i = 0, len = ref.length; i < len; i++) {
            attachment = ref[i];
            if (attachment.id === attachmentId) {
              return attachment;
            }
          }
        };

        Document.prototype.getAttachmentPieces = function() {
          var attachmentPieces;
          attachmentPieces = [];
          this.blockList.eachObject(function(arg) {
            var text;
            text = arg.text;
            return attachmentPieces = attachmentPieces.concat(text.getAttachmentPieces());
          });
          return attachmentPieces;
        };

        Document.prototype.getAttachments = function() {
          var i, len, piece, ref, results;
          ref = this.getAttachmentPieces();
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            piece = ref[i];
            results.push(piece.attachment);
          }
          return results;
        };

        Document.prototype.getRangeOfAttachment = function(attachment) {
          var i, index, len, position, ref, text, textRange;
          position = 0;
          ref = this.blockList.toArray();
          for (index = i = 0, len = ref.length; i < len; index = ++i) {
            text = ref[index].text;
            if (textRange = text.getRangeOfAttachment(attachment)) {
              return normalizeRange([position + textRange[0], position + textRange[1]]);
            }
            position += text.getLength();
          }
        };

        Document.prototype.getLocationRangeOfAttachment = function(attachment) {
          var range;
          range = this.getRangeOfAttachment(attachment);
          return this.locationRangeFromRange(range);
        };

        Document.prototype.getAttachmentPieceForAttachment = function(attachment) {
          var i, len, piece, ref;
          ref = this.getAttachmentPieces();
          for (i = 0, len = ref.length; i < len; i++) {
            piece = ref[i];
            if (piece.attachment === attachment) {
              return piece;
            }
          }
        };

        Document.prototype.findRangesForTextAttribute = function(attributeName, arg) {
          var i, len, length, match, piece, position, range, ranges, ref, withValue;
          withValue = (arg != null ? arg : {}).withValue;
          position = 0;
          range = [];
          ranges = [];
          match = function(piece) {
            if (withValue != null) {
              return piece.getAttribute(attributeName) === withValue;
            } else {
              return piece.hasAttribute(attributeName);
            }
          };
          ref = this.getPieces();
          for (i = 0, len = ref.length; i < len; i++) {
            piece = ref[i];
            length = piece.getLength();
            if (match(piece)) {
              if (range[1] === position) {
                range[1] = position + length;
              } else {
                ranges.push(range = [position, position + length]);
              }
            }
            position += length;
          }
          return ranges;
        };

        Document.prototype.locationFromPosition = function(position) {
          var blocks, location;
          location = this.blockList.findIndexAndOffsetAtPosition(Math.max(0, position));
          if (location.index != null) {
            return location;
          } else {
            blocks = this.getBlocks();
            return {
              index: blocks.length - 1,
              offset: blocks[blocks.length - 1].getLength()
            };
          }
        };

        Document.prototype.positionFromLocation = function(location) {
          return this.blockList.findPositionAtIndexAndOffset(location.index, location.offset);
        };

        Document.prototype.locationRangeFromPosition = function(position) {
          return normalizeRange(this.locationFromPosition(position));
        };

        Document.prototype.locationRangeFromRange = function(range) {
          var endLocation, endPosition, startLocation, startPosition;
          if (!(range = normalizeRange(range))) {
            return;
          }
          startPosition = range[0], endPosition = range[1];
          startLocation = this.locationFromPosition(startPosition);
          endLocation = this.locationFromPosition(endPosition);
          return normalizeRange([startLocation, endLocation]);
        };

        Document.prototype.rangeFromLocationRange = function(locationRange) {
          var leftPosition, rightPosition;
          locationRange = normalizeRange(locationRange);
          leftPosition = this.positionFromLocation(locationRange[0]);
          if (!rangeIsCollapsed(locationRange)) {
            rightPosition = this.positionFromLocation(locationRange[1]);
          }
          return normalizeRange([leftPosition, rightPosition]);
        };

        Document.prototype.isEqualTo = function(document) {
          return this.blockList.isEqualTo(document != null ? document.blockList : void 0);
        };

        Document.prototype.getTexts = function() {
          var block, i, len, ref, results;
          ref = this.getBlocks();
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            block = ref[i];
            results.push(block.text);
          }
          return results;
        };

        Document.prototype.getPieces = function() {
          var i, len, pieces, ref, text;
          pieces = [];
          ref = this.getTexts();
          for (i = 0, len = ref.length; i < len; i++) {
            text = ref[i];
            pieces.push.apply(pieces, text.getPieces());
          }
          return pieces;
        };

        Document.prototype.getObjects = function() {
          return this.getBlocks().concat(this.getTexts()).concat(this.getPieces());
        };

        Document.prototype.toSerializableDocument = function() {
          var blocks;
          blocks = [];
          this.blockList.eachObject(function(block) {
            return blocks.push(block.copyWithText(block.text.toSerializableText()));
          });
          return new this.constructor(blocks);
        };

        Document.prototype.toString = function() {
          return this.blockList.toString();
        };

        Document.prototype.toJSON = function() {
          return this.blockList.toJSON();
        };

        Document.prototype.toConsole = function() {
          var block;
          return JSON.stringify((function() {
            var i, len, ref, results;
            ref = this.blockList.toArray();
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              block = ref[i];
              results.push(JSON.parse(block.text.toConsole()));
            }
            return results;
          }).call(this));
        };

        return Document;

      })(Trix.Object);

    }).call(this);
    (function() {
      Trix.LineBreakInsertion = (function() {
        function LineBreakInsertion(composition) {
          var ref;
          this.composition = composition;
          this.document = this.composition.document;
          ref = this.composition.getSelectedRange(), this.startPosition = ref[0], this.endPosition = ref[1];
          this.startLocation = this.document.locationFromPosition(this.startPosition);
          this.endLocation = this.document.locationFromPosition(this.endPosition);
          this.block = this.document.getBlockAtIndex(this.endLocation.index);
          this.breaksOnReturn = this.block.breaksOnReturn();
          this.previousCharacter = this.block.text.getStringAtPosition(this.endLocation.offset - 1);
          this.nextCharacter = this.block.text.getStringAtPosition(this.endLocation.offset);
        }

        LineBreakInsertion.prototype.shouldInsertBlockBreak = function() {
          if (this.block.hasAttributes() && this.block.isListItem() && !this.block.isEmpty()) {
            return this.startLocation.offset !== 0;
          } else {
            return this.breaksOnReturn && this.nextCharacter !== "\n";
          }
        };

        LineBreakInsertion.prototype.shouldBreakFormattedBlock = function() {
          return this.block.hasAttributes() && !this.block.isListItem() && ((this.breaksOnReturn && this.nextCharacter === "\n") || this.previousCharacter === "\n");
        };

        LineBreakInsertion.prototype.shouldDecreaseListLevel = function() {
          return this.block.hasAttributes() && this.block.isListItem() && this.block.isEmpty();
        };

        LineBreakInsertion.prototype.shouldPrependListItem = function() {
          return this.block.isListItem() && this.startLocation.offset === 0 && !this.block.isEmpty();
        };

        LineBreakInsertion.prototype.shouldRemoveLastBlockAttribute = function() {
          return this.block.hasAttributes() && !this.block.isListItem() && this.block.isEmpty();
        };

        return LineBreakInsertion;

      })();

    }).call(this);
    (function() {
      var arrayStartsWith, extend, getAllAttributeNames, getBlockConfig, getTextConfig, normalizeRange, objectsAreEqual, rangeIsCollapsed, rangesAreEqual, summarizeArrayChange,
        extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      normalizeRange = Trix.normalizeRange, rangesAreEqual = Trix.rangesAreEqual, rangeIsCollapsed = Trix.rangeIsCollapsed, objectsAreEqual = Trix.objectsAreEqual, arrayStartsWith = Trix.arrayStartsWith, summarizeArrayChange = Trix.summarizeArrayChange, getAllAttributeNames = Trix.getAllAttributeNames, getBlockConfig = Trix.getBlockConfig, getTextConfig = Trix.getTextConfig, extend = Trix.extend;

      Trix.Composition = (function(superClass) {
        var placeholder;

        extend1(Composition, superClass);

        function Composition() {
          this.document = new Trix.Document;
          this.attachments = [];
          this.currentAttributes = {};
          this.revision = 0;
        }

        Composition.prototype.setDocument = function(document) {
          var ref;
          if (!document.isEqualTo(this.document)) {
            this.document = document;
            this.refreshAttachments();
            this.revision++;
            return (ref = this.delegate) != null ? typeof ref.compositionDidChangeDocument === "function" ? ref.compositionDidChangeDocument(document) : void 0 : void 0;
          }
        };

        Composition.prototype.getSnapshot = function() {
          return {
            document: this.document,
            selectedRange: this.getSelectedRange()
          };
        };

        Composition.prototype.loadSnapshot = function(arg) {
          var document, ref, ref1, selectedRange;
          document = arg.document, selectedRange = arg.selectedRange;
          if ((ref = this.delegate) != null) {
            if (typeof ref.compositionWillLoadSnapshot === "function") {
              ref.compositionWillLoadSnapshot();
            }
          }
          this.setDocument(document != null ? document : new Trix.Document);
          this.setSelection(selectedRange != null ? selectedRange : [0, 0]);
          return (ref1 = this.delegate) != null ? typeof ref1.compositionDidLoadSnapshot === "function" ? ref1.compositionDidLoadSnapshot() : void 0 : void 0;
        };

        Composition.prototype.insertText = function(text, arg) {
          var endPosition, selectedRange, startPosition, updatePosition;
          updatePosition = (arg != null ? arg : {
            updatePosition: true
          }).updatePosition;
          selectedRange = this.getSelectedRange();
          this.setDocument(this.document.insertTextAtRange(text, selectedRange));
          startPosition = selectedRange[0];
          endPosition = startPosition + text.getLength();
          if (updatePosition) {
            this.setSelection(endPosition);
          }
          return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
        };

        Composition.prototype.insertBlock = function(block) {
          var document;
          if (block == null) {
            block = new Trix.Block;
          }
          document = new Trix.Document([block]);
          return this.insertDocument(document);
        };

        Composition.prototype.insertDocument = function(document) {
          var endPosition, selectedRange, startPosition;
          if (document == null) {
            document = new Trix.Document;
          }
          selectedRange = this.getSelectedRange();
          this.setDocument(this.document.insertDocumentAtRange(document, selectedRange));
          startPosition = selectedRange[0];
          endPosition = startPosition + document.getLength();
          this.setSelection(endPosition);
          return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
        };

        Composition.prototype.insertString = function(string, options) {
          var attributes, text;
          attributes = this.getCurrentTextAttributes();
          text = Trix.Text.textForStringWithAttributes(string, attributes);
          return this.insertText(text, options);
        };

        Composition.prototype.insertBlockBreak = function() {
          var endPosition, selectedRange, startPosition;
          selectedRange = this.getSelectedRange();
          this.setDocument(this.document.insertBlockBreakAtRange(selectedRange));
          startPosition = selectedRange[0];
          endPosition = startPosition + 1;
          this.setSelection(endPosition);
          return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
        };

        Composition.prototype.insertLineBreak = function() {
          var document, insertion;
          insertion = new Trix.LineBreakInsertion(this);
          if (insertion.shouldDecreaseListLevel()) {
            this.decreaseListLevel();
            return this.setSelection(insertion.startPosition);
          } else if (insertion.shouldPrependListItem()) {
            document = new Trix.Document([insertion.block.copyWithoutText()]);
            return this.insertDocument(document);
          } else if (insertion.shouldInsertBlockBreak()) {
            return this.insertBlockBreak();
          } else if (insertion.shouldRemoveLastBlockAttribute()) {
            return this.removeLastBlockAttribute();
          } else if (insertion.shouldBreakFormattedBlock()) {
            return this.breakFormattedBlock(insertion);
          } else {
            return this.insertString("\n");
          }
        };

        Composition.prototype.insertHTML = function(html) {
          var document, endPosition, selectedRange, startPosition;
          document = Trix.Document.fromHTML(html);
          selectedRange = this.getSelectedRange();
          this.setDocument(this.document.mergeDocumentAtRange(document, selectedRange));
          startPosition = selectedRange[0];
          endPosition = startPosition + document.getLength() - 1;
          this.setSelection(endPosition);
          return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
        };

        Composition.prototype.replaceHTML = function(html) {
          var document, locationRange, selectedRange;
          document = Trix.Document.fromHTML(html).copyUsingObjectsFromDocument(this.document);
          locationRange = this.getLocationRange({
            strict: false
          });
          selectedRange = this.document.rangeFromLocationRange(locationRange);
          this.setDocument(document);
          return this.setSelection(selectedRange);
        };

        Composition.prototype.insertFile = function(file) {
          var attachment, ref;
          if ((ref = this.delegate) != null ? ref.compositionShouldAcceptFile(file) : void 0) {
            attachment = Trix.Attachment.attachmentForFile(file);
            return this.insertAttachment(attachment);
          }
        };

        Composition.prototype.insertFiles = function(files) {
          var attachment, attachmentText, file, i, len, ref, text;
          text = new Trix.Text;
          for (i = 0, len = files.length; i < len; i++) {
            file = files[i];
            if (!((ref = this.delegate) != null ? ref.compositionShouldAcceptFile(file) : void 0)) {
              continue;
            }
            attachment = Trix.Attachment.attachmentForFile(file);
            attachmentText = Trix.Text.textForAttachmentWithAttributes(attachment, this.currentAttributes);
            text = text.appendText(attachmentText);
          }
          return this.insertText(text);
        };

        Composition.prototype.insertAttachment = function(attachment) {
          var text;
          text = Trix.Text.textForAttachmentWithAttributes(attachment, this.currentAttributes);
          return this.insertText(text);
        };

        Composition.prototype.deleteInDirection = function(direction) {
          var attachment, block, deletingIntoPreviousBlock, locationRange, range, selectionIsCollapsed, selectionSpansBlocks;
          locationRange = this.getLocationRange();
          range = this.getSelectedRange();
          selectionIsCollapsed = rangeIsCollapsed(range);
          if (selectionIsCollapsed) {
            deletingIntoPreviousBlock = direction === "backward" && locationRange[0].offset === 0;
          } else {
            selectionSpansBlocks = locationRange[0].index !== locationRange[1].index;
          }
          if (deletingIntoPreviousBlock) {
            if (this.canDecreaseBlockAttributeLevel()) {
              block = this.getBlock();
              if (block.isListItem()) {
                this.decreaseListLevel();
              } else {
                this.decreaseBlockAttributeLevel();
              }
              this.setSelection(range[0]);
              if (block.isEmpty()) {
                return false;
              }
            }
          }
          if (selectionIsCollapsed) {
            range = this.getExpandedRangeInDirection(direction);
            if (direction === "backward") {
              attachment = this.getAttachmentAtRange(range);
            }
          }
          if (attachment) {
            this.editAttachment(attachment);
            return false;
          } else {
            this.setDocument(this.document.removeTextAtRange(range));
            this.setSelection(range[0]);
            if (deletingIntoPreviousBlock || selectionSpansBlocks) {
              return false;
            }
          }
        };

        Composition.prototype.moveTextFromRange = function(range) {
          var position;
          position = this.getSelectedRange()[0];
          this.setDocument(this.document.moveTextFromRangeToPosition(range, position));
          return this.setSelection(position);
        };

        Composition.prototype.removeAttachment = function(attachment) {
          var range;
          if (range = this.document.getRangeOfAttachment(attachment)) {
            this.stopEditingAttachment();
            this.setDocument(this.document.removeTextAtRange(range));
            return this.setSelection(range[0]);
          }
        };

        Composition.prototype.removeLastBlockAttribute = function() {
          var block, endPosition, ref, startPosition;
          ref = this.getSelectedRange(), startPosition = ref[0], endPosition = ref[1];
          block = this.document.getBlockAtPosition(endPosition);
          this.removeCurrentAttribute(block.getLastAttribute());
          return this.setSelection(startPosition);
        };

        placeholder = " ";

        Composition.prototype.insertPlaceholder = function() {
          this.placeholderPosition = this.getPosition();
          return this.insertString(placeholder);
        };

        Composition.prototype.selectPlaceholder = function() {
          if (this.placeholderPosition != null) {
            this.setSelectedRange([this.placeholderPosition, this.placeholderPosition + placeholder.length]);
            return this.getSelectedRange();
          }
        };

        Composition.prototype.forgetPlaceholder = function() {
          return this.placeholderPosition = null;
        };

        Composition.prototype.hasCurrentAttribute = function(attributeName) {
          var value;
          value = this.currentAttributes[attributeName];
          return (value != null) && value !== false;
        };

        Composition.prototype.toggleCurrentAttribute = function(attributeName) {
          var value;
          if (value = !this.currentAttributes[attributeName]) {
            return this.setCurrentAttribute(attributeName, value);
          } else {
            return this.removeCurrentAttribute(attributeName);
          }
        };

        Composition.prototype.canSetCurrentAttribute = function(attributeName) {
          if (getBlockConfig(attributeName)) {
            return this.canSetCurrentBlockAttribute(attributeName);
          } else {
            return this.canSetCurrentTextAttribute(attributeName);
          }
        };

        Composition.prototype.canSetCurrentTextAttribute = function(attributeName) {
          switch (attributeName) {
            case "href":
              return !this.selectionContainsAttachmentWithAttribute(attributeName);
            default:
              return true;
          }
        };

        Composition.prototype.canSetCurrentBlockAttribute = function(attributeName) {
          var block;
          if (!(block = this.getBlock())) {
            return;
          }
          return !block.isTerminalBlock();
        };

        Composition.prototype.setCurrentAttribute = function(attributeName, value) {
          if (getBlockConfig(attributeName)) {
            return this.setBlockAttribute(attributeName, value);
          } else {
            this.setTextAttribute(attributeName, value);
            this.currentAttributes[attributeName] = value;
            return this.notifyDelegateOfCurrentAttributesChange();
          }
        };

        Composition.prototype.setTextAttribute = function(attributeName, value) {
          var endPosition, selectedRange, startPosition, text;
          if (!(selectedRange = this.getSelectedRange())) {
            return;
          }
          startPosition = selectedRange[0], endPosition = selectedRange[1];
          if (startPosition === endPosition) {
            if (attributeName === "href") {
              text = Trix.Text.textForStringWithAttributes(value, {
                href: value
              });
              return this.insertText(text);
            }
          } else {
            return this.setDocument(this.document.addAttributeAtRange(attributeName, value, selectedRange));
          }
        };

        Composition.prototype.setBlockAttribute = function(attributeName, value) {
          var block, selectedRange;
          if (!(selectedRange = this.getSelectedRange())) {
            return;
          }
          if (this.canSetCurrentAttribute(attributeName)) {
            block = this.getBlock();
            this.setDocument(this.document.applyBlockAttributeAtRange(attributeName, value, selectedRange));
            return this.setSelection(selectedRange);
          }
        };

        Composition.prototype.removeCurrentAttribute = function(attributeName) {
          if (getBlockConfig(attributeName)) {
            this.removeBlockAttribute(attributeName);
            return this.updateCurrentAttributes();
          } else {
            this.removeTextAttribute(attributeName);
            delete this.currentAttributes[attributeName];
            return this.notifyDelegateOfCurrentAttributesChange();
          }
        };

        Composition.prototype.removeTextAttribute = function(attributeName) {
          var selectedRange;
          if (!(selectedRange = this.getSelectedRange())) {
            return;
          }
          return this.setDocument(this.document.removeAttributeAtRange(attributeName, selectedRange));
        };

        Composition.prototype.removeBlockAttribute = function(attributeName) {
          var selectedRange;
          if (!(selectedRange = this.getSelectedRange())) {
            return;
          }
          return this.setDocument(this.document.removeAttributeAtRange(attributeName, selectedRange));
        };

        Composition.prototype.canDecreaseNestingLevel = function() {
          var ref;
          return ((ref = this.getBlock()) != null ? ref.getNestingLevel() : void 0) > 0;
        };

        Composition.prototype.canIncreaseNestingLevel = function() {
          var block, previousBlock, ref;
          if (!(block = this.getBlock())) {
            return;
          }
          if ((ref = getBlockConfig(block.getLastNestableAttribute())) != null ? ref.listAttribute : void 0) {
            if (previousBlock = this.getPreviousBlock()) {
              return arrayStartsWith(previousBlock.getListItemAttributes(), block.getListItemAttributes());
            }
          } else {
            return block.getNestingLevel() > 0;
          }
        };

        Composition.prototype.decreaseNestingLevel = function() {
          var block;
          if (!(block = this.getBlock())) {
            return;
          }
          return this.setDocument(this.document.replaceBlock(block, block.decreaseNestingLevel()));
        };

        Composition.prototype.increaseNestingLevel = function() {
          var block;
          if (!(block = this.getBlock())) {
            return;
          }
          return this.setDocument(this.document.replaceBlock(block, block.increaseNestingLevel()));
        };

        Composition.prototype.canDecreaseBlockAttributeLevel = function() {
          var ref;
          return ((ref = this.getBlock()) != null ? ref.getAttributeLevel() : void 0) > 0;
        };

        Composition.prototype.decreaseBlockAttributeLevel = function() {
          var attribute, ref;
          if (attribute = (ref = this.getBlock()) != null ? ref.getLastAttribute() : void 0) {
            return this.removeCurrentAttribute(attribute);
          }
        };

        Composition.prototype.decreaseListLevel = function() {
          var attributeLevel, block, endIndex, endPosition, index, startPosition;
          startPosition = this.getSelectedRange()[0];
          index = this.document.locationFromPosition(startPosition).index;
          endIndex = index;
          attributeLevel = this.getBlock().getAttributeLevel();
          while (block = this.document.getBlockAtIndex(endIndex + 1)) {
            if (!(block.isListItem() && block.getAttributeLevel() > attributeLevel)) {
              break;
            }
            endIndex++;
          }
          startPosition = this.document.positionFromLocation({
            index: index,
            offset: 0
          });
          endPosition = this.document.positionFromLocation({
            index: endIndex,
            offset: 0
          });
          return this.setDocument(this.document.removeLastListAttributeAtRange([startPosition, endPosition]));
        };

        Composition.prototype.updateCurrentAttributes = function() {
          var attributeName, currentAttributes, i, len, ref, selectedRange;
          if (selectedRange = this.getSelectedRange({
            ignoreLock: true
          })) {
            currentAttributes = this.document.getCommonAttributesAtRange(selectedRange);
            ref = getAllAttributeNames();
            for (i = 0, len = ref.length; i < len; i++) {
              attributeName = ref[i];
              if (!currentAttributes[attributeName]) {
                if (!this.canSetCurrentAttribute(attributeName)) {
                  currentAttributes[attributeName] = false;
                }
              }
            }
            if (!objectsAreEqual(currentAttributes, this.currentAttributes)) {
              this.currentAttributes = currentAttributes;
              return this.notifyDelegateOfCurrentAttributesChange();
            }
          }
        };

        Composition.prototype.getCurrentAttributes = function() {
          return extend.call({}, this.currentAttributes);
        };

        Composition.prototype.getCurrentTextAttributes = function() {
          var attributes, key, ref, value;
          attributes = {};
          ref = this.currentAttributes;
          for (key in ref) {
            value = ref[key];
            if (getTextConfig(key)) {
              attributes[key] = value;
            }
          }
          return attributes;
        };

        Composition.prototype.freezeSelection = function() {
          return this.setCurrentAttribute("frozen", true);
        };

        Composition.prototype.thawSelection = function() {
          return this.removeCurrentAttribute("frozen");
        };

        Composition.prototype.hasFrozenSelection = function() {
          return this.hasCurrentAttribute("frozen");
        };

        Composition.proxyMethod("getSelectionManager().getPointRange");

        Composition.proxyMethod("getSelectionManager().setLocationRangeFromPointRange");

        Composition.proxyMethod("getSelectionManager().locationIsCursorTarget");

        Composition.proxyMethod("getSelectionManager().selectionIsExpanded");

        Composition.proxyMethod("delegate?.getSelectionManager");

        Composition.prototype.setSelection = function(selectedRange) {
          var locationRange, ref;
          locationRange = this.document.locationRangeFromRange(selectedRange);
          return (ref = this.delegate) != null ? ref.compositionDidRequestChangingSelectionToLocationRange(locationRange) : void 0;
        };

        Composition.prototype.getSelectedRange = function() {
          var locationRange;
          if (locationRange = this.getLocationRange()) {
            return this.document.rangeFromLocationRange(locationRange);
          }
        };

        Composition.prototype.setSelectedRange = function(selectedRange) {
          var locationRange;
          locationRange = this.document.locationRangeFromRange(selectedRange);
          return this.getSelectionManager().setLocationRange(locationRange);
        };

        Composition.prototype.getPosition = function() {
          var locationRange;
          if (locationRange = this.getLocationRange()) {
            return this.document.positionFromLocation(locationRange[0]);
          }
        };

        Composition.prototype.getLocationRange = function(options) {
          var ref;
          return (ref = this.getSelectionManager().getLocationRange(options)) != null ? ref : normalizeRange({
            index: 0,
            offset: 0
          });
        };

        Composition.prototype.getExpandedRangeInDirection = function(direction) {
          var endPosition, ref, startPosition;
          ref = this.getSelectedRange(), startPosition = ref[0], endPosition = ref[1];
          if (direction === "backward") {
            startPosition = this.translateUTF16PositionFromOffset(startPosition, -1);
          } else {
            endPosition = this.translateUTF16PositionFromOffset(endPosition, 1);
          }
          return normalizeRange([startPosition, endPosition]);
        };

        Composition.prototype.moveCursorInDirection = function(direction) {
          var attachment, canEditAttachment, range, selectedRange;
          if (this.editingAttachment) {
            range = this.document.getRangeOfAttachment(this.editingAttachment);
          } else {
            selectedRange = this.getSelectedRange();
            range = this.getExpandedRangeInDirection(direction);
            canEditAttachment = !rangesAreEqual(selectedRange, range);
          }
          if (direction === "backward") {
            this.setSelectedRange(range[0]);
          } else {
            this.setSelectedRange(range[1]);
          }
          if (canEditAttachment) {
            if (attachment = this.getAttachmentAtRange(range)) {
              return this.editAttachment(attachment);
            }
          }
        };

        Composition.prototype.expandSelectionInDirection = function(direction) {
          var range;
          range = this.getExpandedRangeInDirection(direction);
          return this.setSelectedRange(range);
        };

        Composition.prototype.expandSelectionForEditing = function() {
          if (this.hasCurrentAttribute("href")) {
            return this.expandSelectionAroundCommonAttribute("href");
          }
        };

        Composition.prototype.expandSelectionAroundCommonAttribute = function(attributeName) {
          var position, range;
          position = this.getPosition();
          range = this.document.getRangeOfCommonAttributeAtPosition(attributeName, position);
          return this.setSelectedRange(range);
        };

        Composition.prototype.selectionContainsAttachmentWithAttribute = function(attributeName) {
          var attachment, i, len, ref, selectedRange;
          if (selectedRange = this.getSelectedRange()) {
            ref = this.document.getDocumentAtRange(selectedRange).getAttachments();
            for (i = 0, len = ref.length; i < len; i++) {
              attachment = ref[i];
              if (attachment.hasAttribute(attributeName)) {
                return true;
              }
            }
            return false;
          }
        };

        Composition.prototype.selectionIsInCursorTarget = function() {
          return this.editingAttachment || this.positionIsCursorTarget(this.getPosition());
        };

        Composition.prototype.positionIsCursorTarget = function(position) {
          var location;
          if (location = this.document.locationFromPosition(position)) {
            return this.locationIsCursorTarget(location);
          }
        };

        Composition.prototype.positionIsBlockBreak = function(position) {
          var ref;
          return (ref = this.document.getPieceAtPosition(position)) != null ? ref.isBlockBreak() : void 0;
        };

        Composition.prototype.getSelectedDocument = function() {
          var selectedRange;
          if (selectedRange = this.getSelectedRange()) {
            return this.document.getDocumentAtRange(selectedRange);
          }
        };

        Composition.prototype.getAttachments = function() {
          return this.attachments.slice(0);
        };

        Composition.prototype.refreshAttachments = function() {
          var added, attachment, attachments, i, j, len, len1, ref, ref1, ref2, removed, results;
          attachments = this.document.getAttachments();
          ref = summarizeArrayChange(this.attachments, attachments), added = ref.added, removed = ref.removed;
          this.attachments = attachments;
          for (i = 0, len = removed.length; i < len; i++) {
            attachment = removed[i];
            attachment.delegate = null;
            if ((ref1 = this.delegate) != null) {
              if (typeof ref1.compositionDidRemoveAttachment === "function") {
                ref1.compositionDidRemoveAttachment(attachment);
              }
            }
          }
          results = [];
          for (j = 0, len1 = added.length; j < len1; j++) {
            attachment = added[j];
            attachment.delegate = this;
            results.push((ref2 = this.delegate) != null ? typeof ref2.compositionDidAddAttachment === "function" ? ref2.compositionDidAddAttachment(attachment) : void 0 : void 0);
          }
          return results;
        };

        Composition.prototype.attachmentDidChangeAttributes = function(attachment) {
          var ref;
          this.revision++;
          return (ref = this.delegate) != null ? typeof ref.compositionDidEditAttachment === "function" ? ref.compositionDidEditAttachment(attachment) : void 0 : void 0;
        };

        Composition.prototype.attachmentDidChangePreviewURL = function(attachment) {
          var ref;
          this.revision++;
          return (ref = this.delegate) != null ? typeof ref.compositionDidChangeAttachmentPreviewURL === "function" ? ref.compositionDidChangeAttachmentPreviewURL(attachment) : void 0 : void 0;
        };

        Composition.prototype.editAttachment = function(attachment) {
          var ref;
          if (attachment === this.editingAttachment) {
            return;
          }
          this.stopEditingAttachment();
          this.editingAttachment = attachment;
          return (ref = this.delegate) != null ? typeof ref.compositionDidStartEditingAttachment === "function" ? ref.compositionDidStartEditingAttachment(this.editingAttachment) : void 0 : void 0;
        };

        Composition.prototype.stopEditingAttachment = function() {
          var ref;
          if (!this.editingAttachment) {
            return;
          }
          if ((ref = this.delegate) != null) {
            if (typeof ref.compositionDidStopEditingAttachment === "function") {
              ref.compositionDidStopEditingAttachment(this.editingAttachment);
            }
          }
          return this.editingAttachment = null;
        };

        Composition.prototype.canEditAttachmentCaption = function() {
          var ref;
          return (ref = this.editingAttachment) != null ? ref.isPreviewable() : void 0;
        };

        Composition.prototype.updateAttributesForAttachment = function(attributes, attachment) {
          return this.setDocument(this.document.updateAttributesForAttachment(attributes, attachment));
        };

        Composition.prototype.removeAttributeForAttachment = function(attribute, attachment) {
          return this.setDocument(this.document.removeAttributeForAttachment(attribute, attachment));
        };

        Composition.prototype.breakFormattedBlock = function(insertion) {
          var block, document, newDocument, position, range;
          document = insertion.document, block = insertion.block;
          position = insertion.startPosition;
          range = [position - 1, position];
          if (block.getBlockBreakPosition() === insertion.startLocation.offset) {
            if (block.breaksOnReturn() && insertion.nextCharacter === "\n") {
              position += 1;
            } else {
              document = document.removeTextAtRange(range);
            }
            range = [position, position];
          } else if (insertion.nextCharacter === "\n") {
            if (insertion.previousCharacter === "\n") {
              range = [position - 1, position + 1];
            } else {
              range = [position, position + 1];
              position += 1;
            }
          } else if (insertion.startLocation.offset - 1 !== 0) {
            position += 1;
          }
          newDocument = new Trix.Document([block.removeLastAttribute().copyWithoutText()]);
          this.setDocument(document.insertDocumentAtRange(newDocument, range));
          return this.setSelection(position);
        };

        Composition.prototype.getPreviousBlock = function() {
          var index, locationRange;
          if (locationRange = this.getLocationRange()) {
            index = locationRange[0].index;
            if (index > 0) {
              return this.document.getBlockAtIndex(index - 1);
            }
          }
        };

        Composition.prototype.getBlock = function() {
          var locationRange;
          if (locationRange = this.getLocationRange()) {
            return this.document.getBlockAtIndex(locationRange[0].index);
          }
        };

        Composition.prototype.getAttachmentAtRange = function(range) {
          var document;
          document = this.document.getDocumentAtRange(range);
          if (document.toString() === (Trix.OBJECT_REPLACEMENT_CHARACTER + "\n")) {
            return document.getAttachments()[0];
          }
        };

        Composition.prototype.notifyDelegateOfCurrentAttributesChange = function() {
          var ref;
          return (ref = this.delegate) != null ? typeof ref.compositionDidChangeCurrentAttributes === "function" ? ref.compositionDidChangeCurrentAttributes(this.currentAttributes) : void 0 : void 0;
        };

        Composition.prototype.notifyDelegateOfInsertionAtRange = function(range) {
          var ref;
          return (ref = this.delegate) != null ? typeof ref.compositionDidPerformInsertionAtRange === "function" ? ref.compositionDidPerformInsertionAtRange(range) : void 0 : void 0;
        };

        Composition.prototype.translateUTF16PositionFromOffset = function(position, offset) {
          var utf16position, utf16string;
          utf16string = this.document.toUTF16String();
          utf16position = utf16string.offsetFromUCS2Offset(position);
          return utf16string.offsetToUCS2Offset(utf16position + offset);
        };

        return Composition;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.UndoManager = (function(superClass) {
        var entryHasDescriptionAndContext;

        extend(UndoManager, superClass);

        function UndoManager(composition) {
          this.composition = composition;
          this.undoEntries = [];
          this.redoEntries = [];
        }

        UndoManager.prototype.recordUndoEntry = function(description, arg) {
          var consolidatable, context, previousEntry, ref, undoEntry;
          ref = arg != null ? arg : {}, context = ref.context, consolidatable = ref.consolidatable;
          previousEntry = this.undoEntries.slice(-1)[0];
          if (!(consolidatable && entryHasDescriptionAndContext(previousEntry, description, context))) {
            undoEntry = this.createEntry({
              description: description,
              context: context
            });
            this.undoEntries.push(undoEntry);
            return this.redoEntries = [];
          }
        };

        UndoManager.prototype.undo = function() {
          var redoEntry, undoEntry;
          if (undoEntry = this.undoEntries.pop()) {
            redoEntry = this.createEntry(undoEntry);
            this.redoEntries.push(redoEntry);
            return this.composition.loadSnapshot(undoEntry.snapshot);
          }
        };

        UndoManager.prototype.redo = function() {
          var redoEntry, undoEntry;
          if (redoEntry = this.redoEntries.pop()) {
            undoEntry = this.createEntry(redoEntry);
            this.undoEntries.push(undoEntry);
            return this.composition.loadSnapshot(redoEntry.snapshot);
          }
        };

        UndoManager.prototype.canUndo = function() {
          return this.undoEntries.length > 0;
        };

        UndoManager.prototype.canRedo = function() {
          return this.redoEntries.length > 0;
        };

        UndoManager.prototype.createEntry = function(arg) {
          var context, description, ref;
          ref = arg != null ? arg : {}, description = ref.description, context = ref.context;
          return {
            description: description != null ? description.toString() : void 0,
            context: JSON.stringify(context),
            snapshot: this.composition.getSnapshot()
          };
        };

        entryHasDescriptionAndContext = function(entry, description, context) {
          return (entry != null ? entry.description : void 0) === (description != null ? description.toString() : void 0) && (entry != null ? entry.context : void 0) === JSON.stringify(context);
        };

        return UndoManager;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      Trix.Editor = (function() {
        function Editor(composition, selectionManager, element) {
          this.composition = composition;
          this.selectionManager = selectionManager;
          this.element = element;
          this.undoManager = new Trix.UndoManager(this.composition);
        }

        Editor.prototype.loadDocument = function(document) {
          return this.loadSnapshot({
            document: document,
            selectedRange: [0, 0]
          });
        };

        Editor.prototype.loadHTML = function(html) {
          if (html == null) {
            html = "";
          }
          return this.loadDocument(Trix.Document.fromHTML(html, {
            referenceElement: this.element
          }));
        };

        Editor.prototype.loadJSON = function(arg) {
          var document, selectedRange;
          document = arg.document, selectedRange = arg.selectedRange;
          document = Trix.Document.fromJSON(document);
          return this.loadSnapshot({
            document: document,
            selectedRange: selectedRange
          });
        };

        Editor.prototype.loadSnapshot = function(snapshot) {
          this.undoManager = new Trix.UndoManager(this.composition);
          return this.composition.loadSnapshot(snapshot);
        };

        Editor.prototype.getDocument = function() {
          return this.composition.document;
        };

        Editor.prototype.getSelectedDocument = function() {
          return this.composition.getSelectedDocument();
        };

        Editor.prototype.getSnapshot = function() {
          return this.composition.getSnapshot();
        };

        Editor.prototype.toJSON = function() {
          return this.getSnapshot();
        };

        Editor.prototype.deleteInDirection = function(direction) {
          return this.composition.deleteInDirection(direction);
        };

        Editor.prototype.insertAttachment = function(attachment) {
          return this.composition.insertAttachment(attachment);
        };

        Editor.prototype.insertDocument = function(document) {
          return this.composition.insertDocument(document);
        };

        Editor.prototype.insertFile = function(file) {
          return this.composition.insertFile(file);
        };

        Editor.prototype.insertHTML = function(html) {
          return this.composition.insertHTML(html);
        };

        Editor.prototype.insertString = function(string) {
          return this.composition.insertString(string);
        };

        Editor.prototype.insertText = function(text) {
          return this.composition.insertText(text);
        };

        Editor.prototype.insertLineBreak = function() {
          return this.composition.insertLineBreak();
        };

        Editor.prototype.getSelectedRange = function() {
          return this.composition.getSelectedRange();
        };

        Editor.prototype.getPosition = function() {
          return this.composition.getPosition();
        };

        Editor.prototype.getClientRectAtPosition = function(position) {
          var locationRange;
          locationRange = this.getDocument().locationRangeFromRange([position, position + 1]);
          return this.selectionManager.getClientRectAtLocationRange(locationRange);
        };

        Editor.prototype.expandSelectionInDirection = function(direction) {
          return this.composition.expandSelectionInDirection(direction);
        };

        Editor.prototype.moveCursorInDirection = function(direction) {
          return this.composition.moveCursorInDirection(direction);
        };

        Editor.prototype.setSelectedRange = function(selectedRange) {
          return this.composition.setSelectedRange(selectedRange);
        };

        Editor.prototype.activateAttribute = function(name, value) {
          if (value == null) {
            value = true;
          }
          return this.composition.setCurrentAttribute(name, value);
        };

        Editor.prototype.attributeIsActive = function(name) {
          return this.composition.hasCurrentAttribute(name);
        };

        Editor.prototype.canActivateAttribute = function(name) {
          return this.composition.canSetCurrentAttribute(name);
        };

        Editor.prototype.deactivateAttribute = function(name) {
          return this.composition.removeCurrentAttribute(name);
        };

        Editor.prototype.canDecreaseNestingLevel = function() {
          return this.composition.canDecreaseNestingLevel();
        };

        Editor.prototype.canIncreaseNestingLevel = function() {
          return this.composition.canIncreaseNestingLevel();
        };

        Editor.prototype.decreaseNestingLevel = function() {
          if (this.canDecreaseNestingLevel()) {
            return this.composition.decreaseNestingLevel();
          }
        };

        Editor.prototype.increaseNestingLevel = function() {
          if (this.canIncreaseNestingLevel()) {
            return this.composition.increaseNestingLevel();
          }
        };

        Editor.prototype.canDecreaseIndentationLevel = function() {
          return this.canDecreaseNestingLevel();
        };

        Editor.prototype.canIncreaseIndentationLevel = function() {
          return this.canIncreaseNestingLevel();
        };

        Editor.prototype.decreaseIndentationLevel = function() {
          return this.decreaseNestingLevel();
        };

        Editor.prototype.increaseIndentationLevel = function() {
          return this.increaseNestingLevel();
        };

        Editor.prototype.canRedo = function() {
          return this.undoManager.canRedo();
        };

        Editor.prototype.canUndo = function() {
          return this.undoManager.canUndo();
        };

        Editor.prototype.recordUndoEntry = function(description, arg) {
          var consolidatable, context, ref;
          ref = arg != null ? arg : {}, context = ref.context, consolidatable = ref.consolidatable;
          return this.undoManager.recordUndoEntry(description, {
            context: context,
            consolidatable: consolidatable
          });
        };

        Editor.prototype.redo = function() {
          if (this.canRedo()) {
            return this.undoManager.redo();
          }
        };

        Editor.prototype.undo = function() {
          if (this.canUndo()) {
            return this.undoManager.undo();
          }
        };

        return Editor;

      })();

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.ManagedAttachment = (function(superClass) {
        extend(ManagedAttachment, superClass);

        function ManagedAttachment(attachmentManager, attachment) {
          var ref;
          this.attachmentManager = attachmentManager;
          this.attachment = attachment;
          ref = this.attachment, this.id = ref.id, this.file = ref.file;
        }

        ManagedAttachment.prototype.remove = function() {
          return this.attachmentManager.requestRemovalOfAttachment(this.attachment);
        };

        ManagedAttachment.proxyMethod("attachment.getAttribute");

        ManagedAttachment.proxyMethod("attachment.hasAttribute");

        ManagedAttachment.proxyMethod("attachment.setAttribute");

        ManagedAttachment.proxyMethod("attachment.getAttributes");

        ManagedAttachment.proxyMethod("attachment.setAttributes");

        ManagedAttachment.proxyMethod("attachment.isPending");

        ManagedAttachment.proxyMethod("attachment.isPreviewable");

        ManagedAttachment.proxyMethod("attachment.getURL");

        ManagedAttachment.proxyMethod("attachment.getHref");

        ManagedAttachment.proxyMethod("attachment.getFilename");

        ManagedAttachment.proxyMethod("attachment.getFilesize");

        ManagedAttachment.proxyMethod("attachment.getFormattedFilesize");

        ManagedAttachment.proxyMethod("attachment.getExtension");

        ManagedAttachment.proxyMethod("attachment.getContentType");

        ManagedAttachment.proxyMethod("attachment.getFile");

        ManagedAttachment.proxyMethod("attachment.setFile");

        ManagedAttachment.proxyMethod("attachment.releaseFile");

        ManagedAttachment.proxyMethod("attachment.getUploadProgress");

        ManagedAttachment.proxyMethod("attachment.setUploadProgress");

        return ManagedAttachment;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      Trix.AttachmentManager = (function(superClass) {
        extend(AttachmentManager, superClass);

        function AttachmentManager(attachments) {
          var attachment, i, len;
          if (attachments == null) {
            attachments = [];
          }
          this.managedAttachments = {};
          for (i = 0, len = attachments.length; i < len; i++) {
            attachment = attachments[i];
            this.manageAttachment(attachment);
          }
        }

        AttachmentManager.prototype.getAttachments = function() {
          var attachment, id, ref, results;
          ref = this.managedAttachments;
          results = [];
          for (id in ref) {
            attachment = ref[id];
            results.push(attachment);
          }
          return results;
        };

        AttachmentManager.prototype.manageAttachment = function(attachment) {
          var base, name;
          return (base = this.managedAttachments)[name = attachment.id] != null ? base[name] : base[name] = new Trix.ManagedAttachment(this, attachment);
        };

        AttachmentManager.prototype.attachmentIsManaged = function(attachment) {
          return attachment.id in this.managedAttachments;
        };

        AttachmentManager.prototype.requestRemovalOfAttachment = function(attachment) {
          var ref;
          if (this.attachmentIsManaged(attachment)) {
            return (ref = this.delegate) != null ? typeof ref.attachmentManagerDidRequestRemovalOfAttachment === "function" ? ref.attachmentManagerDidRequestRemovalOfAttachment(attachment) : void 0 : void 0;
          }
        };

        AttachmentManager.prototype.unmanageAttachment = function(attachment) {
          var managedAttachment;
          managedAttachment = this.managedAttachments[attachment.id];
          delete this.managedAttachments[attachment.id];
          return managedAttachment;
        };

        return AttachmentManager;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var elementContainsNode, findChildIndexOfNode, nodeIsAttachmentElement, nodeIsBlockContainer, nodeIsBlockStart, nodeIsBlockStartComment, nodeIsCursorTarget, nodeIsEmptyTextNode, nodeIsTextNode, tagName, walkTree;

      elementContainsNode = Trix.elementContainsNode, findChildIndexOfNode = Trix.findChildIndexOfNode, nodeIsBlockStart = Trix.nodeIsBlockStart, nodeIsBlockStartComment = Trix.nodeIsBlockStartComment, nodeIsBlockContainer = Trix.nodeIsBlockContainer, nodeIsCursorTarget = Trix.nodeIsCursorTarget, nodeIsEmptyTextNode = Trix.nodeIsEmptyTextNode, nodeIsTextNode = Trix.nodeIsTextNode, nodeIsAttachmentElement = Trix.nodeIsAttachmentElement, tagName = Trix.tagName, walkTree = Trix.walkTree;

      Trix.LocationMapper = (function() {
        var acceptSignificantNodes, nodeLength, rejectAttachmentContents, rejectEmptyTextNodes;

        function LocationMapper(element) {
          this.element = element;
        }

        LocationMapper.prototype.findLocationFromContainerAndOffset = function(container, offset, arg) {
          var attachmentElement, childIndex, foundBlock, location, node, strict, walker;
          strict = (arg != null ? arg : {
            strict: true
          }).strict;
          childIndex = 0;
          foundBlock = false;
          location = {
            index: 0,
            offset: 0
          };
          if (attachmentElement = this.findAttachmentElementParentForNode(container)) {
            container = attachmentElement.parentNode;
            offset = findChildIndexOfNode(attachmentElement);
          }
          walker = walkTree(this.element, {
            usingFilter: rejectAttachmentContents
          });
          while (walker.nextNode()) {
            node = walker.currentNode;
            if (node === container && nodeIsTextNode(container)) {
              if (!nodeIsCursorTarget(node)) {
                location.offset += offset;
              }
              break;
            } else {
              if (node.parentNode === container) {
                if (childIndex++ === offset) {
                  break;
                }
              } else if (!elementContainsNode(container, node)) {
                if (childIndex > 0) {
                  break;
                }
              }
              if (nodeIsBlockStart(node, {
                strict: strict
              })) {
                if (foundBlock) {
                  location.index++;
                }
                location.offset = 0;
                foundBlock = true;
              } else {
                location.offset += nodeLength(node);
              }
            }
          }
          return location;
        };

        LocationMapper.prototype.findContainerAndOffsetFromLocation = function(location) {
          var container, node, nodeOffset, offset, ref, string;
          if (location.index === 0 && location.offset === 0) {
            container = this.element;
            offset = 0;
            while (container.firstChild) {
              container = container.firstChild;
              if (nodeIsBlockContainer(container)) {
                offset = 1;
                break;
              }
            }
            return [container, offset];
          }
          ref = this.findNodeAndOffsetFromLocation(location), node = ref[0], nodeOffset = ref[1];
          if (!node) {
            return;
          }
          if (nodeIsTextNode(node)) {
            container = node;
            string = node.textContent;
            offset = location.offset - nodeOffset;
          } else {
            container = node.parentNode;
            if (!nodeIsBlockStart(node.previousSibling)) {
              if (!nodeIsBlockContainer(container)) {
                while (node === container.lastChild) {
                  node = container;
                  container = container.parentNode;
                  if (nodeIsBlockContainer(container)) {
                    break;
                  }
                }
              }
            }
            offset = findChildIndexOfNode(node);
            if (location.offset !== 0) {
              offset++;
            }
          }
          return [container, offset];
        };

        LocationMapper.prototype.findNodeAndOffsetFromLocation = function(location) {
          var currentNode, i, len, length, node, nodeOffset, offset, ref;
          offset = 0;
          ref = this.getSignificantNodesForIndex(location.index);
          for (i = 0, len = ref.length; i < len; i++) {
            currentNode = ref[i];
            length = nodeLength(currentNode);
            if (location.offset <= offset + length) {
              if (nodeIsTextNode(currentNode)) {
                node = currentNode;
                nodeOffset = offset;
                if (location.offset === nodeOffset && nodeIsCursorTarget(node)) {
                  break;
                }
              } else if (!node) {
                node = currentNode;
                nodeOffset = offset;
              }
            }
            offset += length;
            if (offset > location.offset) {
              break;
            }
          }
          return [node, nodeOffset];
        };

        LocationMapper.prototype.findAttachmentElementParentForNode = function(node) {
          while (node && node !== this.element) {
            if (nodeIsAttachmentElement(node)) {
              return node;
            }
            node = node.parentNode;
          }
        };

        LocationMapper.prototype.getSignificantNodesForIndex = function(index) {
          var blockIndex, node, nodes, recordingNodes, walker;
          nodes = [];
          walker = walkTree(this.element, {
            usingFilter: acceptSignificantNodes
          });
          recordingNodes = false;
          while (walker.nextNode()) {
            node = walker.currentNode;
            if (nodeIsBlockStartComment(node)) {
              if (typeof blockIndex !== "undefined" && blockIndex !== null) {
                blockIndex++;
              } else {
                blockIndex = 0;
              }
              if (blockIndex === index) {
                recordingNodes = true;
              } else if (recordingNodes) {
                break;
              }
            } else if (recordingNodes) {
              nodes.push(node);
            }
          }
          return nodes;
        };

        nodeLength = function(node) {
          var string;
          if (node.nodeType === Node.TEXT_NODE) {
            if (nodeIsCursorTarget(node)) {
              return 0;
            } else {
              string = node.textContent;
              return string.length;
            }
          } else if (tagName(node) === "br" || nodeIsAttachmentElement(node)) {
            return 1;
          } else {
            return 0;
          }
        };

        acceptSignificantNodes = function(node) {
          if (rejectEmptyTextNodes(node) === NodeFilter.FILTER_ACCEPT) {
            return rejectAttachmentContents(node);
          } else {
            return NodeFilter.FILTER_REJECT;
          }
        };

        rejectEmptyTextNodes = function(node) {
          if (nodeIsEmptyTextNode(node)) {
            return NodeFilter.FILTER_REJECT;
          } else {
            return NodeFilter.FILTER_ACCEPT;
          }
        };

        rejectAttachmentContents = function(node) {
          if (nodeIsAttachmentElement(node.parentNode)) {
            return NodeFilter.FILTER_REJECT;
          } else {
            return NodeFilter.FILTER_ACCEPT;
          }
        };

        return LocationMapper;

      })();

    }).call(this);
    (function() {
      var getDOMRange, setDOMRange,
        slice = [].slice;

      getDOMRange = Trix.getDOMRange, setDOMRange = Trix.setDOMRange;

      Trix.PointMapper = (function() {
        function PointMapper() {}

        PointMapper.prototype.createDOMRangeFromPoint = function(arg) {
          var domRange, offset, offsetNode, originalDOMRange, ref, textRange, x, y;
          x = arg.x, y = arg.y;
          if (document.caretPositionFromPoint) {
            ref = document.caretPositionFromPoint(x, y), offsetNode = ref.offsetNode, offset = ref.offset;
            domRange = document.createRange();
            domRange.setStart(offsetNode, offset);
            return domRange;
          } else if (document.caretRangeFromPoint) {
            return document.caretRangeFromPoint(x, y);
          } else if (document.body.createTextRange) {
            originalDOMRange = getDOMRange();
            try {
              textRange = document.body.createTextRange();
              textRange.moveToPoint(x, y);
              textRange.select();
            } catch (_error) {}
            domRange = getDOMRange();
            setDOMRange(originalDOMRange);
            return domRange;
          }
        };

        PointMapper.prototype.getClientRectsForDOMRange = function(domRange) {
          var end, ref, start;
          ref = slice.call(domRange.getClientRects()), start = ref[0], end = ref[ref.length - 1];
          return [start, end];
        };

        return PointMapper;

      })();

    }).call(this);
    (function() {
      var getDOMRange,
        bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

      getDOMRange = Trix.getDOMRange;

      Trix.SelectionChangeObserver = (function(superClass) {
        var domRangesAreEqual;

        extend(SelectionChangeObserver, superClass);

        function SelectionChangeObserver() {
          this.run = bind(this.run, this);
          this.update = bind(this.update, this);
          this.selectionManagers = [];
        }

        SelectionChangeObserver.prototype.start = function() {
          if (!this.started) {
            this.started = true;
            if ("onselectionchange" in document) {
              return document.addEventListener("selectionchange", this.update, true);
            } else {
              return this.run();
            }
          }
        };

        SelectionChangeObserver.prototype.stop = function() {
          if (this.started) {
            this.started = false;
            return document.removeEventListener("selectionchange", this.update, true);
          }
        };

        SelectionChangeObserver.prototype.registerSelectionManager = function(selectionManager) {
          if (indexOf.call(this.selectionManagers, selectionManager) < 0) {
            this.selectionManagers.push(selectionManager);
            return this.start();
          }
        };

        SelectionChangeObserver.prototype.unregisterSelectionManager = function(selectionManager) {
          var s;
          this.selectionManagers = (function() {
            var i, len, ref, results;
            ref = this.selectionManagers;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              s = ref[i];
              if (s !== selectionManager) {
                results.push(s);
              }
            }
            return results;
          }).call(this);
          if (this.selectionManagers.length === 0) {
            return this.stop();
          }
        };

        SelectionChangeObserver.prototype.notifySelectionManagersOfSelectionChange = function() {
          var i, len, ref, results, selectionManager;
          ref = this.selectionManagers;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            selectionManager = ref[i];
            results.push(selectionManager.selectionDidChange());
          }
          return results;
        };

        SelectionChangeObserver.prototype.update = function() {
          var domRange;
          domRange = getDOMRange();
          if (!domRangesAreEqual(domRange, this.domRange)) {
            this.domRange = domRange;
            return this.notifySelectionManagersOfSelectionChange();
          }
        };

        SelectionChangeObserver.prototype.reset = function() {
          this.domRange = null;
          return this.update();
        };

        SelectionChangeObserver.prototype.run = function() {
          if (this.started) {
            this.update();
            return requestAnimationFrame(this.run);
          }
        };

        domRangesAreEqual = function(left, right) {
          return (left != null ? left.startContainer : void 0) === (right != null ? right.startContainer : void 0) && (left != null ? left.startOffset : void 0) === (right != null ? right.startOffset : void 0) && (left != null ? left.endContainer : void 0) === (right != null ? right.endContainer : void 0) && (left != null ? left.endOffset : void 0) === (right != null ? right.endOffset : void 0);
        };

        return SelectionChangeObserver;

      })(Trix.BasicObject);

      if (Trix.selectionChangeObserver == null) {
        Trix.selectionChangeObserver = new Trix.SelectionChangeObserver;
      }

    }).call(this);
    (function() {
      var elementContainsNode, getDOMRange, getDOMSelection, handleEvent, innerElementIsActive, nodeIsCursorTarget, normalizeRange, rangeIsCollapsed, rangesAreEqual, setDOMRange,
        bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

      getDOMSelection = Trix.getDOMSelection, getDOMRange = Trix.getDOMRange, setDOMRange = Trix.setDOMRange, elementContainsNode = Trix.elementContainsNode, nodeIsCursorTarget = Trix.nodeIsCursorTarget, innerElementIsActive = Trix.innerElementIsActive, handleEvent = Trix.handleEvent, normalizeRange = Trix.normalizeRange, rangeIsCollapsed = Trix.rangeIsCollapsed, rangesAreEqual = Trix.rangesAreEqual;

      Trix.SelectionManager = (function(superClass) {
        extend(SelectionManager, superClass);

        function SelectionManager(element) {
          this.element = element;
          this.selectionDidChange = bind(this.selectionDidChange, this);
          this.didMouseDown = bind(this.didMouseDown, this);
          this.locationMapper = new Trix.LocationMapper(this.element);
          this.pointMapper = new Trix.PointMapper;
          this.lockCount = 0;
          handleEvent("mousedown", {
            onElement: this.element,
            withCallback: this.didMouseDown
          });
        }

        SelectionManager.prototype.getLocationRange = function(options) {
          var locationRange, ref;
          if (options == null) {
            options = {};
          }
          return locationRange = options.strict === false ? this.createLocationRangeFromDOMRange(getDOMRange(), {
            strict: false
          }) : options.ignoreLock ? this.currentLocationRange : (ref = this.lockedLocationRange) != null ? ref : this.currentLocationRange;
        };

        SelectionManager.prototype.setLocationRange = function(locationRange) {
          var domRange;
          if (this.lockedLocationRange) {
            return;
          }
          locationRange = normalizeRange(locationRange);
          if (domRange = this.createDOMRangeFromLocationRange(locationRange)) {
            setDOMRange(domRange);
            return this.updateCurrentLocationRange(locationRange);
          }
        };

        SelectionManager.prototype.setLocationRangeFromPointRange = function(pointRange) {
          var endLocation, startLocation;
          pointRange = normalizeRange(pointRange);
          startLocation = this.getLocationAtPoint(pointRange[0]);
          endLocation = this.getLocationAtPoint(pointRange[1]);
          return this.setLocationRange([startLocation, endLocation]);
        };

        SelectionManager.prototype.getClientRectAtLocationRange = function(locationRange) {
          var domRange;
          if (domRange = this.createDOMRangeFromLocationRange(locationRange)) {
            return this.getClientRectsForDOMRange(domRange)[1];
          }
        };

        SelectionManager.prototype.locationIsCursorTarget = function(location) {
          var node, offset, ref;
          ref = this.findNodeAndOffsetFromLocation(location), node = ref[0], offset = ref[1];
          return nodeIsCursorTarget(node);
        };

        SelectionManager.prototype.lock = function() {
          if (this.lockCount++ === 0) {
            this.updateCurrentLocationRange();
            return this.lockedLocationRange = this.getLocationRange();
          }
        };

        SelectionManager.prototype.unlock = function() {
          var lockedLocationRange;
          if (--this.lockCount === 0) {
            lockedLocationRange = this.lockedLocationRange;
            this.lockedLocationRange = null;
            if (lockedLocationRange != null) {
              return this.setLocationRange(lockedLocationRange);
            }
          }
        };

        SelectionManager.prototype.clearSelection = function() {
          var ref;
          return (ref = getDOMSelection()) != null ? ref.removeAllRanges() : void 0;
        };

        SelectionManager.prototype.selectionIsCollapsed = function() {
          var ref;
          return ((ref = getDOMRange()) != null ? ref.collapsed : void 0) === true;
        };

        SelectionManager.prototype.selectionIsExpanded = function() {
          return !this.selectionIsCollapsed();
        };

        SelectionManager.proxyMethod("locationMapper.findLocationFromContainerAndOffset");

        SelectionManager.proxyMethod("locationMapper.findContainerAndOffsetFromLocation");

        SelectionManager.proxyMethod("locationMapper.findNodeAndOffsetFromLocation");

        SelectionManager.proxyMethod("pointMapper.createDOMRangeFromPoint");

        SelectionManager.proxyMethod("pointMapper.getClientRectsForDOMRange");

        SelectionManager.prototype.didMouseDown = function() {
          return this.pauseTemporarily();
        };

        SelectionManager.prototype.pauseTemporarily = function() {
          var eventName, resume, resumeHandlers, resumeTimeout;
          this.paused = true;
          resume = (function(_this) {
            return function() {
              var handler, i, len;
              _this.paused = false;
              clearTimeout(resumeTimeout);
              for (i = 0, len = resumeHandlers.length; i < len; i++) {
                handler = resumeHandlers[i];
                handler.destroy();
              }
              if (elementContainsNode(document, _this.element)) {
                return _this.selectionDidChange();
              }
            };
          })(this);
          resumeTimeout = setTimeout(resume, 200);
          return resumeHandlers = (function() {
            var i, len, ref, results;
            ref = ["mousemove", "keydown"];
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              eventName = ref[i];
              results.push(handleEvent(eventName, {
                onElement: document,
                withCallback: resume
              }));
            }
            return results;
          })();
        };

        SelectionManager.prototype.selectionDidChange = function() {
          if (!(this.paused || innerElementIsActive(this.element))) {
            return this.updateCurrentLocationRange();
          }
        };

        SelectionManager.prototype.updateCurrentLocationRange = function(locationRange) {
          var ref;
          if (locationRange != null ? locationRange : locationRange = this.createLocationRangeFromDOMRange(getDOMRange())) {
            if (!rangesAreEqual(locationRange, this.currentLocationRange)) {
              this.currentLocationRange = locationRange;
              return (ref = this.delegate) != null ? typeof ref.locationRangeDidChange === "function" ? ref.locationRangeDidChange(this.currentLocationRange.slice(0)) : void 0 : void 0;
            }
          }
        };

        SelectionManager.prototype.createDOMRangeFromLocationRange = function(locationRange) {
          var domRange, rangeEnd, rangeStart, ref;
          rangeStart = this.findContainerAndOffsetFromLocation(locationRange[0]);
          rangeEnd = rangeIsCollapsed(locationRange) ? rangeStart : (ref = this.findContainerAndOffsetFromLocation(locationRange[1])) != null ? ref : rangeStart;
          if ((rangeStart != null) && (rangeEnd != null)) {
            domRange = document.createRange();
            domRange.setStart.apply(domRange, rangeStart);
            domRange.setEnd.apply(domRange, rangeEnd);
            return domRange;
          }
        };

        SelectionManager.prototype.createLocationRangeFromDOMRange = function(domRange, options) {
          var end, start;
          if (!((domRange != null) && this.domRangeWithinElement(domRange))) {
            return;
          }
          if (!(start = this.findLocationFromContainerAndOffset(domRange.startContainer, domRange.startOffset, options))) {
            return;
          }
          if (!domRange.collapsed) {
            end = this.findLocationFromContainerAndOffset(domRange.endContainer, domRange.endOffset, options);
          }
          return normalizeRange([start, end]);
        };

        SelectionManager.prototype.getLocationAtPoint = function(point) {
          var domRange, ref;
          if (domRange = this.createDOMRangeFromPoint(point)) {
            return (ref = this.createLocationRangeFromDOMRange(domRange)) != null ? ref[0] : void 0;
          }
        };

        SelectionManager.prototype.domRangeWithinElement = function(domRange) {
          if (domRange.collapsed) {
            return elementContainsNode(this.element, domRange.startContainer);
          } else {
            return elementContainsNode(this.element, domRange.startContainer) && elementContainsNode(this.element, domRange.endContainer);
          }
        };

        return SelectionManager;

      })(Trix.BasicObject);

    }).call(this);
    (function() {
      var objectsAreEqual, rangeIsCollapsed, rangesAreEqual,
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty,
        slice = [].slice;

      rangeIsCollapsed = Trix.rangeIsCollapsed, rangesAreEqual = Trix.rangesAreEqual, objectsAreEqual = Trix.objectsAreEqual;

      Trix.EditorController = (function(superClass) {
        extend(EditorController, superClass);

        function EditorController(arg) {
          var document, html;
          this.editorElement = arg.editorElement, document = arg.document, html = arg.html;
          this.selectionManager = new Trix.SelectionManager(this.editorElement);
          this.selectionManager.delegate = this;
          this.composition = new Trix.Composition;
          this.composition.delegate = this;
          this.attachmentManager = new Trix.AttachmentManager(this.composition.getAttachments());
          this.attachmentManager.delegate = this;
          this.inputController = new Trix.InputController(this.editorElement);
          this.inputController.delegate = this;
          this.inputController.responder = this.composition;
          this.compositionController = new Trix.CompositionController(this.editorElement, this.composition);
          this.compositionController.delegate = this;
          this.toolbarController = new Trix.ToolbarController(this.editorElement.toolbarElement);
          this.toolbarController.delegate = this;
          this.editor = new Trix.Editor(this.composition, this.selectionManager, this.editorElement);
          if (document != null) {
            this.editor.loadDocument(document);
          } else {
            this.editor.loadHTML(html);
          }
        }

        EditorController.prototype.registerSelectionManager = function() {
          return Trix.selectionChangeObserver.registerSelectionManager(this.selectionManager);
        };

        EditorController.prototype.unregisterSelectionManager = function() {
          return Trix.selectionChangeObserver.unregisterSelectionManager(this.selectionManager);
        };

        EditorController.prototype.compositionDidChangeDocument = function(document) {
          this.notifyEditorElement("document-change");
          if (!this.handlingInput) {
            return this.render();
          }
        };

        EditorController.prototype.compositionDidChangeCurrentAttributes = function(currentAttributes) {
          this.currentAttributes = currentAttributes;
          this.toolbarController.updateAttributes(this.currentAttributes);
          this.updateCurrentActions();
          return this.notifyEditorElement("attributes-change", {
            attributes: this.currentAttributes
          });
        };

        EditorController.prototype.compositionDidPerformInsertionAtRange = function(range) {
          if (this.pasting) {
            return this.pastedRange = range;
          }
        };

        EditorController.prototype.compositionShouldAcceptFile = function(file) {
          return this.notifyEditorElement("file-accept", {
            file: file
          });
        };

        EditorController.prototype.compositionDidAddAttachment = function(attachment) {
          var managedAttachment;
          managedAttachment = this.attachmentManager.manageAttachment(attachment);
          return this.notifyEditorElement("attachment-add", {
            attachment: managedAttachment
          });
        };

        EditorController.prototype.compositionDidEditAttachment = function(attachment) {
          var managedAttachment;
          this.compositionController.rerenderViewForObject(attachment);
          managedAttachment = this.attachmentManager.manageAttachment(attachment);
          this.notifyEditorElement("attachment-edit", {
            attachment: managedAttachment
          });
          return this.notifyEditorElement("change");
        };

        EditorController.prototype.compositionDidChangeAttachmentPreviewURL = function(attachment) {
          this.compositionController.invalidateViewForObject(attachment);
          return this.notifyEditorElement("change");
        };

        EditorController.prototype.compositionDidRemoveAttachment = function(attachment) {
          var managedAttachment;
          managedAttachment = this.attachmentManager.unmanageAttachment(attachment);
          return this.notifyEditorElement("attachment-remove", {
            attachment: managedAttachment
          });
        };

        EditorController.prototype.compositionDidStartEditingAttachment = function(attachment) {
          this.attachmentLocationRange = this.composition.document.getLocationRangeOfAttachment(attachment);
          this.compositionController.installAttachmentEditorForAttachment(attachment);
          return this.selectionManager.setLocationRange(this.attachmentLocationRange);
        };

        EditorController.prototype.compositionDidStopEditingAttachment = function(attachment) {
          this.compositionController.uninstallAttachmentEditor();
          return this.attachmentLocationRange = null;
        };

        EditorController.prototype.compositionDidRequestChangingSelectionToLocationRange = function(locationRange) {
          if (this.loadingSnapshot && !this.isFocused()) {
            return;
          }
          this.requestedLocationRange = locationRange;
          this.compositionRevisionWhenLocationRangeRequested = this.composition.revision;
          if (!this.handlingInput) {
            return this.render();
          }
        };

        EditorController.prototype.compositionWillLoadSnapshot = function() {
          return this.loadingSnapshot = true;
        };

        EditorController.prototype.compositionDidLoadSnapshot = function() {
          this.compositionController.refreshViewCache();
          this.render();
          return this.loadingSnapshot = false;
        };

        EditorController.prototype.getSelectionManager = function() {
          return this.selectionManager;
        };

        EditorController.proxyMethod("getSelectionManager().setLocationRange");

        EditorController.proxyMethod("getSelectionManager().getLocationRange");

        EditorController.prototype.attachmentManagerDidRequestRemovalOfAttachment = function(attachment) {
          return this.removeAttachment(attachment);
        };

        EditorController.prototype.compositionControllerWillSyncDocumentView = function() {
          this.inputController.editorWillSyncDocumentView();
          this.selectionManager.lock();
          return this.selectionManager.clearSelection();
        };

        EditorController.prototype.compositionControllerDidSyncDocumentView = function() {
          this.inputController.editorDidSyncDocumentView();
          this.selectionManager.unlock();
          this.updateCurrentActions();
          return this.notifyEditorElement("sync");
        };

        EditorController.prototype.compositionControllerDidRender = function() {
          if (this.requestedLocationRange != null) {
            if (this.compositionRevisionWhenLocationRangeRequested === this.composition.revision) {
              this.selectionManager.setLocationRange(this.requestedLocationRange);
            }
            this.requestedLocationRange = null;
            this.compositionRevisionWhenLocationRangeRequested = null;
          }
          if (this.renderedCompositionRevision !== this.composition.revision) {
            this.composition.updateCurrentAttributes();
            this.notifyEditorElement("render");
          }
          return this.renderedCompositionRevision = this.composition.revision;
        };

        EditorController.prototype.compositionControllerDidFocus = function() {
          this.toolbarController.hideDialog();
          return this.notifyEditorElement("focus");
        };

        EditorController.prototype.compositionControllerDidBlur = function() {
          return this.notifyEditorElement("blur");
        };

        EditorController.prototype.compositionControllerDidSelectAttachment = function(attachment) {
          return this.composition.editAttachment(attachment);
        };

        EditorController.prototype.compositionControllerDidRequestDeselectingAttachment = function(attachment) {
          var locationRange, ref;
          locationRange = (ref = this.attachmentLocationRange) != null ? ref : this.composition.document.getLocationRangeOfAttachment(attachment);
          return this.selectionManager.setLocationRange(locationRange[1]);
        };

        EditorController.prototype.compositionControllerWillUpdateAttachment = function(attachment) {
          return this.editor.recordUndoEntry("Edit Attachment", {
            context: attachment.id,
            consolidatable: true
          });
        };

        EditorController.prototype.compositionControllerDidRequestRemovalOfAttachment = function(attachment) {
          return this.removeAttachment(attachment);
        };

        EditorController.prototype.inputControllerWillHandleInput = function() {
          this.handlingInput = true;
          return this.requestedRender = false;
        };

        EditorController.prototype.inputControllerDidRequestRender = function() {
          return this.requestedRender = true;
        };

        EditorController.prototype.inputControllerDidHandleInput = function() {
          this.handlingInput = false;
          if (this.requestedRender) {
            this.requestedRender = false;
            return this.render();
          }
        };

        EditorController.prototype.inputControllerDidAllowUnhandledInput = function() {
          return this.notifyEditorElement("change");
        };

        EditorController.prototype.inputControllerDidRequestReparse = function() {
          return this.reparse();
        };

        EditorController.prototype.inputControllerWillPerformTyping = function() {
          return this.recordTypingUndoEntry();
        };

        EditorController.prototype.inputControllerWillCutText = function() {
          return this.editor.recordUndoEntry("Cut");
        };

        EditorController.prototype.inputControllerWillPaste = function(paste) {
          this.editor.recordUndoEntry("Paste");
          this.pasting = true;
          return this.notifyEditorElement("before-paste", {
            paste: paste
          });
        };

        EditorController.prototype.inputControllerDidPaste = function(paste) {
          paste.range = this.pastedRange;
          this.pastedRange = null;
          this.pasting = null;
          return this.notifyEditorElement("paste", {
            paste: paste
          });
        };

        EditorController.prototype.inputControllerWillMoveText = function() {
          return this.editor.recordUndoEntry("Move");
        };

        EditorController.prototype.inputControllerWillAttachFiles = function() {
          return this.editor.recordUndoEntry("Drop Files");
        };

        EditorController.prototype.inputControllerDidReceiveKeyboardCommand = function(keys) {
          return this.toolbarController.applyKeyboardCommand(keys);
        };

        EditorController.prototype.inputControllerDidStartDrag = function() {
          return this.locationRangeBeforeDrag = this.selectionManager.getLocationRange();
        };

        EditorController.prototype.inputControllerDidReceiveDragOverPoint = function(point) {
          return this.selectionManager.setLocationRangeFromPointRange(point);
        };

        EditorController.prototype.inputControllerDidCancelDrag = function() {
          this.selectionManager.setLocationRange(this.locationRangeBeforeDrag);
          return this.locationRangeBeforeDrag = null;
        };

        EditorController.prototype.locationRangeDidChange = function(locationRange) {
          this.composition.updateCurrentAttributes();
          this.updateCurrentActions();
          if (this.attachmentLocationRange && !rangesAreEqual(this.attachmentLocationRange, locationRange)) {
            this.composition.stopEditingAttachment();
          }
          return this.notifyEditorElement("selection-change");
        };

        EditorController.prototype.toolbarDidClickButton = function() {
          if (!this.getLocationRange()) {
            return this.setLocationRange({
              index: 0,
              offset: 0
            });
          }
        };

        EditorController.prototype.toolbarDidInvokeAction = function(actionName) {
          return this.invokeAction(actionName);
        };

        EditorController.prototype.toolbarDidToggleAttribute = function(attributeName) {
          this.recordFormattingUndoEntry();
          this.composition.toggleCurrentAttribute(attributeName);
          this.render();
          if (!this.selectionFrozen) {
            return this.editorElement.focus();
          }
        };

        EditorController.prototype.toolbarDidUpdateAttribute = function(attributeName, value) {
          this.recordFormattingUndoEntry();
          this.composition.setCurrentAttribute(attributeName, value);
          this.render();
          if (!this.selectionFrozen) {
            return this.editorElement.focus();
          }
        };

        EditorController.prototype.toolbarDidRemoveAttribute = function(attributeName) {
          this.recordFormattingUndoEntry();
          this.composition.removeCurrentAttribute(attributeName);
          this.render();
          if (!this.selectionFrozen) {
            return this.editorElement.focus();
          }
        };

        EditorController.prototype.toolbarWillShowDialog = function(dialogElement) {
          this.composition.expandSelectionForEditing();
          return this.freezeSelection();
        };

        EditorController.prototype.toolbarDidShowDialog = function(dialogName) {
          return this.notifyEditorElement("toolbar-dialog-show", {
            dialogName: dialogName
          });
        };

        EditorController.prototype.toolbarDidHideDialog = function(dialogName) {
          this.thawSelection();
          this.editorElement.focus();
          return this.notifyEditorElement("toolbar-dialog-hide", {
            dialogName: dialogName
          });
        };

        EditorController.prototype.freezeSelection = function() {
          if (!this.selectionFrozen) {
            this.selectionManager.lock();
            this.composition.freezeSelection();
            this.selectionFrozen = true;
            return this.render();
          }
        };

        EditorController.prototype.thawSelection = function() {
          if (this.selectionFrozen) {
            this.composition.thawSelection();
            this.selectionManager.unlock();
            this.selectionFrozen = false;
            return this.render();
          }
        };

        EditorController.prototype.actions = {
          undo: {
            test: function() {
              return this.editor.canUndo();
            },
            perform: function() {
              return this.editor.undo();
            }
          },
          redo: {
            test: function() {
              return this.editor.canRedo();
            },
            perform: function() {
              return this.editor.redo();
            }
          },
          link: {
            test: function() {
              return this.editor.canActivateAttribute("href");
            }
          },
          increaseNestingLevel: {
            test: function() {
              return this.editor.canIncreaseNestingLevel();
            },
            perform: function() {
              return this.editor.increaseNestingLevel() && this.render();
            }
          },
          decreaseNestingLevel: {
            test: function() {
              return this.editor.canDecreaseNestingLevel();
            },
            perform: function() {
              return this.editor.decreaseNestingLevel() && this.render();
            }
          },
          increaseBlockLevel: {
            test: function() {
              return this.editor.canIncreaseNestingLevel();
            },
            perform: function() {
              return this.editor.increaseNestingLevel() && this.render();
            }
          },
          decreaseBlockLevel: {
            test: function() {
              return this.editor.canDecreaseNestingLevel();
            },
            perform: function() {
              return this.editor.decreaseNestingLevel() && this.render();
            }
          }
        };

        EditorController.prototype.canInvokeAction = function(actionName) {
          var ref, ref1;
          if (this.actionIsExternal(actionName)) {
            return true;
          } else {
            return !!((ref = this.actions[actionName]) != null ? (ref1 = ref.test) != null ? ref1.call(this) : void 0 : void 0);
          }
        };

        EditorController.prototype.invokeAction = function(actionName) {
          var ref, ref1;
          if (this.actionIsExternal(actionName)) {
            return this.notifyEditorElement("action-invoke", {
              actionName: actionName
            });
          } else {
            return (ref = this.actions[actionName]) != null ? (ref1 = ref.perform) != null ? ref1.call(this) : void 0 : void 0;
          }
        };

        EditorController.prototype.actionIsExternal = function(actionName) {
          return /^x-./.test(actionName);
        };

        EditorController.prototype.getCurrentActions = function() {
          var actionName, result;
          result = {};
          for (actionName in this.actions) {
            result[actionName] = this.canInvokeAction(actionName);
          }
          return result;
        };

        EditorController.prototype.updateCurrentActions = function() {
          var currentActions;
          currentActions = this.getCurrentActions();
          if (!objectsAreEqual(currentActions, this.currentActions)) {
            this.currentActions = currentActions;
            this.toolbarController.updateActions(this.currentActions);
            return this.notifyEditorElement("actions-change", {
              actions: this.currentActions
            });
          }
        };

        EditorController.prototype.reparse = function() {
          return this.composition.replaceHTML(this.editorElement.innerHTML);
        };

        EditorController.prototype.render = function() {
          return this.compositionController.render();
        };

        EditorController.prototype.updateInputElement = function() {
          var element, value;
          element = this.compositionController.getSerializableElement();
          value = Trix.serializeToContentType(element, "text/html");
          return this.editorElement.setInputElementValue(value);
        };

        EditorController.prototype.notifyEditorElement = function(message, data) {
          switch (message) {
            case "document-change":
              this.documentChangedSinceLastRender = true;
              break;
            case "render":
              if (this.documentChangedSinceLastRender) {
                this.documentChangedSinceLastRender = false;
                this.notifyEditorElement("change");
              }
              break;
            case "change":
            case "attachment-add":
            case "attachment-edit":
            case "attachment-remove":
              this.updateInputElement();
          }
          return this.editorElement.notify(message, data);
        };

        EditorController.prototype.removeAttachment = function(attachment) {
          this.editor.recordUndoEntry("Delete Attachment");
          this.composition.removeAttachment(attachment);
          return this.render();
        };

        EditorController.prototype.recordFormattingUndoEntry = function() {
          var locationRange;
          locationRange = this.selectionManager.getLocationRange();
          if (!rangeIsCollapsed(locationRange)) {
            return this.editor.recordUndoEntry("Formatting", {
              context: this.getUndoContext(),
              consolidatable: true
            });
          }
        };

        EditorController.prototype.recordTypingUndoEntry = function() {
          return this.editor.recordUndoEntry("Typing", {
            context: this.getUndoContext(this.currentAttributes),
            consolidatable: true
          });
        };

        EditorController.prototype.getUndoContext = function() {
          var context;
          context = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return [this.getLocationContext(), this.getTimeContext()].concat(slice.call(context));
        };

        EditorController.prototype.getLocationContext = function() {
          var locationRange;
          locationRange = this.selectionManager.getLocationRange();
          if (rangeIsCollapsed(locationRange)) {
            return locationRange[0].index;
          } else {
            return locationRange;
          }
        };

        EditorController.prototype.getTimeContext = function() {
          if (Trix.config.undoInterval > 0) {
            return Math.floor(new Date().getTime() / Trix.config.undoInterval);
          } else {
            return 0;
          }
        };

        EditorController.prototype.isFocused = function() {
          var ref;
          return this.editorElement === ((ref = this.editorElement.ownerDocument) != null ? ref.activeElement : void 0);
        };

        return EditorController;

      })(Trix.Controller);

    }).call(this);
    (function() {
      var attachmentSelector, handleEvent, handleEventOnce, makeElement, triggerEvent;

      makeElement = Trix.makeElement, triggerEvent = Trix.triggerEvent, handleEvent = Trix.handleEvent, handleEventOnce = Trix.handleEventOnce;

      attachmentSelector = Trix.AttachmentView.attachmentSelector;

      Trix.registerElement("trix-editor", (function() {
        var autofocus, browserForcesObjectResizing, configureContentEditable, cursorTargetStyles, disableObjectResizing, id, makeEditable, setDefaultParagraphSeparator;
        id = 0;
        autofocus = function(element) {
          if (!document.querySelector(":focus")) {
            if (element.hasAttribute("autofocus") && document.querySelector("[autofocus]") === element) {
              return element.focus();
            }
          }
        };
        makeEditable = function(element) {
          if (element.hasAttribute("contenteditable")) {
            return;
          }
          element.setAttribute("contenteditable", "");
          return handleEventOnce("focus", {
            onElement: element,
            withCallback: function() {
              return configureContentEditable(element);
            }
          });
        };
        configureContentEditable = function(element) {
          disableObjectResizing(element);
          return setDefaultParagraphSeparator(element);
        };
        disableObjectResizing = function(element) {
          if (typeof document.queryCommandSupported === "function" ? document.queryCommandSupported("enableObjectResizing") : void 0) {
            document.execCommand("enableObjectResizing", false, false);
            return handleEvent("mscontrolselect", {
              onElement: element,
              preventDefault: true
            });
          }
        };
        setDefaultParagraphSeparator = function(element) {
          var tagName;
          if (typeof document.queryCommandSupported === "function" ? document.queryCommandSupported("DefaultParagraphSeparator") : void 0) {
            tagName = Trix.config.blockAttributes["default"].tagName;
            if (tagName === "div" || tagName === "p") {
              return document.execCommand("DefaultParagraphSeparator", false, tagName);
            }
          }
        };
        browserForcesObjectResizing = /Trident.*rv:11/.test(navigator.userAgent);
        cursorTargetStyles = (function() {
          if (browserForcesObjectResizing) {
            return {
              display: "inline",
              width: "auto"
            };
          } else {
            return {
              display: "inline-block",
              width: "1px"
            };
          }
        })();
        return {
          defaultCSS: "%t:empty:not(:focus)::before {\n  content: attr(placeholder);\n  color: graytext;\n}\n\n%t a[contenteditable=false] {\n  cursor: text;\n}\n\n%t img {\n  max-width: 100%;\n  height: auto;\n}\n\n%t " + attachmentSelector + " figcaption textarea {\n  resize: none;\n}\n\n%t " + attachmentSelector + " figcaption textarea.trix-autoresize-clone {\n  position: absolute;\n  left: -9999px;\n  max-height: 0px;\n}\n\n%t " + attachmentSelector + " figcaption[data-trix-placeholder]:empty::before {\n  content: attr(data-trix-placeholder);\n  color: graytext;\n}\n\n%t [data-trix-cursor-target] {\n  display: " + cursorTargetStyles.display + " !important;\n  width: " + cursorTargetStyles.width + " !important;\n  padding: 0 !important;\n  margin: 0 !important;\n  border: none !important;\n}\n\n%t [data-trix-cursor-target=left] {\n  vertical-align: top !important;\n  margin-left: -1px !important;\n}\n\n%t [data-trix-cursor-target=right] {\n  vertical-align: bottom !important;\n  margin-right: -1px !important;\n}",
          trixId: {
            get: function() {
              if (this.hasAttribute("trix-id")) {
                return this.getAttribute("trix-id");
              } else {
                this.setAttribute("trix-id", ++id);
                return this.trixId;
              }
            }
          },
          toolbarElement: {
            get: function() {
              var element, ref, toolbarId;
              if (this.hasAttribute("toolbar")) {
                return (ref = this.ownerDocument) != null ? ref.getElementById(this.getAttribute("toolbar")) : void 0;
              } else if (this.parentNode) {
                toolbarId = "trix-toolbar-" + this.trixId;
                this.setAttribute("toolbar", toolbarId);
                element = makeElement("trix-toolbar", {
                  id: toolbarId
                });
                this.parentNode.insertBefore(element, this);
                return element;
              }
            }
          },
          inputElement: {
            get: function() {
              var element, inputId, ref;
              if (this.hasAttribute("input")) {
                return (ref = this.ownerDocument) != null ? ref.getElementById(this.getAttribute("input")) : void 0;
              } else if (this.parentNode) {
                inputId = "trix-input-" + this.trixId;
                this.setAttribute("input", inputId);
                element = makeElement("input", {
                  type: "hidden",
                  id: inputId
                });
                this.parentNode.insertBefore(element, this.nextElementSibling);
                return element;
              }
            }
          },
          editor: {
            get: function() {
              var ref;
              return (ref = this.editorController) != null ? ref.editor : void 0;
            }
          },
          name: {
            get: function() {
              var ref;
              return (ref = this.inputElement) != null ? ref.name : void 0;
            }
          },
          value: {
            get: function() {
              var ref;
              return (ref = this.inputElement) != null ? ref.value : void 0;
            },
            set: function(defaultValue) {
              var ref;
              this.defaultValue = defaultValue;
              return (ref = this.editor) != null ? ref.loadHTML(this.defaultValue) : void 0;
            }
          },
          notify: function(message, data) {
            if (this.editorController) {
              return triggerEvent("trix-" + message, {
                onElement: this,
                attributes: data
              });
            }
          },
          setInputElementValue: function(value) {
            var ref;
            return (ref = this.inputElement) != null ? ref.value = value : void 0;
          },
          createdCallback: function() {
            return makeEditable(this);
          },
          attachedCallback: function() {
            if (!this.hasAttribute("data-trix-internal")) {
              if (this.editorController == null) {
                this.editorController = new Trix.EditorController({
                  editorElement: this,
                  html: this.defaultValue = this.value
                });
              }
              this.editorController.registerSelectionManager();
              this.registerResetListener();
              autofocus(this);
              return requestAnimationFrame((function(_this) {
                return function() {
                  return _this.notify("initialize");
                };
              })(this));
            }
          },
          detachedCallback: function() {
            var ref;
            if ((ref = this.editorController) != null) {
              ref.unregisterSelectionManager();
            }
            return this.unregisterResetListener();
          },
          registerResetListener: function() {
            this.resetListener = this.resetBubbled.bind(this);
            return window.addEventListener("reset", this.resetListener, false);
          },
          unregisterResetListener: function() {
            return window.removeEventListener("reset", this.resetListener, false);
          },
          resetBubbled: function(event) {
            var ref;
            if (event.target === ((ref = this.inputElement) != null ? ref.form : void 0)) {
              if (!event.defaultPrevented) {
                return this.reset();
              }
            }
          },
          reset: function() {
            return this.value = this.defaultValue;
          }
        };
      })());

    }).call(this);
    (function() {


    }).call(this);
  }).call(this);

  if (typeof module === "object" && module.exports) {
    module.exports = Trix;
  } else if (typeof define === "function" && define.amd) {
    define(Trix);
  }
}).call(this);
