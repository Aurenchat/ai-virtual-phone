/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 221:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var React = __webpack_require__(540);
function formatProdErrorMessage(code) {
  var url = "https://react.dev/errors/" + code;
  if (1 < arguments.length) {
    url += "?args[]=" + encodeURIComponent(arguments[1]);
    for (var i = 2; i < arguments.length; i++)
      url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return (
    "Minified React error #" +
    code +
    "; visit " +
    url +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
function noop() {}
var Internals = {
    d: {
      f: noop,
      r: function () {
        throw Error(formatProdErrorMessage(522));
      },
      D: noop,
      C: noop,
      L: noop,
      m: noop,
      X: noop,
      S: noop,
      M: noop
    },
    p: 0,
    findDOMNode: null
  },
  REACT_PORTAL_TYPE = Symbol.for("react.portal");
function createPortal$1(children, containerInfo, implementation) {
  var key =
    3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key: null == key ? null : "" + key,
    children: children,
    containerInfo: containerInfo,
    implementation: implementation
  };
}
var ReactSharedInternals =
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function getCrossOriginStringAs(as, input) {
  if ("font" === as) return "";
  if ("string" === typeof input)
    return "use-credentials" === input ? input : "";
}
exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
  Internals;
exports.createPortal = function (children, container) {
  var key =
    2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (
    !container ||
    (1 !== container.nodeType &&
      9 !== container.nodeType &&
      11 !== container.nodeType)
  )
    throw Error(formatProdErrorMessage(299));
  return createPortal$1(children, container, null, key);
};
exports.flushSync = function (fn) {
  var previousTransition = ReactSharedInternals.T,
    previousUpdatePriority = Internals.p;
  try {
    if (((ReactSharedInternals.T = null), (Internals.p = 2), fn)) return fn();
  } finally {
    (ReactSharedInternals.T = previousTransition),
      (Internals.p = previousUpdatePriority),
      Internals.d.f();
  }
};
exports.preconnect = function (href, options) {
  "string" === typeof href &&
    (options
      ? ((options = options.crossOrigin),
        (options =
          "string" === typeof options
            ? "use-credentials" === options
              ? options
              : ""
            : void 0))
      : (options = null),
    Internals.d.C(href, options));
};
exports.prefetchDNS = function (href) {
  "string" === typeof href && Internals.d.D(href);
};
exports.preinit = function (href, options) {
  if ("string" === typeof href && options && "string" === typeof options.as) {
    var as = options.as,
      crossOrigin = getCrossOriginStringAs(as, options.crossOrigin),
      integrity =
        "string" === typeof options.integrity ? options.integrity : void 0,
      fetchPriority =
        "string" === typeof options.fetchPriority
          ? options.fetchPriority
          : void 0;
    "style" === as
      ? Internals.d.S(
          href,
          "string" === typeof options.precedence ? options.precedence : void 0,
          {
            crossOrigin: crossOrigin,
            integrity: integrity,
            fetchPriority: fetchPriority
          }
        )
      : "script" === as &&
        Internals.d.X(href, {
          crossOrigin: crossOrigin,
          integrity: integrity,
          fetchPriority: fetchPriority,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0
        });
  }
};
exports.preinitModule = function (href, options) {
  if ("string" === typeof href)
    if ("object" === typeof options && null !== options) {
      if (null == options.as || "script" === options.as) {
        var crossOrigin = getCrossOriginStringAs(
          options.as,
          options.crossOrigin
        );
        Internals.d.M(href, {
          crossOrigin: crossOrigin,
          integrity:
            "string" === typeof options.integrity ? options.integrity : void 0,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0
        });
      }
    } else null == options && Internals.d.M(href);
};
exports.preload = function (href, options) {
  if (
    "string" === typeof href &&
    "object" === typeof options &&
    null !== options &&
    "string" === typeof options.as
  ) {
    var as = options.as,
      crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
    Internals.d.L(href, as, {
      crossOrigin: crossOrigin,
      integrity:
        "string" === typeof options.integrity ? options.integrity : void 0,
      nonce: "string" === typeof options.nonce ? options.nonce : void 0,
      type: "string" === typeof options.type ? options.type : void 0,
      fetchPriority:
        "string" === typeof options.fetchPriority
          ? options.fetchPriority
          : void 0,
      referrerPolicy:
        "string" === typeof options.referrerPolicy
          ? options.referrerPolicy
          : void 0,
      imageSrcSet:
        "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
      imageSizes:
        "string" === typeof options.imageSizes ? options.imageSizes : void 0,
      media: "string" === typeof options.media ? options.media : void 0
    });
  }
};
exports.preloadModule = function (href, options) {
  if ("string" === typeof href)
    if (options) {
      var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
      Internals.d.m(href, {
        as:
          "string" === typeof options.as && "script" !== options.as
            ? options.as
            : void 0,
        crossOrigin: crossOrigin,
        integrity:
          "string" === typeof options.integrity ? options.integrity : void 0
      });
    } else Internals.d.m(href);
};
exports.requestFormReset = function (form) {
  Internals.d.r(form);
};
exports.unstable_batchedUpdates = function (fn, a) {
  return fn(a);
};
exports.useFormState = function (action, initialState, permalink) {
  return ReactSharedInternals.H.useFormState(action, initialState, permalink);
};
exports.useFormStatus = function () {
  return ReactSharedInternals.H.useHostTransitionStatus();
};
exports.version = "19.2.4";


/***/ }),

/***/ 247:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 Modernizr 3.0.0pre (Custom Build) | MIT
*/

var Scheduler = __webpack_require__(982),
  React = __webpack_require__(540),
  ReactDOM = __webpack_require__(961);
function formatProdErrorMessage(code) {
  var url = "https://react.dev/errors/" + code;
  if (1 < arguments.length) {
    url += "?args[]=" + encodeURIComponent(arguments[1]);
    for (var i = 2; i < arguments.length; i++)
      url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return (
    "Minified React error #" +
    code +
    "; visit " +
    url +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
function isValidContainer(node) {
  return !(
    !node ||
    (1 !== node.nodeType && 9 !== node.nodeType && 11 !== node.nodeType)
  );
}
function getNearestMountedFiber(fiber) {
  var node = fiber,
    nearestMounted = fiber;
  if (fiber.alternate) for (; node.return; ) node = node.return;
  else {
    fiber = node;
    do
      (node = fiber),
        0 !== (node.flags & 4098) && (nearestMounted = node.return),
        (fiber = node.return);
    while (fiber);
  }
  return 3 === node.tag ? nearestMounted : null;
}
function getSuspenseInstanceFromFiber(fiber) {
  if (13 === fiber.tag) {
    var suspenseState = fiber.memoizedState;
    null === suspenseState &&
      ((fiber = fiber.alternate),
      null !== fiber && (suspenseState = fiber.memoizedState));
    if (null !== suspenseState) return suspenseState.dehydrated;
  }
  return null;
}
function getActivityInstanceFromFiber(fiber) {
  if (31 === fiber.tag) {
    var activityState = fiber.memoizedState;
    null === activityState &&
      ((fiber = fiber.alternate),
      null !== fiber && (activityState = fiber.memoizedState));
    if (null !== activityState) return activityState.dehydrated;
  }
  return null;
}
function assertIsMounted(fiber) {
  if (getNearestMountedFiber(fiber) !== fiber)
    throw Error(formatProdErrorMessage(188));
}
function findCurrentFiberUsingSlowPath(fiber) {
  var alternate = fiber.alternate;
  if (!alternate) {
    alternate = getNearestMountedFiber(fiber);
    if (null === alternate) throw Error(formatProdErrorMessage(188));
    return alternate !== fiber ? null : fiber;
  }
  for (var a = fiber, b = alternate; ; ) {
    var parentA = a.return;
    if (null === parentA) break;
    var parentB = parentA.alternate;
    if (null === parentB) {
      b = parentA.return;
      if (null !== b) {
        a = b;
        continue;
      }
      break;
    }
    if (parentA.child === parentB.child) {
      for (parentB = parentA.child; parentB; ) {
        if (parentB === a) return assertIsMounted(parentA), fiber;
        if (parentB === b) return assertIsMounted(parentA), alternate;
        parentB = parentB.sibling;
      }
      throw Error(formatProdErrorMessage(188));
    }
    if (a.return !== b.return) (a = parentA), (b = parentB);
    else {
      for (var didFindChild = !1, child$0 = parentA.child; child$0; ) {
        if (child$0 === a) {
          didFindChild = !0;
          a = parentA;
          b = parentB;
          break;
        }
        if (child$0 === b) {
          didFindChild = !0;
          b = parentA;
          a = parentB;
          break;
        }
        child$0 = child$0.sibling;
      }
      if (!didFindChild) {
        for (child$0 = parentB.child; child$0; ) {
          if (child$0 === a) {
            didFindChild = !0;
            a = parentB;
            b = parentA;
            break;
          }
          if (child$0 === b) {
            didFindChild = !0;
            b = parentB;
            a = parentA;
            break;
          }
          child$0 = child$0.sibling;
        }
        if (!didFindChild) throw Error(formatProdErrorMessage(189));
      }
    }
    if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
  }
  if (3 !== a.tag) throw Error(formatProdErrorMessage(188));
  return a.stateNode.current === a ? fiber : alternate;
}
function findCurrentHostFiberImpl(node) {
  var tag = node.tag;
  if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
  for (node = node.child; null !== node; ) {
    tag = findCurrentHostFiberImpl(node);
    if (null !== tag) return tag;
    node = node.sibling;
  }
  return null;
}
var assign = Object.assign,
  REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"),
  REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy");
Symbol.for("react.scope");
var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
Symbol.for("react.legacy_hidden");
Symbol.for("react.tracing_marker");
var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
Symbol.for("react.view_transition");
var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
function getComponentNameFromType(type) {
  if (null == type) return null;
  if ("function" === typeof type)
    return type.$$typeof === REACT_CLIENT_REFERENCE
      ? null
      : type.displayName || type.name || null;
  if ("string" === typeof type) return type;
  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return "Fragment";
    case REACT_PROFILER_TYPE:
      return "Profiler";
    case REACT_STRICT_MODE_TYPE:
      return "StrictMode";
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
    case REACT_ACTIVITY_TYPE:
      return "Activity";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_CONTEXT_TYPE:
        return type.displayName || "Context";
      case REACT_CONSUMER_TYPE:
        return (type._context.displayName || "Context") + ".Consumer";
      case REACT_FORWARD_REF_TYPE:
        var innerType = type.render;
        type = type.displayName;
        type ||
          ((type = innerType.displayName || innerType.name || ""),
          (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
        return type;
      case REACT_MEMO_TYPE:
        return (
          (innerType = type.displayName || null),
          null !== innerType
            ? innerType
            : getComponentNameFromType(type.type) || "Memo"
        );
      case REACT_LAZY_TYPE:
        innerType = type._payload;
        type = type._init;
        try {
          return getComponentNameFromType(type(innerType));
        } catch (x) {}
    }
  return null;
}
var isArrayImpl = Array.isArray,
  ReactSharedInternals =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  ReactDOMSharedInternals =
    ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  sharedNotPendingObject = {
    pending: !1,
    data: null,
    method: null,
    action: null
  },
  valueStack = [],
  index = -1;
function createCursor(defaultValue) {
  return { current: defaultValue };
}
function pop(cursor) {
  0 > index ||
    ((cursor.current = valueStack[index]), (valueStack[index] = null), index--);
}
function push(cursor, value) {
  index++;
  valueStack[index] = cursor.current;
  cursor.current = value;
}
var contextStackCursor = createCursor(null),
  contextFiberStackCursor = createCursor(null),
  rootInstanceStackCursor = createCursor(null),
  hostTransitionProviderCursor = createCursor(null);
function pushHostContainer(fiber, nextRootInstance) {
  push(rootInstanceStackCursor, nextRootInstance);
  push(contextFiberStackCursor, fiber);
  push(contextStackCursor, null);
  switch (nextRootInstance.nodeType) {
    case 9:
    case 11:
      fiber = (fiber = nextRootInstance.documentElement)
        ? (fiber = fiber.namespaceURI)
          ? getOwnHostContext(fiber)
          : 0
        : 0;
      break;
    default:
      if (
        ((fiber = nextRootInstance.tagName),
        (nextRootInstance = nextRootInstance.namespaceURI))
      )
        (nextRootInstance = getOwnHostContext(nextRootInstance)),
          (fiber = getChildHostContextProd(nextRootInstance, fiber));
      else
        switch (fiber) {
          case "svg":
            fiber = 1;
            break;
          case "math":
            fiber = 2;
            break;
          default:
            fiber = 0;
        }
  }
  pop(contextStackCursor);
  push(contextStackCursor, fiber);
}
function popHostContainer() {
  pop(contextStackCursor);
  pop(contextFiberStackCursor);
  pop(rootInstanceStackCursor);
}
function pushHostContext(fiber) {
  null !== fiber.memoizedState && push(hostTransitionProviderCursor, fiber);
  var context = contextStackCursor.current;
  var JSCompiler_inline_result = getChildHostContextProd(context, fiber.type);
  context !== JSCompiler_inline_result &&
    (push(contextFiberStackCursor, fiber),
    push(contextStackCursor, JSCompiler_inline_result));
}
function popHostContext(fiber) {
  contextFiberStackCursor.current === fiber &&
    (pop(contextStackCursor), pop(contextFiberStackCursor));
  hostTransitionProviderCursor.current === fiber &&
    (pop(hostTransitionProviderCursor),
    (HostTransitionContext._currentValue = sharedNotPendingObject));
}
var prefix, suffix;
function describeBuiltInComponentFrame(name) {
  if (void 0 === prefix)
    try {
      throw Error();
    } catch (x) {
      var match = x.stack.trim().match(/\n( *(at )?)/);
      prefix = (match && match[1]) || "";
      suffix =
        -1 < x.stack.indexOf("\n    at")
          ? " (<anonymous>)"
          : -1 < x.stack.indexOf("@")
            ? "@unknown:0:0"
            : "";
    }
  return "\n" + prefix + name + suffix;
}
var reentry = !1;
function describeNativeComponentFrame(fn, construct) {
  if (!fn || reentry) return "";
  reentry = !0;
  var previousPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    var RunInRootFrame = {
      DetermineComponentFrameRoot: function () {
        try {
          if (construct) {
            var Fake = function () {
              throw Error();
            };
            Object.defineProperty(Fake.prototype, "props", {
              set: function () {
                throw Error();
              }
            });
            if ("object" === typeof Reflect && Reflect.construct) {
              try {
                Reflect.construct(Fake, []);
              } catch (x) {
                var control = x;
              }
              Reflect.construct(fn, [], Fake);
            } else {
              try {
                Fake.call();
              } catch (x$1) {
                control = x$1;
              }
              fn.call(Fake.prototype);
            }
          } else {
            try {
              throw Error();
            } catch (x$2) {
              control = x$2;
            }
            (Fake = fn()) &&
              "function" === typeof Fake.catch &&
              Fake.catch(function () {});
          }
        } catch (sample) {
          if (sample && control && "string" === typeof sample.stack)
            return [sample.stack, control.stack];
        }
        return [null, null];
      }
    };
    RunInRootFrame.DetermineComponentFrameRoot.displayName =
      "DetermineComponentFrameRoot";
    var namePropDescriptor = Object.getOwnPropertyDescriptor(
      RunInRootFrame.DetermineComponentFrameRoot,
      "name"
    );
    namePropDescriptor &&
      namePropDescriptor.configurable &&
      Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
    var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(),
      sampleStack = _RunInRootFrame$Deter[0],
      controlStack = _RunInRootFrame$Deter[1];
    if (sampleStack && controlStack) {
      var sampleLines = sampleStack.split("\n"),
        controlLines = controlStack.split("\n");
      for (
        namePropDescriptor = RunInRootFrame = 0;
        RunInRootFrame < sampleLines.length &&
        !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");

      )
        RunInRootFrame++;
      for (
        ;
        namePropDescriptor < controlLines.length &&
        !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        );

      )
        namePropDescriptor++;
      if (
        RunInRootFrame === sampleLines.length ||
        namePropDescriptor === controlLines.length
      )
        for (
          RunInRootFrame = sampleLines.length - 1,
            namePropDescriptor = controlLines.length - 1;
          1 <= RunInRootFrame &&
          0 <= namePropDescriptor &&
          sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];

        )
          namePropDescriptor--;
      for (
        ;
        1 <= RunInRootFrame && 0 <= namePropDescriptor;
        RunInRootFrame--, namePropDescriptor--
      )
        if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
          if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
            do
              if (
                (RunInRootFrame--,
                namePropDescriptor--,
                0 > namePropDescriptor ||
                  sampleLines[RunInRootFrame] !==
                    controlLines[namePropDescriptor])
              ) {
                var frame =
                  "\n" +
                  sampleLines[RunInRootFrame].replace(" at new ", " at ");
                fn.displayName &&
                  frame.includes("<anonymous>") &&
                  (frame = frame.replace("<anonymous>", fn.displayName));
                return frame;
              }
            while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
          }
          break;
        }
    }
  } finally {
    (reentry = !1), (Error.prepareStackTrace = previousPrepareStackTrace);
  }
  return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
    ? describeBuiltInComponentFrame(previousPrepareStackTrace)
    : "";
}
function describeFiber(fiber, childFiber) {
  switch (fiber.tag) {
    case 26:
    case 27:
    case 5:
      return describeBuiltInComponentFrame(fiber.type);
    case 16:
      return describeBuiltInComponentFrame("Lazy");
    case 13:
      return fiber.child !== childFiber && null !== childFiber
        ? describeBuiltInComponentFrame("Suspense Fallback")
        : describeBuiltInComponentFrame("Suspense");
    case 19:
      return describeBuiltInComponentFrame("SuspenseList");
    case 0:
    case 15:
      return describeNativeComponentFrame(fiber.type, !1);
    case 11:
      return describeNativeComponentFrame(fiber.type.render, !1);
    case 1:
      return describeNativeComponentFrame(fiber.type, !0);
    case 31:
      return describeBuiltInComponentFrame("Activity");
    default:
      return "";
  }
}
function getStackByFiberInDevAndProd(workInProgress) {
  try {
    var info = "",
      previous = null;
    do
      (info += describeFiber(workInProgress, previous)),
        (previous = workInProgress),
        (workInProgress = workInProgress.return);
    while (workInProgress);
    return info;
  } catch (x) {
    return "\nError generating stack: " + x.message + "\n" + x.stack;
  }
}
var hasOwnProperty = Object.prototype.hasOwnProperty,
  scheduleCallback$3 = Scheduler.unstable_scheduleCallback,
  cancelCallback$1 = Scheduler.unstable_cancelCallback,
  shouldYield = Scheduler.unstable_shouldYield,
  requestPaint = Scheduler.unstable_requestPaint,
  now = Scheduler.unstable_now,
  getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel,
  ImmediatePriority = Scheduler.unstable_ImmediatePriority,
  UserBlockingPriority = Scheduler.unstable_UserBlockingPriority,
  NormalPriority$1 = Scheduler.unstable_NormalPriority,
  LowPriority = Scheduler.unstable_LowPriority,
  IdlePriority = Scheduler.unstable_IdlePriority,
  log$1 = Scheduler.log,
  unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue,
  rendererID = null,
  injectedHook = null;
function setIsStrictModeForDevtools(newIsStrictMode) {
  "function" === typeof log$1 && unstable_setDisableYieldValue(newIsStrictMode);
  if (injectedHook && "function" === typeof injectedHook.setStrictMode)
    try {
      injectedHook.setStrictMode(rendererID, newIsStrictMode);
    } catch (err) {}
}
var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
  log = Math.log,
  LN2 = Math.LN2;
function clz32Fallback(x) {
  x >>>= 0;
  return 0 === x ? 32 : (31 - ((log(x) / LN2) | 0)) | 0;
}
var nextTransitionUpdateLane = 256,
  nextTransitionDeferredLane = 262144,
  nextRetryLane = 4194304;
function getHighestPriorityLanes(lanes) {
  var pendingSyncLanes = lanes & 42;
  if (0 !== pendingSyncLanes) return pendingSyncLanes;
  switch (lanes & -lanes) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
      return 64;
    case 128:
      return 128;
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
      return lanes & 261888;
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return lanes & 3932160;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
      return lanes & 62914560;
    case 67108864:
      return 67108864;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 0;
    default:
      return lanes;
  }
}
function getNextLanes(root, wipLanes, rootHasPendingCommit) {
  var pendingLanes = root.pendingLanes;
  if (0 === pendingLanes) return 0;
  var nextLanes = 0,
    suspendedLanes = root.suspendedLanes,
    pingedLanes = root.pingedLanes;
  root = root.warmLanes;
  var nonIdlePendingLanes = pendingLanes & 134217727;
  0 !== nonIdlePendingLanes
    ? ((pendingLanes = nonIdlePendingLanes & ~suspendedLanes),
      0 !== pendingLanes
        ? (nextLanes = getHighestPriorityLanes(pendingLanes))
        : ((pingedLanes &= nonIdlePendingLanes),
          0 !== pingedLanes
            ? (nextLanes = getHighestPriorityLanes(pingedLanes))
            : rootHasPendingCommit ||
              ((rootHasPendingCommit = nonIdlePendingLanes & ~root),
              0 !== rootHasPendingCommit &&
                (nextLanes = getHighestPriorityLanes(rootHasPendingCommit)))))
    : ((nonIdlePendingLanes = pendingLanes & ~suspendedLanes),
      0 !== nonIdlePendingLanes
        ? (nextLanes = getHighestPriorityLanes(nonIdlePendingLanes))
        : 0 !== pingedLanes
          ? (nextLanes = getHighestPriorityLanes(pingedLanes))
          : rootHasPendingCommit ||
            ((rootHasPendingCommit = pendingLanes & ~root),
            0 !== rootHasPendingCommit &&
              (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
  return 0 === nextLanes
    ? 0
    : 0 !== wipLanes &&
        wipLanes !== nextLanes &&
        0 === (wipLanes & suspendedLanes) &&
        ((suspendedLanes = nextLanes & -nextLanes),
        (rootHasPendingCommit = wipLanes & -wipLanes),
        suspendedLanes >= rootHasPendingCommit ||
          (32 === suspendedLanes && 0 !== (rootHasPendingCommit & 4194048)))
      ? wipLanes
      : nextLanes;
}
function checkIfRootIsPrerendering(root, renderLanes) {
  return (
    0 ===
    (root.pendingLanes &
      ~(root.suspendedLanes & ~root.pingedLanes) &
      renderLanes)
  );
}
function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case 1:
    case 2:
    case 4:
    case 8:
    case 64:
      return currentTime + 250;
    case 16:
    case 32:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return currentTime + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
      return -1;
    case 67108864:
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function claimNextRetryLane() {
  var lane = nextRetryLane;
  nextRetryLane <<= 1;
  0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
  return lane;
}
function createLaneMap(initial) {
  for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
  return laneMap;
}
function markRootUpdated$1(root, updateLane) {
  root.pendingLanes |= updateLane;
  268435456 !== updateLane &&
    ((root.suspendedLanes = 0), (root.pingedLanes = 0), (root.warmLanes = 0));
}
function markRootFinished(
  root,
  finishedLanes,
  remainingLanes,
  spawnedLane,
  updatedLanes,
  suspendedRetryLanes
) {
  var previouslyPendingLanes = root.pendingLanes;
  root.pendingLanes = remainingLanes;
  root.suspendedLanes = 0;
  root.pingedLanes = 0;
  root.warmLanes = 0;
  root.expiredLanes &= remainingLanes;
  root.entangledLanes &= remainingLanes;
  root.errorRecoveryDisabledLanes &= remainingLanes;
  root.shellSuspendCounter = 0;
  var entanglements = root.entanglements,
    expirationTimes = root.expirationTimes,
    hiddenUpdates = root.hiddenUpdates;
  for (
    remainingLanes = previouslyPendingLanes & ~remainingLanes;
    0 < remainingLanes;

  ) {
    var index$7 = 31 - clz32(remainingLanes),
      lane = 1 << index$7;
    entanglements[index$7] = 0;
    expirationTimes[index$7] = -1;
    var hiddenUpdatesForLane = hiddenUpdates[index$7];
    if (null !== hiddenUpdatesForLane)
      for (
        hiddenUpdates[index$7] = null, index$7 = 0;
        index$7 < hiddenUpdatesForLane.length;
        index$7++
      ) {
        var update = hiddenUpdatesForLane[index$7];
        null !== update && (update.lane &= -536870913);
      }
    remainingLanes &= ~lane;
  }
  0 !== spawnedLane && markSpawnedDeferredLane(root, spawnedLane, 0);
  0 !== suspendedRetryLanes &&
    0 === updatedLanes &&
    0 !== root.tag &&
    (root.suspendedLanes |=
      suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
}
function markSpawnedDeferredLane(root, spawnedLane, entangledLanes) {
  root.pendingLanes |= spawnedLane;
  root.suspendedLanes &= ~spawnedLane;
  var spawnedLaneIndex = 31 - clz32(spawnedLane);
  root.entangledLanes |= spawnedLane;
  root.entanglements[spawnedLaneIndex] =
    root.entanglements[spawnedLaneIndex] |
    1073741824 |
    (entangledLanes & 261930);
}
function markRootEntangled(root, entangledLanes) {
  var rootEntangledLanes = (root.entangledLanes |= entangledLanes);
  for (root = root.entanglements; rootEntangledLanes; ) {
    var index$8 = 31 - clz32(rootEntangledLanes),
      lane = 1 << index$8;
    (lane & entangledLanes) | (root[index$8] & entangledLanes) &&
      (root[index$8] |= entangledLanes);
    rootEntangledLanes &= ~lane;
  }
}
function getBumpedLaneForHydration(root, renderLanes) {
  var renderLane = renderLanes & -renderLanes;
  renderLane =
    0 !== (renderLane & 42) ? 1 : getBumpedLaneForHydrationByLane(renderLane);
  return 0 !== (renderLane & (root.suspendedLanes | renderLanes))
    ? 0
    : renderLane;
}
function getBumpedLaneForHydrationByLane(lane) {
  switch (lane) {
    case 2:
      lane = 1;
      break;
    case 8:
      lane = 4;
      break;
    case 32:
      lane = 16;
      break;
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
      lane = 128;
      break;
    case 268435456:
      lane = 134217728;
      break;
    default:
      lane = 0;
  }
  return lane;
}
function lanesToEventPriority(lanes) {
  lanes &= -lanes;
  return 2 < lanes
    ? 8 < lanes
      ? 0 !== (lanes & 134217727)
        ? 32
        : 268435456
      : 8
    : 2;
}
function resolveUpdatePriority() {
  var updatePriority = ReactDOMSharedInternals.p;
  if (0 !== updatePriority) return updatePriority;
  updatePriority = window.event;
  return void 0 === updatePriority ? 32 : getEventPriority(updatePriority.type);
}
function runWithPriority(priority, fn) {
  var previousPriority = ReactDOMSharedInternals.p;
  try {
    return (ReactDOMSharedInternals.p = priority), fn();
  } finally {
    ReactDOMSharedInternals.p = previousPriority;
  }
}
var randomKey = Math.random().toString(36).slice(2),
  internalInstanceKey = "__reactFiber$" + randomKey,
  internalPropsKey = "__reactProps$" + randomKey,
  internalContainerInstanceKey = "__reactContainer$" + randomKey,
  internalEventHandlersKey = "__reactEvents$" + randomKey,
  internalEventHandlerListenersKey = "__reactListeners$" + randomKey,
  internalEventHandlesSetKey = "__reactHandles$" + randomKey,
  internalRootNodeResourcesKey = "__reactResources$" + randomKey,
  internalHoistableMarker = "__reactMarker$" + randomKey;
function detachDeletedInstance(node) {
  delete node[internalInstanceKey];
  delete node[internalPropsKey];
  delete node[internalEventHandlersKey];
  delete node[internalEventHandlerListenersKey];
  delete node[internalEventHandlesSetKey];
}
function getClosestInstanceFromNode(targetNode) {
  var targetInst = targetNode[internalInstanceKey];
  if (targetInst) return targetInst;
  for (var parentNode = targetNode.parentNode; parentNode; ) {
    if (
      (targetInst =
        parentNode[internalContainerInstanceKey] ||
        parentNode[internalInstanceKey])
    ) {
      parentNode = targetInst.alternate;
      if (
        null !== targetInst.child ||
        (null !== parentNode && null !== parentNode.child)
      )
        for (
          targetNode = getParentHydrationBoundary(targetNode);
          null !== targetNode;

        ) {
          if ((parentNode = targetNode[internalInstanceKey])) return parentNode;
          targetNode = getParentHydrationBoundary(targetNode);
        }
      return targetInst;
    }
    targetNode = parentNode;
    parentNode = targetNode.parentNode;
  }
  return null;
}
function getInstanceFromNode(node) {
  if (
    (node = node[internalInstanceKey] || node[internalContainerInstanceKey])
  ) {
    var tag = node.tag;
    if (
      5 === tag ||
      6 === tag ||
      13 === tag ||
      31 === tag ||
      26 === tag ||
      27 === tag ||
      3 === tag
    )
      return node;
  }
  return null;
}
function getNodeFromInstance(inst) {
  var tag = inst.tag;
  if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return inst.stateNode;
  throw Error(formatProdErrorMessage(33));
}
function getResourcesFromRoot(root) {
  var resources = root[internalRootNodeResourcesKey];
  resources ||
    (resources = root[internalRootNodeResourcesKey] =
      { hoistableStyles: new Map(), hoistableScripts: new Map() });
  return resources;
}
function markNodeAsHoistable(node) {
  node[internalHoistableMarker] = !0;
}
var allNativeEvents = new Set(),
  registrationNameDependencies = {};
function registerTwoPhaseEvent(registrationName, dependencies) {
  registerDirectEvent(registrationName, dependencies);
  registerDirectEvent(registrationName + "Capture", dependencies);
}
function registerDirectEvent(registrationName, dependencies) {
  registrationNameDependencies[registrationName] = dependencies;
  for (
    registrationName = 0;
    registrationName < dependencies.length;
    registrationName++
  )
    allNativeEvents.add(dependencies[registrationName]);
}
var VALID_ATTRIBUTE_NAME_REGEX = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ),
  illegalAttributeNameCache = {},
  validatedAttributeNameCache = {};
function isAttributeNameSafe(attributeName) {
  if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
    return !0;
  if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return !1;
  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
    return (validatedAttributeNameCache[attributeName] = !0);
  illegalAttributeNameCache[attributeName] = !0;
  return !1;
}
function setValueForAttribute(node, name, value) {
  if (isAttributeNameSafe(name))
    if (null === value) node.removeAttribute(name);
    else {
      switch (typeof value) {
        case "undefined":
        case "function":
        case "symbol":
          node.removeAttribute(name);
          return;
        case "boolean":
          var prefix$10 = name.toLowerCase().slice(0, 5);
          if ("data-" !== prefix$10 && "aria-" !== prefix$10) {
            node.removeAttribute(name);
            return;
          }
      }
      node.setAttribute(name, "" + value);
    }
}
function setValueForKnownAttribute(node, name, value) {
  if (null === value) node.removeAttribute(name);
  else {
    switch (typeof value) {
      case "undefined":
      case "function":
      case "symbol":
      case "boolean":
        node.removeAttribute(name);
        return;
    }
    node.setAttribute(name, "" + value);
  }
}
function setValueForNamespacedAttribute(node, namespace, name, value) {
  if (null === value) node.removeAttribute(name);
  else {
    switch (typeof value) {
      case "undefined":
      case "function":
      case "symbol":
      case "boolean":
        node.removeAttribute(name);
        return;
    }
    node.setAttributeNS(namespace, name, "" + value);
  }
}
function getToStringValue(value) {
  switch (typeof value) {
    case "bigint":
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return value;
    case "object":
      return value;
    default:
      return "";
  }
}
function isCheckable(elem) {
  var type = elem.type;
  return (
    (elem = elem.nodeName) &&
    "input" === elem.toLowerCase() &&
    ("checkbox" === type || "radio" === type)
  );
}
function trackValueOnNode(node, valueField, currentValue) {
  var descriptor = Object.getOwnPropertyDescriptor(
    node.constructor.prototype,
    valueField
  );
  if (
    !node.hasOwnProperty(valueField) &&
    "undefined" !== typeof descriptor &&
    "function" === typeof descriptor.get &&
    "function" === typeof descriptor.set
  ) {
    var get = descriptor.get,
      set = descriptor.set;
    Object.defineProperty(node, valueField, {
      configurable: !0,
      get: function () {
        return get.call(this);
      },
      set: function (value) {
        currentValue = "" + value;
        set.call(this, value);
      }
    });
    Object.defineProperty(node, valueField, {
      enumerable: descriptor.enumerable
    });
    return {
      getValue: function () {
        return currentValue;
      },
      setValue: function (value) {
        currentValue = "" + value;
      },
      stopTracking: function () {
        node._valueTracker = null;
        delete node[valueField];
      }
    };
  }
}
function track(node) {
  if (!node._valueTracker) {
    var valueField = isCheckable(node) ? "checked" : "value";
    node._valueTracker = trackValueOnNode(
      node,
      valueField,
      "" + node[valueField]
    );
  }
}
function updateValueIfChanged(node) {
  if (!node) return !1;
  var tracker = node._valueTracker;
  if (!tracker) return !0;
  var lastValue = tracker.getValue();
  var value = "";
  node &&
    (value = isCheckable(node)
      ? node.checked
        ? "true"
        : "false"
      : node.value);
  node = value;
  return node !== lastValue ? (tracker.setValue(node), !0) : !1;
}
function getActiveElement(doc) {
  doc = doc || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof doc) return null;
  try {
    return doc.activeElement || doc.body;
  } catch (e) {
    return doc.body;
  }
}
var escapeSelectorAttributeValueInsideDoubleQuotesRegex = /[\n"\\]/g;
function escapeSelectorAttributeValueInsideDoubleQuotes(value) {
  return value.replace(
    escapeSelectorAttributeValueInsideDoubleQuotesRegex,
    function (ch) {
      return "\\" + ch.charCodeAt(0).toString(16) + " ";
    }
  );
}
function updateInput(
  element,
  value,
  defaultValue,
  lastDefaultValue,
  checked,
  defaultChecked,
  type,
  name
) {
  element.name = "";
  null != type &&
  "function" !== typeof type &&
  "symbol" !== typeof type &&
  "boolean" !== typeof type
    ? (element.type = type)
    : element.removeAttribute("type");
  if (null != value)
    if ("number" === type) {
      if ((0 === value && "" === element.value) || element.value != value)
        element.value = "" + getToStringValue(value);
    } else
      element.value !== "" + getToStringValue(value) &&
        (element.value = "" + getToStringValue(value));
  else
    ("submit" !== type && "reset" !== type) || element.removeAttribute("value");
  null != value
    ? setDefaultValue(element, type, getToStringValue(value))
    : null != defaultValue
      ? setDefaultValue(element, type, getToStringValue(defaultValue))
      : null != lastDefaultValue && element.removeAttribute("value");
  null == checked &&
    null != defaultChecked &&
    (element.defaultChecked = !!defaultChecked);
  null != checked &&
    (element.checked =
      checked && "function" !== typeof checked && "symbol" !== typeof checked);
  null != name &&
  "function" !== typeof name &&
  "symbol" !== typeof name &&
  "boolean" !== typeof name
    ? (element.name = "" + getToStringValue(name))
    : element.removeAttribute("name");
}
function initInput(
  element,
  value,
  defaultValue,
  checked,
  defaultChecked,
  type,
  name,
  isHydrating
) {
  null != type &&
    "function" !== typeof type &&
    "symbol" !== typeof type &&
    "boolean" !== typeof type &&
    (element.type = type);
  if (null != value || null != defaultValue) {
    if (
      !(
        ("submit" !== type && "reset" !== type) ||
        (void 0 !== value && null !== value)
      )
    ) {
      track(element);
      return;
    }
    defaultValue =
      null != defaultValue ? "" + getToStringValue(defaultValue) : "";
    value = null != value ? "" + getToStringValue(value) : defaultValue;
    isHydrating || value === element.value || (element.value = value);
    element.defaultValue = value;
  }
  checked = null != checked ? checked : defaultChecked;
  checked =
    "function" !== typeof checked && "symbol" !== typeof checked && !!checked;
  element.checked = isHydrating ? element.checked : !!checked;
  element.defaultChecked = !!checked;
  null != name &&
    "function" !== typeof name &&
    "symbol" !== typeof name &&
    "boolean" !== typeof name &&
    (element.name = name);
  track(element);
}
function setDefaultValue(node, type, value) {
  ("number" === type && getActiveElement(node.ownerDocument) === node) ||
    node.defaultValue === "" + value ||
    (node.defaultValue = "" + value);
}
function updateOptions(node, multiple, propValue, setDefaultSelected) {
  node = node.options;
  if (multiple) {
    multiple = {};
    for (var i = 0; i < propValue.length; i++)
      multiple["$" + propValue[i]] = !0;
    for (propValue = 0; propValue < node.length; propValue++)
      (i = multiple.hasOwnProperty("$" + node[propValue].value)),
        node[propValue].selected !== i && (node[propValue].selected = i),
        i && setDefaultSelected && (node[propValue].defaultSelected = !0);
  } else {
    propValue = "" + getToStringValue(propValue);
    multiple = null;
    for (i = 0; i < node.length; i++) {
      if (node[i].value === propValue) {
        node[i].selected = !0;
        setDefaultSelected && (node[i].defaultSelected = !0);
        return;
      }
      null !== multiple || node[i].disabled || (multiple = node[i]);
    }
    null !== multiple && (multiple.selected = !0);
  }
}
function updateTextarea(element, value, defaultValue) {
  if (
    null != value &&
    ((value = "" + getToStringValue(value)),
    value !== element.value && (element.value = value),
    null == defaultValue)
  ) {
    element.defaultValue !== value && (element.defaultValue = value);
    return;
  }
  element.defaultValue =
    null != defaultValue ? "" + getToStringValue(defaultValue) : "";
}
function initTextarea(element, value, defaultValue, children) {
  if (null == value) {
    if (null != children) {
      if (null != defaultValue) throw Error(formatProdErrorMessage(92));
      if (isArrayImpl(children)) {
        if (1 < children.length) throw Error(formatProdErrorMessage(93));
        children = children[0];
      }
      defaultValue = children;
    }
    null == defaultValue && (defaultValue = "");
    value = defaultValue;
  }
  defaultValue = getToStringValue(value);
  element.defaultValue = defaultValue;
  children = element.textContent;
  children === defaultValue &&
    "" !== children &&
    null !== children &&
    (element.value = children);
  track(element);
}
function setTextContent(node, text) {
  if (text) {
    var firstChild = node.firstChild;
    if (
      firstChild &&
      firstChild === node.lastChild &&
      3 === firstChild.nodeType
    ) {
      firstChild.nodeValue = text;
      return;
    }
  }
  node.textContent = text;
}
var unitlessNumbers = new Set(
  "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
    " "
  )
);
function setValueForStyle(style, styleName, value) {
  var isCustomProperty = 0 === styleName.indexOf("--");
  null == value || "boolean" === typeof value || "" === value
    ? isCustomProperty
      ? style.setProperty(styleName, "")
      : "float" === styleName
        ? (style.cssFloat = "")
        : (style[styleName] = "")
    : isCustomProperty
      ? style.setProperty(styleName, value)
      : "number" !== typeof value ||
          0 === value ||
          unitlessNumbers.has(styleName)
        ? "float" === styleName
          ? (style.cssFloat = value)
          : (style[styleName] = ("" + value).trim())
        : (style[styleName] = value + "px");
}
function setValueForStyles(node, styles, prevStyles) {
  if (null != styles && "object" !== typeof styles)
    throw Error(formatProdErrorMessage(62));
  node = node.style;
  if (null != prevStyles) {
    for (var styleName in prevStyles)
      !prevStyles.hasOwnProperty(styleName) ||
        (null != styles && styles.hasOwnProperty(styleName)) ||
        (0 === styleName.indexOf("--")
          ? node.setProperty(styleName, "")
          : "float" === styleName
            ? (node.cssFloat = "")
            : (node[styleName] = ""));
    for (var styleName$16 in styles)
      (styleName = styles[styleName$16]),
        styles.hasOwnProperty(styleName$16) &&
          prevStyles[styleName$16] !== styleName &&
          setValueForStyle(node, styleName$16, styleName);
  } else
    for (var styleName$17 in styles)
      styles.hasOwnProperty(styleName$17) &&
        setValueForStyle(node, styleName$17, styles[styleName$17]);
}
function isCustomElement(tagName) {
  if (-1 === tagName.indexOf("-")) return !1;
  switch (tagName) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return !1;
    default:
      return !0;
  }
}
var aliases = new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]),
  isJavaScriptProtocol =
    /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
function sanitizeURL(url) {
  return isJavaScriptProtocol.test("" + url)
    ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
    : url;
}
function noop$1() {}
var currentReplayingEvent = null;
function getEventTarget(nativeEvent) {
  nativeEvent = nativeEvent.target || nativeEvent.srcElement || window;
  nativeEvent.correspondingUseElement &&
    (nativeEvent = nativeEvent.correspondingUseElement);
  return 3 === nativeEvent.nodeType ? nativeEvent.parentNode : nativeEvent;
}
var restoreTarget = null,
  restoreQueue = null;
function restoreStateOfTarget(target) {
  var internalInstance = getInstanceFromNode(target);
  if (internalInstance && (target = internalInstance.stateNode)) {
    var props = target[internalPropsKey] || null;
    a: switch (((target = internalInstance.stateNode), internalInstance.type)) {
      case "input":
        updateInput(
          target,
          props.value,
          props.defaultValue,
          props.defaultValue,
          props.checked,
          props.defaultChecked,
          props.type,
          props.name
        );
        internalInstance = props.name;
        if ("radio" === props.type && null != internalInstance) {
          for (props = target; props.parentNode; ) props = props.parentNode;
          props = props.querySelectorAll(
            'input[name="' +
              escapeSelectorAttributeValueInsideDoubleQuotes(
                "" + internalInstance
              ) +
              '"][type="radio"]'
          );
          for (
            internalInstance = 0;
            internalInstance < props.length;
            internalInstance++
          ) {
            var otherNode = props[internalInstance];
            if (otherNode !== target && otherNode.form === target.form) {
              var otherProps = otherNode[internalPropsKey] || null;
              if (!otherProps) throw Error(formatProdErrorMessage(90));
              updateInput(
                otherNode,
                otherProps.value,
                otherProps.defaultValue,
                otherProps.defaultValue,
                otherProps.checked,
                otherProps.defaultChecked,
                otherProps.type,
                otherProps.name
              );
            }
          }
          for (
            internalInstance = 0;
            internalInstance < props.length;
            internalInstance++
          )
            (otherNode = props[internalInstance]),
              otherNode.form === target.form && updateValueIfChanged(otherNode);
        }
        break a;
      case "textarea":
        updateTextarea(target, props.value, props.defaultValue);
        break a;
      case "select":
        (internalInstance = props.value),
          null != internalInstance &&
            updateOptions(target, !!props.multiple, internalInstance, !1);
    }
  }
}
var isInsideEventHandler = !1;
function batchedUpdates$1(fn, a, b) {
  if (isInsideEventHandler) return fn(a, b);
  isInsideEventHandler = !0;
  try {
    var JSCompiler_inline_result = fn(a);
    return JSCompiler_inline_result;
  } finally {
    if (
      ((isInsideEventHandler = !1),
      null !== restoreTarget || null !== restoreQueue)
    )
      if (
        (flushSyncWork$1(),
        restoreTarget &&
          ((a = restoreTarget),
          (fn = restoreQueue),
          (restoreQueue = restoreTarget = null),
          restoreStateOfTarget(a),
          fn))
      )
        for (a = 0; a < fn.length; a++) restoreStateOfTarget(fn[a]);
  }
}
function getListener(inst, registrationName) {
  var stateNode = inst.stateNode;
  if (null === stateNode) return null;
  var props = stateNode[internalPropsKey] || null;
  if (null === props) return null;
  stateNode = props[registrationName];
  a: switch (registrationName) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (props = !props.disabled) ||
        ((inst = inst.type),
        (props = !(
          "button" === inst ||
          "input" === inst ||
          "select" === inst ||
          "textarea" === inst
        )));
      inst = !props;
      break a;
    default:
      inst = !1;
  }
  if (inst) return null;
  if (stateNode && "function" !== typeof stateNode)
    throw Error(
      formatProdErrorMessage(231, registrationName, typeof stateNode)
    );
  return stateNode;
}
var canUseDOM = !(
    "undefined" === typeof window ||
    "undefined" === typeof window.document ||
    "undefined" === typeof window.document.createElement
  ),
  passiveBrowserEventsSupported = !1;
if (canUseDOM)
  try {
    var options = {};
    Object.defineProperty(options, "passive", {
      get: function () {
        passiveBrowserEventsSupported = !0;
      }
    });
    window.addEventListener("test", options, options);
    window.removeEventListener("test", options, options);
  } catch (e) {
    passiveBrowserEventsSupported = !1;
  }
var root = null,
  startText = null,
  fallbackText = null;
function getData() {
  if (fallbackText) return fallbackText;
  var start,
    startValue = startText,
    startLength = startValue.length,
    end,
    endValue = "value" in root ? root.value : root.textContent,
    endLength = endValue.length;
  for (
    start = 0;
    start < startLength && startValue[start] === endValue[start];
    start++
  );
  var minEnd = startLength - start;
  for (
    end = 1;
    end <= minEnd &&
    startValue[startLength - end] === endValue[endLength - end];
    end++
  );
  return (fallbackText = endValue.slice(start, 1 < end ? 1 - end : void 0));
}
function getEventCharCode(nativeEvent) {
  var keyCode = nativeEvent.keyCode;
  "charCode" in nativeEvent
    ? ((nativeEvent = nativeEvent.charCode),
      0 === nativeEvent && 13 === keyCode && (nativeEvent = 13))
    : (nativeEvent = keyCode);
  10 === nativeEvent && (nativeEvent = 13);
  return 32 <= nativeEvent || 13 === nativeEvent ? nativeEvent : 0;
}
function functionThatReturnsTrue() {
  return !0;
}
function functionThatReturnsFalse() {
  return !1;
}
function createSyntheticEvent(Interface) {
  function SyntheticBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    this._reactName = reactName;
    this._targetInst = targetInst;
    this.type = reactEventType;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    this.currentTarget = null;
    for (var propName in Interface)
      Interface.hasOwnProperty(propName) &&
        ((reactName = Interface[propName]),
        (this[propName] = reactName
          ? reactName(nativeEvent)
          : nativeEvent[propName]));
    this.isDefaultPrevented = (
      null != nativeEvent.defaultPrevented
        ? nativeEvent.defaultPrevented
        : !1 === nativeEvent.returnValue
    )
      ? functionThatReturnsTrue
      : functionThatReturnsFalse;
    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }
  assign(SyntheticBaseEvent.prototype, {
    preventDefault: function () {
      this.defaultPrevented = !0;
      var event = this.nativeEvent;
      event &&
        (event.preventDefault
          ? event.preventDefault()
          : "unknown" !== typeof event.returnValue && (event.returnValue = !1),
        (this.isDefaultPrevented = functionThatReturnsTrue));
    },
    stopPropagation: function () {
      var event = this.nativeEvent;
      event &&
        (event.stopPropagation
          ? event.stopPropagation()
          : "unknown" !== typeof event.cancelBubble &&
            (event.cancelBubble = !0),
        (this.isPropagationStopped = functionThatReturnsTrue));
    },
    persist: function () {},
    isPersistent: functionThatReturnsTrue
  });
  return SyntheticBaseEvent;
}
var EventInterface = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function (event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  },
  SyntheticEvent = createSyntheticEvent(EventInterface),
  UIEventInterface = assign({}, EventInterface, { view: 0, detail: 0 }),
  SyntheticUIEvent = createSyntheticEvent(UIEventInterface),
  lastMovementX,
  lastMovementY,
  lastMouseEvent,
  MouseEventInterface = assign({}, UIEventInterface, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: getEventModifierState,
    button: 0,
    buttons: 0,
    relatedTarget: function (event) {
      return void 0 === event.relatedTarget
        ? event.fromElement === event.srcElement
          ? event.toElement
          : event.fromElement
        : event.relatedTarget;
    },
    movementX: function (event) {
      if ("movementX" in event) return event.movementX;
      event !== lastMouseEvent &&
        (lastMouseEvent && "mousemove" === event.type
          ? ((lastMovementX = event.screenX - lastMouseEvent.screenX),
            (lastMovementY = event.screenY - lastMouseEvent.screenY))
          : (lastMovementY = lastMovementX = 0),
        (lastMouseEvent = event));
      return lastMovementX;
    },
    movementY: function (event) {
      return "movementY" in event ? event.movementY : lastMovementY;
    }
  }),
  SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface),
  DragEventInterface = assign({}, MouseEventInterface, { dataTransfer: 0 }),
  SyntheticDragEvent = createSyntheticEvent(DragEventInterface),
  FocusEventInterface = assign({}, UIEventInterface, { relatedTarget: 0 }),
  SyntheticFocusEvent = createSyntheticEvent(FocusEventInterface),
  AnimationEventInterface = assign({}, EventInterface, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }),
  SyntheticAnimationEvent = createSyntheticEvent(AnimationEventInterface),
  ClipboardEventInterface = assign({}, EventInterface, {
    clipboardData: function (event) {
      return "clipboardData" in event
        ? event.clipboardData
        : window.clipboardData;
    }
  }),
  SyntheticClipboardEvent = createSyntheticEvent(ClipboardEventInterface),
  CompositionEventInterface = assign({}, EventInterface, { data: 0 }),
  SyntheticCompositionEvent = createSyntheticEvent(CompositionEventInterface),
  normalizeKey = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  },
  translateToKey = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  },
  modifierKeyToProp = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
function modifierStateGetter(keyArg) {
  var nativeEvent = this.nativeEvent;
  return nativeEvent.getModifierState
    ? nativeEvent.getModifierState(keyArg)
    : (keyArg = modifierKeyToProp[keyArg])
      ? !!nativeEvent[keyArg]
      : !1;
}
function getEventModifierState() {
  return modifierStateGetter;
}
var KeyboardEventInterface = assign({}, UIEventInterface, {
    key: function (nativeEvent) {
      if (nativeEvent.key) {
        var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
        if ("Unidentified" !== key) return key;
      }
      return "keypress" === nativeEvent.type
        ? ((nativeEvent = getEventCharCode(nativeEvent)),
          13 === nativeEvent ? "Enter" : String.fromCharCode(nativeEvent))
        : "keydown" === nativeEvent.type || "keyup" === nativeEvent.type
          ? translateToKey[nativeEvent.keyCode] || "Unidentified"
          : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: getEventModifierState,
    charCode: function (event) {
      return "keypress" === event.type ? getEventCharCode(event) : 0;
    },
    keyCode: function (event) {
      return "keydown" === event.type || "keyup" === event.type
        ? event.keyCode
        : 0;
    },
    which: function (event) {
      return "keypress" === event.type
        ? getEventCharCode(event)
        : "keydown" === event.type || "keyup" === event.type
          ? event.keyCode
          : 0;
    }
  }),
  SyntheticKeyboardEvent = createSyntheticEvent(KeyboardEventInterface),
  PointerEventInterface = assign({}, MouseEventInterface, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }),
  SyntheticPointerEvent = createSyntheticEvent(PointerEventInterface),
  TouchEventInterface = assign({}, UIEventInterface, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: getEventModifierState
  }),
  SyntheticTouchEvent = createSyntheticEvent(TouchEventInterface),
  TransitionEventInterface = assign({}, EventInterface, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }),
  SyntheticTransitionEvent = createSyntheticEvent(TransitionEventInterface),
  WheelEventInterface = assign({}, MouseEventInterface, {
    deltaX: function (event) {
      return "deltaX" in event
        ? event.deltaX
        : "wheelDeltaX" in event
          ? -event.wheelDeltaX
          : 0;
    },
    deltaY: function (event) {
      return "deltaY" in event
        ? event.deltaY
        : "wheelDeltaY" in event
          ? -event.wheelDeltaY
          : "wheelDelta" in event
            ? -event.wheelDelta
            : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }),
  SyntheticWheelEvent = createSyntheticEvent(WheelEventInterface),
  ToggleEventInterface = assign({}, EventInterface, {
    newState: 0,
    oldState: 0
  }),
  SyntheticToggleEvent = createSyntheticEvent(ToggleEventInterface),
  END_KEYCODES = [9, 13, 27, 32],
  canUseCompositionEvent = canUseDOM && "CompositionEvent" in window,
  documentMode = null;
canUseDOM &&
  "documentMode" in document &&
  (documentMode = document.documentMode);
var canUseTextInputEvent = canUseDOM && "TextEvent" in window && !documentMode,
  useFallbackCompositionData =
    canUseDOM &&
    (!canUseCompositionEvent ||
      (documentMode && 8 < documentMode && 11 >= documentMode)),
  SPACEBAR_CHAR = String.fromCharCode(32),
  hasSpaceKeypress = !1;
function isFallbackCompositionEnd(domEventName, nativeEvent) {
  switch (domEventName) {
    case "keyup":
      return -1 !== END_KEYCODES.indexOf(nativeEvent.keyCode);
    case "keydown":
      return 229 !== nativeEvent.keyCode;
    case "keypress":
    case "mousedown":
    case "focusout":
      return !0;
    default:
      return !1;
  }
}
function getDataFromCustomEvent(nativeEvent) {
  nativeEvent = nativeEvent.detail;
  return "object" === typeof nativeEvent && "data" in nativeEvent
    ? nativeEvent.data
    : null;
}
var isComposing = !1;
function getNativeBeforeInputChars(domEventName, nativeEvent) {
  switch (domEventName) {
    case "compositionend":
      return getDataFromCustomEvent(nativeEvent);
    case "keypress":
      if (32 !== nativeEvent.which) return null;
      hasSpaceKeypress = !0;
      return SPACEBAR_CHAR;
    case "textInput":
      return (
        (domEventName = nativeEvent.data),
        domEventName === SPACEBAR_CHAR && hasSpaceKeypress ? null : domEventName
      );
    default:
      return null;
  }
}
function getFallbackBeforeInputChars(domEventName, nativeEvent) {
  if (isComposing)
    return "compositionend" === domEventName ||
      (!canUseCompositionEvent &&
        isFallbackCompositionEnd(domEventName, nativeEvent))
      ? ((domEventName = getData()),
        (fallbackText = startText = root = null),
        (isComposing = !1),
        domEventName)
      : null;
  switch (domEventName) {
    case "paste":
      return null;
    case "keypress":
      if (
        !(nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) ||
        (nativeEvent.ctrlKey && nativeEvent.altKey)
      ) {
        if (nativeEvent.char && 1 < nativeEvent.char.length)
          return nativeEvent.char;
        if (nativeEvent.which) return String.fromCharCode(nativeEvent.which);
      }
      return null;
    case "compositionend":
      return useFallbackCompositionData && "ko" !== nativeEvent.locale
        ? null
        : nativeEvent.data;
    default:
      return null;
  }
}
var supportedInputTypes = {
  color: !0,
  date: !0,
  datetime: !0,
  "datetime-local": !0,
  email: !0,
  month: !0,
  number: !0,
  password: !0,
  range: !0,
  search: !0,
  tel: !0,
  text: !0,
  time: !0,
  url: !0,
  week: !0
};
function isTextInputElement(elem) {
  var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
  return "input" === nodeName
    ? !!supportedInputTypes[elem.type]
    : "textarea" === nodeName
      ? !0
      : !1;
}
function createAndAccumulateChangeEvent(
  dispatchQueue,
  inst,
  nativeEvent,
  target
) {
  restoreTarget
    ? restoreQueue
      ? restoreQueue.push(target)
      : (restoreQueue = [target])
    : (restoreTarget = target);
  inst = accumulateTwoPhaseListeners(inst, "onChange");
  0 < inst.length &&
    ((nativeEvent = new SyntheticEvent(
      "onChange",
      "change",
      null,
      nativeEvent,
      target
    )),
    dispatchQueue.push({ event: nativeEvent, listeners: inst }));
}
var activeElement$1 = null,
  activeElementInst$1 = null;
function runEventInBatch(dispatchQueue) {
  processDispatchQueue(dispatchQueue, 0);
}
function getInstIfValueChanged(targetInst) {
  var targetNode = getNodeFromInstance(targetInst);
  if (updateValueIfChanged(targetNode)) return targetInst;
}
function getTargetInstForChangeEvent(domEventName, targetInst) {
  if ("change" === domEventName) return targetInst;
}
var isInputEventSupported = !1;
if (canUseDOM) {
  var JSCompiler_inline_result$jscomp$286;
  if (canUseDOM) {
    var isSupported$jscomp$inline_427 = "oninput" in document;
    if (!isSupported$jscomp$inline_427) {
      var element$jscomp$inline_428 = document.createElement("div");
      element$jscomp$inline_428.setAttribute("oninput", "return;");
      isSupported$jscomp$inline_427 =
        "function" === typeof element$jscomp$inline_428.oninput;
    }
    JSCompiler_inline_result$jscomp$286 = isSupported$jscomp$inline_427;
  } else JSCompiler_inline_result$jscomp$286 = !1;
  isInputEventSupported =
    JSCompiler_inline_result$jscomp$286 &&
    (!document.documentMode || 9 < document.documentMode);
}
function stopWatchingForValueChange() {
  activeElement$1 &&
    (activeElement$1.detachEvent("onpropertychange", handlePropertyChange),
    (activeElementInst$1 = activeElement$1 = null));
}
function handlePropertyChange(nativeEvent) {
  if (
    "value" === nativeEvent.propertyName &&
    getInstIfValueChanged(activeElementInst$1)
  ) {
    var dispatchQueue = [];
    createAndAccumulateChangeEvent(
      dispatchQueue,
      activeElementInst$1,
      nativeEvent,
      getEventTarget(nativeEvent)
    );
    batchedUpdates$1(runEventInBatch, dispatchQueue);
  }
}
function handleEventsForInputEventPolyfill(domEventName, target, targetInst) {
  "focusin" === domEventName
    ? (stopWatchingForValueChange(),
      (activeElement$1 = target),
      (activeElementInst$1 = targetInst),
      activeElement$1.attachEvent("onpropertychange", handlePropertyChange))
    : "focusout" === domEventName && stopWatchingForValueChange();
}
function getTargetInstForInputEventPolyfill(domEventName) {
  if (
    "selectionchange" === domEventName ||
    "keyup" === domEventName ||
    "keydown" === domEventName
  )
    return getInstIfValueChanged(activeElementInst$1);
}
function getTargetInstForClickEvent(domEventName, targetInst) {
  if ("click" === domEventName) return getInstIfValueChanged(targetInst);
}
function getTargetInstForInputOrChangeEvent(domEventName, targetInst) {
  if ("input" === domEventName || "change" === domEventName)
    return getInstIfValueChanged(targetInst);
}
function is(x, y) {
  return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
}
var objectIs = "function" === typeof Object.is ? Object.is : is;
function shallowEqual(objA, objB) {
  if (objectIs(objA, objB)) return !0;
  if (
    "object" !== typeof objA ||
    null === objA ||
    "object" !== typeof objB ||
    null === objB
  )
    return !1;
  var keysA = Object.keys(objA),
    keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return !1;
  for (keysB = 0; keysB < keysA.length; keysB++) {
    var currentKey = keysA[keysB];
    if (
      !hasOwnProperty.call(objB, currentKey) ||
      !objectIs(objA[currentKey], objB[currentKey])
    )
      return !1;
  }
  return !0;
}
function getLeafNode(node) {
  for (; node && node.firstChild; ) node = node.firstChild;
  return node;
}
function getNodeForCharacterOffset(root, offset) {
  var node = getLeafNode(root);
  root = 0;
  for (var nodeEnd; node; ) {
    if (3 === node.nodeType) {
      nodeEnd = root + node.textContent.length;
      if (root <= offset && nodeEnd >= offset)
        return { node: node, offset: offset - root };
      root = nodeEnd;
    }
    a: {
      for (; node; ) {
        if (node.nextSibling) {
          node = node.nextSibling;
          break a;
        }
        node = node.parentNode;
      }
      node = void 0;
    }
    node = getLeafNode(node);
  }
}
function containsNode(outerNode, innerNode) {
  return outerNode && innerNode
    ? outerNode === innerNode
      ? !0
      : outerNode && 3 === outerNode.nodeType
        ? !1
        : innerNode && 3 === innerNode.nodeType
          ? containsNode(outerNode, innerNode.parentNode)
          : "contains" in outerNode
            ? outerNode.contains(innerNode)
            : outerNode.compareDocumentPosition
              ? !!(outerNode.compareDocumentPosition(innerNode) & 16)
              : !1
    : !1;
}
function getActiveElementDeep(containerInfo) {
  containerInfo =
    null != containerInfo &&
    null != containerInfo.ownerDocument &&
    null != containerInfo.ownerDocument.defaultView
      ? containerInfo.ownerDocument.defaultView
      : window;
  for (
    var element = getActiveElement(containerInfo.document);
    element instanceof containerInfo.HTMLIFrameElement;

  ) {
    try {
      var JSCompiler_inline_result =
        "string" === typeof element.contentWindow.location.href;
    } catch (err) {
      JSCompiler_inline_result = !1;
    }
    if (JSCompiler_inline_result) containerInfo = element.contentWindow;
    else break;
    element = getActiveElement(containerInfo.document);
  }
  return element;
}
function hasSelectionCapabilities(elem) {
  var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
  return (
    nodeName &&
    (("input" === nodeName &&
      ("text" === elem.type ||
        "search" === elem.type ||
        "tel" === elem.type ||
        "url" === elem.type ||
        "password" === elem.type)) ||
      "textarea" === nodeName ||
      "true" === elem.contentEditable)
  );
}
var skipSelectionChangeEvent =
    canUseDOM && "documentMode" in document && 11 >= document.documentMode,
  activeElement = null,
  activeElementInst = null,
  lastSelection = null,
  mouseDown = !1;
function constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget) {
  var doc =
    nativeEventTarget.window === nativeEventTarget
      ? nativeEventTarget.document
      : 9 === nativeEventTarget.nodeType
        ? nativeEventTarget
        : nativeEventTarget.ownerDocument;
  mouseDown ||
    null == activeElement ||
    activeElement !== getActiveElement(doc) ||
    ((doc = activeElement),
    "selectionStart" in doc && hasSelectionCapabilities(doc)
      ? (doc = { start: doc.selectionStart, end: doc.selectionEnd })
      : ((doc = (
          (doc.ownerDocument && doc.ownerDocument.defaultView) ||
          window
        ).getSelection()),
        (doc = {
          anchorNode: doc.anchorNode,
          anchorOffset: doc.anchorOffset,
          focusNode: doc.focusNode,
          focusOffset: doc.focusOffset
        })),
    (lastSelection && shallowEqual(lastSelection, doc)) ||
      ((lastSelection = doc),
      (doc = accumulateTwoPhaseListeners(activeElementInst, "onSelect")),
      0 < doc.length &&
        ((nativeEvent = new SyntheticEvent(
          "onSelect",
          "select",
          null,
          nativeEvent,
          nativeEventTarget
        )),
        dispatchQueue.push({ event: nativeEvent, listeners: doc }),
        (nativeEvent.target = activeElement))));
}
function makePrefixMap(styleProp, eventName) {
  var prefixes = {};
  prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
  prefixes["Webkit" + styleProp] = "webkit" + eventName;
  prefixes["Moz" + styleProp] = "moz" + eventName;
  return prefixes;
}
var vendorPrefixes = {
    animationend: makePrefixMap("Animation", "AnimationEnd"),
    animationiteration: makePrefixMap("Animation", "AnimationIteration"),
    animationstart: makePrefixMap("Animation", "AnimationStart"),
    transitionrun: makePrefixMap("Transition", "TransitionRun"),
    transitionstart: makePrefixMap("Transition", "TransitionStart"),
    transitioncancel: makePrefixMap("Transition", "TransitionCancel"),
    transitionend: makePrefixMap("Transition", "TransitionEnd")
  },
  prefixedEventNames = {},
  style = {};
canUseDOM &&
  ((style = document.createElement("div").style),
  "AnimationEvent" in window ||
    (delete vendorPrefixes.animationend.animation,
    delete vendorPrefixes.animationiteration.animation,
    delete vendorPrefixes.animationstart.animation),
  "TransitionEvent" in window ||
    delete vendorPrefixes.transitionend.transition);
function getVendorPrefixedEventName(eventName) {
  if (prefixedEventNames[eventName]) return prefixedEventNames[eventName];
  if (!vendorPrefixes[eventName]) return eventName;
  var prefixMap = vendorPrefixes[eventName],
    styleProp;
  for (styleProp in prefixMap)
    if (prefixMap.hasOwnProperty(styleProp) && styleProp in style)
      return (prefixedEventNames[eventName] = prefixMap[styleProp]);
  return eventName;
}
var ANIMATION_END = getVendorPrefixedEventName("animationend"),
  ANIMATION_ITERATION = getVendorPrefixedEventName("animationiteration"),
  ANIMATION_START = getVendorPrefixedEventName("animationstart"),
  TRANSITION_RUN = getVendorPrefixedEventName("transitionrun"),
  TRANSITION_START = getVendorPrefixedEventName("transitionstart"),
  TRANSITION_CANCEL = getVendorPrefixedEventName("transitioncancel"),
  TRANSITION_END = getVendorPrefixedEventName("transitionend"),
  topLevelEventsToReactNames = new Map(),
  simpleEventPluginEvents =
    "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
      " "
    );
simpleEventPluginEvents.push("scrollEnd");
function registerSimpleEvent(domEventName, reactName) {
  topLevelEventsToReactNames.set(domEventName, reactName);
  registerTwoPhaseEvent(reactName, [domEventName]);
}
var reportGlobalError =
    "function" === typeof reportError
      ? reportError
      : function (error) {
          if (
            "object" === typeof window &&
            "function" === typeof window.ErrorEvent
          ) {
            var event = new window.ErrorEvent("error", {
              bubbles: !0,
              cancelable: !0,
              message:
                "object" === typeof error &&
                null !== error &&
                "string" === typeof error.message
                  ? String(error.message)
                  : String(error),
              error: error
            });
            if (!window.dispatchEvent(event)) return;
          } else if (
            "object" === typeof process &&
            "function" === typeof process.emit
          ) {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        },
  concurrentQueues = [],
  concurrentQueuesIndex = 0,
  concurrentlyUpdatedLanes = 0;
function finishQueueingConcurrentUpdates() {
  for (
    var endIndex = concurrentQueuesIndex,
      i = (concurrentlyUpdatedLanes = concurrentQueuesIndex = 0);
    i < endIndex;

  ) {
    var fiber = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var queue = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var update = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var lane = concurrentQueues[i];
    concurrentQueues[i++] = null;
    if (null !== queue && null !== update) {
      var pending = queue.pending;
      null === pending
        ? (update.next = update)
        : ((update.next = pending.next), (pending.next = update));
      queue.pending = update;
    }
    0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
  }
}
function enqueueUpdate$1(fiber, queue, update, lane) {
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;
  concurrentlyUpdatedLanes |= lane;
  fiber.lanes |= lane;
  fiber = fiber.alternate;
  null !== fiber && (fiber.lanes |= lane);
}
function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
  enqueueUpdate$1(fiber, queue, update, lane);
  return getRootForUpdatedFiber(fiber);
}
function enqueueConcurrentRenderForLane(fiber, lane) {
  enqueueUpdate$1(fiber, null, null, lane);
  return getRootForUpdatedFiber(fiber);
}
function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
  sourceFiber.lanes |= lane;
  var alternate = sourceFiber.alternate;
  null !== alternate && (alternate.lanes |= lane);
  for (var isHidden = !1, parent = sourceFiber.return; null !== parent; )
    (parent.childLanes |= lane),
      (alternate = parent.alternate),
      null !== alternate && (alternate.childLanes |= lane),
      22 === parent.tag &&
        ((sourceFiber = parent.stateNode),
        null === sourceFiber || sourceFiber._visibility & 1 || (isHidden = !0)),
      (sourceFiber = parent),
      (parent = parent.return);
  return 3 === sourceFiber.tag
    ? ((parent = sourceFiber.stateNode),
      isHidden &&
        null !== update &&
        ((isHidden = 31 - clz32(lane)),
        (sourceFiber = parent.hiddenUpdates),
        (alternate = sourceFiber[isHidden]),
        null === alternate
          ? (sourceFiber[isHidden] = [update])
          : alternate.push(update),
        (update.lane = lane | 536870912)),
      parent)
    : null;
}
function getRootForUpdatedFiber(sourceFiber) {
  if (50 < nestedUpdateCount)
    throw (
      ((nestedUpdateCount = 0),
      (rootWithNestedUpdates = null),
      Error(formatProdErrorMessage(185)))
    );
  for (var parent = sourceFiber.return; null !== parent; )
    (sourceFiber = parent), (parent = sourceFiber.return);
  return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
}
var emptyContextObject = {};
function FiberNode(tag, pendingProps, key, mode) {
  this.tag = tag;
  this.key = key;
  this.sibling =
    this.child =
    this.return =
    this.stateNode =
    this.type =
    this.elementType =
      null;
  this.index = 0;
  this.refCleanup = this.ref = null;
  this.pendingProps = pendingProps;
  this.dependencies =
    this.memoizedState =
    this.updateQueue =
    this.memoizedProps =
      null;
  this.mode = mode;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function createFiberImplClass(tag, pendingProps, key, mode) {
  return new FiberNode(tag, pendingProps, key, mode);
}
function shouldConstruct(Component) {
  Component = Component.prototype;
  return !(!Component || !Component.isReactComponent);
}
function createWorkInProgress(current, pendingProps) {
  var workInProgress = current.alternate;
  null === workInProgress
    ? ((workInProgress = createFiberImplClass(
        current.tag,
        pendingProps,
        current.key,
        current.mode
      )),
      (workInProgress.elementType = current.elementType),
      (workInProgress.type = current.type),
      (workInProgress.stateNode = current.stateNode),
      (workInProgress.alternate = current),
      (current.alternate = workInProgress))
    : ((workInProgress.pendingProps = pendingProps),
      (workInProgress.type = current.type),
      (workInProgress.flags = 0),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.deletions = null));
  workInProgress.flags = current.flags & 65011712;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  pendingProps = current.dependencies;
  workInProgress.dependencies =
    null === pendingProps
      ? null
      : { lanes: pendingProps.lanes, firstContext: pendingProps.firstContext };
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.refCleanup = current.refCleanup;
  return workInProgress;
}
function resetWorkInProgress(workInProgress, renderLanes) {
  workInProgress.flags &= 65011714;
  var current = workInProgress.alternate;
  null === current
    ? ((workInProgress.childLanes = 0),
      (workInProgress.lanes = renderLanes),
      (workInProgress.child = null),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.memoizedProps = null),
      (workInProgress.memoizedState = null),
      (workInProgress.updateQueue = null),
      (workInProgress.dependencies = null),
      (workInProgress.stateNode = null))
    : ((workInProgress.childLanes = current.childLanes),
      (workInProgress.lanes = current.lanes),
      (workInProgress.child = current.child),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.deletions = null),
      (workInProgress.memoizedProps = current.memoizedProps),
      (workInProgress.memoizedState = current.memoizedState),
      (workInProgress.updateQueue = current.updateQueue),
      (workInProgress.type = current.type),
      (renderLanes = current.dependencies),
      (workInProgress.dependencies =
        null === renderLanes
          ? null
          : {
              lanes: renderLanes.lanes,
              firstContext: renderLanes.firstContext
            }));
  return workInProgress;
}
function createFiberFromTypeAndProps(
  type,
  key,
  pendingProps,
  owner,
  mode,
  lanes
) {
  var fiberTag = 0;
  owner = type;
  if ("function" === typeof type) shouldConstruct(type) && (fiberTag = 1);
  else if ("string" === typeof type)
    fiberTag = isHostHoistableType(
      type,
      pendingProps,
      contextStackCursor.current
    )
      ? 26
      : "html" === type || "head" === type || "body" === type
        ? 27
        : 5;
  else
    a: switch (type) {
      case REACT_ACTIVITY_TYPE:
        return (
          (type = createFiberImplClass(31, pendingProps, key, mode)),
          (type.elementType = REACT_ACTIVITY_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      case REACT_STRICT_MODE_TYPE:
        fiberTag = 8;
        mode |= 24;
        break;
      case REACT_PROFILER_TYPE:
        return (
          (type = createFiberImplClass(12, pendingProps, key, mode | 2)),
          (type.elementType = REACT_PROFILER_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_SUSPENSE_TYPE:
        return (
          (type = createFiberImplClass(13, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_SUSPENSE_LIST_TYPE:
        return (
          (type = createFiberImplClass(19, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_LIST_TYPE),
          (type.lanes = lanes),
          type
        );
      default:
        if ("object" === typeof type && null !== type)
          switch (type.$$typeof) {
            case REACT_CONTEXT_TYPE:
              fiberTag = 10;
              break a;
            case REACT_CONSUMER_TYPE:
              fiberTag = 9;
              break a;
            case REACT_FORWARD_REF_TYPE:
              fiberTag = 11;
              break a;
            case REACT_MEMO_TYPE:
              fiberTag = 14;
              break a;
            case REACT_LAZY_TYPE:
              fiberTag = 16;
              owner = null;
              break a;
          }
        fiberTag = 29;
        pendingProps = Error(
          formatProdErrorMessage(130, null === type ? "null" : typeof type, "")
        );
        owner = null;
    }
  key = createFiberImplClass(fiberTag, pendingProps, key, mode);
  key.elementType = type;
  key.type = owner;
  key.lanes = lanes;
  return key;
}
function createFiberFromFragment(elements, mode, lanes, key) {
  elements = createFiberImplClass(7, elements, key, mode);
  elements.lanes = lanes;
  return elements;
}
function createFiberFromText(content, mode, lanes) {
  content = createFiberImplClass(6, content, null, mode);
  content.lanes = lanes;
  return content;
}
function createFiberFromDehydratedFragment(dehydratedNode) {
  var fiber = createFiberImplClass(18, null, null, 0);
  fiber.stateNode = dehydratedNode;
  return fiber;
}
function createFiberFromPortal(portal, mode, lanes) {
  mode = createFiberImplClass(
    4,
    null !== portal.children ? portal.children : [],
    portal.key,
    mode
  );
  mode.lanes = lanes;
  mode.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null,
    implementation: portal.implementation
  };
  return mode;
}
var CapturedStacks = new WeakMap();
function createCapturedValueAtFiber(value, source) {
  if ("object" === typeof value && null !== value) {
    var existing = CapturedStacks.get(value);
    if (void 0 !== existing) return existing;
    source = {
      value: value,
      source: source,
      stack: getStackByFiberInDevAndProd(source)
    };
    CapturedStacks.set(value, source);
    return source;
  }
  return {
    value: value,
    source: source,
    stack: getStackByFiberInDevAndProd(source)
  };
}
var forkStack = [],
  forkStackIndex = 0,
  treeForkProvider = null,
  treeForkCount = 0,
  idStack = [],
  idStackIndex = 0,
  treeContextProvider = null,
  treeContextId = 1,
  treeContextOverflow = "";
function pushTreeFork(workInProgress, totalChildren) {
  forkStack[forkStackIndex++] = treeForkCount;
  forkStack[forkStackIndex++] = treeForkProvider;
  treeForkProvider = workInProgress;
  treeForkCount = totalChildren;
}
function pushTreeId(workInProgress, totalChildren, index) {
  idStack[idStackIndex++] = treeContextId;
  idStack[idStackIndex++] = treeContextOverflow;
  idStack[idStackIndex++] = treeContextProvider;
  treeContextProvider = workInProgress;
  var baseIdWithLeadingBit = treeContextId;
  workInProgress = treeContextOverflow;
  var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
  baseIdWithLeadingBit &= ~(1 << baseLength);
  index += 1;
  var length = 32 - clz32(totalChildren) + baseLength;
  if (30 < length) {
    var numberOfOverflowBits = baseLength - (baseLength % 5);
    length = (
      baseIdWithLeadingBit &
      ((1 << numberOfOverflowBits) - 1)
    ).toString(32);
    baseIdWithLeadingBit >>= numberOfOverflowBits;
    baseLength -= numberOfOverflowBits;
    treeContextId =
      (1 << (32 - clz32(totalChildren) + baseLength)) |
      (index << baseLength) |
      baseIdWithLeadingBit;
    treeContextOverflow = length + workInProgress;
  } else
    (treeContextId =
      (1 << length) | (index << baseLength) | baseIdWithLeadingBit),
      (treeContextOverflow = workInProgress);
}
function pushMaterializedTreeId(workInProgress) {
  null !== workInProgress.return &&
    (pushTreeFork(workInProgress, 1), pushTreeId(workInProgress, 1, 0));
}
function popTreeContext(workInProgress) {
  for (; workInProgress === treeForkProvider; )
    (treeForkProvider = forkStack[--forkStackIndex]),
      (forkStack[forkStackIndex] = null),
      (treeForkCount = forkStack[--forkStackIndex]),
      (forkStack[forkStackIndex] = null);
  for (; workInProgress === treeContextProvider; )
    (treeContextProvider = idStack[--idStackIndex]),
      (idStack[idStackIndex] = null),
      (treeContextOverflow = idStack[--idStackIndex]),
      (idStack[idStackIndex] = null),
      (treeContextId = idStack[--idStackIndex]),
      (idStack[idStackIndex] = null);
}
function restoreSuspendedTreeContext(workInProgress, suspendedContext) {
  idStack[idStackIndex++] = treeContextId;
  idStack[idStackIndex++] = treeContextOverflow;
  idStack[idStackIndex++] = treeContextProvider;
  treeContextId = suspendedContext.id;
  treeContextOverflow = suspendedContext.overflow;
  treeContextProvider = workInProgress;
}
var hydrationParentFiber = null,
  nextHydratableInstance = null,
  isHydrating = !1,
  hydrationErrors = null,
  rootOrSingletonContext = !1,
  HydrationMismatchException = Error(formatProdErrorMessage(519));
function throwOnHydrationMismatch(fiber) {
  var error = Error(
    formatProdErrorMessage(
      418,
      1 < arguments.length && void 0 !== arguments[1] && arguments[1]
        ? "text"
        : "HTML",
      ""
    )
  );
  queueHydrationError(createCapturedValueAtFiber(error, fiber));
  throw HydrationMismatchException;
}
function prepareToHydrateHostInstance(fiber) {
  var instance = fiber.stateNode,
    type = fiber.type,
    props = fiber.memoizedProps;
  instance[internalInstanceKey] = fiber;
  instance[internalPropsKey] = props;
  switch (type) {
    case "dialog":
      listenToNonDelegatedEvent("cancel", instance);
      listenToNonDelegatedEvent("close", instance);
      break;
    case "iframe":
    case "object":
    case "embed":
      listenToNonDelegatedEvent("load", instance);
      break;
    case "video":
    case "audio":
      for (type = 0; type < mediaEventTypes.length; type++)
        listenToNonDelegatedEvent(mediaEventTypes[type], instance);
      break;
    case "source":
      listenToNonDelegatedEvent("error", instance);
      break;
    case "img":
    case "image":
    case "link":
      listenToNonDelegatedEvent("error", instance);
      listenToNonDelegatedEvent("load", instance);
      break;
    case "details":
      listenToNonDelegatedEvent("toggle", instance);
      break;
    case "input":
      listenToNonDelegatedEvent("invalid", instance);
      initInput(
        instance,
        props.value,
        props.defaultValue,
        props.checked,
        props.defaultChecked,
        props.type,
        props.name,
        !0
      );
      break;
    case "select":
      listenToNonDelegatedEvent("invalid", instance);
      break;
    case "textarea":
      listenToNonDelegatedEvent("invalid", instance),
        initTextarea(instance, props.value, props.defaultValue, props.children);
  }
  type = props.children;
  ("string" !== typeof type &&
    "number" !== typeof type &&
    "bigint" !== typeof type) ||
  instance.textContent === "" + type ||
  !0 === props.suppressHydrationWarning ||
  checkForUnmatchedText(instance.textContent, type)
    ? (null != props.popover &&
        (listenToNonDelegatedEvent("beforetoggle", instance),
        listenToNonDelegatedEvent("toggle", instance)),
      null != props.onScroll && listenToNonDelegatedEvent("scroll", instance),
      null != props.onScrollEnd &&
        listenToNonDelegatedEvent("scrollend", instance),
      null != props.onClick && (instance.onclick = noop$1),
      (instance = !0))
    : (instance = !1);
  instance || throwOnHydrationMismatch(fiber, !0);
}
function popToNextHostParent(fiber) {
  for (hydrationParentFiber = fiber.return; hydrationParentFiber; )
    switch (hydrationParentFiber.tag) {
      case 5:
      case 31:
      case 13:
        rootOrSingletonContext = !1;
        return;
      case 27:
      case 3:
        rootOrSingletonContext = !0;
        return;
      default:
        hydrationParentFiber = hydrationParentFiber.return;
    }
}
function popHydrationState(fiber) {
  if (fiber !== hydrationParentFiber) return !1;
  if (!isHydrating) return popToNextHostParent(fiber), (isHydrating = !0), !1;
  var tag = fiber.tag,
    JSCompiler_temp;
  if ((JSCompiler_temp = 3 !== tag && 27 !== tag)) {
    if ((JSCompiler_temp = 5 === tag))
      (JSCompiler_temp = fiber.type),
        (JSCompiler_temp =
          !("form" !== JSCompiler_temp && "button" !== JSCompiler_temp) ||
          shouldSetTextContent(fiber.type, fiber.memoizedProps));
    JSCompiler_temp = !JSCompiler_temp;
  }
  JSCompiler_temp && nextHydratableInstance && throwOnHydrationMismatch(fiber);
  popToNextHostParent(fiber);
  if (13 === tag) {
    fiber = fiber.memoizedState;
    fiber = null !== fiber ? fiber.dehydrated : null;
    if (!fiber) throw Error(formatProdErrorMessage(317));
    nextHydratableInstance =
      getNextHydratableInstanceAfterHydrationBoundary(fiber);
  } else if (31 === tag) {
    fiber = fiber.memoizedState;
    fiber = null !== fiber ? fiber.dehydrated : null;
    if (!fiber) throw Error(formatProdErrorMessage(317));
    nextHydratableInstance =
      getNextHydratableInstanceAfterHydrationBoundary(fiber);
  } else
    27 === tag
      ? ((tag = nextHydratableInstance),
        isSingletonScope(fiber.type)
          ? ((fiber = previousHydratableOnEnteringScopedSingleton),
            (previousHydratableOnEnteringScopedSingleton = null),
            (nextHydratableInstance = fiber))
          : (nextHydratableInstance = tag))
      : (nextHydratableInstance = hydrationParentFiber
          ? getNextHydratable(fiber.stateNode.nextSibling)
          : null);
  return !0;
}
function resetHydrationState() {
  nextHydratableInstance = hydrationParentFiber = null;
  isHydrating = !1;
}
function upgradeHydrationErrorsToRecoverable() {
  var queuedErrors = hydrationErrors;
  null !== queuedErrors &&
    (null === workInProgressRootRecoverableErrors
      ? (workInProgressRootRecoverableErrors = queuedErrors)
      : workInProgressRootRecoverableErrors.push.apply(
          workInProgressRootRecoverableErrors,
          queuedErrors
        ),
    (hydrationErrors = null));
  return queuedErrors;
}
function queueHydrationError(error) {
  null === hydrationErrors
    ? (hydrationErrors = [error])
    : hydrationErrors.push(error);
}
var valueCursor = createCursor(null),
  currentlyRenderingFiber$1 = null,
  lastContextDependency = null;
function pushProvider(providerFiber, context, nextValue) {
  push(valueCursor, context._currentValue);
  context._currentValue = nextValue;
}
function popProvider(context) {
  context._currentValue = valueCursor.current;
  pop(valueCursor);
}
function scheduleContextWorkOnParentPath(parent, renderLanes, propagationRoot) {
  for (; null !== parent; ) {
    var alternate = parent.alternate;
    (parent.childLanes & renderLanes) !== renderLanes
      ? ((parent.childLanes |= renderLanes),
        null !== alternate && (alternate.childLanes |= renderLanes))
      : null !== alternate &&
        (alternate.childLanes & renderLanes) !== renderLanes &&
        (alternate.childLanes |= renderLanes);
    if (parent === propagationRoot) break;
    parent = parent.return;
  }
}
function propagateContextChanges(
  workInProgress,
  contexts,
  renderLanes,
  forcePropagateEntireTree
) {
  var fiber = workInProgress.child;
  null !== fiber && (fiber.return = workInProgress);
  for (; null !== fiber; ) {
    var list = fiber.dependencies;
    if (null !== list) {
      var nextFiber = fiber.child;
      list = list.firstContext;
      a: for (; null !== list; ) {
        var dependency = list;
        list = fiber;
        for (var i = 0; i < contexts.length; i++)
          if (dependency.context === contexts[i]) {
            list.lanes |= renderLanes;
            dependency = list.alternate;
            null !== dependency && (dependency.lanes |= renderLanes);
            scheduleContextWorkOnParentPath(
              list.return,
              renderLanes,
              workInProgress
            );
            forcePropagateEntireTree || (nextFiber = null);
            break a;
          }
        list = dependency.next;
      }
    } else if (18 === fiber.tag) {
      nextFiber = fiber.return;
      if (null === nextFiber) throw Error(formatProdErrorMessage(341));
      nextFiber.lanes |= renderLanes;
      list = nextFiber.alternate;
      null !== list && (list.lanes |= renderLanes);
      scheduleContextWorkOnParentPath(nextFiber, renderLanes, workInProgress);
      nextFiber = null;
    } else nextFiber = fiber.child;
    if (null !== nextFiber) nextFiber.return = fiber;
    else
      for (nextFiber = fiber; null !== nextFiber; ) {
        if (nextFiber === workInProgress) {
          nextFiber = null;
          break;
        }
        fiber = nextFiber.sibling;
        if (null !== fiber) {
          fiber.return = nextFiber.return;
          nextFiber = fiber;
          break;
        }
        nextFiber = nextFiber.return;
      }
    fiber = nextFiber;
  }
}
function propagateParentContextChanges(
  current,
  workInProgress,
  renderLanes,
  forcePropagateEntireTree
) {
  current = null;
  for (
    var parent = workInProgress, isInsidePropagationBailout = !1;
    null !== parent;

  ) {
    if (!isInsidePropagationBailout)
      if (0 !== (parent.flags & 524288)) isInsidePropagationBailout = !0;
      else if (0 !== (parent.flags & 262144)) break;
    if (10 === parent.tag) {
      var currentParent = parent.alternate;
      if (null === currentParent) throw Error(formatProdErrorMessage(387));
      currentParent = currentParent.memoizedProps;
      if (null !== currentParent) {
        var context = parent.type;
        objectIs(parent.pendingProps.value, currentParent.value) ||
          (null !== current ? current.push(context) : (current = [context]));
      }
    } else if (parent === hostTransitionProviderCursor.current) {
      currentParent = parent.alternate;
      if (null === currentParent) throw Error(formatProdErrorMessage(387));
      currentParent.memoizedState.memoizedState !==
        parent.memoizedState.memoizedState &&
        (null !== current
          ? current.push(HostTransitionContext)
          : (current = [HostTransitionContext]));
    }
    parent = parent.return;
  }
  null !== current &&
    propagateContextChanges(
      workInProgress,
      current,
      renderLanes,
      forcePropagateEntireTree
    );
  workInProgress.flags |= 262144;
}
function checkIfContextChanged(currentDependencies) {
  for (
    currentDependencies = currentDependencies.firstContext;
    null !== currentDependencies;

  ) {
    if (
      !objectIs(
        currentDependencies.context._currentValue,
        currentDependencies.memoizedValue
      )
    )
      return !0;
    currentDependencies = currentDependencies.next;
  }
  return !1;
}
function prepareToReadContext(workInProgress) {
  currentlyRenderingFiber$1 = workInProgress;
  lastContextDependency = null;
  workInProgress = workInProgress.dependencies;
  null !== workInProgress && (workInProgress.firstContext = null);
}
function readContext(context) {
  return readContextForConsumer(currentlyRenderingFiber$1, context);
}
function readContextDuringReconciliation(consumer, context) {
  null === currentlyRenderingFiber$1 && prepareToReadContext(consumer);
  return readContextForConsumer(consumer, context);
}
function readContextForConsumer(consumer, context) {
  var value = context._currentValue;
  context = { context: context, memoizedValue: value, next: null };
  if (null === lastContextDependency) {
    if (null === consumer) throw Error(formatProdErrorMessage(308));
    lastContextDependency = context;
    consumer.dependencies = { lanes: 0, firstContext: context };
    consumer.flags |= 524288;
  } else lastContextDependency = lastContextDependency.next = context;
  return value;
}
var AbortControllerLocal =
    "undefined" !== typeof AbortController
      ? AbortController
      : function () {
          var listeners = [],
            signal = (this.signal = {
              aborted: !1,
              addEventListener: function (type, listener) {
                listeners.push(listener);
              }
            });
          this.abort = function () {
            signal.aborted = !0;
            listeners.forEach(function (listener) {
              return listener();
            });
          };
        },
  scheduleCallback$2 = Scheduler.unstable_scheduleCallback,
  NormalPriority = Scheduler.unstable_NormalPriority,
  CacheContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
function createCache() {
  return {
    controller: new AbortControllerLocal(),
    data: new Map(),
    refCount: 0
  };
}
function releaseCache(cache) {
  cache.refCount--;
  0 === cache.refCount &&
    scheduleCallback$2(NormalPriority, function () {
      cache.controller.abort();
    });
}
var currentEntangledListeners = null,
  currentEntangledPendingCount = 0,
  currentEntangledLane = 0,
  currentEntangledActionThenable = null;
function entangleAsyncAction(transition, thenable) {
  if (null === currentEntangledListeners) {
    var entangledListeners = (currentEntangledListeners = []);
    currentEntangledPendingCount = 0;
    currentEntangledLane = requestTransitionLane();
    currentEntangledActionThenable = {
      status: "pending",
      value: void 0,
      then: function (resolve) {
        entangledListeners.push(resolve);
      }
    };
  }
  currentEntangledPendingCount++;
  thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
  return thenable;
}
function pingEngtangledActionScope() {
  if (
    0 === --currentEntangledPendingCount &&
    null !== currentEntangledListeners
  ) {
    null !== currentEntangledActionThenable &&
      (currentEntangledActionThenable.status = "fulfilled");
    var listeners = currentEntangledListeners;
    currentEntangledListeners = null;
    currentEntangledLane = 0;
    currentEntangledActionThenable = null;
    for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
  }
}
function chainThenableValue(thenable, result) {
  var listeners = [],
    thenableWithOverride = {
      status: "pending",
      value: null,
      reason: null,
      then: function (resolve) {
        listeners.push(resolve);
      }
    };
  thenable.then(
    function () {
      thenableWithOverride.status = "fulfilled";
      thenableWithOverride.value = result;
      for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
    },
    function (error) {
      thenableWithOverride.status = "rejected";
      thenableWithOverride.reason = error;
      for (error = 0; error < listeners.length; error++)
        (0, listeners[error])(void 0);
    }
  );
  return thenableWithOverride;
}
var prevOnStartTransitionFinish = ReactSharedInternals.S;
ReactSharedInternals.S = function (transition, returnValue) {
  globalMostRecentTransitionTime = now();
  "object" === typeof returnValue &&
    null !== returnValue &&
    "function" === typeof returnValue.then &&
    entangleAsyncAction(transition, returnValue);
  null !== prevOnStartTransitionFinish &&
    prevOnStartTransitionFinish(transition, returnValue);
};
var resumedCache = createCursor(null);
function peekCacheFromPool() {
  var cacheResumedFromPreviousRender = resumedCache.current;
  return null !== cacheResumedFromPreviousRender
    ? cacheResumedFromPreviousRender
    : workInProgressRoot.pooledCache;
}
function pushTransition(offscreenWorkInProgress, prevCachePool) {
  null === prevCachePool
    ? push(resumedCache, resumedCache.current)
    : push(resumedCache, prevCachePool.pool);
}
function getSuspendedCache() {
  var cacheFromPool = peekCacheFromPool();
  return null === cacheFromPool
    ? null
    : { parent: CacheContext._currentValue, pool: cacheFromPool };
}
var SuspenseException = Error(formatProdErrorMessage(460)),
  SuspenseyCommitException = Error(formatProdErrorMessage(474)),
  SuspenseActionException = Error(formatProdErrorMessage(542)),
  noopSuspenseyCommitThenable = { then: function () {} };
function isThenableResolved(thenable) {
  thenable = thenable.status;
  return "fulfilled" === thenable || "rejected" === thenable;
}
function trackUsedThenable(thenableState, thenable, index) {
  index = thenableState[index];
  void 0 === index
    ? thenableState.push(thenable)
    : index !== thenable && (thenable.then(noop$1, noop$1), (thenable = index));
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw (
        ((thenableState = thenable.reason),
        checkIfUseWrappedInAsyncCatch(thenableState),
        thenableState)
      );
    default:
      if ("string" === typeof thenable.status) thenable.then(noop$1, noop$1);
      else {
        thenableState = workInProgressRoot;
        if (null !== thenableState && 100 < thenableState.shellSuspendCounter)
          throw Error(formatProdErrorMessage(482));
        thenableState = thenable;
        thenableState.status = "pending";
        thenableState.then(
          function (fulfilledValue) {
            if ("pending" === thenable.status) {
              var fulfilledThenable = thenable;
              fulfilledThenable.status = "fulfilled";
              fulfilledThenable.value = fulfilledValue;
            }
          },
          function (error) {
            if ("pending" === thenable.status) {
              var rejectedThenable = thenable;
              rejectedThenable.status = "rejected";
              rejectedThenable.reason = error;
            }
          }
        );
      }
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw (
            ((thenableState = thenable.reason),
            checkIfUseWrappedInAsyncCatch(thenableState),
            thenableState)
          );
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
function resolveLazy(lazyType) {
  try {
    var init = lazyType._init;
    return init(lazyType._payload);
  } catch (x) {
    if (null !== x && "object" === typeof x && "function" === typeof x.then)
      throw ((suspendedThenable = x), SuspenseException);
    throw x;
  }
}
var suspendedThenable = null;
function getSuspendedThenable() {
  if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
function checkIfUseWrappedInAsyncCatch(rejectedReason) {
  if (
    rejectedReason === SuspenseException ||
    rejectedReason === SuspenseActionException
  )
    throw Error(formatProdErrorMessage(483));
}
var thenableState$1 = null,
  thenableIndexCounter$1 = 0;
function unwrapThenable(thenable) {
  var index = thenableIndexCounter$1;
  thenableIndexCounter$1 += 1;
  null === thenableState$1 && (thenableState$1 = []);
  return trackUsedThenable(thenableState$1, thenable, index);
}
function coerceRef(workInProgress, element) {
  element = element.props.ref;
  workInProgress.ref = void 0 !== element ? element : null;
}
function throwOnInvalidObjectTypeImpl(returnFiber, newChild) {
  if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
    throw Error(formatProdErrorMessage(525));
  returnFiber = Object.prototype.toString.call(newChild);
  throw Error(
    formatProdErrorMessage(
      31,
      "[object Object]" === returnFiber
        ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
        : returnFiber
    )
  );
}
function createChildReconciler(shouldTrackSideEffects) {
  function deleteChild(returnFiber, childToDelete) {
    if (shouldTrackSideEffects) {
      var deletions = returnFiber.deletions;
      null === deletions
        ? ((returnFiber.deletions = [childToDelete]), (returnFiber.flags |= 16))
        : deletions.push(childToDelete);
    }
  }
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffects) return null;
    for (; null !== currentFirstChild; )
      deleteChild(returnFiber, currentFirstChild),
        (currentFirstChild = currentFirstChild.sibling);
    return null;
  }
  function mapRemainingChildren(currentFirstChild) {
    for (var existingChildren = new Map(); null !== currentFirstChild; )
      null !== currentFirstChild.key
        ? existingChildren.set(currentFirstChild.key, currentFirstChild)
        : existingChildren.set(currentFirstChild.index, currentFirstChild),
        (currentFirstChild = currentFirstChild.sibling);
    return existingChildren;
  }
  function useFiber(fiber, pendingProps) {
    fiber = createWorkInProgress(fiber, pendingProps);
    fiber.index = 0;
    fiber.sibling = null;
    return fiber;
  }
  function placeChild(newFiber, lastPlacedIndex, newIndex) {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects)
      return (newFiber.flags |= 1048576), lastPlacedIndex;
    newIndex = newFiber.alternate;
    if (null !== newIndex)
      return (
        (newIndex = newIndex.index),
        newIndex < lastPlacedIndex
          ? ((newFiber.flags |= 67108866), lastPlacedIndex)
          : newIndex
      );
    newFiber.flags |= 67108866;
    return lastPlacedIndex;
  }
  function placeSingleChild(newFiber) {
    shouldTrackSideEffects &&
      null === newFiber.alternate &&
      (newFiber.flags |= 67108866);
    return newFiber;
  }
  function updateTextNode(returnFiber, current, textContent, lanes) {
    if (null === current || 6 !== current.tag)
      return (
        (current = createFiberFromText(textContent, returnFiber.mode, lanes)),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, textContent);
    current.return = returnFiber;
    return current;
  }
  function updateElement(returnFiber, current, element, lanes) {
    var elementType = element.type;
    if (elementType === REACT_FRAGMENT_TYPE)
      return updateFragment(
        returnFiber,
        current,
        element.props.children,
        lanes,
        element.key
      );
    if (
      null !== current &&
      (current.elementType === elementType ||
        ("object" === typeof elementType &&
          null !== elementType &&
          elementType.$$typeof === REACT_LAZY_TYPE &&
          resolveLazy(elementType) === current.type))
    )
      return (
        (current = useFiber(current, element.props)),
        coerceRef(current, element),
        (current.return = returnFiber),
        current
      );
    current = createFiberFromTypeAndProps(
      element.type,
      element.key,
      element.props,
      null,
      returnFiber.mode,
      lanes
    );
    coerceRef(current, element);
    current.return = returnFiber;
    return current;
  }
  function updatePortal(returnFiber, current, portal, lanes) {
    if (
      null === current ||
      4 !== current.tag ||
      current.stateNode.containerInfo !== portal.containerInfo ||
      current.stateNode.implementation !== portal.implementation
    )
      return (
        (current = createFiberFromPortal(portal, returnFiber.mode, lanes)),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, portal.children || []);
    current.return = returnFiber;
    return current;
  }
  function updateFragment(returnFiber, current, fragment, lanes, key) {
    if (null === current || 7 !== current.tag)
      return (
        (current = createFiberFromFragment(
          fragment,
          returnFiber.mode,
          lanes,
          key
        )),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, fragment);
    current.return = returnFiber;
    return current;
  }
  function createChild(returnFiber, newChild, lanes) {
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return (
        (newChild = createFiberFromText(
          "" + newChild,
          returnFiber.mode,
          lanes
        )),
        (newChild.return = returnFiber),
        newChild
      );
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return (
            (lanes = createFiberFromTypeAndProps(
              newChild.type,
              newChild.key,
              newChild.props,
              null,
              returnFiber.mode,
              lanes
            )),
            coerceRef(lanes, newChild),
            (lanes.return = returnFiber),
            lanes
          );
        case REACT_PORTAL_TYPE:
          return (
            (newChild = createFiberFromPortal(
              newChild,
              returnFiber.mode,
              lanes
            )),
            (newChild.return = returnFiber),
            newChild
          );
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            createChild(returnFiber, newChild, lanes)
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return (
          (newChild = createFiberFromFragment(
            newChild,
            returnFiber.mode,
            lanes,
            null
          )),
          (newChild.return = returnFiber),
          newChild
        );
      if ("function" === typeof newChild.then)
        return createChild(returnFiber, unwrapThenable(newChild), lanes);
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return createChild(
          returnFiber,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function updateSlot(returnFiber, oldFiber, newChild, lanes) {
    var key = null !== oldFiber ? oldFiber.key : null;
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return null !== key
        ? null
        : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return newChild.key === key
            ? updateElement(returnFiber, oldFiber, newChild, lanes)
            : null;
        case REACT_PORTAL_TYPE:
          return newChild.key === key
            ? updatePortal(returnFiber, oldFiber, newChild, lanes)
            : null;
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            updateSlot(returnFiber, oldFiber, newChild, lanes)
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return null !== key
          ? null
          : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
      if ("function" === typeof newChild.then)
        return updateSlot(
          returnFiber,
          oldFiber,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return updateSlot(
          returnFiber,
          oldFiber,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function updateFromMap(
    existingChildren,
    returnFiber,
    newIdx,
    newChild,
    lanes
  ) {
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return (
        (existingChildren = existingChildren.get(newIdx) || null),
        updateTextNode(returnFiber, existingChildren, "" + newChild, lanes)
      );
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return (
            (existingChildren =
              existingChildren.get(
                null === newChild.key ? newIdx : newChild.key
              ) || null),
            updateElement(returnFiber, existingChildren, newChild, lanes)
          );
        case REACT_PORTAL_TYPE:
          return (
            (existingChildren =
              existingChildren.get(
                null === newChild.key ? newIdx : newChild.key
              ) || null),
            updatePortal(returnFiber, existingChildren, newChild, lanes)
          );
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              newChild,
              lanes
            )
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return (
          (existingChildren = existingChildren.get(newIdx) || null),
          updateFragment(returnFiber, existingChildren, newChild, lanes, null)
        );
      if ("function" === typeof newChild.then)
        return updateFromMap(
          existingChildren,
          returnFiber,
          newIdx,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return updateFromMap(
          existingChildren,
          returnFiber,
          newIdx,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function reconcileChildrenArray(
    returnFiber,
    currentFirstChild,
    newChildren,
    lanes
  ) {
    for (
      var resultingFirstChild = null,
        previousNewFiber = null,
        oldFiber = currentFirstChild,
        newIdx = (currentFirstChild = 0),
        nextOldFiber = null;
      null !== oldFiber && newIdx < newChildren.length;
      newIdx++
    ) {
      oldFiber.index > newIdx
        ? ((nextOldFiber = oldFiber), (oldFiber = null))
        : (nextOldFiber = oldFiber.sibling);
      var newFiber = updateSlot(
        returnFiber,
        oldFiber,
        newChildren[newIdx],
        lanes
      );
      if (null === newFiber) {
        null === oldFiber && (oldFiber = nextOldFiber);
        break;
      }
      shouldTrackSideEffects &&
        oldFiber &&
        null === newFiber.alternate &&
        deleteChild(returnFiber, oldFiber);
      currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
      null === previousNewFiber
        ? (resultingFirstChild = newFiber)
        : (previousNewFiber.sibling = newFiber);
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    if (newIdx === newChildren.length)
      return (
        deleteRemainingChildren(returnFiber, oldFiber),
        isHydrating && pushTreeFork(returnFiber, newIdx),
        resultingFirstChild
      );
    if (null === oldFiber) {
      for (; newIdx < newChildren.length; newIdx++)
        (oldFiber = createChild(returnFiber, newChildren[newIdx], lanes)),
          null !== oldFiber &&
            ((currentFirstChild = placeChild(
              oldFiber,
              currentFirstChild,
              newIdx
            )),
            null === previousNewFiber
              ? (resultingFirstChild = oldFiber)
              : (previousNewFiber.sibling = oldFiber),
            (previousNewFiber = oldFiber));
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    for (
      oldFiber = mapRemainingChildren(oldFiber);
      newIdx < newChildren.length;
      newIdx++
    )
      (nextOldFiber = updateFromMap(
        oldFiber,
        returnFiber,
        newIdx,
        newChildren[newIdx],
        lanes
      )),
        null !== nextOldFiber &&
          (shouldTrackSideEffects &&
            null !== nextOldFiber.alternate &&
            oldFiber.delete(
              null === nextOldFiber.key ? newIdx : nextOldFiber.key
            ),
          (currentFirstChild = placeChild(
            nextOldFiber,
            currentFirstChild,
            newIdx
          )),
          null === previousNewFiber
            ? (resultingFirstChild = nextOldFiber)
            : (previousNewFiber.sibling = nextOldFiber),
          (previousNewFiber = nextOldFiber));
    shouldTrackSideEffects &&
      oldFiber.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    isHydrating && pushTreeFork(returnFiber, newIdx);
    return resultingFirstChild;
  }
  function reconcileChildrenIterator(
    returnFiber,
    currentFirstChild,
    newChildren,
    lanes
  ) {
    if (null == newChildren) throw Error(formatProdErrorMessage(151));
    for (
      var resultingFirstChild = null,
        previousNewFiber = null,
        oldFiber = currentFirstChild,
        newIdx = (currentFirstChild = 0),
        nextOldFiber = null,
        step = newChildren.next();
      null !== oldFiber && !step.done;
      newIdx++, step = newChildren.next()
    ) {
      oldFiber.index > newIdx
        ? ((nextOldFiber = oldFiber), (oldFiber = null))
        : (nextOldFiber = oldFiber.sibling);
      var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
      if (null === newFiber) {
        null === oldFiber && (oldFiber = nextOldFiber);
        break;
      }
      shouldTrackSideEffects &&
        oldFiber &&
        null === newFiber.alternate &&
        deleteChild(returnFiber, oldFiber);
      currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
      null === previousNewFiber
        ? (resultingFirstChild = newFiber)
        : (previousNewFiber.sibling = newFiber);
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    if (step.done)
      return (
        deleteRemainingChildren(returnFiber, oldFiber),
        isHydrating && pushTreeFork(returnFiber, newIdx),
        resultingFirstChild
      );
    if (null === oldFiber) {
      for (; !step.done; newIdx++, step = newChildren.next())
        (step = createChild(returnFiber, step.value, lanes)),
          null !== step &&
            ((currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
            null === previousNewFiber
              ? (resultingFirstChild = step)
              : (previousNewFiber.sibling = step),
            (previousNewFiber = step));
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    for (
      oldFiber = mapRemainingChildren(oldFiber);
      !step.done;
      newIdx++, step = newChildren.next()
    )
      (step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes)),
        null !== step &&
          (shouldTrackSideEffects &&
            null !== step.alternate &&
            oldFiber.delete(null === step.key ? newIdx : step.key),
          (currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
          null === previousNewFiber
            ? (resultingFirstChild = step)
            : (previousNewFiber.sibling = step),
          (previousNewFiber = step));
    shouldTrackSideEffects &&
      oldFiber.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    isHydrating && pushTreeFork(returnFiber, newIdx);
    return resultingFirstChild;
  }
  function reconcileChildFibersImpl(
    returnFiber,
    currentFirstChild,
    newChild,
    lanes
  ) {
    "object" === typeof newChild &&
      null !== newChild &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      null === newChild.key &&
      (newChild = newChild.props.children);
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          a: {
            for (var key = newChild.key; null !== currentFirstChild; ) {
              if (currentFirstChild.key === key) {
                key = newChild.type;
                if (key === REACT_FRAGMENT_TYPE) {
                  if (7 === currentFirstChild.tag) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(
                      currentFirstChild,
                      newChild.props.children
                    );
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  }
                } else if (
                  currentFirstChild.elementType === key ||
                  ("object" === typeof key &&
                    null !== key &&
                    key.$$typeof === REACT_LAZY_TYPE &&
                    resolveLazy(key) === currentFirstChild.type)
                ) {
                  deleteRemainingChildren(
                    returnFiber,
                    currentFirstChild.sibling
                  );
                  lanes = useFiber(currentFirstChild, newChild.props);
                  coerceRef(lanes, newChild);
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                  break a;
                }
                deleteRemainingChildren(returnFiber, currentFirstChild);
                break;
              } else deleteChild(returnFiber, currentFirstChild);
              currentFirstChild = currentFirstChild.sibling;
            }
            newChild.type === REACT_FRAGMENT_TYPE
              ? ((lanes = createFiberFromFragment(
                  newChild.props.children,
                  returnFiber.mode,
                  lanes,
                  newChild.key
                )),
                (lanes.return = returnFiber),
                (returnFiber = lanes))
              : ((lanes = createFiberFromTypeAndProps(
                  newChild.type,
                  newChild.key,
                  newChild.props,
                  null,
                  returnFiber.mode,
                  lanes
                )),
                coerceRef(lanes, newChild),
                (lanes.return = returnFiber),
                (returnFiber = lanes));
          }
          return placeSingleChild(returnFiber);
        case REACT_PORTAL_TYPE:
          a: {
            for (key = newChild.key; null !== currentFirstChild; ) {
              if (currentFirstChild.key === key)
                if (
                  4 === currentFirstChild.tag &&
                  currentFirstChild.stateNode.containerInfo ===
                    newChild.containerInfo &&
                  currentFirstChild.stateNode.implementation ===
                    newChild.implementation
                ) {
                  deleteRemainingChildren(
                    returnFiber,
                    currentFirstChild.sibling
                  );
                  lanes = useFiber(currentFirstChild, newChild.children || []);
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                  break a;
                } else {
                  deleteRemainingChildren(returnFiber, currentFirstChild);
                  break;
                }
              else deleteChild(returnFiber, currentFirstChild);
              currentFirstChild = currentFirstChild.sibling;
            }
            lanes = createFiberFromPortal(newChild, returnFiber.mode, lanes);
            lanes.return = returnFiber;
            returnFiber = lanes;
          }
          return placeSingleChild(returnFiber);
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            reconcileChildFibersImpl(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            )
          );
      }
      if (isArrayImpl(newChild))
        return reconcileChildrenArray(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
      if (getIteratorFn(newChild)) {
        key = getIteratorFn(newChild);
        if ("function" !== typeof key) throw Error(formatProdErrorMessage(150));
        newChild = key.call(newChild);
        return reconcileChildrenIterator(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
      }
      if ("function" === typeof newChild.then)
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
      ? ((newChild = "" + newChild),
        null !== currentFirstChild && 6 === currentFirstChild.tag
          ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling),
            (lanes = useFiber(currentFirstChild, newChild)),
            (lanes.return = returnFiber),
            (returnFiber = lanes))
          : (deleteRemainingChildren(returnFiber, currentFirstChild),
            (lanes = createFiberFromText(newChild, returnFiber.mode, lanes)),
            (lanes.return = returnFiber),
            (returnFiber = lanes)),
        placeSingleChild(returnFiber))
      : deleteRemainingChildren(returnFiber, currentFirstChild);
  }
  return function (returnFiber, currentFirstChild, newChild, lanes) {
    try {
      thenableIndexCounter$1 = 0;
      var firstChildFiber = reconcileChildFibersImpl(
        returnFiber,
        currentFirstChild,
        newChild,
        lanes
      );
      thenableState$1 = null;
      return firstChildFiber;
    } catch (x) {
      if (x === SuspenseException || x === SuspenseActionException) throw x;
      var fiber = createFiberImplClass(29, x, null, returnFiber.mode);
      fiber.lanes = lanes;
      fiber.return = returnFiber;
      return fiber;
    } finally {
    }
  };
}
var reconcileChildFibers = createChildReconciler(!0),
  mountChildFibers = createChildReconciler(!1),
  hasForceUpdate = !1;
function initializeUpdateQueue(fiber) {
  fiber.updateQueue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: { pending: null, lanes: 0, hiddenCallbacks: null },
    callbacks: null
  };
}
function cloneUpdateQueue(current, workInProgress) {
  current = current.updateQueue;
  workInProgress.updateQueue === current &&
    (workInProgress.updateQueue = {
      baseState: current.baseState,
      firstBaseUpdate: current.firstBaseUpdate,
      lastBaseUpdate: current.lastBaseUpdate,
      shared: current.shared,
      callbacks: null
    });
}
function createUpdate(lane) {
  return { lane: lane, tag: 0, payload: null, callback: null, next: null };
}
function enqueueUpdate(fiber, update, lane) {
  var updateQueue = fiber.updateQueue;
  if (null === updateQueue) return null;
  updateQueue = updateQueue.shared;
  if (0 !== (executionContext & 2)) {
    var pending = updateQueue.pending;
    null === pending
      ? (update.next = update)
      : ((update.next = pending.next), (pending.next = update));
    updateQueue.pending = update;
    update = getRootForUpdatedFiber(fiber);
    markUpdateLaneFromFiberToRoot(fiber, null, lane);
    return update;
  }
  enqueueUpdate$1(fiber, updateQueue, update, lane);
  return getRootForUpdatedFiber(fiber);
}
function entangleTransitions(root, fiber, lane) {
  fiber = fiber.updateQueue;
  if (null !== fiber && ((fiber = fiber.shared), 0 !== (lane & 4194048))) {
    var queueLanes = fiber.lanes;
    queueLanes &= root.pendingLanes;
    lane |= queueLanes;
    fiber.lanes = lane;
    markRootEntangled(root, lane);
  }
}
function enqueueCapturedUpdate(workInProgress, capturedUpdate) {
  var queue = workInProgress.updateQueue,
    current = workInProgress.alternate;
  if (
    null !== current &&
    ((current = current.updateQueue), queue === current)
  ) {
    var newFirst = null,
      newLast = null;
    queue = queue.firstBaseUpdate;
    if (null !== queue) {
      do {
        var clone = {
          lane: queue.lane,
          tag: queue.tag,
          payload: queue.payload,
          callback: null,
          next: null
        };
        null === newLast
          ? (newFirst = newLast = clone)
          : (newLast = newLast.next = clone);
        queue = queue.next;
      } while (null !== queue);
      null === newLast
        ? (newFirst = newLast = capturedUpdate)
        : (newLast = newLast.next = capturedUpdate);
    } else newFirst = newLast = capturedUpdate;
    queue = {
      baseState: current.baseState,
      firstBaseUpdate: newFirst,
      lastBaseUpdate: newLast,
      shared: current.shared,
      callbacks: current.callbacks
    };
    workInProgress.updateQueue = queue;
    return;
  }
  workInProgress = queue.lastBaseUpdate;
  null === workInProgress
    ? (queue.firstBaseUpdate = capturedUpdate)
    : (workInProgress.next = capturedUpdate);
  queue.lastBaseUpdate = capturedUpdate;
}
var didReadFromEntangledAsyncAction = !1;
function suspendIfUpdateReadFromEntangledAsyncAction() {
  if (didReadFromEntangledAsyncAction) {
    var entangledActionThenable = currentEntangledActionThenable;
    if (null !== entangledActionThenable) throw entangledActionThenable;
  }
}
function processUpdateQueue(
  workInProgress$jscomp$0,
  props,
  instance$jscomp$0,
  renderLanes
) {
  didReadFromEntangledAsyncAction = !1;
  var queue = workInProgress$jscomp$0.updateQueue;
  hasForceUpdate = !1;
  var firstBaseUpdate = queue.firstBaseUpdate,
    lastBaseUpdate = queue.lastBaseUpdate,
    pendingQueue = queue.shared.pending;
  if (null !== pendingQueue) {
    queue.shared.pending = null;
    var lastPendingUpdate = pendingQueue,
      firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    null === lastBaseUpdate
      ? (firstBaseUpdate = firstPendingUpdate)
      : (lastBaseUpdate.next = firstPendingUpdate);
    lastBaseUpdate = lastPendingUpdate;
    var current = workInProgress$jscomp$0.alternate;
    null !== current &&
      ((current = current.updateQueue),
      (pendingQueue = current.lastBaseUpdate),
      pendingQueue !== lastBaseUpdate &&
        (null === pendingQueue
          ? (current.firstBaseUpdate = firstPendingUpdate)
          : (pendingQueue.next = firstPendingUpdate),
        (current.lastBaseUpdate = lastPendingUpdate)));
  }
  if (null !== firstBaseUpdate) {
    var newState = queue.baseState;
    lastBaseUpdate = 0;
    current = firstPendingUpdate = lastPendingUpdate = null;
    pendingQueue = firstBaseUpdate;
    do {
      var updateLane = pendingQueue.lane & -536870913,
        isHiddenUpdate = updateLane !== pendingQueue.lane;
      if (
        isHiddenUpdate
          ? (workInProgressRootRenderLanes & updateLane) === updateLane
          : (renderLanes & updateLane) === updateLane
      ) {
        0 !== updateLane &&
          updateLane === currentEntangledLane &&
          (didReadFromEntangledAsyncAction = !0);
        null !== current &&
          (current = current.next =
            {
              lane: 0,
              tag: pendingQueue.tag,
              payload: pendingQueue.payload,
              callback: null,
              next: null
            });
        a: {
          var workInProgress = workInProgress$jscomp$0,
            update = pendingQueue;
          updateLane = props;
          var instance = instance$jscomp$0;
          switch (update.tag) {
            case 1:
              workInProgress = update.payload;
              if ("function" === typeof workInProgress) {
                newState = workInProgress.call(instance, newState, updateLane);
                break a;
              }
              newState = workInProgress;
              break a;
            case 3:
              workInProgress.flags = (workInProgress.flags & -65537) | 128;
            case 0:
              workInProgress = update.payload;
              updateLane =
                "function" === typeof workInProgress
                  ? workInProgress.call(instance, newState, updateLane)
                  : workInProgress;
              if (null === updateLane || void 0 === updateLane) break a;
              newState = assign({}, newState, updateLane);
              break a;
            case 2:
              hasForceUpdate = !0;
          }
        }
        updateLane = pendingQueue.callback;
        null !== updateLane &&
          ((workInProgress$jscomp$0.flags |= 64),
          isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192),
          (isHiddenUpdate = queue.callbacks),
          null === isHiddenUpdate
            ? (queue.callbacks = [updateLane])
            : isHiddenUpdate.push(updateLane));
      } else
        (isHiddenUpdate = {
          lane: updateLane,
          tag: pendingQueue.tag,
          payload: pendingQueue.payload,
          callback: pendingQueue.callback,
          next: null
        }),
          null === current
            ? ((firstPendingUpdate = current = isHiddenUpdate),
              (lastPendingUpdate = newState))
            : (current = current.next = isHiddenUpdate),
          (lastBaseUpdate |= updateLane);
      pendingQueue = pendingQueue.next;
      if (null === pendingQueue)
        if (((pendingQueue = queue.shared.pending), null === pendingQueue))
          break;
        else
          (isHiddenUpdate = pendingQueue),
            (pendingQueue = isHiddenUpdate.next),
            (isHiddenUpdate.next = null),
            (queue.lastBaseUpdate = isHiddenUpdate),
            (queue.shared.pending = null);
    } while (1);
    null === current && (lastPendingUpdate = newState);
    queue.baseState = lastPendingUpdate;
    queue.firstBaseUpdate = firstPendingUpdate;
    queue.lastBaseUpdate = current;
    null === firstBaseUpdate && (queue.shared.lanes = 0);
    workInProgressRootSkippedLanes |= lastBaseUpdate;
    workInProgress$jscomp$0.lanes = lastBaseUpdate;
    workInProgress$jscomp$0.memoizedState = newState;
  }
}
function callCallback(callback, context) {
  if ("function" !== typeof callback)
    throw Error(formatProdErrorMessage(191, callback));
  callback.call(context);
}
function commitCallbacks(updateQueue, context) {
  var callbacks = updateQueue.callbacks;
  if (null !== callbacks)
    for (
      updateQueue.callbacks = null, updateQueue = 0;
      updateQueue < callbacks.length;
      updateQueue++
    )
      callCallback(callbacks[updateQueue], context);
}
var currentTreeHiddenStackCursor = createCursor(null),
  prevEntangledRenderLanesCursor = createCursor(0);
function pushHiddenContext(fiber, context) {
  fiber = entangledRenderLanes;
  push(prevEntangledRenderLanesCursor, fiber);
  push(currentTreeHiddenStackCursor, context);
  entangledRenderLanes = fiber | context.baseLanes;
}
function reuseHiddenContextOnStack() {
  push(prevEntangledRenderLanesCursor, entangledRenderLanes);
  push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
}
function popHiddenContext() {
  entangledRenderLanes = prevEntangledRenderLanesCursor.current;
  pop(currentTreeHiddenStackCursor);
  pop(prevEntangledRenderLanesCursor);
}
var suspenseHandlerStackCursor = createCursor(null),
  shellBoundary = null;
function pushPrimaryTreeSuspenseHandler(handler) {
  var current = handler.alternate;
  push(suspenseStackCursor, suspenseStackCursor.current & 1);
  push(suspenseHandlerStackCursor, handler);
  null === shellBoundary &&
    (null === current || null !== currentTreeHiddenStackCursor.current
      ? (shellBoundary = handler)
      : null !== current.memoizedState && (shellBoundary = handler));
}
function pushDehydratedActivitySuspenseHandler(fiber) {
  push(suspenseStackCursor, suspenseStackCursor.current);
  push(suspenseHandlerStackCursor, fiber);
  null === shellBoundary && (shellBoundary = fiber);
}
function pushOffscreenSuspenseHandler(fiber) {
  22 === fiber.tag
    ? (push(suspenseStackCursor, suspenseStackCursor.current),
      push(suspenseHandlerStackCursor, fiber),
      null === shellBoundary && (shellBoundary = fiber))
    : reuseSuspenseHandlerOnStack(fiber);
}
function reuseSuspenseHandlerOnStack() {
  push(suspenseStackCursor, suspenseStackCursor.current);
  push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
}
function popSuspenseHandler(fiber) {
  pop(suspenseHandlerStackCursor);
  shellBoundary === fiber && (shellBoundary = null);
  pop(suspenseStackCursor);
}
var suspenseStackCursor = createCursor(0);
function findFirstSuspended(row) {
  for (var node = row; null !== node; ) {
    if (13 === node.tag) {
      var state = node.memoizedState;
      if (
        null !== state &&
        ((state = state.dehydrated),
        null === state ||
          isSuspenseInstancePending(state) ||
          isSuspenseInstanceFallback(state))
      )
        return node;
    } else if (
      19 === node.tag &&
      ("forwards" === node.memoizedProps.revealOrder ||
        "backwards" === node.memoizedProps.revealOrder ||
        "unstable_legacy-backwards" === node.memoizedProps.revealOrder ||
        "together" === node.memoizedProps.revealOrder)
    ) {
      if (0 !== (node.flags & 128)) return node;
    } else if (null !== node.child) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === row) break;
    for (; null === node.sibling; ) {
      if (null === node.return || node.return === row) return null;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return null;
}
var renderLanes = 0,
  currentlyRenderingFiber = null,
  currentHook = null,
  workInProgressHook = null,
  didScheduleRenderPhaseUpdate = !1,
  didScheduleRenderPhaseUpdateDuringThisPass = !1,
  shouldDoubleInvokeUserFnsInHooksDEV = !1,
  localIdCounter = 0,
  thenableIndexCounter = 0,
  thenableState = null,
  globalClientIdCounter = 0;
function throwInvalidHookError() {
  throw Error(formatProdErrorMessage(321));
}
function areHookInputsEqual(nextDeps, prevDeps) {
  if (null === prevDeps) return !1;
  for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
    if (!objectIs(nextDeps[i], prevDeps[i])) return !1;
  return !0;
}
function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  secondArg,
  nextRenderLanes
) {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = 0;
  ReactSharedInternals.H =
    null === current || null === current.memoizedState
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
  shouldDoubleInvokeUserFnsInHooksDEV = !1;
  nextRenderLanes = Component(props, secondArg);
  shouldDoubleInvokeUserFnsInHooksDEV = !1;
  didScheduleRenderPhaseUpdateDuringThisPass &&
    (nextRenderLanes = renderWithHooksAgain(
      workInProgress,
      Component,
      props,
      secondArg
    ));
  finishRenderingHooks(current);
  return nextRenderLanes;
}
function finishRenderingHooks(current) {
  ReactSharedInternals.H = ContextOnlyDispatcher;
  var didRenderTooFewHooks = null !== currentHook && null !== currentHook.next;
  renderLanes = 0;
  workInProgressHook = currentHook = currentlyRenderingFiber = null;
  didScheduleRenderPhaseUpdate = !1;
  thenableIndexCounter = 0;
  thenableState = null;
  if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
  null === current ||
    didReceiveUpdate ||
    ((current = current.dependencies),
    null !== current &&
      checkIfContextChanged(current) &&
      (didReceiveUpdate = !0));
}
function renderWithHooksAgain(workInProgress, Component, props, secondArg) {
  currentlyRenderingFiber = workInProgress;
  var numberOfReRenders = 0;
  do {
    didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
    thenableIndexCounter = 0;
    didScheduleRenderPhaseUpdateDuringThisPass = !1;
    if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
    numberOfReRenders += 1;
    workInProgressHook = currentHook = null;
    if (null != workInProgress.updateQueue) {
      var children = workInProgress.updateQueue;
      children.lastEffect = null;
      children.events = null;
      children.stores = null;
      null != children.memoCache && (children.memoCache.index = 0);
    }
    ReactSharedInternals.H = HooksDispatcherOnRerender;
    children = Component(props, secondArg);
  } while (didScheduleRenderPhaseUpdateDuringThisPass);
  return children;
}
function TransitionAwareHostComponent() {
  var dispatcher = ReactSharedInternals.H,
    maybeThenable = dispatcher.useState()[0];
  maybeThenable =
    "function" === typeof maybeThenable.then
      ? useThenable(maybeThenable)
      : maybeThenable;
  dispatcher = dispatcher.useState()[0];
  (null !== currentHook ? currentHook.memoizedState : null) !== dispatcher &&
    (currentlyRenderingFiber.flags |= 1024);
  return maybeThenable;
}
function checkDidRenderIdHook() {
  var didRenderIdHook = 0 !== localIdCounter;
  localIdCounter = 0;
  return didRenderIdHook;
}
function bailoutHooks(current, workInProgress, lanes) {
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.flags &= -2053;
  current.lanes &= ~lanes;
}
function resetHooksOnUnwind(workInProgress) {
  if (didScheduleRenderPhaseUpdate) {
    for (
      workInProgress = workInProgress.memoizedState;
      null !== workInProgress;

    ) {
      var queue = workInProgress.queue;
      null !== queue && (queue.pending = null);
      workInProgress = workInProgress.next;
    }
    didScheduleRenderPhaseUpdate = !1;
  }
  renderLanes = 0;
  workInProgressHook = currentHook = currentlyRenderingFiber = null;
  didScheduleRenderPhaseUpdateDuringThisPass = !1;
  thenableIndexCounter = localIdCounter = 0;
  thenableState = null;
}
function mountWorkInProgressHook() {
  var hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null
  };
  null === workInProgressHook
    ? (currentlyRenderingFiber.memoizedState = workInProgressHook = hook)
    : (workInProgressHook = workInProgressHook.next = hook);
  return workInProgressHook;
}
function updateWorkInProgressHook() {
  if (null === currentHook) {
    var nextCurrentHook = currentlyRenderingFiber.alternate;
    nextCurrentHook =
      null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
  } else nextCurrentHook = currentHook.next;
  var nextWorkInProgressHook =
    null === workInProgressHook
      ? currentlyRenderingFiber.memoizedState
      : workInProgressHook.next;
  if (null !== nextWorkInProgressHook)
    (workInProgressHook = nextWorkInProgressHook),
      (currentHook = nextCurrentHook);
  else {
    if (null === nextCurrentHook) {
      if (null === currentlyRenderingFiber.alternate)
        throw Error(formatProdErrorMessage(467));
      throw Error(formatProdErrorMessage(310));
    }
    currentHook = nextCurrentHook;
    nextCurrentHook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,
      next: null
    };
    null === workInProgressHook
      ? (currentlyRenderingFiber.memoizedState = workInProgressHook =
          nextCurrentHook)
      : (workInProgressHook = workInProgressHook.next = nextCurrentHook);
  }
  return workInProgressHook;
}
function createFunctionComponentUpdateQueue() {
  return { lastEffect: null, events: null, stores: null, memoCache: null };
}
function useThenable(thenable) {
  var index = thenableIndexCounter;
  thenableIndexCounter += 1;
  null === thenableState && (thenableState = []);
  thenable = trackUsedThenable(thenableState, thenable, index);
  index = currentlyRenderingFiber;
  null ===
    (null === workInProgressHook
      ? index.memoizedState
      : workInProgressHook.next) &&
    ((index = index.alternate),
    (ReactSharedInternals.H =
      null === index || null === index.memoizedState
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate));
  return thenable;
}
function use(usable) {
  if (null !== usable && "object" === typeof usable) {
    if ("function" === typeof usable.then) return useThenable(usable);
    if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
  }
  throw Error(formatProdErrorMessage(438, String(usable)));
}
function useMemoCache(size) {
  var memoCache = null,
    updateQueue = currentlyRenderingFiber.updateQueue;
  null !== updateQueue && (memoCache = updateQueue.memoCache);
  if (null == memoCache) {
    var current = currentlyRenderingFiber.alternate;
    null !== current &&
      ((current = current.updateQueue),
      null !== current &&
        ((current = current.memoCache),
        null != current &&
          (memoCache = {
            data: current.data.map(function (array) {
              return array.slice();
            }),
            index: 0
          })));
  }
  null == memoCache && (memoCache = { data: [], index: 0 });
  null === updateQueue &&
    ((updateQueue = createFunctionComponentUpdateQueue()),
    (currentlyRenderingFiber.updateQueue = updateQueue));
  updateQueue.memoCache = memoCache;
  updateQueue = memoCache.data[memoCache.index];
  if (void 0 === updateQueue)
    for (
      updateQueue = memoCache.data[memoCache.index] = Array(size), current = 0;
      current < size;
      current++
    )
      updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
  memoCache.index++;
  return updateQueue;
}
function basicStateReducer(state, action) {
  return "function" === typeof action ? action(state) : action;
}
function updateReducer(reducer) {
  var hook = updateWorkInProgressHook();
  return updateReducerImpl(hook, currentHook, reducer);
}
function updateReducerImpl(hook, current, reducer) {
  var queue = hook.queue;
  if (null === queue) throw Error(formatProdErrorMessage(311));
  queue.lastRenderedReducer = reducer;
  var baseQueue = hook.baseQueue,
    pendingQueue = queue.pending;
  if (null !== pendingQueue) {
    if (null !== baseQueue) {
      var baseFirst = baseQueue.next;
      baseQueue.next = pendingQueue.next;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  pendingQueue = hook.baseState;
  if (null === baseQueue) hook.memoizedState = pendingQueue;
  else {
    current = baseQueue.next;
    var newBaseQueueFirst = (baseFirst = null),
      newBaseQueueLast = null,
      update = current,
      didReadFromEntangledAsyncAction$60 = !1;
    do {
      var updateLane = update.lane & -536870913;
      if (
        updateLane !== update.lane
          ? (workInProgressRootRenderLanes & updateLane) === updateLane
          : (renderLanes & updateLane) === updateLane
      ) {
        var revertLane = update.revertLane;
        if (0 === revertLane)
          null !== newBaseQueueLast &&
            (newBaseQueueLast = newBaseQueueLast.next =
              {
                lane: 0,
                revertLane: 0,
                gesture: null,
                action: update.action,
                hasEagerState: update.hasEagerState,
                eagerState: update.eagerState,
                next: null
              }),
            updateLane === currentEntangledLane &&
              (didReadFromEntangledAsyncAction$60 = !0);
        else if ((renderLanes & revertLane) === revertLane) {
          update = update.next;
          revertLane === currentEntangledLane &&
            (didReadFromEntangledAsyncAction$60 = !0);
          continue;
        } else
          (updateLane = {
            lane: 0,
            revertLane: update.revertLane,
            gesture: null,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          }),
            null === newBaseQueueLast
              ? ((newBaseQueueFirst = newBaseQueueLast = updateLane),
                (baseFirst = pendingQueue))
              : (newBaseQueueLast = newBaseQueueLast.next = updateLane),
            (currentlyRenderingFiber.lanes |= revertLane),
            (workInProgressRootSkippedLanes |= revertLane);
        updateLane = update.action;
        shouldDoubleInvokeUserFnsInHooksDEV &&
          reducer(pendingQueue, updateLane);
        pendingQueue = update.hasEagerState
          ? update.eagerState
          : reducer(pendingQueue, updateLane);
      } else
        (revertLane = {
          lane: updateLane,
          revertLane: update.revertLane,
          gesture: update.gesture,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null
        }),
          null === newBaseQueueLast
            ? ((newBaseQueueFirst = newBaseQueueLast = revertLane),
              (baseFirst = pendingQueue))
            : (newBaseQueueLast = newBaseQueueLast.next = revertLane),
          (currentlyRenderingFiber.lanes |= updateLane),
          (workInProgressRootSkippedLanes |= updateLane);
      update = update.next;
    } while (null !== update && update !== current);
    null === newBaseQueueLast
      ? (baseFirst = pendingQueue)
      : (newBaseQueueLast.next = newBaseQueueFirst);
    if (
      !objectIs(pendingQueue, hook.memoizedState) &&
      ((didReceiveUpdate = !0),
      didReadFromEntangledAsyncAction$60 &&
        ((reducer = currentEntangledActionThenable), null !== reducer))
    )
      throw reducer;
    hook.memoizedState = pendingQueue;
    hook.baseState = baseFirst;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = pendingQueue;
  }
  null === baseQueue && (queue.lanes = 0);
  return [hook.memoizedState, queue.dispatch];
}
function rerenderReducer(reducer) {
  var hook = updateWorkInProgressHook(),
    queue = hook.queue;
  if (null === queue) throw Error(formatProdErrorMessage(311));
  queue.lastRenderedReducer = reducer;
  var dispatch = queue.dispatch,
    lastRenderPhaseUpdate = queue.pending,
    newState = hook.memoizedState;
  if (null !== lastRenderPhaseUpdate) {
    queue.pending = null;
    var update = (lastRenderPhaseUpdate = lastRenderPhaseUpdate.next);
    do (newState = reducer(newState, update.action)), (update = update.next);
    while (update !== lastRenderPhaseUpdate);
    objectIs(newState, hook.memoizedState) || (didReceiveUpdate = !0);
    hook.memoizedState = newState;
    null === hook.baseQueue && (hook.baseState = newState);
    queue.lastRenderedState = newState;
  }
  return [newState, dispatch];
}
function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
  var fiber = currentlyRenderingFiber,
    hook = updateWorkInProgressHook(),
    isHydrating$jscomp$0 = isHydrating;
  if (isHydrating$jscomp$0) {
    if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
    getServerSnapshot = getServerSnapshot();
  } else getServerSnapshot = getSnapshot();
  var snapshotChanged = !objectIs(
    (currentHook || hook).memoizedState,
    getServerSnapshot
  );
  snapshotChanged &&
    ((hook.memoizedState = getServerSnapshot), (didReceiveUpdate = !0));
  hook = hook.queue;
  updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [
    subscribe
  ]);
  if (
    hook.getSnapshot !== getSnapshot ||
    snapshotChanged ||
    (null !== workInProgressHook && workInProgressHook.memoizedState.tag & 1)
  ) {
    fiber.flags |= 2048;
    pushSimpleEffect(
      9,
      { destroy: void 0 },
      updateStoreInstance.bind(
        null,
        fiber,
        hook,
        getServerSnapshot,
        getSnapshot
      ),
      null
    );
    if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
    isHydrating$jscomp$0 ||
      0 !== (renderLanes & 127) ||
      pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
  }
  return getServerSnapshot;
}
function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
  fiber.flags |= 16384;
  fiber = { getSnapshot: getSnapshot, value: renderedSnapshot };
  getSnapshot = currentlyRenderingFiber.updateQueue;
  null === getSnapshot
    ? ((getSnapshot = createFunctionComponentUpdateQueue()),
      (currentlyRenderingFiber.updateQueue = getSnapshot),
      (getSnapshot.stores = [fiber]))
    : ((renderedSnapshot = getSnapshot.stores),
      null === renderedSnapshot
        ? (getSnapshot.stores = [fiber])
        : renderedSnapshot.push(fiber));
}
function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
  inst.value = nextSnapshot;
  inst.getSnapshot = getSnapshot;
  checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
}
function subscribeToStore(fiber, inst, subscribe) {
  return subscribe(function () {
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
  });
}
function checkIfSnapshotChanged(inst) {
  var latestGetSnapshot = inst.getSnapshot;
  inst = inst.value;
  try {
    var nextValue = latestGetSnapshot();
    return !objectIs(inst, nextValue);
  } catch (error) {
    return !0;
  }
}
function forceStoreRerender(fiber) {
  var root = enqueueConcurrentRenderForLane(fiber, 2);
  null !== root && scheduleUpdateOnFiber(root, fiber, 2);
}
function mountStateImpl(initialState) {
  var hook = mountWorkInProgressHook();
  if ("function" === typeof initialState) {
    var initialStateInitializer = initialState;
    initialState = initialStateInitializer();
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(!0);
      try {
        initialStateInitializer();
      } finally {
        setIsStrictModeForDevtools(!1);
      }
    }
  }
  hook.memoizedState = hook.baseState = initialState;
  hook.queue = {
    pending: null,
    lanes: 0,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState
  };
  return hook;
}
function updateOptimisticImpl(hook, current, passthrough, reducer) {
  hook.baseState = passthrough;
  return updateReducerImpl(
    hook,
    currentHook,
    "function" === typeof reducer ? reducer : basicStateReducer
  );
}
function dispatchActionState(
  fiber,
  actionQueue,
  setPendingState,
  setState,
  payload
) {
  if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
  fiber = actionQueue.action;
  if (null !== fiber) {
    var actionNode = {
      payload: payload,
      action: fiber,
      next: null,
      isTransition: !0,
      status: "pending",
      value: null,
      reason: null,
      listeners: [],
      then: function (listener) {
        actionNode.listeners.push(listener);
      }
    };
    null !== ReactSharedInternals.T
      ? setPendingState(!0)
      : (actionNode.isTransition = !1);
    setState(actionNode);
    setPendingState = actionQueue.pending;
    null === setPendingState
      ? ((actionNode.next = actionQueue.pending = actionNode),
        runActionStateAction(actionQueue, actionNode))
      : ((actionNode.next = setPendingState.next),
        (actionQueue.pending = setPendingState.next = actionNode));
  }
}
function runActionStateAction(actionQueue, node) {
  var action = node.action,
    payload = node.payload,
    prevState = actionQueue.state;
  if (node.isTransition) {
    var prevTransition = ReactSharedInternals.T,
      currentTransition = {};
    ReactSharedInternals.T = currentTransition;
    try {
      var returnValue = action(prevState, payload),
        onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish &&
        onStartTransitionFinish(currentTransition, returnValue);
      handleActionReturnValue(actionQueue, node, returnValue);
    } catch (error) {
      onActionError(actionQueue, node, error);
    } finally {
      null !== prevTransition &&
        null !== currentTransition.types &&
        (prevTransition.types = currentTransition.types),
        (ReactSharedInternals.T = prevTransition);
    }
  } else
    try {
      (prevTransition = action(prevState, payload)),
        handleActionReturnValue(actionQueue, node, prevTransition);
    } catch (error$66) {
      onActionError(actionQueue, node, error$66);
    }
}
function handleActionReturnValue(actionQueue, node, returnValue) {
  null !== returnValue &&
  "object" === typeof returnValue &&
  "function" === typeof returnValue.then
    ? returnValue.then(
        function (nextState) {
          onActionSuccess(actionQueue, node, nextState);
        },
        function (error) {
          return onActionError(actionQueue, node, error);
        }
      )
    : onActionSuccess(actionQueue, node, returnValue);
}
function onActionSuccess(actionQueue, actionNode, nextState) {
  actionNode.status = "fulfilled";
  actionNode.value = nextState;
  notifyActionListeners(actionNode);
  actionQueue.state = nextState;
  actionNode = actionQueue.pending;
  null !== actionNode &&
    ((nextState = actionNode.next),
    nextState === actionNode
      ? (actionQueue.pending = null)
      : ((nextState = nextState.next),
        (actionNode.next = nextState),
        runActionStateAction(actionQueue, nextState)));
}
function onActionError(actionQueue, actionNode, error) {
  var last = actionQueue.pending;
  actionQueue.pending = null;
  if (null !== last) {
    last = last.next;
    do
      (actionNode.status = "rejected"),
        (actionNode.reason = error),
        notifyActionListeners(actionNode),
        (actionNode = actionNode.next);
    while (actionNode !== last);
  }
  actionQueue.action = null;
}
function notifyActionListeners(actionNode) {
  actionNode = actionNode.listeners;
  for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
}
function actionStateReducer(oldState, newState) {
  return newState;
}
function mountActionState(action, initialStateProp) {
  if (isHydrating) {
    var ssrFormState = workInProgressRoot.formState;
    if (null !== ssrFormState) {
      a: {
        var JSCompiler_inline_result = currentlyRenderingFiber;
        if (isHydrating) {
          if (nextHydratableInstance) {
            b: {
              var JSCompiler_inline_result$jscomp$0 = nextHydratableInstance;
              for (
                var inRootOrSingleton = rootOrSingletonContext;
                8 !== JSCompiler_inline_result$jscomp$0.nodeType;

              ) {
                if (!inRootOrSingleton) {
                  JSCompiler_inline_result$jscomp$0 = null;
                  break b;
                }
                JSCompiler_inline_result$jscomp$0 = getNextHydratable(
                  JSCompiler_inline_result$jscomp$0.nextSibling
                );
                if (null === JSCompiler_inline_result$jscomp$0) {
                  JSCompiler_inline_result$jscomp$0 = null;
                  break b;
                }
              }
              inRootOrSingleton = JSCompiler_inline_result$jscomp$0.data;
              JSCompiler_inline_result$jscomp$0 =
                "F!" === inRootOrSingleton || "F" === inRootOrSingleton
                  ? JSCompiler_inline_result$jscomp$0
                  : null;
            }
            if (JSCompiler_inline_result$jscomp$0) {
              nextHydratableInstance = getNextHydratable(
                JSCompiler_inline_result$jscomp$0.nextSibling
              );
              JSCompiler_inline_result =
                "F!" === JSCompiler_inline_result$jscomp$0.data;
              break a;
            }
          }
          throwOnHydrationMismatch(JSCompiler_inline_result);
        }
        JSCompiler_inline_result = !1;
      }
      JSCompiler_inline_result && (initialStateProp = ssrFormState[0]);
    }
  }
  ssrFormState = mountWorkInProgressHook();
  ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
  JSCompiler_inline_result = {
    pending: null,
    lanes: 0,
    dispatch: null,
    lastRenderedReducer: actionStateReducer,
    lastRenderedState: initialStateProp
  };
  ssrFormState.queue = JSCompiler_inline_result;
  ssrFormState = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    JSCompiler_inline_result
  );
  JSCompiler_inline_result.dispatch = ssrFormState;
  JSCompiler_inline_result = mountStateImpl(!1);
  inRootOrSingleton = dispatchOptimisticSetState.bind(
    null,
    currentlyRenderingFiber,
    !1,
    JSCompiler_inline_result.queue
  );
  JSCompiler_inline_result = mountWorkInProgressHook();
  JSCompiler_inline_result$jscomp$0 = {
    state: initialStateProp,
    dispatch: null,
    action: action,
    pending: null
  };
  JSCompiler_inline_result.queue = JSCompiler_inline_result$jscomp$0;
  ssrFormState = dispatchActionState.bind(
    null,
    currentlyRenderingFiber,
    JSCompiler_inline_result$jscomp$0,
    inRootOrSingleton,
    ssrFormState
  );
  JSCompiler_inline_result$jscomp$0.dispatch = ssrFormState;
  JSCompiler_inline_result.memoizedState = action;
  return [initialStateProp, ssrFormState, !1];
}
function updateActionState(action) {
  var stateHook = updateWorkInProgressHook();
  return updateActionStateImpl(stateHook, currentHook, action);
}
function updateActionStateImpl(stateHook, currentStateHook, action) {
  currentStateHook = updateReducerImpl(
    stateHook,
    currentStateHook,
    actionStateReducer
  )[0];
  stateHook = updateReducer(basicStateReducer)[0];
  if (
    "object" === typeof currentStateHook &&
    null !== currentStateHook &&
    "function" === typeof currentStateHook.then
  )
    try {
      var state = useThenable(currentStateHook);
    } catch (x) {
      if (x === SuspenseException) throw SuspenseActionException;
      throw x;
    }
  else state = currentStateHook;
  currentStateHook = updateWorkInProgressHook();
  var actionQueue = currentStateHook.queue,
    dispatch = actionQueue.dispatch;
  action !== currentStateHook.memoizedState &&
    ((currentlyRenderingFiber.flags |= 2048),
    pushSimpleEffect(
      9,
      { destroy: void 0 },
      actionStateActionEffect.bind(null, actionQueue, action),
      null
    ));
  return [state, dispatch, stateHook];
}
function actionStateActionEffect(actionQueue, action) {
  actionQueue.action = action;
}
function rerenderActionState(action) {
  var stateHook = updateWorkInProgressHook(),
    currentStateHook = currentHook;
  if (null !== currentStateHook)
    return updateActionStateImpl(stateHook, currentStateHook, action);
  updateWorkInProgressHook();
  stateHook = stateHook.memoizedState;
  currentStateHook = updateWorkInProgressHook();
  var dispatch = currentStateHook.queue.dispatch;
  currentStateHook.memoizedState = action;
  return [stateHook, dispatch, !1];
}
function pushSimpleEffect(tag, inst, create, deps) {
  tag = { tag: tag, create: create, deps: deps, inst: inst, next: null };
  inst = currentlyRenderingFiber.updateQueue;
  null === inst &&
    ((inst = createFunctionComponentUpdateQueue()),
    (currentlyRenderingFiber.updateQueue = inst));
  create = inst.lastEffect;
  null === create
    ? (inst.lastEffect = tag.next = tag)
    : ((deps = create.next),
      (create.next = tag),
      (tag.next = deps),
      (inst.lastEffect = tag));
  return tag;
}
function updateRef() {
  return updateWorkInProgressHook().memoizedState;
}
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  var hook = mountWorkInProgressHook();
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushSimpleEffect(
    1 | hookFlags,
    { destroy: void 0 },
    create,
    void 0 === deps ? null : deps
  );
}
function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  var hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var inst = hook.memoizedState.inst;
  null !== currentHook &&
  null !== deps &&
  areHookInputsEqual(deps, currentHook.memoizedState.deps)
    ? (hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps))
    : ((currentlyRenderingFiber.flags |= fiberFlags),
      (hook.memoizedState = pushSimpleEffect(
        1 | hookFlags,
        inst,
        create,
        deps
      )));
}
function mountEffect(create, deps) {
  mountEffectImpl(8390656, 8, create, deps);
}
function updateEffect(create, deps) {
  updateEffectImpl(2048, 8, create, deps);
}
function useEffectEventImpl(payload) {
  currentlyRenderingFiber.flags |= 4;
  var componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (null === componentUpdateQueue)
    (componentUpdateQueue = createFunctionComponentUpdateQueue()),
      (currentlyRenderingFiber.updateQueue = componentUpdateQueue),
      (componentUpdateQueue.events = [payload]);
  else {
    var events = componentUpdateQueue.events;
    null === events
      ? (componentUpdateQueue.events = [payload])
      : events.push(payload);
  }
}
function updateEvent(callback) {
  var ref = updateWorkInProgressHook().memoizedState;
  useEffectEventImpl({ ref: ref, nextImpl: callback });
  return function () {
    if (0 !== (executionContext & 2)) throw Error(formatProdErrorMessage(440));
    return ref.impl.apply(void 0, arguments);
  };
}
function updateInsertionEffect(create, deps) {
  return updateEffectImpl(4, 2, create, deps);
}
function updateLayoutEffect(create, deps) {
  return updateEffectImpl(4, 4, create, deps);
}
function imperativeHandleEffect(create, ref) {
  if ("function" === typeof ref) {
    create = create();
    var refCleanup = ref(create);
    return function () {
      "function" === typeof refCleanup ? refCleanup() : ref(null);
    };
  }
  if (null !== ref && void 0 !== ref)
    return (
      (create = create()),
      (ref.current = create),
      function () {
        ref.current = null;
      }
    );
}
function updateImperativeHandle(ref, create, deps) {
  deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
  updateEffectImpl(4, 4, imperativeHandleEffect.bind(null, create, ref), deps);
}
function mountDebugValue() {}
function updateCallback(callback, deps) {
  var hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var prevState = hook.memoizedState;
  if (null !== deps && areHookInputsEqual(deps, prevState[1]))
    return prevState[0];
  hook.memoizedState = [callback, deps];
  return callback;
}
function updateMemo(nextCreate, deps) {
  var hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var prevState = hook.memoizedState;
  if (null !== deps && areHookInputsEqual(deps, prevState[1]))
    return prevState[0];
  prevState = nextCreate();
  if (shouldDoubleInvokeUserFnsInHooksDEV) {
    setIsStrictModeForDevtools(!0);
    try {
      nextCreate();
    } finally {
      setIsStrictModeForDevtools(!1);
    }
  }
  hook.memoizedState = [prevState, deps];
  return prevState;
}
function mountDeferredValueImpl(hook, value, initialValue) {
  if (
    void 0 === initialValue ||
    (0 !== (renderLanes & 1073741824) &&
      0 === (workInProgressRootRenderLanes & 261930))
  )
    return (hook.memoizedState = value);
  hook.memoizedState = initialValue;
  hook = requestDeferredLane();
  currentlyRenderingFiber.lanes |= hook;
  workInProgressRootSkippedLanes |= hook;
  return initialValue;
}
function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
  if (objectIs(value, prevValue)) return value;
  if (null !== currentTreeHiddenStackCursor.current)
    return (
      (hook = mountDeferredValueImpl(hook, value, initialValue)),
      objectIs(hook, prevValue) || (didReceiveUpdate = !0),
      hook
    );
  if (
    0 === (renderLanes & 42) ||
    (0 !== (renderLanes & 1073741824) &&
      0 === (workInProgressRootRenderLanes & 261930))
  )
    return (didReceiveUpdate = !0), (hook.memoizedState = value);
  hook = requestDeferredLane();
  currentlyRenderingFiber.lanes |= hook;
  workInProgressRootSkippedLanes |= hook;
  return prevValue;
}
function startTransition(fiber, queue, pendingState, finishedState, callback) {
  var previousPriority = ReactDOMSharedInternals.p;
  ReactDOMSharedInternals.p =
    0 !== previousPriority && 8 > previousPriority ? previousPriority : 8;
  var prevTransition = ReactSharedInternals.T,
    currentTransition = {};
  ReactSharedInternals.T = currentTransition;
  dispatchOptimisticSetState(fiber, !1, queue, pendingState);
  try {
    var returnValue = callback(),
      onStartTransitionFinish = ReactSharedInternals.S;
    null !== onStartTransitionFinish &&
      onStartTransitionFinish(currentTransition, returnValue);
    if (
      null !== returnValue &&
      "object" === typeof returnValue &&
      "function" === typeof returnValue.then
    ) {
      var thenableForFinishedState = chainThenableValue(
        returnValue,
        finishedState
      );
      dispatchSetStateInternal(
        fiber,
        queue,
        thenableForFinishedState,
        requestUpdateLane(fiber)
      );
    } else
      dispatchSetStateInternal(
        fiber,
        queue,
        finishedState,
        requestUpdateLane(fiber)
      );
  } catch (error) {
    dispatchSetStateInternal(
      fiber,
      queue,
      { then: function () {}, status: "rejected", reason: error },
      requestUpdateLane()
    );
  } finally {
    (ReactDOMSharedInternals.p = previousPriority),
      null !== prevTransition &&
        null !== currentTransition.types &&
        (prevTransition.types = currentTransition.types),
      (ReactSharedInternals.T = prevTransition);
  }
}
function noop() {}
function startHostTransition(formFiber, pendingState, action, formData) {
  if (5 !== formFiber.tag) throw Error(formatProdErrorMessage(476));
  var queue = ensureFormComponentIsStateful(formFiber).queue;
  startTransition(
    formFiber,
    queue,
    pendingState,
    sharedNotPendingObject,
    null === action
      ? noop
      : function () {
          requestFormReset$1(formFiber);
          return action(formData);
        }
  );
}
function ensureFormComponentIsStateful(formFiber) {
  var existingStateHook = formFiber.memoizedState;
  if (null !== existingStateHook) return existingStateHook;
  existingStateHook = {
    memoizedState: sharedNotPendingObject,
    baseState: sharedNotPendingObject,
    baseQueue: null,
    queue: {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: sharedNotPendingObject
    },
    next: null
  };
  var initialResetState = {};
  existingStateHook.next = {
    memoizedState: initialResetState,
    baseState: initialResetState,
    baseQueue: null,
    queue: {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialResetState
    },
    next: null
  };
  formFiber.memoizedState = existingStateHook;
  formFiber = formFiber.alternate;
  null !== formFiber && (formFiber.memoizedState = existingStateHook);
  return existingStateHook;
}
function requestFormReset$1(formFiber) {
  var stateHook = ensureFormComponentIsStateful(formFiber);
  null === stateHook.next && (stateHook = formFiber.alternate.memoizedState);
  dispatchSetStateInternal(
    formFiber,
    stateHook.next.queue,
    {},
    requestUpdateLane()
  );
}
function useHostTransitionStatus() {
  return readContext(HostTransitionContext);
}
function updateId() {
  return updateWorkInProgressHook().memoizedState;
}
function updateRefresh() {
  return updateWorkInProgressHook().memoizedState;
}
function refreshCache(fiber) {
  for (var provider = fiber.return; null !== provider; ) {
    switch (provider.tag) {
      case 24:
      case 3:
        var lane = requestUpdateLane();
        fiber = createUpdate(lane);
        var root$69 = enqueueUpdate(provider, fiber, lane);
        null !== root$69 &&
          (scheduleUpdateOnFiber(root$69, provider, lane),
          entangleTransitions(root$69, provider, lane));
        provider = { cache: createCache() };
        fiber.payload = provider;
        return;
    }
    provider = provider.return;
  }
}
function dispatchReducerAction(fiber, queue, action) {
  var lane = requestUpdateLane();
  action = {
    lane: lane,
    revertLane: 0,
    gesture: null,
    action: action,
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  isRenderPhaseUpdate(fiber)
    ? enqueueRenderPhaseUpdate(queue, action)
    : ((action = enqueueConcurrentHookUpdate(fiber, queue, action, lane)),
      null !== action &&
        (scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane)));
}
function dispatchSetState(fiber, queue, action) {
  var lane = requestUpdateLane();
  dispatchSetStateInternal(fiber, queue, action, lane);
}
function dispatchSetStateInternal(fiber, queue, action, lane) {
  var update = {
    lane: lane,
    revertLane: 0,
    gesture: null,
    action: action,
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
  else {
    var alternate = fiber.alternate;
    if (
      0 === fiber.lanes &&
      (null === alternate || 0 === alternate.lanes) &&
      ((alternate = queue.lastRenderedReducer), null !== alternate)
    )
      try {
        var currentState = queue.lastRenderedState,
          eagerState = alternate(currentState, action);
        update.hasEagerState = !0;
        update.eagerState = eagerState;
        if (objectIs(eagerState, currentState))
          return (
            enqueueUpdate$1(fiber, queue, update, 0),
            null === workInProgressRoot && finishQueueingConcurrentUpdates(),
            !1
          );
      } catch (error) {
      } finally {
      }
    action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
    if (null !== action)
      return (
        scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane),
        !0
      );
  }
  return !1;
}
function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
  action = {
    lane: 2,
    revertLane: requestTransitionLane(),
    gesture: null,
    action: action,
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  if (isRenderPhaseUpdate(fiber)) {
    if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
  } else
    (throwIfDuringRender = enqueueConcurrentHookUpdate(
      fiber,
      queue,
      action,
      2
    )),
      null !== throwIfDuringRender &&
        scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
}
function isRenderPhaseUpdate(fiber) {
  var alternate = fiber.alternate;
  return (
    fiber === currentlyRenderingFiber ||
    (null !== alternate && alternate === currentlyRenderingFiber)
  );
}
function enqueueRenderPhaseUpdate(queue, update) {
  didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate =
    !0;
  var pending = queue.pending;
  null === pending
    ? (update.next = update)
    : ((update.next = pending.next), (pending.next = update));
  queue.pending = update;
}
function entangleTransitionUpdate(root, queue, lane) {
  if (0 !== (lane & 4194048)) {
    var queueLanes = queue.lanes;
    queueLanes &= root.pendingLanes;
    lane |= queueLanes;
    queue.lanes = lane;
    markRootEntangled(root, lane);
  }
}
var ContextOnlyDispatcher = {
  readContext: readContext,
  use: use,
  useCallback: throwInvalidHookError,
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useImperativeHandle: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
  useInsertionEffect: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useReducer: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useState: throwInvalidHookError,
  useDebugValue: throwInvalidHookError,
  useDeferredValue: throwInvalidHookError,
  useTransition: throwInvalidHookError,
  useSyncExternalStore: throwInvalidHookError,
  useId: throwInvalidHookError,
  useHostTransitionStatus: throwInvalidHookError,
  useFormState: throwInvalidHookError,
  useActionState: throwInvalidHookError,
  useOptimistic: throwInvalidHookError,
  useMemoCache: throwInvalidHookError,
  useCacheRefresh: throwInvalidHookError
};
ContextOnlyDispatcher.useEffectEvent = throwInvalidHookError;
var HooksDispatcherOnMount = {
    readContext: readContext,
    use: use,
    useCallback: function (callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        void 0 === deps ? null : deps
      ];
      return callback;
    },
    useContext: readContext,
    useEffect: mountEffect,
    useImperativeHandle: function (ref, create, deps) {
      deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
      mountEffectImpl(
        4194308,
        4,
        imperativeHandleEffect.bind(null, create, ref),
        deps
      );
    },
    useLayoutEffect: function (create, deps) {
      return mountEffectImpl(4194308, 4, create, deps);
    },
    useInsertionEffect: function (create, deps) {
      mountEffectImpl(4, 2, create, deps);
    },
    useMemo: function (nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      var nextValue = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(!0);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(!1);
        }
      }
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    },
    useReducer: function (reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (void 0 !== init) {
        var initialState = init(initialArg);
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(!0);
          try {
            init(initialArg);
          } finally {
            setIsStrictModeForDevtools(!1);
          }
        }
      } else initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber,
        reducer
      );
      return [hook.memoizedState, reducer];
    },
    useRef: function (initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return (hook.memoizedState = initialValue);
    },
    useState: function (initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue,
        dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    },
    useTransition: function () {
      var stateHook = mountStateImpl(!1);
      stateHook = startTransition.bind(
        null,
        currentlyRenderingFiber,
        stateHook.queue,
        !0,
        !1
      );
      mountWorkInProgressHook().memoizedState = stateHook;
      return [!1, stateHook];
    },
    useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber,
        hook = mountWorkInProgressHook();
      if (isHydrating) {
        if (void 0 === getServerSnapshot)
          throw Error(formatProdErrorMessage(407));
        getServerSnapshot = getServerSnapshot();
      } else {
        getServerSnapshot = getSnapshot();
        if (null === workInProgressRoot)
          throw Error(formatProdErrorMessage(349));
        0 !== (workInProgressRootRenderLanes & 127) ||
          pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
      }
      hook.memoizedState = getServerSnapshot;
      var inst = { value: getServerSnapshot, getSnapshot: getSnapshot };
      hook.queue = inst;
      mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
        subscribe
      ]);
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(
          null,
          fiber,
          inst,
          getServerSnapshot,
          getSnapshot
        ),
        null
      );
      return getServerSnapshot;
    },
    useId: function () {
      var hook = mountWorkInProgressHook(),
        identifierPrefix = workInProgressRoot.identifierPrefix;
      if (isHydrating) {
        var JSCompiler_inline_result = treeContextOverflow;
        var idWithLeadingBit = treeContextId;
        JSCompiler_inline_result =
          (
            idWithLeadingBit & ~(1 << (32 - clz32(idWithLeadingBit) - 1))
          ).toString(32) + JSCompiler_inline_result;
        identifierPrefix =
          "_" + identifierPrefix + "R_" + JSCompiler_inline_result;
        JSCompiler_inline_result = localIdCounter++;
        0 < JSCompiler_inline_result &&
          (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
        identifierPrefix += "_";
      } else
        (JSCompiler_inline_result = globalClientIdCounter++),
          (identifierPrefix =
            "_" +
            identifierPrefix +
            "r_" +
            JSCompiler_inline_result.toString(32) +
            "_");
      return (hook.memoizedState = identifierPrefix);
    },
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: mountActionState,
    useActionState: mountActionState,
    useOptimistic: function (passthrough) {
      var hook = mountWorkInProgressHook();
      hook.memoizedState = hook.baseState = passthrough;
      var queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      hook.queue = queue;
      hook = dispatchOptimisticSetState.bind(
        null,
        currentlyRenderingFiber,
        !0,
        queue
      );
      queue.dispatch = hook;
      return [passthrough, hook];
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: function () {
      return (mountWorkInProgressHook().memoizedState = refreshCache.bind(
        null,
        currentlyRenderingFiber
      ));
    },
    useEffectEvent: function (callback) {
      var hook = mountWorkInProgressHook(),
        ref = { impl: callback };
      hook.memoizedState = ref;
      return function () {
        if (0 !== (executionContext & 2))
          throw Error(formatProdErrorMessage(440));
        return ref.impl.apply(void 0, arguments);
      };
    }
  },
  HooksDispatcherOnUpdate = {
    readContext: readContext,
    use: use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,
    useRef: updateRef,
    useState: function () {
      return updateReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function () {
      var booleanOrThenable = updateReducer(basicStateReducer)[0],
        start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable
          ? booleanOrThenable
          : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: updateActionState,
    useActionState: updateActionState,
    useOptimistic: function (passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: updateRefresh
  };
HooksDispatcherOnUpdate.useEffectEvent = updateEvent;
var HooksDispatcherOnRerender = {
  readContext: readContext,
  use: use,
  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useInsertionEffect: updateInsertionEffect,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: rerenderReducer,
  useRef: updateRef,
  useState: function () {
    return rerenderReducer(basicStateReducer);
  },
  useDebugValue: mountDebugValue,
  useDeferredValue: function (value, initialValue) {
    var hook = updateWorkInProgressHook();
    return null === currentHook
      ? mountDeferredValueImpl(hook, value, initialValue)
      : updateDeferredValueImpl(
          hook,
          currentHook.memoizedState,
          value,
          initialValue
        );
  },
  useTransition: function () {
    var booleanOrThenable = rerenderReducer(basicStateReducer)[0],
      start = updateWorkInProgressHook().memoizedState;
    return [
      "boolean" === typeof booleanOrThenable
        ? booleanOrThenable
        : useThenable(booleanOrThenable),
      start
    ];
  },
  useSyncExternalStore: updateSyncExternalStore,
  useId: updateId,
  useHostTransitionStatus: useHostTransitionStatus,
  useFormState: rerenderActionState,
  useActionState: rerenderActionState,
  useOptimistic: function (passthrough, reducer) {
    var hook = updateWorkInProgressHook();
    if (null !== currentHook)
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    hook.baseState = passthrough;
    return [passthrough, hook.queue.dispatch];
  },
  useMemoCache: useMemoCache,
  useCacheRefresh: updateRefresh
};
HooksDispatcherOnRerender.useEffectEvent = updateEvent;
function applyDerivedStateFromProps(
  workInProgress,
  ctor,
  getDerivedStateFromProps,
  nextProps
) {
  ctor = workInProgress.memoizedState;
  getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
  getDerivedStateFromProps =
    null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps
      ? ctor
      : assign({}, ctor, getDerivedStateFromProps);
  workInProgress.memoizedState = getDerivedStateFromProps;
  0 === workInProgress.lanes &&
    (workInProgress.updateQueue.baseState = getDerivedStateFromProps);
}
var classComponentUpdater = {
  enqueueSetState: function (inst, payload, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(),
      update = createUpdate(lane);
    update.payload = payload;
    void 0 !== callback && null !== callback && (update.callback = callback);
    payload = enqueueUpdate(inst, update, lane);
    null !== payload &&
      (scheduleUpdateOnFiber(payload, inst, lane),
      entangleTransitions(payload, inst, lane));
  },
  enqueueReplaceState: function (inst, payload, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(),
      update = createUpdate(lane);
    update.tag = 1;
    update.payload = payload;
    void 0 !== callback && null !== callback && (update.callback = callback);
    payload = enqueueUpdate(inst, update, lane);
    null !== payload &&
      (scheduleUpdateOnFiber(payload, inst, lane),
      entangleTransitions(payload, inst, lane));
  },
  enqueueForceUpdate: function (inst, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(),
      update = createUpdate(lane);
    update.tag = 2;
    void 0 !== callback && null !== callback && (update.callback = callback);
    callback = enqueueUpdate(inst, update, lane);
    null !== callback &&
      (scheduleUpdateOnFiber(callback, inst, lane),
      entangleTransitions(callback, inst, lane));
  }
};
function checkShouldComponentUpdate(
  workInProgress,
  ctor,
  oldProps,
  newProps,
  oldState,
  newState,
  nextContext
) {
  workInProgress = workInProgress.stateNode;
  return "function" === typeof workInProgress.shouldComponentUpdate
    ? workInProgress.shouldComponentUpdate(newProps, newState, nextContext)
    : ctor.prototype && ctor.prototype.isPureReactComponent
      ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
      : !0;
}
function callComponentWillReceiveProps(
  workInProgress,
  instance,
  newProps,
  nextContext
) {
  workInProgress = instance.state;
  "function" === typeof instance.componentWillReceiveProps &&
    instance.componentWillReceiveProps(newProps, nextContext);
  "function" === typeof instance.UNSAFE_componentWillReceiveProps &&
    instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
  instance.state !== workInProgress &&
    classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
}
function resolveClassComponentProps(Component, baseProps) {
  var newProps = baseProps;
  if ("ref" in baseProps) {
    newProps = {};
    for (var propName in baseProps)
      "ref" !== propName && (newProps[propName] = baseProps[propName]);
  }
  if ((Component = Component.defaultProps)) {
    newProps === baseProps && (newProps = assign({}, newProps));
    for (var propName$73 in Component)
      void 0 === newProps[propName$73] &&
        (newProps[propName$73] = Component[propName$73]);
  }
  return newProps;
}
function defaultOnUncaughtError(error) {
  reportGlobalError(error);
}
function defaultOnCaughtError(error) {
  console.error(error);
}
function defaultOnRecoverableError(error) {
  reportGlobalError(error);
}
function logUncaughtError(root, errorInfo) {
  try {
    var onUncaughtError = root.onUncaughtError;
    onUncaughtError(errorInfo.value, { componentStack: errorInfo.stack });
  } catch (e$74) {
    setTimeout(function () {
      throw e$74;
    });
  }
}
function logCaughtError(root, boundary, errorInfo) {
  try {
    var onCaughtError = root.onCaughtError;
    onCaughtError(errorInfo.value, {
      componentStack: errorInfo.stack,
      errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
    });
  } catch (e$75) {
    setTimeout(function () {
      throw e$75;
    });
  }
}
function createRootErrorUpdate(root, errorInfo, lane) {
  lane = createUpdate(lane);
  lane.tag = 3;
  lane.payload = { element: null };
  lane.callback = function () {
    logUncaughtError(root, errorInfo);
  };
  return lane;
}
function createClassErrorUpdate(lane) {
  lane = createUpdate(lane);
  lane.tag = 3;
  return lane;
}
function initializeClassErrorUpdate(update, root, fiber, errorInfo) {
  var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
  if ("function" === typeof getDerivedStateFromError) {
    var error = errorInfo.value;
    update.payload = function () {
      return getDerivedStateFromError(error);
    };
    update.callback = function () {
      logCaughtError(root, fiber, errorInfo);
    };
  }
  var inst = fiber.stateNode;
  null !== inst &&
    "function" === typeof inst.componentDidCatch &&
    (update.callback = function () {
      logCaughtError(root, fiber, errorInfo);
      "function" !== typeof getDerivedStateFromError &&
        (null === legacyErrorBoundariesThatAlreadyFailed
          ? (legacyErrorBoundariesThatAlreadyFailed = new Set([this]))
          : legacyErrorBoundariesThatAlreadyFailed.add(this));
      var stack = errorInfo.stack;
      this.componentDidCatch(errorInfo.value, {
        componentStack: null !== stack ? stack : ""
      });
    });
}
function throwException(
  root,
  returnFiber,
  sourceFiber,
  value,
  rootRenderLanes
) {
  sourceFiber.flags |= 32768;
  if (
    null !== value &&
    "object" === typeof value &&
    "function" === typeof value.then
  ) {
    returnFiber = sourceFiber.alternate;
    null !== returnFiber &&
      propagateParentContextChanges(
        returnFiber,
        sourceFiber,
        rootRenderLanes,
        !0
      );
    sourceFiber = suspenseHandlerStackCursor.current;
    if (null !== sourceFiber) {
      switch (sourceFiber.tag) {
        case 31:
        case 13:
          return (
            null === shellBoundary
              ? renderDidSuspendDelayIfPossible()
              : null === sourceFiber.alternate &&
                0 === workInProgressRootExitStatus &&
                (workInProgressRootExitStatus = 3),
            (sourceFiber.flags &= -257),
            (sourceFiber.flags |= 65536),
            (sourceFiber.lanes = rootRenderLanes),
            value === noopSuspenseyCommitThenable
              ? (sourceFiber.flags |= 16384)
              : ((returnFiber = sourceFiber.updateQueue),
                null === returnFiber
                  ? (sourceFiber.updateQueue = new Set([value]))
                  : returnFiber.add(value),
                attachPingListener(root, value, rootRenderLanes)),
            !1
          );
        case 22:
          return (
            (sourceFiber.flags |= 65536),
            value === noopSuspenseyCommitThenable
              ? (sourceFiber.flags |= 16384)
              : ((returnFiber = sourceFiber.updateQueue),
                null === returnFiber
                  ? ((returnFiber = {
                      transitions: null,
                      markerInstances: null,
                      retryQueue: new Set([value])
                    }),
                    (sourceFiber.updateQueue = returnFiber))
                  : ((sourceFiber = returnFiber.retryQueue),
                    null === sourceFiber
                      ? (returnFiber.retryQueue = new Set([value]))
                      : sourceFiber.add(value)),
                attachPingListener(root, value, rootRenderLanes)),
            !1
          );
      }
      throw Error(formatProdErrorMessage(435, sourceFiber.tag));
    }
    attachPingListener(root, value, rootRenderLanes);
    renderDidSuspendDelayIfPossible();
    return !1;
  }
  if (isHydrating)
    return (
      (returnFiber = suspenseHandlerStackCursor.current),
      null !== returnFiber
        ? (0 === (returnFiber.flags & 65536) && (returnFiber.flags |= 256),
          (returnFiber.flags |= 65536),
          (returnFiber.lanes = rootRenderLanes),
          value !== HydrationMismatchException &&
            ((root = Error(formatProdErrorMessage(422), { cause: value })),
            queueHydrationError(createCapturedValueAtFiber(root, sourceFiber))))
        : (value !== HydrationMismatchException &&
            ((returnFiber = Error(formatProdErrorMessage(423), {
              cause: value
            })),
            queueHydrationError(
              createCapturedValueAtFiber(returnFiber, sourceFiber)
            )),
          (root = root.current.alternate),
          (root.flags |= 65536),
          (rootRenderLanes &= -rootRenderLanes),
          (root.lanes |= rootRenderLanes),
          (value = createCapturedValueAtFiber(value, sourceFiber)),
          (rootRenderLanes = createRootErrorUpdate(
            root.stateNode,
            value,
            rootRenderLanes
          )),
          enqueueCapturedUpdate(root, rootRenderLanes),
          4 !== workInProgressRootExitStatus &&
            (workInProgressRootExitStatus = 2)),
      !1
    );
  var wrapperError = Error(formatProdErrorMessage(520), { cause: value });
  wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
  null === workInProgressRootConcurrentErrors
    ? (workInProgressRootConcurrentErrors = [wrapperError])
    : workInProgressRootConcurrentErrors.push(wrapperError);
  4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
  if (null === returnFiber) return !0;
  value = createCapturedValueAtFiber(value, sourceFiber);
  sourceFiber = returnFiber;
  do {
    switch (sourceFiber.tag) {
      case 3:
        return (
          (sourceFiber.flags |= 65536),
          (root = rootRenderLanes & -rootRenderLanes),
          (sourceFiber.lanes |= root),
          (root = createRootErrorUpdate(sourceFiber.stateNode, value, root)),
          enqueueCapturedUpdate(sourceFiber, root),
          !1
        );
      case 1:
        if (
          ((returnFiber = sourceFiber.type),
          (wrapperError = sourceFiber.stateNode),
          0 === (sourceFiber.flags & 128) &&
            ("function" === typeof returnFiber.getDerivedStateFromError ||
              (null !== wrapperError &&
                "function" === typeof wrapperError.componentDidCatch &&
                (null === legacyErrorBoundariesThatAlreadyFailed ||
                  !legacyErrorBoundariesThatAlreadyFailed.has(wrapperError)))))
        )
          return (
            (sourceFiber.flags |= 65536),
            (rootRenderLanes &= -rootRenderLanes),
            (sourceFiber.lanes |= rootRenderLanes),
            (rootRenderLanes = createClassErrorUpdate(rootRenderLanes)),
            initializeClassErrorUpdate(
              rootRenderLanes,
              root,
              sourceFiber,
              value
            ),
            enqueueCapturedUpdate(sourceFiber, rootRenderLanes),
            !1
          );
    }
    sourceFiber = sourceFiber.return;
  } while (null !== sourceFiber);
  return !1;
}
var SelectiveHydrationException = Error(formatProdErrorMessage(461)),
  didReceiveUpdate = !1;
function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
  workInProgress.child =
    null === current
      ? mountChildFibers(workInProgress, null, nextChildren, renderLanes)
      : reconcileChildFibers(
          workInProgress,
          current.child,
          nextChildren,
          renderLanes
        );
}
function updateForwardRef(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  Component = Component.render;
  var ref = workInProgress.ref;
  if ("ref" in nextProps) {
    var propsWithoutRef = {};
    for (var key in nextProps)
      "ref" !== key && (propsWithoutRef[key] = nextProps[key]);
  } else propsWithoutRef = nextProps;
  prepareToReadContext(workInProgress);
  nextProps = renderWithHooks(
    current,
    workInProgress,
    Component,
    propsWithoutRef,
    ref,
    renderLanes
  );
  key = checkDidRenderIdHook();
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  isHydrating && key && pushMaterializedTreeId(workInProgress);
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, nextProps, renderLanes);
  return workInProgress.child;
}
function updateMemoComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  if (null === current) {
    var type = Component.type;
    if (
      "function" === typeof type &&
      !shouldConstruct(type) &&
      void 0 === type.defaultProps &&
      null === Component.compare
    )
      return (
        (workInProgress.tag = 15),
        (workInProgress.type = type),
        updateSimpleMemoComponent(
          current,
          workInProgress,
          type,
          nextProps,
          renderLanes
        )
      );
    current = createFiberFromTypeAndProps(
      Component.type,
      null,
      nextProps,
      workInProgress,
      workInProgress.mode,
      renderLanes
    );
    current.ref = workInProgress.ref;
    current.return = workInProgress;
    return (workInProgress.child = current);
  }
  type = current.child;
  if (!checkScheduledUpdateOrContext(current, renderLanes)) {
    var prevProps = type.memoizedProps;
    Component = Component.compare;
    Component = null !== Component ? Component : shallowEqual;
    if (Component(prevProps, nextProps) && current.ref === workInProgress.ref)
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  workInProgress.flags |= 1;
  current = createWorkInProgress(type, nextProps);
  current.ref = workInProgress.ref;
  current.return = workInProgress;
  return (workInProgress.child = current);
}
function updateSimpleMemoComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  if (null !== current) {
    var prevProps = current.memoizedProps;
    if (
      shallowEqual(prevProps, nextProps) &&
      current.ref === workInProgress.ref
    )
      if (
        ((didReceiveUpdate = !1),
        (workInProgress.pendingProps = nextProps = prevProps),
        checkScheduledUpdateOrContext(current, renderLanes))
      )
        0 !== (current.flags & 131072) && (didReceiveUpdate = !0);
      else
        return (
          (workInProgress.lanes = current.lanes),
          bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
        );
  }
  return updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  );
}
function updateOffscreenComponent(
  current,
  workInProgress,
  renderLanes,
  nextProps
) {
  var nextChildren = nextProps.children,
    prevState = null !== current ? current.memoizedState : null;
  null === current &&
    null === workInProgress.stateNode &&
    (workInProgress.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
  if ("hidden" === nextProps.mode) {
    if (0 !== (workInProgress.flags & 128)) {
      prevState =
        null !== prevState ? prevState.baseLanes | renderLanes : renderLanes;
      if (null !== current) {
        nextProps = workInProgress.child = current.child;
        for (nextChildren = 0; null !== nextProps; )
          (nextChildren =
            nextChildren | nextProps.lanes | nextProps.childLanes),
            (nextProps = nextProps.sibling);
        nextProps = nextChildren & ~prevState;
      } else (nextProps = 0), (workInProgress.child = null);
      return deferHiddenOffscreenComponent(
        current,
        workInProgress,
        prevState,
        renderLanes,
        nextProps
      );
    }
    if (0 !== (renderLanes & 536870912))
      (workInProgress.memoizedState = { baseLanes: 0, cachePool: null }),
        null !== current &&
          pushTransition(
            workInProgress,
            null !== prevState ? prevState.cachePool : null
          ),
        null !== prevState
          ? pushHiddenContext(workInProgress, prevState)
          : reuseHiddenContextOnStack(),
        pushOffscreenSuspenseHandler(workInProgress);
    else
      return (
        (nextProps = workInProgress.lanes = 536870912),
        deferHiddenOffscreenComponent(
          current,
          workInProgress,
          null !== prevState ? prevState.baseLanes | renderLanes : renderLanes,
          renderLanes,
          nextProps
        )
      );
  } else
    null !== prevState
      ? (pushTransition(workInProgress, prevState.cachePool),
        pushHiddenContext(workInProgress, prevState),
        reuseSuspenseHandlerOnStack(workInProgress),
        (workInProgress.memoizedState = null))
      : (null !== current && pushTransition(workInProgress, null),
        reuseHiddenContextOnStack(),
        reuseSuspenseHandlerOnStack(workInProgress));
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
function bailoutOffscreenComponent(current, workInProgress) {
  (null !== current && 22 === current.tag) ||
    null !== workInProgress.stateNode ||
    (workInProgress.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
  return workInProgress.sibling;
}
function deferHiddenOffscreenComponent(
  current,
  workInProgress,
  nextBaseLanes,
  renderLanes,
  remainingChildLanes
) {
  var JSCompiler_inline_result = peekCacheFromPool();
  JSCompiler_inline_result =
    null === JSCompiler_inline_result
      ? null
      : { parent: CacheContext._currentValue, pool: JSCompiler_inline_result };
  workInProgress.memoizedState = {
    baseLanes: nextBaseLanes,
    cachePool: JSCompiler_inline_result
  };
  null !== current && pushTransition(workInProgress, null);
  reuseHiddenContextOnStack();
  pushOffscreenSuspenseHandler(workInProgress);
  null !== current &&
    propagateParentContextChanges(current, workInProgress, renderLanes, !0);
  workInProgress.childLanes = remainingChildLanes;
  return null;
}
function mountActivityChildren(workInProgress, nextProps) {
  nextProps = mountWorkInProgressOffscreenFiber(
    { mode: nextProps.mode, children: nextProps.children },
    workInProgress.mode
  );
  nextProps.ref = workInProgress.ref;
  workInProgress.child = nextProps;
  nextProps.return = workInProgress;
  return nextProps;
}
function retryActivityComponentWithoutHydrating(
  current,
  workInProgress,
  renderLanes
) {
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);
  current = mountActivityChildren(workInProgress, workInProgress.pendingProps);
  current.flags |= 2;
  popSuspenseHandler(workInProgress);
  workInProgress.memoizedState = null;
  return current;
}
function updateActivityComponent(current, workInProgress, renderLanes) {
  var nextProps = workInProgress.pendingProps,
    didSuspend = 0 !== (workInProgress.flags & 128);
  workInProgress.flags &= -129;
  if (null === current) {
    if (isHydrating) {
      if ("hidden" === nextProps.mode)
        return (
          (current = mountActivityChildren(workInProgress, nextProps)),
          (workInProgress.lanes = 536870912),
          bailoutOffscreenComponent(null, current)
        );
      pushDehydratedActivitySuspenseHandler(workInProgress);
      (current = nextHydratableInstance)
        ? ((current = canHydrateHydrationBoundary(
            current,
            rootOrSingletonContext
          )),
          (current = null !== current && "&" === current.data ? current : null),
          null !== current &&
            ((workInProgress.memoizedState = {
              dehydrated: current,
              treeContext:
                null !== treeContextProvider
                  ? { id: treeContextId, overflow: treeContextOverflow }
                  : null,
              retryLane: 536870912,
              hydrationErrors: null
            }),
            (renderLanes = createFiberFromDehydratedFragment(current)),
            (renderLanes.return = workInProgress),
            (workInProgress.child = renderLanes),
            (hydrationParentFiber = workInProgress),
            (nextHydratableInstance = null)))
        : (current = null);
      if (null === current) throw throwOnHydrationMismatch(workInProgress);
      workInProgress.lanes = 536870912;
      return null;
    }
    return mountActivityChildren(workInProgress, nextProps);
  }
  var prevState = current.memoizedState;
  if (null !== prevState) {
    var dehydrated = prevState.dehydrated;
    pushDehydratedActivitySuspenseHandler(workInProgress);
    if (didSuspend)
      if (workInProgress.flags & 256)
        (workInProgress.flags &= -257),
          (workInProgress = retryActivityComponentWithoutHydrating(
            current,
            workInProgress,
            renderLanes
          ));
      else if (null !== workInProgress.memoizedState)
        (workInProgress.child = current.child),
          (workInProgress.flags |= 128),
          (workInProgress = null);
      else throw Error(formatProdErrorMessage(558));
    else if (
      (didReceiveUpdate ||
        propagateParentContextChanges(current, workInProgress, renderLanes, !1),
      (didSuspend = 0 !== (renderLanes & current.childLanes)),
      didReceiveUpdate || didSuspend)
    ) {
      nextProps = workInProgressRoot;
      if (
        null !== nextProps &&
        ((dehydrated = getBumpedLaneForHydration(nextProps, renderLanes)),
        0 !== dehydrated && dehydrated !== prevState.retryLane)
      )
        throw (
          ((prevState.retryLane = dehydrated),
          enqueueConcurrentRenderForLane(current, dehydrated),
          scheduleUpdateOnFiber(nextProps, current, dehydrated),
          SelectiveHydrationException)
        );
      renderDidSuspendDelayIfPossible();
      workInProgress = retryActivityComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes
      );
    } else
      (current = prevState.treeContext),
        (nextHydratableInstance = getNextHydratable(dehydrated.nextSibling)),
        (hydrationParentFiber = workInProgress),
        (isHydrating = !0),
        (hydrationErrors = null),
        (rootOrSingletonContext = !1),
        null !== current &&
          restoreSuspendedTreeContext(workInProgress, current),
        (workInProgress = mountActivityChildren(workInProgress, nextProps)),
        (workInProgress.flags |= 4096);
    return workInProgress;
  }
  current = createWorkInProgress(current.child, {
    mode: nextProps.mode,
    children: nextProps.children
  });
  current.ref = workInProgress.ref;
  workInProgress.child = current;
  current.return = workInProgress;
  return current;
}
function markRef(current, workInProgress) {
  var ref = workInProgress.ref;
  if (null === ref)
    null !== current &&
      null !== current.ref &&
      (workInProgress.flags |= 4194816);
  else {
    if ("function" !== typeof ref && "object" !== typeof ref)
      throw Error(formatProdErrorMessage(284));
    if (null === current || current.ref !== ref)
      workInProgress.flags |= 4194816;
  }
}
function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  prepareToReadContext(workInProgress);
  Component = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    void 0,
    renderLanes
  );
  nextProps = checkDidRenderIdHook();
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  isHydrating && nextProps && pushMaterializedTreeId(workInProgress);
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, Component, renderLanes);
  return workInProgress.child;
}
function replayFunctionComponent(
  current,
  workInProgress,
  nextProps,
  Component,
  secondArg,
  renderLanes
) {
  prepareToReadContext(workInProgress);
  workInProgress.updateQueue = null;
  nextProps = renderWithHooksAgain(
    workInProgress,
    Component,
    nextProps,
    secondArg
  );
  finishRenderingHooks(current);
  Component = checkDidRenderIdHook();
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  isHydrating && Component && pushMaterializedTreeId(workInProgress);
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, nextProps, renderLanes);
  return workInProgress.child;
}
function updateClassComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  prepareToReadContext(workInProgress);
  if (null === workInProgress.stateNode) {
    var context = emptyContextObject,
      contextType = Component.contextType;
    "object" === typeof contextType &&
      null !== contextType &&
      (context = readContext(contextType));
    context = new Component(nextProps, context);
    workInProgress.memoizedState =
      null !== context.state && void 0 !== context.state ? context.state : null;
    context.updater = classComponentUpdater;
    workInProgress.stateNode = context;
    context._reactInternals = workInProgress;
    context = workInProgress.stateNode;
    context.props = nextProps;
    context.state = workInProgress.memoizedState;
    context.refs = {};
    initializeUpdateQueue(workInProgress);
    contextType = Component.contextType;
    context.context =
      "object" === typeof contextType && null !== contextType
        ? readContext(contextType)
        : emptyContextObject;
    context.state = workInProgress.memoizedState;
    contextType = Component.getDerivedStateFromProps;
    "function" === typeof contextType &&
      (applyDerivedStateFromProps(
        workInProgress,
        Component,
        contextType,
        nextProps
      ),
      (context.state = workInProgress.memoizedState));
    "function" === typeof Component.getDerivedStateFromProps ||
      "function" === typeof context.getSnapshotBeforeUpdate ||
      ("function" !== typeof context.UNSAFE_componentWillMount &&
        "function" !== typeof context.componentWillMount) ||
      ((contextType = context.state),
      "function" === typeof context.componentWillMount &&
        context.componentWillMount(),
      "function" === typeof context.UNSAFE_componentWillMount &&
        context.UNSAFE_componentWillMount(),
      contextType !== context.state &&
        classComponentUpdater.enqueueReplaceState(context, context.state, null),
      processUpdateQueue(workInProgress, nextProps, context, renderLanes),
      suspendIfUpdateReadFromEntangledAsyncAction(),
      (context.state = workInProgress.memoizedState));
    "function" === typeof context.componentDidMount &&
      (workInProgress.flags |= 4194308);
    nextProps = !0;
  } else if (null === current) {
    context = workInProgress.stateNode;
    var unresolvedOldProps = workInProgress.memoizedProps,
      oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
    context.props = oldProps;
    var oldContext = context.context,
      contextType$jscomp$0 = Component.contextType;
    contextType = emptyContextObject;
    "object" === typeof contextType$jscomp$0 &&
      null !== contextType$jscomp$0 &&
      (contextType = readContext(contextType$jscomp$0));
    var getDerivedStateFromProps = Component.getDerivedStateFromProps;
    contextType$jscomp$0 =
      "function" === typeof getDerivedStateFromProps ||
      "function" === typeof context.getSnapshotBeforeUpdate;
    unresolvedOldProps = workInProgress.pendingProps !== unresolvedOldProps;
    contextType$jscomp$0 ||
      ("function" !== typeof context.UNSAFE_componentWillReceiveProps &&
        "function" !== typeof context.componentWillReceiveProps) ||
      ((unresolvedOldProps || oldContext !== contextType) &&
        callComponentWillReceiveProps(
          workInProgress,
          context,
          nextProps,
          contextType
        ));
    hasForceUpdate = !1;
    var oldState = workInProgress.memoizedState;
    context.state = oldState;
    processUpdateQueue(workInProgress, nextProps, context, renderLanes);
    suspendIfUpdateReadFromEntangledAsyncAction();
    oldContext = workInProgress.memoizedState;
    unresolvedOldProps || oldState !== oldContext || hasForceUpdate
      ? ("function" === typeof getDerivedStateFromProps &&
          (applyDerivedStateFromProps(
            workInProgress,
            Component,
            getDerivedStateFromProps,
            nextProps
          ),
          (oldContext = workInProgress.memoizedState)),
        (oldProps =
          hasForceUpdate ||
          checkShouldComponentUpdate(
            workInProgress,
            Component,
            oldProps,
            nextProps,
            oldState,
            oldContext,
            contextType
          ))
          ? (contextType$jscomp$0 ||
              ("function" !== typeof context.UNSAFE_componentWillMount &&
                "function" !== typeof context.componentWillMount) ||
              ("function" === typeof context.componentWillMount &&
                context.componentWillMount(),
              "function" === typeof context.UNSAFE_componentWillMount &&
                context.UNSAFE_componentWillMount()),
            "function" === typeof context.componentDidMount &&
              (workInProgress.flags |= 4194308))
          : ("function" === typeof context.componentDidMount &&
              (workInProgress.flags |= 4194308),
            (workInProgress.memoizedProps = nextProps),
            (workInProgress.memoizedState = oldContext)),
        (context.props = nextProps),
        (context.state = oldContext),
        (context.context = contextType),
        (nextProps = oldProps))
      : ("function" === typeof context.componentDidMount &&
          (workInProgress.flags |= 4194308),
        (nextProps = !1));
  } else {
    context = workInProgress.stateNode;
    cloneUpdateQueue(current, workInProgress);
    contextType = workInProgress.memoizedProps;
    contextType$jscomp$0 = resolveClassComponentProps(Component, contextType);
    context.props = contextType$jscomp$0;
    getDerivedStateFromProps = workInProgress.pendingProps;
    oldState = context.context;
    oldContext = Component.contextType;
    oldProps = emptyContextObject;
    "object" === typeof oldContext &&
      null !== oldContext &&
      (oldProps = readContext(oldContext));
    unresolvedOldProps = Component.getDerivedStateFromProps;
    (oldContext =
      "function" === typeof unresolvedOldProps ||
      "function" === typeof context.getSnapshotBeforeUpdate) ||
      ("function" !== typeof context.UNSAFE_componentWillReceiveProps &&
        "function" !== typeof context.componentWillReceiveProps) ||
      ((contextType !== getDerivedStateFromProps || oldState !== oldProps) &&
        callComponentWillReceiveProps(
          workInProgress,
          context,
          nextProps,
          oldProps
        ));
    hasForceUpdate = !1;
    oldState = workInProgress.memoizedState;
    context.state = oldState;
    processUpdateQueue(workInProgress, nextProps, context, renderLanes);
    suspendIfUpdateReadFromEntangledAsyncAction();
    var newState = workInProgress.memoizedState;
    contextType !== getDerivedStateFromProps ||
    oldState !== newState ||
    hasForceUpdate ||
    (null !== current &&
      null !== current.dependencies &&
      checkIfContextChanged(current.dependencies))
      ? ("function" === typeof unresolvedOldProps &&
          (applyDerivedStateFromProps(
            workInProgress,
            Component,
            unresolvedOldProps,
            nextProps
          ),
          (newState = workInProgress.memoizedState)),
        (contextType$jscomp$0 =
          hasForceUpdate ||
          checkShouldComponentUpdate(
            workInProgress,
            Component,
            contextType$jscomp$0,
            nextProps,
            oldState,
            newState,
            oldProps
          ) ||
          (null !== current &&
            null !== current.dependencies &&
            checkIfContextChanged(current.dependencies)))
          ? (oldContext ||
              ("function" !== typeof context.UNSAFE_componentWillUpdate &&
                "function" !== typeof context.componentWillUpdate) ||
              ("function" === typeof context.componentWillUpdate &&
                context.componentWillUpdate(nextProps, newState, oldProps),
              "function" === typeof context.UNSAFE_componentWillUpdate &&
                context.UNSAFE_componentWillUpdate(
                  nextProps,
                  newState,
                  oldProps
                )),
            "function" === typeof context.componentDidUpdate &&
              (workInProgress.flags |= 4),
            "function" === typeof context.getSnapshotBeforeUpdate &&
              (workInProgress.flags |= 1024))
          : ("function" !== typeof context.componentDidUpdate ||
              (contextType === current.memoizedProps &&
                oldState === current.memoizedState) ||
              (workInProgress.flags |= 4),
            "function" !== typeof context.getSnapshotBeforeUpdate ||
              (contextType === current.memoizedProps &&
                oldState === current.memoizedState) ||
              (workInProgress.flags |= 1024),
            (workInProgress.memoizedProps = nextProps),
            (workInProgress.memoizedState = newState)),
        (context.props = nextProps),
        (context.state = newState),
        (context.context = oldProps),
        (nextProps = contextType$jscomp$0))
      : ("function" !== typeof context.componentDidUpdate ||
          (contextType === current.memoizedProps &&
            oldState === current.memoizedState) ||
          (workInProgress.flags |= 4),
        "function" !== typeof context.getSnapshotBeforeUpdate ||
          (contextType === current.memoizedProps &&
            oldState === current.memoizedState) ||
          (workInProgress.flags |= 1024),
        (nextProps = !1));
  }
  context = nextProps;
  markRef(current, workInProgress);
  nextProps = 0 !== (workInProgress.flags & 128);
  context || nextProps
    ? ((context = workInProgress.stateNode),
      (Component =
        nextProps && "function" !== typeof Component.getDerivedStateFromError
          ? null
          : context.render()),
      (workInProgress.flags |= 1),
      null !== current && nextProps
        ? ((workInProgress.child = reconcileChildFibers(
            workInProgress,
            current.child,
            null,
            renderLanes
          )),
          (workInProgress.child = reconcileChildFibers(
            workInProgress,
            null,
            Component,
            renderLanes
          )))
        : reconcileChildren(current, workInProgress, Component, renderLanes),
      (workInProgress.memoizedState = context.state),
      (current = workInProgress.child))
    : (current = bailoutOnAlreadyFinishedWork(
        current,
        workInProgress,
        renderLanes
      ));
  return current;
}
function mountHostRootWithoutHydrating(
  current,
  workInProgress,
  nextChildren,
  renderLanes
) {
  resetHydrationState();
  workInProgress.flags |= 256;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
var SUSPENDED_MARKER = {
  dehydrated: null,
  treeContext: null,
  retryLane: 0,
  hydrationErrors: null
};
function mountSuspenseOffscreenState(renderLanes) {
  return { baseLanes: renderLanes, cachePool: getSuspendedCache() };
}
function getRemainingWorkInPrimaryTree(
  current,
  primaryTreeDidDefer,
  renderLanes
) {
  current = null !== current ? current.childLanes & ~renderLanes : 0;
  primaryTreeDidDefer && (current |= workInProgressDeferredLane);
  return current;
}
function updateSuspenseComponent(current, workInProgress, renderLanes) {
  var nextProps = workInProgress.pendingProps,
    showFallback = !1,
    didSuspend = 0 !== (workInProgress.flags & 128),
    JSCompiler_temp;
  (JSCompiler_temp = didSuspend) ||
    (JSCompiler_temp =
      null !== current && null === current.memoizedState
        ? !1
        : 0 !== (suspenseStackCursor.current & 2));
  JSCompiler_temp && ((showFallback = !0), (workInProgress.flags &= -129));
  JSCompiler_temp = 0 !== (workInProgress.flags & 32);
  workInProgress.flags &= -33;
  if (null === current) {
    if (isHydrating) {
      showFallback
        ? pushPrimaryTreeSuspenseHandler(workInProgress)
        : reuseSuspenseHandlerOnStack(workInProgress);
      (current = nextHydratableInstance)
        ? ((current = canHydrateHydrationBoundary(
            current,
            rootOrSingletonContext
          )),
          (current = null !== current && "&" !== current.data ? current : null),
          null !== current &&
            ((workInProgress.memoizedState = {
              dehydrated: current,
              treeContext:
                null !== treeContextProvider
                  ? { id: treeContextId, overflow: treeContextOverflow }
                  : null,
              retryLane: 536870912,
              hydrationErrors: null
            }),
            (renderLanes = createFiberFromDehydratedFragment(current)),
            (renderLanes.return = workInProgress),
            (workInProgress.child = renderLanes),
            (hydrationParentFiber = workInProgress),
            (nextHydratableInstance = null)))
        : (current = null);
      if (null === current) throw throwOnHydrationMismatch(workInProgress);
      isSuspenseInstanceFallback(current)
        ? (workInProgress.lanes = 32)
        : (workInProgress.lanes = 536870912);
      return null;
    }
    var nextPrimaryChildren = nextProps.children;
    nextProps = nextProps.fallback;
    if (showFallback)
      return (
        reuseSuspenseHandlerOnStack(workInProgress),
        (showFallback = workInProgress.mode),
        (nextPrimaryChildren = mountWorkInProgressOffscreenFiber(
          { mode: "hidden", children: nextPrimaryChildren },
          showFallback
        )),
        (nextProps = createFiberFromFragment(
          nextProps,
          showFallback,
          renderLanes,
          null
        )),
        (nextPrimaryChildren.return = workInProgress),
        (nextProps.return = workInProgress),
        (nextPrimaryChildren.sibling = nextProps),
        (workInProgress.child = nextPrimaryChildren),
        (nextProps = workInProgress.child),
        (nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes)),
        (nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes
        )),
        (workInProgress.memoizedState = SUSPENDED_MARKER),
        bailoutOffscreenComponent(null, nextProps)
      );
    pushPrimaryTreeSuspenseHandler(workInProgress);
    return mountSuspensePrimaryChildren(workInProgress, nextPrimaryChildren);
  }
  var prevState = current.memoizedState;
  if (
    null !== prevState &&
    ((nextPrimaryChildren = prevState.dehydrated), null !== nextPrimaryChildren)
  ) {
    if (didSuspend)
      workInProgress.flags & 256
        ? (pushPrimaryTreeSuspenseHandler(workInProgress),
          (workInProgress.flags &= -257),
          (workInProgress = retrySuspenseComponentWithoutHydrating(
            current,
            workInProgress,
            renderLanes
          )))
        : null !== workInProgress.memoizedState
          ? (reuseSuspenseHandlerOnStack(workInProgress),
            (workInProgress.child = current.child),
            (workInProgress.flags |= 128),
            (workInProgress = null))
          : (reuseSuspenseHandlerOnStack(workInProgress),
            (nextPrimaryChildren = nextProps.fallback),
            (showFallback = workInProgress.mode),
            (nextProps = mountWorkInProgressOffscreenFiber(
              { mode: "visible", children: nextProps.children },
              showFallback
            )),
            (nextPrimaryChildren = createFiberFromFragment(
              nextPrimaryChildren,
              showFallback,
              renderLanes,
              null
            )),
            (nextPrimaryChildren.flags |= 2),
            (nextProps.return = workInProgress),
            (nextPrimaryChildren.return = workInProgress),
            (nextProps.sibling = nextPrimaryChildren),
            (workInProgress.child = nextProps),
            reconcileChildFibers(
              workInProgress,
              current.child,
              null,
              renderLanes
            ),
            (nextProps = workInProgress.child),
            (nextProps.memoizedState =
              mountSuspenseOffscreenState(renderLanes)),
            (nextProps.childLanes = getRemainingWorkInPrimaryTree(
              current,
              JSCompiler_temp,
              renderLanes
            )),
            (workInProgress.memoizedState = SUSPENDED_MARKER),
            (workInProgress = bailoutOffscreenComponent(null, nextProps)));
    else if (
      (pushPrimaryTreeSuspenseHandler(workInProgress),
      isSuspenseInstanceFallback(nextPrimaryChildren))
    ) {
      JSCompiler_temp =
        nextPrimaryChildren.nextSibling &&
        nextPrimaryChildren.nextSibling.dataset;
      if (JSCompiler_temp) var digest = JSCompiler_temp.dgst;
      JSCompiler_temp = digest;
      nextProps = Error(formatProdErrorMessage(419));
      nextProps.stack = "";
      nextProps.digest = JSCompiler_temp;
      queueHydrationError({ value: nextProps, source: null, stack: null });
      workInProgress = retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes
      );
    } else if (
      (didReceiveUpdate ||
        propagateParentContextChanges(current, workInProgress, renderLanes, !1),
      (JSCompiler_temp = 0 !== (renderLanes & current.childLanes)),
      didReceiveUpdate || JSCompiler_temp)
    ) {
      JSCompiler_temp = workInProgressRoot;
      if (
        null !== JSCompiler_temp &&
        ((nextProps = getBumpedLaneForHydration(JSCompiler_temp, renderLanes)),
        0 !== nextProps && nextProps !== prevState.retryLane)
      )
        throw (
          ((prevState.retryLane = nextProps),
          enqueueConcurrentRenderForLane(current, nextProps),
          scheduleUpdateOnFiber(JSCompiler_temp, current, nextProps),
          SelectiveHydrationException)
        );
      isSuspenseInstancePending(nextPrimaryChildren) ||
        renderDidSuspendDelayIfPossible();
      workInProgress = retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes
      );
    } else
      isSuspenseInstancePending(nextPrimaryChildren)
        ? ((workInProgress.flags |= 192),
          (workInProgress.child = current.child),
          (workInProgress = null))
        : ((current = prevState.treeContext),
          (nextHydratableInstance = getNextHydratable(
            nextPrimaryChildren.nextSibling
          )),
          (hydrationParentFiber = workInProgress),
          (isHydrating = !0),
          (hydrationErrors = null),
          (rootOrSingletonContext = !1),
          null !== current &&
            restoreSuspendedTreeContext(workInProgress, current),
          (workInProgress = mountSuspensePrimaryChildren(
            workInProgress,
            nextProps.children
          )),
          (workInProgress.flags |= 4096));
    return workInProgress;
  }
  if (showFallback)
    return (
      reuseSuspenseHandlerOnStack(workInProgress),
      (nextPrimaryChildren = nextProps.fallback),
      (showFallback = workInProgress.mode),
      (prevState = current.child),
      (digest = prevState.sibling),
      (nextProps = createWorkInProgress(prevState, {
        mode: "hidden",
        children: nextProps.children
      })),
      (nextProps.subtreeFlags = prevState.subtreeFlags & 65011712),
      null !== digest
        ? (nextPrimaryChildren = createWorkInProgress(
            digest,
            nextPrimaryChildren
          ))
        : ((nextPrimaryChildren = createFiberFromFragment(
            nextPrimaryChildren,
            showFallback,
            renderLanes,
            null
          )),
          (nextPrimaryChildren.flags |= 2)),
      (nextPrimaryChildren.return = workInProgress),
      (nextProps.return = workInProgress),
      (nextProps.sibling = nextPrimaryChildren),
      (workInProgress.child = nextProps),
      bailoutOffscreenComponent(null, nextProps),
      (nextProps = workInProgress.child),
      (nextPrimaryChildren = current.child.memoizedState),
      null === nextPrimaryChildren
        ? (nextPrimaryChildren = mountSuspenseOffscreenState(renderLanes))
        : ((showFallback = nextPrimaryChildren.cachePool),
          null !== showFallback
            ? ((prevState = CacheContext._currentValue),
              (showFallback =
                showFallback.parent !== prevState
                  ? { parent: prevState, pool: prevState }
                  : showFallback))
            : (showFallback = getSuspendedCache()),
          (nextPrimaryChildren = {
            baseLanes: nextPrimaryChildren.baseLanes | renderLanes,
            cachePool: showFallback
          })),
      (nextProps.memoizedState = nextPrimaryChildren),
      (nextProps.childLanes = getRemainingWorkInPrimaryTree(
        current,
        JSCompiler_temp,
        renderLanes
      )),
      (workInProgress.memoizedState = SUSPENDED_MARKER),
      bailoutOffscreenComponent(current.child, nextProps)
    );
  pushPrimaryTreeSuspenseHandler(workInProgress);
  renderLanes = current.child;
  current = renderLanes.sibling;
  renderLanes = createWorkInProgress(renderLanes, {
    mode: "visible",
    children: nextProps.children
  });
  renderLanes.return = workInProgress;
  renderLanes.sibling = null;
  null !== current &&
    ((JSCompiler_temp = workInProgress.deletions),
    null === JSCompiler_temp
      ? ((workInProgress.deletions = [current]), (workInProgress.flags |= 16))
      : JSCompiler_temp.push(current));
  workInProgress.child = renderLanes;
  workInProgress.memoizedState = null;
  return renderLanes;
}
function mountSuspensePrimaryChildren(workInProgress, primaryChildren) {
  primaryChildren = mountWorkInProgressOffscreenFiber(
    { mode: "visible", children: primaryChildren },
    workInProgress.mode
  );
  primaryChildren.return = workInProgress;
  return (workInProgress.child = primaryChildren);
}
function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
  offscreenProps = createFiberImplClass(22, offscreenProps, null, mode);
  offscreenProps.lanes = 0;
  return offscreenProps;
}
function retrySuspenseComponentWithoutHydrating(
  current,
  workInProgress,
  renderLanes
) {
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);
  current = mountSuspensePrimaryChildren(
    workInProgress,
    workInProgress.pendingProps.children
  );
  current.flags |= 2;
  workInProgress.memoizedState = null;
  return current;
}
function scheduleSuspenseWorkOnFiber(fiber, renderLanes, propagationRoot) {
  fiber.lanes |= renderLanes;
  var alternate = fiber.alternate;
  null !== alternate && (alternate.lanes |= renderLanes);
  scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
}
function initSuspenseListRenderState(
  workInProgress,
  isBackwards,
  tail,
  lastContentRow,
  tailMode,
  treeForkCount
) {
  var renderState = workInProgress.memoizedState;
  null === renderState
    ? (workInProgress.memoizedState = {
        isBackwards: isBackwards,
        rendering: null,
        renderingStartTime: 0,
        last: lastContentRow,
        tail: tail,
        tailMode: tailMode,
        treeForkCount: treeForkCount
      })
    : ((renderState.isBackwards = isBackwards),
      (renderState.rendering = null),
      (renderState.renderingStartTime = 0),
      (renderState.last = lastContentRow),
      (renderState.tail = tail),
      (renderState.tailMode = tailMode),
      (renderState.treeForkCount = treeForkCount));
}
function updateSuspenseListComponent(current, workInProgress, renderLanes) {
  var nextProps = workInProgress.pendingProps,
    revealOrder = nextProps.revealOrder,
    tailMode = nextProps.tail;
  nextProps = nextProps.children;
  var suspenseContext = suspenseStackCursor.current,
    shouldForceFallback = 0 !== (suspenseContext & 2);
  shouldForceFallback
    ? ((suspenseContext = (suspenseContext & 1) | 2),
      (workInProgress.flags |= 128))
    : (suspenseContext &= 1);
  push(suspenseStackCursor, suspenseContext);
  reconcileChildren(current, workInProgress, nextProps, renderLanes);
  nextProps = isHydrating ? treeForkCount : 0;
  if (!shouldForceFallback && null !== current && 0 !== (current.flags & 128))
    a: for (current = workInProgress.child; null !== current; ) {
      if (13 === current.tag)
        null !== current.memoizedState &&
          scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
      else if (19 === current.tag)
        scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
      else if (null !== current.child) {
        current.child.return = current;
        current = current.child;
        continue;
      }
      if (current === workInProgress) break a;
      for (; null === current.sibling; ) {
        if (null === current.return || current.return === workInProgress)
          break a;
        current = current.return;
      }
      current.sibling.return = current.return;
      current = current.sibling;
    }
  switch (revealOrder) {
    case "forwards":
      renderLanes = workInProgress.child;
      for (revealOrder = null; null !== renderLanes; )
        (current = renderLanes.alternate),
          null !== current &&
            null === findFirstSuspended(current) &&
            (revealOrder = renderLanes),
          (renderLanes = renderLanes.sibling);
      renderLanes = revealOrder;
      null === renderLanes
        ? ((revealOrder = workInProgress.child), (workInProgress.child = null))
        : ((revealOrder = renderLanes.sibling), (renderLanes.sibling = null));
      initSuspenseListRenderState(
        workInProgress,
        !1,
        revealOrder,
        renderLanes,
        tailMode,
        nextProps
      );
      break;
    case "backwards":
    case "unstable_legacy-backwards":
      renderLanes = null;
      revealOrder = workInProgress.child;
      for (workInProgress.child = null; null !== revealOrder; ) {
        current = revealOrder.alternate;
        if (null !== current && null === findFirstSuspended(current)) {
          workInProgress.child = revealOrder;
          break;
        }
        current = revealOrder.sibling;
        revealOrder.sibling = renderLanes;
        renderLanes = revealOrder;
        revealOrder = current;
      }
      initSuspenseListRenderState(
        workInProgress,
        !0,
        renderLanes,
        null,
        tailMode,
        nextProps
      );
      break;
    case "together":
      initSuspenseListRenderState(
        workInProgress,
        !1,
        null,
        null,
        void 0,
        nextProps
      );
      break;
    default:
      workInProgress.memoizedState = null;
  }
  return workInProgress.child;
}
function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
  null !== current && (workInProgress.dependencies = current.dependencies);
  workInProgressRootSkippedLanes |= workInProgress.lanes;
  if (0 === (renderLanes & workInProgress.childLanes))
    if (null !== current) {
      if (
        (propagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
          !1
        ),
        0 === (renderLanes & workInProgress.childLanes))
      )
        return null;
    } else return null;
  if (null !== current && workInProgress.child !== current.child)
    throw Error(formatProdErrorMessage(153));
  if (null !== workInProgress.child) {
    current = workInProgress.child;
    renderLanes = createWorkInProgress(current, current.pendingProps);
    workInProgress.child = renderLanes;
    for (renderLanes.return = workInProgress; null !== current.sibling; )
      (current = current.sibling),
        (renderLanes = renderLanes.sibling =
          createWorkInProgress(current, current.pendingProps)),
        (renderLanes.return = workInProgress);
    renderLanes.sibling = null;
  }
  return workInProgress.child;
}
function checkScheduledUpdateOrContext(current, renderLanes) {
  if (0 !== (current.lanes & renderLanes)) return !0;
  current = current.dependencies;
  return null !== current && checkIfContextChanged(current) ? !0 : !1;
}
function attemptEarlyBailoutIfNoScheduledUpdate(
  current,
  workInProgress,
  renderLanes
) {
  switch (workInProgress.tag) {
    case 3:
      pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
      pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
      resetHydrationState();
      break;
    case 27:
    case 5:
      pushHostContext(workInProgress);
      break;
    case 4:
      pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
      break;
    case 10:
      pushProvider(
        workInProgress,
        workInProgress.type,
        workInProgress.memoizedProps.value
      );
      break;
    case 31:
      if (null !== workInProgress.memoizedState)
        return (
          (workInProgress.flags |= 128),
          pushDehydratedActivitySuspenseHandler(workInProgress),
          null
        );
      break;
    case 13:
      var state$102 = workInProgress.memoizedState;
      if (null !== state$102) {
        if (null !== state$102.dehydrated)
          return (
            pushPrimaryTreeSuspenseHandler(workInProgress),
            (workInProgress.flags |= 128),
            null
          );
        if (0 !== (renderLanes & workInProgress.child.childLanes))
          return updateSuspenseComponent(current, workInProgress, renderLanes);
        pushPrimaryTreeSuspenseHandler(workInProgress);
        current = bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        );
        return null !== current ? current.sibling : null;
      }
      pushPrimaryTreeSuspenseHandler(workInProgress);
      break;
    case 19:
      var didSuspendBefore = 0 !== (current.flags & 128);
      state$102 = 0 !== (renderLanes & workInProgress.childLanes);
      state$102 ||
        (propagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
          !1
        ),
        (state$102 = 0 !== (renderLanes & workInProgress.childLanes)));
      if (didSuspendBefore) {
        if (state$102)
          return updateSuspenseListComponent(
            current,
            workInProgress,
            renderLanes
          );
        workInProgress.flags |= 128;
      }
      didSuspendBefore = workInProgress.memoizedState;
      null !== didSuspendBefore &&
        ((didSuspendBefore.rendering = null),
        (didSuspendBefore.tail = null),
        (didSuspendBefore.lastEffect = null));
      push(suspenseStackCursor, suspenseStackCursor.current);
      if (state$102) break;
      else return null;
    case 22:
      return (
        (workInProgress.lanes = 0),
        updateOffscreenComponent(
          current,
          workInProgress,
          renderLanes,
          workInProgress.pendingProps
        )
      );
    case 24:
      pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
  }
  return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
}
function beginWork(current, workInProgress, renderLanes) {
  if (null !== current)
    if (current.memoizedProps !== workInProgress.pendingProps)
      didReceiveUpdate = !0;
    else {
      if (
        !checkScheduledUpdateOrContext(current, renderLanes) &&
        0 === (workInProgress.flags & 128)
      )
        return (
          (didReceiveUpdate = !1),
          attemptEarlyBailoutIfNoScheduledUpdate(
            current,
            workInProgress,
            renderLanes
          )
        );
      didReceiveUpdate = 0 !== (current.flags & 131072) ? !0 : !1;
    }
  else
    (didReceiveUpdate = !1),
      isHydrating &&
        0 !== (workInProgress.flags & 1048576) &&
        pushTreeId(workInProgress, treeForkCount, workInProgress.index);
  workInProgress.lanes = 0;
  switch (workInProgress.tag) {
    case 16:
      a: {
        var props = workInProgress.pendingProps;
        current = resolveLazy(workInProgress.elementType);
        workInProgress.type = current;
        if ("function" === typeof current)
          shouldConstruct(current)
            ? ((props = resolveClassComponentProps(current, props)),
              (workInProgress.tag = 1),
              (workInProgress = updateClassComponent(
                null,
                workInProgress,
                current,
                props,
                renderLanes
              )))
            : ((workInProgress.tag = 0),
              (workInProgress = updateFunctionComponent(
                null,
                workInProgress,
                current,
                props,
                renderLanes
              )));
        else {
          if (void 0 !== current && null !== current) {
            var $$typeof = current.$$typeof;
            if ($$typeof === REACT_FORWARD_REF_TYPE) {
              workInProgress.tag = 11;
              workInProgress = updateForwardRef(
                null,
                workInProgress,
                current,
                props,
                renderLanes
              );
              break a;
            } else if ($$typeof === REACT_MEMO_TYPE) {
              workInProgress.tag = 14;
              workInProgress = updateMemoComponent(
                null,
                workInProgress,
                current,
                props,
                renderLanes
              );
              break a;
            }
          }
          workInProgress = getComponentNameFromType(current) || current;
          throw Error(formatProdErrorMessage(306, workInProgress, ""));
        }
      }
      return workInProgress;
    case 0:
      return updateFunctionComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 1:
      return (
        (props = workInProgress.type),
        ($$typeof = resolveClassComponentProps(
          props,
          workInProgress.pendingProps
        )),
        updateClassComponent(
          current,
          workInProgress,
          props,
          $$typeof,
          renderLanes
        )
      );
    case 3:
      a: {
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        );
        if (null === current) throw Error(formatProdErrorMessage(387));
        props = workInProgress.pendingProps;
        var prevState = workInProgress.memoizedState;
        $$typeof = prevState.element;
        cloneUpdateQueue(current, workInProgress);
        processUpdateQueue(workInProgress, props, null, renderLanes);
        var nextState = workInProgress.memoizedState;
        props = nextState.cache;
        pushProvider(workInProgress, CacheContext, props);
        props !== prevState.cache &&
          propagateContextChanges(
            workInProgress,
            [CacheContext],
            renderLanes,
            !0
          );
        suspendIfUpdateReadFromEntangledAsyncAction();
        props = nextState.element;
        if (prevState.isDehydrated)
          if (
            ((prevState = {
              element: props,
              isDehydrated: !1,
              cache: nextState.cache
            }),
            (workInProgress.updateQueue.baseState = prevState),
            (workInProgress.memoizedState = prevState),
            workInProgress.flags & 256)
          ) {
            workInProgress = mountHostRootWithoutHydrating(
              current,
              workInProgress,
              props,
              renderLanes
            );
            break a;
          } else if (props !== $$typeof) {
            $$typeof = createCapturedValueAtFiber(
              Error(formatProdErrorMessage(424)),
              workInProgress
            );
            queueHydrationError($$typeof);
            workInProgress = mountHostRootWithoutHydrating(
              current,
              workInProgress,
              props,
              renderLanes
            );
            break a;
          } else {
            current = workInProgress.stateNode.containerInfo;
            switch (current.nodeType) {
              case 9:
                current = current.body;
                break;
              default:
                current =
                  "HTML" === current.nodeName
                    ? current.ownerDocument.body
                    : current;
            }
            nextHydratableInstance = getNextHydratable(current.firstChild);
            hydrationParentFiber = workInProgress;
            isHydrating = !0;
            hydrationErrors = null;
            rootOrSingletonContext = !0;
            renderLanes = mountChildFibers(
              workInProgress,
              null,
              props,
              renderLanes
            );
            for (workInProgress.child = renderLanes; renderLanes; )
              (renderLanes.flags = (renderLanes.flags & -3) | 4096),
                (renderLanes = renderLanes.sibling);
          }
        else {
          resetHydrationState();
          if (props === $$typeof) {
            workInProgress = bailoutOnAlreadyFinishedWork(
              current,
              workInProgress,
              renderLanes
            );
            break a;
          }
          reconcileChildren(current, workInProgress, props, renderLanes);
        }
        workInProgress = workInProgress.child;
      }
      return workInProgress;
    case 26:
      return (
        markRef(current, workInProgress),
        null === current
          ? (renderLanes = getResource(
              workInProgress.type,
              null,
              workInProgress.pendingProps,
              null
            ))
            ? (workInProgress.memoizedState = renderLanes)
            : isHydrating ||
              ((renderLanes = workInProgress.type),
              (current = workInProgress.pendingProps),
              (props = getOwnerDocumentFromRootContainer(
                rootInstanceStackCursor.current
              ).createElement(renderLanes)),
              (props[internalInstanceKey] = workInProgress),
              (props[internalPropsKey] = current),
              setInitialProperties(props, renderLanes, current),
              markNodeAsHoistable(props),
              (workInProgress.stateNode = props))
          : (workInProgress.memoizedState = getResource(
              workInProgress.type,
              current.memoizedProps,
              workInProgress.pendingProps,
              current.memoizedState
            )),
        null
      );
    case 27:
      return (
        pushHostContext(workInProgress),
        null === current &&
          isHydrating &&
          ((props = workInProgress.stateNode =
            resolveSingletonInstance(
              workInProgress.type,
              workInProgress.pendingProps,
              rootInstanceStackCursor.current
            )),
          (hydrationParentFiber = workInProgress),
          (rootOrSingletonContext = !0),
          ($$typeof = nextHydratableInstance),
          isSingletonScope(workInProgress.type)
            ? ((previousHydratableOnEnteringScopedSingleton = $$typeof),
              (nextHydratableInstance = getNextHydratable(props.firstChild)))
            : (nextHydratableInstance = $$typeof)),
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        markRef(current, workInProgress),
        null === current && (workInProgress.flags |= 4194304),
        workInProgress.child
      );
    case 5:
      if (null === current && isHydrating) {
        if (($$typeof = props = nextHydratableInstance))
          (props = canHydrateInstance(
            props,
            workInProgress.type,
            workInProgress.pendingProps,
            rootOrSingletonContext
          )),
            null !== props
              ? ((workInProgress.stateNode = props),
                (hydrationParentFiber = workInProgress),
                (nextHydratableInstance = getNextHydratable(props.firstChild)),
                (rootOrSingletonContext = !1),
                ($$typeof = !0))
              : ($$typeof = !1);
        $$typeof || throwOnHydrationMismatch(workInProgress);
      }
      pushHostContext(workInProgress);
      $$typeof = workInProgress.type;
      prevState = workInProgress.pendingProps;
      nextState = null !== current ? current.memoizedProps : null;
      props = prevState.children;
      shouldSetTextContent($$typeof, prevState)
        ? (props = null)
        : null !== nextState &&
          shouldSetTextContent($$typeof, nextState) &&
          (workInProgress.flags |= 32);
      null !== workInProgress.memoizedState &&
        (($$typeof = renderWithHooks(
          current,
          workInProgress,
          TransitionAwareHostComponent,
          null,
          null,
          renderLanes
        )),
        (HostTransitionContext._currentValue = $$typeof));
      markRef(current, workInProgress);
      reconcileChildren(current, workInProgress, props, renderLanes);
      return workInProgress.child;
    case 6:
      if (null === current && isHydrating) {
        if ((current = renderLanes = nextHydratableInstance))
          (renderLanes = canHydrateTextInstance(
            renderLanes,
            workInProgress.pendingProps,
            rootOrSingletonContext
          )),
            null !== renderLanes
              ? ((workInProgress.stateNode = renderLanes),
                (hydrationParentFiber = workInProgress),
                (nextHydratableInstance = null),
                (current = !0))
              : (current = !1);
        current || throwOnHydrationMismatch(workInProgress);
      }
      return null;
    case 13:
      return updateSuspenseComponent(current, workInProgress, renderLanes);
    case 4:
      return (
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        ),
        (props = workInProgress.pendingProps),
        null === current
          ? (workInProgress.child = reconcileChildFibers(
              workInProgress,
              null,
              props,
              renderLanes
            ))
          : reconcileChildren(current, workInProgress, props, renderLanes),
        workInProgress.child
      );
    case 11:
      return updateForwardRef(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 7:
      return (
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps,
          renderLanes
        ),
        workInProgress.child
      );
    case 8:
      return (
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 12:
      return (
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 10:
      return (
        (props = workInProgress.pendingProps),
        pushProvider(workInProgress, workInProgress.type, props.value),
        reconcileChildren(current, workInProgress, props.children, renderLanes),
        workInProgress.child
      );
    case 9:
      return (
        ($$typeof = workInProgress.type._context),
        (props = workInProgress.pendingProps.children),
        prepareToReadContext(workInProgress),
        ($$typeof = readContext($$typeof)),
        (props = props($$typeof)),
        (workInProgress.flags |= 1),
        reconcileChildren(current, workInProgress, props, renderLanes),
        workInProgress.child
      );
    case 14:
      return updateMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 15:
      return updateSimpleMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 19:
      return updateSuspenseListComponent(current, workInProgress, renderLanes);
    case 31:
      return updateActivityComponent(current, workInProgress, renderLanes);
    case 22:
      return updateOffscreenComponent(
        current,
        workInProgress,
        renderLanes,
        workInProgress.pendingProps
      );
    case 24:
      return (
        prepareToReadContext(workInProgress),
        (props = readContext(CacheContext)),
        null === current
          ? (($$typeof = peekCacheFromPool()),
            null === $$typeof &&
              (($$typeof = workInProgressRoot),
              (prevState = createCache()),
              ($$typeof.pooledCache = prevState),
              prevState.refCount++,
              null !== prevState && ($$typeof.pooledCacheLanes |= renderLanes),
              ($$typeof = prevState)),
            (workInProgress.memoizedState = { parent: props, cache: $$typeof }),
            initializeUpdateQueue(workInProgress),
            pushProvider(workInProgress, CacheContext, $$typeof))
          : (0 !== (current.lanes & renderLanes) &&
              (cloneUpdateQueue(current, workInProgress),
              processUpdateQueue(workInProgress, null, null, renderLanes),
              suspendIfUpdateReadFromEntangledAsyncAction()),
            ($$typeof = current.memoizedState),
            (prevState = workInProgress.memoizedState),
            $$typeof.parent !== props
              ? (($$typeof = { parent: props, cache: props }),
                (workInProgress.memoizedState = $$typeof),
                0 === workInProgress.lanes &&
                  (workInProgress.memoizedState =
                    workInProgress.updateQueue.baseState =
                      $$typeof),
                pushProvider(workInProgress, CacheContext, props))
              : ((props = prevState.cache),
                pushProvider(workInProgress, CacheContext, props),
                props !== $$typeof.cache &&
                  propagateContextChanges(
                    workInProgress,
                    [CacheContext],
                    renderLanes,
                    !0
                  ))),
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 29:
      throw workInProgress.pendingProps;
  }
  throw Error(formatProdErrorMessage(156, workInProgress.tag));
}
function markUpdate(workInProgress) {
  workInProgress.flags |= 4;
}
function preloadInstanceAndSuspendIfNeeded(
  workInProgress,
  type,
  oldProps,
  newProps,
  renderLanes
) {
  if ((type = 0 !== (workInProgress.mode & 32))) type = !1;
  if (type) {
    if (
      ((workInProgress.flags |= 16777216),
      (renderLanes & 335544128) === renderLanes)
    )
      if (workInProgress.stateNode.complete) workInProgress.flags |= 8192;
      else if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
      else
        throw (
          ((suspendedThenable = noopSuspenseyCommitThenable),
          SuspenseyCommitException)
        );
  } else workInProgress.flags &= -16777217;
}
function preloadResourceAndSuspendIfNeeded(workInProgress, resource) {
  if ("stylesheet" !== resource.type || 0 !== (resource.state.loading & 4))
    workInProgress.flags &= -16777217;
  else if (((workInProgress.flags |= 16777216), !preloadResource(resource)))
    if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
    else
      throw (
        ((suspendedThenable = noopSuspenseyCommitThenable),
        SuspenseyCommitException)
      );
}
function scheduleRetryEffect(workInProgress, retryQueue) {
  null !== retryQueue && (workInProgress.flags |= 4);
  workInProgress.flags & 16384 &&
    ((retryQueue =
      22 !== workInProgress.tag ? claimNextRetryLane() : 536870912),
    (workInProgress.lanes |= retryQueue),
    (workInProgressSuspendedRetryLanes |= retryQueue));
}
function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
  if (!isHydrating)
    switch (renderState.tailMode) {
      case "hidden":
        hasRenderedATailFallback = renderState.tail;
        for (var lastTailNode = null; null !== hasRenderedATailFallback; )
          null !== hasRenderedATailFallback.alternate &&
            (lastTailNode = hasRenderedATailFallback),
            (hasRenderedATailFallback = hasRenderedATailFallback.sibling);
        null === lastTailNode
          ? (renderState.tail = null)
          : (lastTailNode.sibling = null);
        break;
      case "collapsed":
        lastTailNode = renderState.tail;
        for (var lastTailNode$106 = null; null !== lastTailNode; )
          null !== lastTailNode.alternate && (lastTailNode$106 = lastTailNode),
            (lastTailNode = lastTailNode.sibling);
        null === lastTailNode$106
          ? hasRenderedATailFallback || null === renderState.tail
            ? (renderState.tail = null)
            : (renderState.tail.sibling = null)
          : (lastTailNode$106.sibling = null);
    }
}
function bubbleProperties(completedWork) {
  var didBailout =
      null !== completedWork.alternate &&
      completedWork.alternate.child === completedWork.child,
    newChildLanes = 0,
    subtreeFlags = 0;
  if (didBailout)
    for (var child$107 = completedWork.child; null !== child$107; )
      (newChildLanes |= child$107.lanes | child$107.childLanes),
        (subtreeFlags |= child$107.subtreeFlags & 65011712),
        (subtreeFlags |= child$107.flags & 65011712),
        (child$107.return = completedWork),
        (child$107 = child$107.sibling);
  else
    for (child$107 = completedWork.child; null !== child$107; )
      (newChildLanes |= child$107.lanes | child$107.childLanes),
        (subtreeFlags |= child$107.subtreeFlags),
        (subtreeFlags |= child$107.flags),
        (child$107.return = completedWork),
        (child$107 = child$107.sibling);
  completedWork.subtreeFlags |= subtreeFlags;
  completedWork.childLanes = newChildLanes;
  return didBailout;
}
function completeWork(current, workInProgress, renderLanes) {
  var newProps = workInProgress.pendingProps;
  popTreeContext(workInProgress);
  switch (workInProgress.tag) {
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return bubbleProperties(workInProgress), null;
    case 1:
      return bubbleProperties(workInProgress), null;
    case 3:
      renderLanes = workInProgress.stateNode;
      newProps = null;
      null !== current && (newProps = current.memoizedState.cache);
      workInProgress.memoizedState.cache !== newProps &&
        (workInProgress.flags |= 2048);
      popProvider(CacheContext);
      popHostContainer();
      renderLanes.pendingContext &&
        ((renderLanes.context = renderLanes.pendingContext),
        (renderLanes.pendingContext = null));
      if (null === current || null === current.child)
        popHydrationState(workInProgress)
          ? markUpdate(workInProgress)
          : null === current ||
            (current.memoizedState.isDehydrated &&
              0 === (workInProgress.flags & 256)) ||
            ((workInProgress.flags |= 1024),
            upgradeHydrationErrorsToRecoverable());
      bubbleProperties(workInProgress);
      return null;
    case 26:
      var type = workInProgress.type,
        nextResource = workInProgress.memoizedState;
      null === current
        ? (markUpdate(workInProgress),
          null !== nextResource
            ? (bubbleProperties(workInProgress),
              preloadResourceAndSuspendIfNeeded(workInProgress, nextResource))
            : (bubbleProperties(workInProgress),
              preloadInstanceAndSuspendIfNeeded(
                workInProgress,
                type,
                null,
                newProps,
                renderLanes
              )))
        : nextResource
          ? nextResource !== current.memoizedState
            ? (markUpdate(workInProgress),
              bubbleProperties(workInProgress),
              preloadResourceAndSuspendIfNeeded(workInProgress, nextResource))
            : (bubbleProperties(workInProgress),
              (workInProgress.flags &= -16777217))
          : ((current = current.memoizedProps),
            current !== newProps && markUpdate(workInProgress),
            bubbleProperties(workInProgress),
            preloadInstanceAndSuspendIfNeeded(
              workInProgress,
              type,
              current,
              newProps,
              renderLanes
            ));
      return null;
    case 27:
      popHostContext(workInProgress);
      renderLanes = rootInstanceStackCursor.current;
      type = workInProgress.type;
      if (null !== current && null != workInProgress.stateNode)
        current.memoizedProps !== newProps && markUpdate(workInProgress);
      else {
        if (!newProps) {
          if (null === workInProgress.stateNode)
            throw Error(formatProdErrorMessage(166));
          bubbleProperties(workInProgress);
          return null;
        }
        current = contextStackCursor.current;
        popHydrationState(workInProgress)
          ? prepareToHydrateHostInstance(workInProgress, current)
          : ((current = resolveSingletonInstance(type, newProps, renderLanes)),
            (workInProgress.stateNode = current),
            markUpdate(workInProgress));
      }
      bubbleProperties(workInProgress);
      return null;
    case 5:
      popHostContext(workInProgress);
      type = workInProgress.type;
      if (null !== current && null != workInProgress.stateNode)
        current.memoizedProps !== newProps && markUpdate(workInProgress);
      else {
        if (!newProps) {
          if (null === workInProgress.stateNode)
            throw Error(formatProdErrorMessage(166));
          bubbleProperties(workInProgress);
          return null;
        }
        nextResource = contextStackCursor.current;
        if (popHydrationState(workInProgress))
          prepareToHydrateHostInstance(workInProgress, nextResource);
        else {
          var ownerDocument = getOwnerDocumentFromRootContainer(
            rootInstanceStackCursor.current
          );
          switch (nextResource) {
            case 1:
              nextResource = ownerDocument.createElementNS(
                "http://www.w3.org/2000/svg",
                type
              );
              break;
            case 2:
              nextResource = ownerDocument.createElementNS(
                "http://www.w3.org/1998/Math/MathML",
                type
              );
              break;
            default:
              switch (type) {
                case "svg":
                  nextResource = ownerDocument.createElementNS(
                    "http://www.w3.org/2000/svg",
                    type
                  );
                  break;
                case "math":
                  nextResource = ownerDocument.createElementNS(
                    "http://www.w3.org/1998/Math/MathML",
                    type
                  );
                  break;
                case "script":
                  nextResource = ownerDocument.createElement("div");
                  nextResource.innerHTML = "<script>\x3c/script>";
                  nextResource = nextResource.removeChild(
                    nextResource.firstChild
                  );
                  break;
                case "select":
                  nextResource =
                    "string" === typeof newProps.is
                      ? ownerDocument.createElement("select", {
                          is: newProps.is
                        })
                      : ownerDocument.createElement("select");
                  newProps.multiple
                    ? (nextResource.multiple = !0)
                    : newProps.size && (nextResource.size = newProps.size);
                  break;
                default:
                  nextResource =
                    "string" === typeof newProps.is
                      ? ownerDocument.createElement(type, { is: newProps.is })
                      : ownerDocument.createElement(type);
              }
          }
          nextResource[internalInstanceKey] = workInProgress;
          nextResource[internalPropsKey] = newProps;
          a: for (
            ownerDocument = workInProgress.child;
            null !== ownerDocument;

          ) {
            if (5 === ownerDocument.tag || 6 === ownerDocument.tag)
              nextResource.appendChild(ownerDocument.stateNode);
            else if (
              4 !== ownerDocument.tag &&
              27 !== ownerDocument.tag &&
              null !== ownerDocument.child
            ) {
              ownerDocument.child.return = ownerDocument;
              ownerDocument = ownerDocument.child;
              continue;
            }
            if (ownerDocument === workInProgress) break a;
            for (; null === ownerDocument.sibling; ) {
              if (
                null === ownerDocument.return ||
                ownerDocument.return === workInProgress
              )
                break a;
              ownerDocument = ownerDocument.return;
            }
            ownerDocument.sibling.return = ownerDocument.return;
            ownerDocument = ownerDocument.sibling;
          }
          workInProgress.stateNode = nextResource;
          a: switch (
            (setInitialProperties(nextResource, type, newProps), type)
          ) {
            case "button":
            case "input":
            case "select":
            case "textarea":
              newProps = !!newProps.autoFocus;
              break a;
            case "img":
              newProps = !0;
              break a;
            default:
              newProps = !1;
          }
          newProps && markUpdate(workInProgress);
        }
      }
      bubbleProperties(workInProgress);
      preloadInstanceAndSuspendIfNeeded(
        workInProgress,
        workInProgress.type,
        null === current ? null : current.memoizedProps,
        workInProgress.pendingProps,
        renderLanes
      );
      return null;
    case 6:
      if (current && null != workInProgress.stateNode)
        current.memoizedProps !== newProps && markUpdate(workInProgress);
      else {
        if ("string" !== typeof newProps && null === workInProgress.stateNode)
          throw Error(formatProdErrorMessage(166));
        current = rootInstanceStackCursor.current;
        if (popHydrationState(workInProgress)) {
          current = workInProgress.stateNode;
          renderLanes = workInProgress.memoizedProps;
          newProps = null;
          type = hydrationParentFiber;
          if (null !== type)
            switch (type.tag) {
              case 27:
              case 5:
                newProps = type.memoizedProps;
            }
          current[internalInstanceKey] = workInProgress;
          current =
            current.nodeValue === renderLanes ||
            (null !== newProps && !0 === newProps.suppressHydrationWarning) ||
            checkForUnmatchedText(current.nodeValue, renderLanes)
              ? !0
              : !1;
          current || throwOnHydrationMismatch(workInProgress, !0);
        } else
          (current =
            getOwnerDocumentFromRootContainer(current).createTextNode(
              newProps
            )),
            (current[internalInstanceKey] = workInProgress),
            (workInProgress.stateNode = current);
      }
      bubbleProperties(workInProgress);
      return null;
    case 31:
      renderLanes = workInProgress.memoizedState;
      if (null === current || null !== current.memoizedState) {
        newProps = popHydrationState(workInProgress);
        if (null !== renderLanes) {
          if (null === current) {
            if (!newProps) throw Error(formatProdErrorMessage(318));
            current = workInProgress.memoizedState;
            current = null !== current ? current.dehydrated : null;
            if (!current) throw Error(formatProdErrorMessage(557));
            current[internalInstanceKey] = workInProgress;
          } else
            resetHydrationState(),
              0 === (workInProgress.flags & 128) &&
                (workInProgress.memoizedState = null),
              (workInProgress.flags |= 4);
          bubbleProperties(workInProgress);
          current = !1;
        } else
          (renderLanes = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = renderLanes),
            (current = !0);
        if (!current) {
          if (workInProgress.flags & 256)
            return popSuspenseHandler(workInProgress), workInProgress;
          popSuspenseHandler(workInProgress);
          return null;
        }
        if (0 !== (workInProgress.flags & 128))
          throw Error(formatProdErrorMessage(558));
      }
      bubbleProperties(workInProgress);
      return null;
    case 13:
      newProps = workInProgress.memoizedState;
      if (
        null === current ||
        (null !== current.memoizedState &&
          null !== current.memoizedState.dehydrated)
      ) {
        type = popHydrationState(workInProgress);
        if (null !== newProps && null !== newProps.dehydrated) {
          if (null === current) {
            if (!type) throw Error(formatProdErrorMessage(318));
            type = workInProgress.memoizedState;
            type = null !== type ? type.dehydrated : null;
            if (!type) throw Error(formatProdErrorMessage(317));
            type[internalInstanceKey] = workInProgress;
          } else
            resetHydrationState(),
              0 === (workInProgress.flags & 128) &&
                (workInProgress.memoizedState = null),
              (workInProgress.flags |= 4);
          bubbleProperties(workInProgress);
          type = !1;
        } else
          (type = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = type),
            (type = !0);
        if (!type) {
          if (workInProgress.flags & 256)
            return popSuspenseHandler(workInProgress), workInProgress;
          popSuspenseHandler(workInProgress);
          return null;
        }
      }
      popSuspenseHandler(workInProgress);
      if (0 !== (workInProgress.flags & 128))
        return (workInProgress.lanes = renderLanes), workInProgress;
      renderLanes = null !== newProps;
      current = null !== current && null !== current.memoizedState;
      renderLanes &&
        ((newProps = workInProgress.child),
        (type = null),
        null !== newProps.alternate &&
          null !== newProps.alternate.memoizedState &&
          null !== newProps.alternate.memoizedState.cachePool &&
          (type = newProps.alternate.memoizedState.cachePool.pool),
        (nextResource = null),
        null !== newProps.memoizedState &&
          null !== newProps.memoizedState.cachePool &&
          (nextResource = newProps.memoizedState.cachePool.pool),
        nextResource !== type && (newProps.flags |= 2048));
      renderLanes !== current &&
        renderLanes &&
        (workInProgress.child.flags |= 8192);
      scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
      bubbleProperties(workInProgress);
      return null;
    case 4:
      return (
        popHostContainer(),
        null === current &&
          listenToAllSupportedEvents(workInProgress.stateNode.containerInfo),
        bubbleProperties(workInProgress),
        null
      );
    case 10:
      return (
        popProvider(workInProgress.type), bubbleProperties(workInProgress), null
      );
    case 19:
      pop(suspenseStackCursor);
      newProps = workInProgress.memoizedState;
      if (null === newProps) return bubbleProperties(workInProgress), null;
      type = 0 !== (workInProgress.flags & 128);
      nextResource = newProps.rendering;
      if (null === nextResource)
        if (type) cutOffTailIfNeeded(newProps, !1);
        else {
          if (
            0 !== workInProgressRootExitStatus ||
            (null !== current && 0 !== (current.flags & 128))
          )
            for (current = workInProgress.child; null !== current; ) {
              nextResource = findFirstSuspended(current);
              if (null !== nextResource) {
                workInProgress.flags |= 128;
                cutOffTailIfNeeded(newProps, !1);
                current = nextResource.updateQueue;
                workInProgress.updateQueue = current;
                scheduleRetryEffect(workInProgress, current);
                workInProgress.subtreeFlags = 0;
                current = renderLanes;
                for (renderLanes = workInProgress.child; null !== renderLanes; )
                  resetWorkInProgress(renderLanes, current),
                    (renderLanes = renderLanes.sibling);
                push(
                  suspenseStackCursor,
                  (suspenseStackCursor.current & 1) | 2
                );
                isHydrating &&
                  pushTreeFork(workInProgress, newProps.treeForkCount);
                return workInProgress.child;
              }
              current = current.sibling;
            }
          null !== newProps.tail &&
            now() > workInProgressRootRenderTargetTime &&
            ((workInProgress.flags |= 128),
            (type = !0),
            cutOffTailIfNeeded(newProps, !1),
            (workInProgress.lanes = 4194304));
        }
      else {
        if (!type)
          if (
            ((current = findFirstSuspended(nextResource)), null !== current)
          ) {
            if (
              ((workInProgress.flags |= 128),
              (type = !0),
              (current = current.updateQueue),
              (workInProgress.updateQueue = current),
              scheduleRetryEffect(workInProgress, current),
              cutOffTailIfNeeded(newProps, !0),
              null === newProps.tail &&
                "hidden" === newProps.tailMode &&
                !nextResource.alternate &&
                !isHydrating)
            )
              return bubbleProperties(workInProgress), null;
          } else
            2 * now() - newProps.renderingStartTime >
              workInProgressRootRenderTargetTime &&
              536870912 !== renderLanes &&
              ((workInProgress.flags |= 128),
              (type = !0),
              cutOffTailIfNeeded(newProps, !1),
              (workInProgress.lanes = 4194304));
        newProps.isBackwards
          ? ((nextResource.sibling = workInProgress.child),
            (workInProgress.child = nextResource))
          : ((current = newProps.last),
            null !== current
              ? (current.sibling = nextResource)
              : (workInProgress.child = nextResource),
            (newProps.last = nextResource));
      }
      if (null !== newProps.tail)
        return (
          (current = newProps.tail),
          (newProps.rendering = current),
          (newProps.tail = current.sibling),
          (newProps.renderingStartTime = now()),
          (current.sibling = null),
          (renderLanes = suspenseStackCursor.current),
          push(
            suspenseStackCursor,
            type ? (renderLanes & 1) | 2 : renderLanes & 1
          ),
          isHydrating && pushTreeFork(workInProgress, newProps.treeForkCount),
          current
        );
      bubbleProperties(workInProgress);
      return null;
    case 22:
    case 23:
      return (
        popSuspenseHandler(workInProgress),
        popHiddenContext(),
        (newProps = null !== workInProgress.memoizedState),
        null !== current
          ? (null !== current.memoizedState) !== newProps &&
            (workInProgress.flags |= 8192)
          : newProps && (workInProgress.flags |= 8192),
        newProps
          ? 0 !== (renderLanes & 536870912) &&
            0 === (workInProgress.flags & 128) &&
            (bubbleProperties(workInProgress),
            workInProgress.subtreeFlags & 6 && (workInProgress.flags |= 8192))
          : bubbleProperties(workInProgress),
        (renderLanes = workInProgress.updateQueue),
        null !== renderLanes &&
          scheduleRetryEffect(workInProgress, renderLanes.retryQueue),
        (renderLanes = null),
        null !== current &&
          null !== current.memoizedState &&
          null !== current.memoizedState.cachePool &&
          (renderLanes = current.memoizedState.cachePool.pool),
        (newProps = null),
        null !== workInProgress.memoizedState &&
          null !== workInProgress.memoizedState.cachePool &&
          (newProps = workInProgress.memoizedState.cachePool.pool),
        newProps !== renderLanes && (workInProgress.flags |= 2048),
        null !== current && pop(resumedCache),
        null
      );
    case 24:
      return (
        (renderLanes = null),
        null !== current && (renderLanes = current.memoizedState.cache),
        workInProgress.memoizedState.cache !== renderLanes &&
          (workInProgress.flags |= 2048),
        popProvider(CacheContext),
        bubbleProperties(workInProgress),
        null
      );
    case 25:
      return null;
    case 30:
      return null;
  }
  throw Error(formatProdErrorMessage(156, workInProgress.tag));
}
function unwindWork(current, workInProgress) {
  popTreeContext(workInProgress);
  switch (workInProgress.tag) {
    case 1:
      return (
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null
      );
    case 3:
      return (
        popProvider(CacheContext),
        popHostContainer(),
        (current = workInProgress.flags),
        0 !== (current & 65536) && 0 === (current & 128)
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null
      );
    case 26:
    case 27:
    case 5:
      return popHostContext(workInProgress), null;
    case 31:
      if (null !== workInProgress.memoizedState) {
        popSuspenseHandler(workInProgress);
        if (null === workInProgress.alternate)
          throw Error(formatProdErrorMessage(340));
        resetHydrationState();
      }
      current = workInProgress.flags;
      return current & 65536
        ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
        : null;
    case 13:
      popSuspenseHandler(workInProgress);
      current = workInProgress.memoizedState;
      if (null !== current && null !== current.dehydrated) {
        if (null === workInProgress.alternate)
          throw Error(formatProdErrorMessage(340));
        resetHydrationState();
      }
      current = workInProgress.flags;
      return current & 65536
        ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
        : null;
    case 19:
      return pop(suspenseStackCursor), null;
    case 4:
      return popHostContainer(), null;
    case 10:
      return popProvider(workInProgress.type), null;
    case 22:
    case 23:
      return (
        popSuspenseHandler(workInProgress),
        popHiddenContext(),
        null !== current && pop(resumedCache),
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null
      );
    case 24:
      return popProvider(CacheContext), null;
    case 25:
      return null;
    default:
      return null;
  }
}
function unwindInterruptedWork(current, interruptedWork) {
  popTreeContext(interruptedWork);
  switch (interruptedWork.tag) {
    case 3:
      popProvider(CacheContext);
      popHostContainer();
      break;
    case 26:
    case 27:
    case 5:
      popHostContext(interruptedWork);
      break;
    case 4:
      popHostContainer();
      break;
    case 31:
      null !== interruptedWork.memoizedState &&
        popSuspenseHandler(interruptedWork);
      break;
    case 13:
      popSuspenseHandler(interruptedWork);
      break;
    case 19:
      pop(suspenseStackCursor);
      break;
    case 10:
      popProvider(interruptedWork.type);
      break;
    case 22:
    case 23:
      popSuspenseHandler(interruptedWork);
      popHiddenContext();
      null !== current && pop(resumedCache);
      break;
    case 24:
      popProvider(CacheContext);
  }
}
function commitHookEffectListMount(flags, finishedWork) {
  try {
    var updateQueue = finishedWork.updateQueue,
      lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== lastEffect) {
      var firstEffect = lastEffect.next;
      updateQueue = firstEffect;
      do {
        if ((updateQueue.tag & flags) === flags) {
          lastEffect = void 0;
          var create = updateQueue.create,
            inst = updateQueue.inst;
          lastEffect = create();
          inst.destroy = lastEffect;
        }
        updateQueue = updateQueue.next;
      } while (updateQueue !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitHookEffectListUnmount(
  flags,
  finishedWork,
  nearestMountedAncestor$jscomp$0
) {
  try {
    var updateQueue = finishedWork.updateQueue,
      lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== lastEffect) {
      var firstEffect = lastEffect.next;
      updateQueue = firstEffect;
      do {
        if ((updateQueue.tag & flags) === flags) {
          var inst = updateQueue.inst,
            destroy = inst.destroy;
          if (void 0 !== destroy) {
            inst.destroy = void 0;
            lastEffect = finishedWork;
            var nearestMountedAncestor = nearestMountedAncestor$jscomp$0,
              destroy_ = destroy;
            try {
              destroy_();
            } catch (error) {
              captureCommitPhaseError(
                lastEffect,
                nearestMountedAncestor,
                error
              );
            }
          }
        }
        updateQueue = updateQueue.next;
      } while (updateQueue !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitClassCallbacks(finishedWork) {
  var updateQueue = finishedWork.updateQueue;
  if (null !== updateQueue) {
    var instance = finishedWork.stateNode;
    try {
      commitCallbacks(updateQueue, instance);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}
function safelyCallComponentWillUnmount(
  current,
  nearestMountedAncestor,
  instance
) {
  instance.props = resolveClassComponentProps(
    current.type,
    current.memoizedProps
  );
  instance.state = current.memoizedState;
  try {
    instance.componentWillUnmount();
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}
function safelyAttachRef(current, nearestMountedAncestor) {
  try {
    var ref = current.ref;
    if (null !== ref) {
      switch (current.tag) {
        case 26:
        case 27:
        case 5:
          var instanceToUse = current.stateNode;
          break;
        case 30:
          instanceToUse = current.stateNode;
          break;
        default:
          instanceToUse = current.stateNode;
      }
      "function" === typeof ref
        ? (current.refCleanup = ref(instanceToUse))
        : (ref.current = instanceToUse);
    }
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}
function safelyDetachRef(current, nearestMountedAncestor) {
  var ref = current.ref,
    refCleanup = current.refCleanup;
  if (null !== ref)
    if ("function" === typeof refCleanup)
      try {
        refCleanup();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      } finally {
        (current.refCleanup = null),
          (current = current.alternate),
          null != current && (current.refCleanup = null);
      }
    else if ("function" === typeof ref)
      try {
        ref(null);
      } catch (error$140) {
        captureCommitPhaseError(current, nearestMountedAncestor, error$140);
      }
    else ref.current = null;
}
function commitHostMount(finishedWork) {
  var type = finishedWork.type,
    props = finishedWork.memoizedProps,
    instance = finishedWork.stateNode;
  try {
    a: switch (type) {
      case "button":
      case "input":
      case "select":
      case "textarea":
        props.autoFocus && instance.focus();
        break a;
      case "img":
        props.src
          ? (instance.src = props.src)
          : props.srcSet && (instance.srcset = props.srcSet);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitHostUpdate(finishedWork, newProps, oldProps) {
  try {
    var domElement = finishedWork.stateNode;
    updateProperties(domElement, finishedWork.type, oldProps, newProps);
    domElement[internalPropsKey] = newProps;
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function isHostParent(fiber) {
  return (
    5 === fiber.tag ||
    3 === fiber.tag ||
    26 === fiber.tag ||
    (27 === fiber.tag && isSingletonScope(fiber.type)) ||
    4 === fiber.tag
  );
}
function getHostSibling(fiber) {
  a: for (;;) {
    for (; null === fiber.sibling; ) {
      if (null === fiber.return || isHostParent(fiber.return)) return null;
      fiber = fiber.return;
    }
    fiber.sibling.return = fiber.return;
    for (
      fiber = fiber.sibling;
      5 !== fiber.tag && 6 !== fiber.tag && 18 !== fiber.tag;

    ) {
      if (27 === fiber.tag && isSingletonScope(fiber.type)) continue a;
      if (fiber.flags & 2) continue a;
      if (null === fiber.child || 4 === fiber.tag) continue a;
      else (fiber.child.return = fiber), (fiber = fiber.child);
    }
    if (!(fiber.flags & 2)) return fiber.stateNode;
  }
}
function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
  var tag = node.tag;
  if (5 === tag || 6 === tag)
    (node = node.stateNode),
      before
        ? (9 === parent.nodeType
            ? parent.body
            : "HTML" === parent.nodeName
              ? parent.ownerDocument.body
              : parent
          ).insertBefore(node, before)
        : ((before =
            9 === parent.nodeType
              ? parent.body
              : "HTML" === parent.nodeName
                ? parent.ownerDocument.body
                : parent),
          before.appendChild(node),
          (parent = parent._reactRootContainer),
          (null !== parent && void 0 !== parent) ||
            null !== before.onclick ||
            (before.onclick = noop$1));
  else if (
    4 !== tag &&
    (27 === tag &&
      isSingletonScope(node.type) &&
      ((parent = node.stateNode), (before = null)),
    (node = node.child),
    null !== node)
  )
    for (
      insertOrAppendPlacementNodeIntoContainer(node, before, parent),
        node = node.sibling;
      null !== node;

    )
      insertOrAppendPlacementNodeIntoContainer(node, before, parent),
        (node = node.sibling);
}
function insertOrAppendPlacementNode(node, before, parent) {
  var tag = node.tag;
  if (5 === tag || 6 === tag)
    (node = node.stateNode),
      before ? parent.insertBefore(node, before) : parent.appendChild(node);
  else if (
    4 !== tag &&
    (27 === tag && isSingletonScope(node.type) && (parent = node.stateNode),
    (node = node.child),
    null !== node)
  )
    for (
      insertOrAppendPlacementNode(node, before, parent), node = node.sibling;
      null !== node;

    )
      insertOrAppendPlacementNode(node, before, parent), (node = node.sibling);
}
function commitHostSingletonAcquisition(finishedWork) {
  var singleton = finishedWork.stateNode,
    props = finishedWork.memoizedProps;
  try {
    for (
      var type = finishedWork.type, attributes = singleton.attributes;
      attributes.length;

    )
      singleton.removeAttributeNode(attributes[0]);
    setInitialProperties(singleton, type, props);
    singleton[internalInstanceKey] = finishedWork;
    singleton[internalPropsKey] = props;
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
var offscreenSubtreeIsHidden = !1,
  offscreenSubtreeWasHidden = !1,
  needsFormReset = !1,
  PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set,
  nextEffect = null;
function commitBeforeMutationEffects(root, firstChild) {
  root = root.containerInfo;
  eventsEnabled = _enabled;
  root = getActiveElementDeep(root);
  if (hasSelectionCapabilities(root)) {
    if ("selectionStart" in root)
      var JSCompiler_temp = {
        start: root.selectionStart,
        end: root.selectionEnd
      };
    else
      a: {
        JSCompiler_temp =
          ((JSCompiler_temp = root.ownerDocument) &&
            JSCompiler_temp.defaultView) ||
          window;
        var selection =
          JSCompiler_temp.getSelection && JSCompiler_temp.getSelection();
        if (selection && 0 !== selection.rangeCount) {
          JSCompiler_temp = selection.anchorNode;
          var anchorOffset = selection.anchorOffset,
            focusNode = selection.focusNode;
          selection = selection.focusOffset;
          try {
            JSCompiler_temp.nodeType, focusNode.nodeType;
          } catch (e$20) {
            JSCompiler_temp = null;
            break a;
          }
          var length = 0,
            start = -1,
            end = -1,
            indexWithinAnchor = 0,
            indexWithinFocus = 0,
            node = root,
            parentNode = null;
          b: for (;;) {
            for (var next; ; ) {
              node !== JSCompiler_temp ||
                (0 !== anchorOffset && 3 !== node.nodeType) ||
                (start = length + anchorOffset);
              node !== focusNode ||
                (0 !== selection && 3 !== node.nodeType) ||
                (end = length + selection);
              3 === node.nodeType && (length += node.nodeValue.length);
              if (null === (next = node.firstChild)) break;
              parentNode = node;
              node = next;
            }
            for (;;) {
              if (node === root) break b;
              parentNode === JSCompiler_temp &&
                ++indexWithinAnchor === anchorOffset &&
                (start = length);
              parentNode === focusNode &&
                ++indexWithinFocus === selection &&
                (end = length);
              if (null !== (next = node.nextSibling)) break;
              node = parentNode;
              parentNode = node.parentNode;
            }
            node = next;
          }
          JSCompiler_temp =
            -1 === start || -1 === end ? null : { start: start, end: end };
        } else JSCompiler_temp = null;
      }
    JSCompiler_temp = JSCompiler_temp || { start: 0, end: 0 };
  } else JSCompiler_temp = null;
  selectionInformation = { focusedElem: root, selectionRange: JSCompiler_temp };
  _enabled = !1;
  for (nextEffect = firstChild; null !== nextEffect; )
    if (
      ((firstChild = nextEffect),
      (root = firstChild.child),
      0 !== (firstChild.subtreeFlags & 1028) && null !== root)
    )
      (root.return = firstChild), (nextEffect = root);
    else
      for (; null !== nextEffect; ) {
        firstChild = nextEffect;
        focusNode = firstChild.alternate;
        root = firstChild.flags;
        switch (firstChild.tag) {
          case 0:
            if (
              0 !== (root & 4) &&
              ((root = firstChild.updateQueue),
              (root = null !== root ? root.events : null),
              null !== root)
            )
              for (
                JSCompiler_temp = 0;
                JSCompiler_temp < root.length;
                JSCompiler_temp++
              )
                (anchorOffset = root[JSCompiler_temp]),
                  (anchorOffset.ref.impl = anchorOffset.nextImpl);
            break;
          case 11:
          case 15:
            break;
          case 1:
            if (0 !== (root & 1024) && null !== focusNode) {
              root = void 0;
              JSCompiler_temp = firstChild;
              anchorOffset = focusNode.memoizedProps;
              focusNode = focusNode.memoizedState;
              selection = JSCompiler_temp.stateNode;
              try {
                var resolvedPrevProps = resolveClassComponentProps(
                  JSCompiler_temp.type,
                  anchorOffset
                );
                root = selection.getSnapshotBeforeUpdate(
                  resolvedPrevProps,
                  focusNode
                );
                selection.__reactInternalSnapshotBeforeUpdate = root;
              } catch (error) {
                captureCommitPhaseError(
                  JSCompiler_temp,
                  JSCompiler_temp.return,
                  error
                );
              }
            }
            break;
          case 3:
            if (0 !== (root & 1024))
              if (
                ((root = firstChild.stateNode.containerInfo),
                (JSCompiler_temp = root.nodeType),
                9 === JSCompiler_temp)
              )
                clearContainerSparingly(root);
              else if (1 === JSCompiler_temp)
                switch (root.nodeName) {
                  case "HEAD":
                  case "HTML":
                  case "BODY":
                    clearContainerSparingly(root);
                    break;
                  default:
                    root.textContent = "";
                }
            break;
          case 5:
          case 26:
          case 27:
          case 6:
          case 4:
          case 17:
            break;
          default:
            if (0 !== (root & 1024)) throw Error(formatProdErrorMessage(163));
        }
        root = firstChild.sibling;
        if (null !== root) {
          root.return = firstChild.return;
          nextEffect = root;
          break;
        }
        nextEffect = firstChild.return;
      }
}
function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 4 && commitHookEffectListMount(5, finishedWork);
      break;
    case 1:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (flags & 4)
        if (((finishedRoot = finishedWork.stateNode), null === current))
          try {
            finishedRoot.componentDidMount();
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        else {
          var prevProps = resolveClassComponentProps(
            finishedWork.type,
            current.memoizedProps
          );
          current = current.memoizedState;
          try {
            finishedRoot.componentDidUpdate(
              prevProps,
              current,
              finishedRoot.__reactInternalSnapshotBeforeUpdate
            );
          } catch (error$139) {
            captureCommitPhaseError(
              finishedWork,
              finishedWork.return,
              error$139
            );
          }
        }
      flags & 64 && commitClassCallbacks(finishedWork);
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 3:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (
        flags & 64 &&
        ((finishedRoot = finishedWork.updateQueue), null !== finishedRoot)
      ) {
        current = null;
        if (null !== finishedWork.child)
          switch (finishedWork.child.tag) {
            case 27:
            case 5:
              current = finishedWork.child.stateNode;
              break;
            case 1:
              current = finishedWork.child.stateNode;
          }
        try {
          commitCallbacks(finishedRoot, current);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      break;
    case 27:
      null === current &&
        flags & 4 &&
        commitHostSingletonAcquisition(finishedWork);
    case 26:
    case 5:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      null === current && flags & 4 && commitHostMount(finishedWork);
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 12:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case 31:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
      break;
    case 13:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
      flags & 64 &&
        ((finishedRoot = finishedWork.memoizedState),
        null !== finishedRoot &&
          ((finishedRoot = finishedRoot.dehydrated),
          null !== finishedRoot &&
            ((finishedWork = retryDehydratedSuspenseBoundary.bind(
              null,
              finishedWork
            )),
            registerSuspenseInstanceRetry(finishedRoot, finishedWork))));
      break;
    case 22:
      flags = null !== finishedWork.memoizedState || offscreenSubtreeIsHidden;
      if (!flags) {
        current =
          (null !== current && null !== current.memoizedState) ||
          offscreenSubtreeWasHidden;
        prevProps = offscreenSubtreeIsHidden;
        var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = flags;
        (offscreenSubtreeWasHidden = current) && !prevOffscreenSubtreeWasHidden
          ? recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              0 !== (finishedWork.subtreeFlags & 8772)
            )
          : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        offscreenSubtreeIsHidden = prevProps;
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
      }
      break;
    case 30:
      break;
    default:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
  }
}
function detachFiberAfterEffects(fiber) {
  var alternate = fiber.alternate;
  null !== alternate &&
    ((fiber.alternate = null), detachFiberAfterEffects(alternate));
  fiber.child = null;
  fiber.deletions = null;
  fiber.sibling = null;
  5 === fiber.tag &&
    ((alternate = fiber.stateNode),
    null !== alternate && detachDeletedInstance(alternate));
  fiber.stateNode = null;
  fiber.return = null;
  fiber.dependencies = null;
  fiber.memoizedProps = null;
  fiber.memoizedState = null;
  fiber.pendingProps = null;
  fiber.stateNode = null;
  fiber.updateQueue = null;
}
var hostParent = null,
  hostParentIsContainer = !1;
function recursivelyTraverseDeletionEffects(
  finishedRoot,
  nearestMountedAncestor,
  parent
) {
  for (parent = parent.child; null !== parent; )
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent),
      (parent = parent.sibling);
}
function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAncestor,
  deletedFiber
) {
  if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
    try {
      injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
    } catch (err) {}
  switch (deletedFiber.tag) {
    case 26:
      offscreenSubtreeWasHidden ||
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      deletedFiber.memoizedState
        ? deletedFiber.memoizedState.count--
        : deletedFiber.stateNode &&
          ((deletedFiber = deletedFiber.stateNode),
          deletedFiber.parentNode.removeChild(deletedFiber));
      break;
    case 27:
      offscreenSubtreeWasHidden ||
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
      var prevHostParent = hostParent,
        prevHostParentIsContainer = hostParentIsContainer;
      isSingletonScope(deletedFiber.type) &&
        ((hostParent = deletedFiber.stateNode), (hostParentIsContainer = !1));
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      releaseSingletonInstance(deletedFiber.stateNode);
      hostParent = prevHostParent;
      hostParentIsContainer = prevHostParentIsContainer;
      break;
    case 5:
      offscreenSubtreeWasHidden ||
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
    case 6:
      prevHostParent = hostParent;
      prevHostParentIsContainer = hostParentIsContainer;
      hostParent = null;
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      hostParent = prevHostParent;
      hostParentIsContainer = prevHostParentIsContainer;
      if (null !== hostParent)
        if (hostParentIsContainer)
          try {
            (9 === hostParent.nodeType
              ? hostParent.body
              : "HTML" === hostParent.nodeName
                ? hostParent.ownerDocument.body
                : hostParent
            ).removeChild(deletedFiber.stateNode);
          } catch (error) {
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error
            );
          }
        else
          try {
            hostParent.removeChild(deletedFiber.stateNode);
          } catch (error) {
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error
            );
          }
      break;
    case 18:
      null !== hostParent &&
        (hostParentIsContainer
          ? ((finishedRoot = hostParent),
            clearHydrationBoundary(
              9 === finishedRoot.nodeType
                ? finishedRoot.body
                : "HTML" === finishedRoot.nodeName
                  ? finishedRoot.ownerDocument.body
                  : finishedRoot,
              deletedFiber.stateNode
            ),
            retryIfBlockedOn(finishedRoot))
          : clearHydrationBoundary(hostParent, deletedFiber.stateNode));
      break;
    case 4:
      prevHostParent = hostParent;
      prevHostParentIsContainer = hostParentIsContainer;
      hostParent = deletedFiber.stateNode.containerInfo;
      hostParentIsContainer = !0;
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      hostParent = prevHostParent;
      hostParentIsContainer = prevHostParentIsContainer;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
      offscreenSubtreeWasHidden ||
        commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 1:
      offscreenSubtreeWasHidden ||
        (safelyDetachRef(deletedFiber, nearestMountedAncestor),
        (prevHostParent = deletedFiber.stateNode),
        "function" === typeof prevHostParent.componentWillUnmount &&
          safelyCallComponentWillUnmount(
            deletedFiber,
            nearestMountedAncestor,
            prevHostParent
          ));
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 21:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 22:
      offscreenSubtreeWasHidden =
        (prevHostParent = offscreenSubtreeWasHidden) ||
        null !== deletedFiber.memoizedState;
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      offscreenSubtreeWasHidden = prevHostParent;
      break;
    default:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
  }
}
function commitActivityHydrationCallbacks(finishedRoot, finishedWork) {
  if (
    null === finishedWork.memoizedState &&
    ((finishedRoot = finishedWork.alternate),
    null !== finishedRoot &&
      ((finishedRoot = finishedRoot.memoizedState), null !== finishedRoot))
  ) {
    finishedRoot = finishedRoot.dehydrated;
    try {
      retryIfBlockedOn(finishedRoot);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}
function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
  if (
    null === finishedWork.memoizedState &&
    ((finishedRoot = finishedWork.alternate),
    null !== finishedRoot &&
      ((finishedRoot = finishedRoot.memoizedState),
      null !== finishedRoot &&
        ((finishedRoot = finishedRoot.dehydrated), null !== finishedRoot)))
  )
    try {
      retryIfBlockedOn(finishedRoot);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
}
function getRetryCache(finishedWork) {
  switch (finishedWork.tag) {
    case 31:
    case 13:
    case 19:
      var retryCache = finishedWork.stateNode;
      null === retryCache &&
        (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
      return retryCache;
    case 22:
      return (
        (finishedWork = finishedWork.stateNode),
        (retryCache = finishedWork._retryCache),
        null === retryCache &&
          (retryCache = finishedWork._retryCache = new PossiblyWeakSet()),
        retryCache
      );
    default:
      throw Error(formatProdErrorMessage(435, finishedWork.tag));
  }
}
function attachSuspenseRetryListeners(finishedWork, wakeables) {
  var retryCache = getRetryCache(finishedWork);
  wakeables.forEach(function (wakeable) {
    if (!retryCache.has(wakeable)) {
      retryCache.add(wakeable);
      var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
      wakeable.then(retry, retry);
    }
  });
}
function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber) {
  var deletions = parentFiber.deletions;
  if (null !== deletions)
    for (var i = 0; i < deletions.length; i++) {
      var childToDelete = deletions[i],
        root = root$jscomp$0,
        returnFiber = parentFiber,
        parent = returnFiber;
      a: for (; null !== parent; ) {
        switch (parent.tag) {
          case 27:
            if (isSingletonScope(parent.type)) {
              hostParent = parent.stateNode;
              hostParentIsContainer = !1;
              break a;
            }
            break;
          case 5:
            hostParent = parent.stateNode;
            hostParentIsContainer = !1;
            break a;
          case 3:
          case 4:
            hostParent = parent.stateNode.containerInfo;
            hostParentIsContainer = !0;
            break a;
        }
        parent = parent.return;
      }
      if (null === hostParent) throw Error(formatProdErrorMessage(160));
      commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
      hostParent = null;
      hostParentIsContainer = !1;
      root = childToDelete.alternate;
      null !== root && (root.return = null);
      childToDelete.return = null;
    }
  if (parentFiber.subtreeFlags & 13886)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitMutationEffectsOnFiber(parentFiber, root$jscomp$0),
        (parentFiber = parentFiber.sibling);
}
var currentHoistableRoot = null;
function commitMutationEffectsOnFiber(finishedWork, root) {
  var current = finishedWork.alternate,
    flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        (commitHookEffectListUnmount(3, finishedWork, finishedWork.return),
        commitHookEffectListMount(3, finishedWork),
        commitHookEffectListUnmount(5, finishedWork, finishedWork.return));
      break;
    case 1:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      flags & 64 &&
        offscreenSubtreeIsHidden &&
        ((finishedWork = finishedWork.updateQueue),
        null !== finishedWork &&
          ((flags = finishedWork.callbacks),
          null !== flags &&
            ((current = finishedWork.shared.hiddenCallbacks),
            (finishedWork.shared.hiddenCallbacks =
              null === current ? flags : current.concat(flags)))));
      break;
    case 26:
      var hoistableRoot = currentHoistableRoot;
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      if (flags & 4) {
        var currentResource = null !== current ? current.memoizedState : null;
        flags = finishedWork.memoizedState;
        if (null === current)
          if (null === flags)
            if (null === finishedWork.stateNode) {
              a: {
                flags = finishedWork.type;
                current = finishedWork.memoizedProps;
                hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
                b: switch (flags) {
                  case "title":
                    currentResource =
                      hoistableRoot.getElementsByTagName("title")[0];
                    if (
                      !currentResource ||
                      currentResource[internalHoistableMarker] ||
                      currentResource[internalInstanceKey] ||
                      "http://www.w3.org/2000/svg" ===
                        currentResource.namespaceURI ||
                      currentResource.hasAttribute("itemprop")
                    )
                      (currentResource = hoistableRoot.createElement(flags)),
                        hoistableRoot.head.insertBefore(
                          currentResource,
                          hoistableRoot.querySelector("head > title")
                        );
                    setInitialProperties(currentResource, flags, current);
                    currentResource[internalInstanceKey] = finishedWork;
                    markNodeAsHoistable(currentResource);
                    flags = currentResource;
                    break a;
                  case "link":
                    var maybeNodes = getHydratableHoistableCache(
                      "link",
                      "href",
                      hoistableRoot
                    ).get(flags + (current.href || ""));
                    if (maybeNodes)
                      for (var i = 0; i < maybeNodes.length; i++)
                        if (
                          ((currentResource = maybeNodes[i]),
                          currentResource.getAttribute("href") ===
                            (null == current.href || "" === current.href
                              ? null
                              : current.href) &&
                            currentResource.getAttribute("rel") ===
                              (null == current.rel ? null : current.rel) &&
                            currentResource.getAttribute("title") ===
                              (null == current.title ? null : current.title) &&
                            currentResource.getAttribute("crossorigin") ===
                              (null == current.crossOrigin
                                ? null
                                : current.crossOrigin))
                        ) {
                          maybeNodes.splice(i, 1);
                          break b;
                        }
                    currentResource = hoistableRoot.createElement(flags);
                    setInitialProperties(currentResource, flags, current);
                    hoistableRoot.head.appendChild(currentResource);
                    break;
                  case "meta":
                    if (
                      (maybeNodes = getHydratableHoistableCache(
                        "meta",
                        "content",
                        hoistableRoot
                      ).get(flags + (current.content || "")))
                    )
                      for (i = 0; i < maybeNodes.length; i++)
                        if (
                          ((currentResource = maybeNodes[i]),
                          currentResource.getAttribute("content") ===
                            (null == current.content
                              ? null
                              : "" + current.content) &&
                            currentResource.getAttribute("name") ===
                              (null == current.name ? null : current.name) &&
                            currentResource.getAttribute("property") ===
                              (null == current.property
                                ? null
                                : current.property) &&
                            currentResource.getAttribute("http-equiv") ===
                              (null == current.httpEquiv
                                ? null
                                : current.httpEquiv) &&
                            currentResource.getAttribute("charset") ===
                              (null == current.charSet
                                ? null
                                : current.charSet))
                        ) {
                          maybeNodes.splice(i, 1);
                          break b;
                        }
                    currentResource = hoistableRoot.createElement(flags);
                    setInitialProperties(currentResource, flags, current);
                    hoistableRoot.head.appendChild(currentResource);
                    break;
                  default:
                    throw Error(formatProdErrorMessage(468, flags));
                }
                currentResource[internalInstanceKey] = finishedWork;
                markNodeAsHoistable(currentResource);
                flags = currentResource;
              }
              finishedWork.stateNode = flags;
            } else
              mountHoistable(
                hoistableRoot,
                finishedWork.type,
                finishedWork.stateNode
              );
          else
            finishedWork.stateNode = acquireResource(
              hoistableRoot,
              flags,
              finishedWork.memoizedProps
            );
        else
          currentResource !== flags
            ? (null === currentResource
                ? null !== current.stateNode &&
                  ((current = current.stateNode),
                  current.parentNode.removeChild(current))
                : currentResource.count--,
              null === flags
                ? mountHoistable(
                    hoistableRoot,
                    finishedWork.type,
                    finishedWork.stateNode
                  )
                : acquireResource(
                    hoistableRoot,
                    flags,
                    finishedWork.memoizedProps
                  ))
            : null === flags &&
              null !== finishedWork.stateNode &&
              commitHostUpdate(
                finishedWork,
                finishedWork.memoizedProps,
                current.memoizedProps
              );
      }
      break;
    case 27:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      null !== current &&
        flags & 4 &&
        commitHostUpdate(
          finishedWork,
          finishedWork.memoizedProps,
          current.memoizedProps
        );
      break;
    case 5:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      if (finishedWork.flags & 32) {
        hoistableRoot = finishedWork.stateNode;
        try {
          setTextContent(hoistableRoot, "");
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      flags & 4 &&
        null != finishedWork.stateNode &&
        ((hoistableRoot = finishedWork.memoizedProps),
        commitHostUpdate(
          finishedWork,
          hoistableRoot,
          null !== current ? current.memoizedProps : hoistableRoot
        ));
      flags & 1024 && (needsFormReset = !0);
      break;
    case 6:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      if (flags & 4) {
        if (null === finishedWork.stateNode)
          throw Error(formatProdErrorMessage(162));
        flags = finishedWork.memoizedProps;
        current = finishedWork.stateNode;
        try {
          current.nodeValue = flags;
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      break;
    case 3:
      tagCaches = null;
      hoistableRoot = currentHoistableRoot;
      currentHoistableRoot = getHoistableRoot(root.containerInfo);
      recursivelyTraverseMutationEffects(root, finishedWork);
      currentHoistableRoot = hoistableRoot;
      commitReconciliationEffects(finishedWork);
      if (flags & 4 && null !== current && current.memoizedState.isDehydrated)
        try {
          retryIfBlockedOn(root.containerInfo);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      needsFormReset &&
        ((needsFormReset = !1), recursivelyResetForms(finishedWork));
      break;
    case 4:
      flags = currentHoistableRoot;
      currentHoistableRoot = getHoistableRoot(
        finishedWork.stateNode.containerInfo
      );
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      currentHoistableRoot = flags;
      break;
    case 12:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      break;
    case 31:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        ((flags = finishedWork.updateQueue),
        null !== flags &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, flags)));
      break;
    case 13:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      finishedWork.child.flags & 8192 &&
        (null !== finishedWork.memoizedState) !==
          (null !== current && null !== current.memoizedState) &&
        (globalMostRecentFallbackTime = now());
      flags & 4 &&
        ((flags = finishedWork.updateQueue),
        null !== flags &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, flags)));
      break;
    case 22:
      hoistableRoot = null !== finishedWork.memoizedState;
      var wasHidden = null !== current && null !== current.memoizedState,
        prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden,
        prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
      offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || hoistableRoot;
      offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
      recursivelyTraverseMutationEffects(root, finishedWork);
      offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
      offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
      commitReconciliationEffects(finishedWork);
      if (flags & 8192)
        a: for (
          root = finishedWork.stateNode,
            root._visibility = hoistableRoot
              ? root._visibility & -2
              : root._visibility | 1,
            hoistableRoot &&
              (null === current ||
                wasHidden ||
                offscreenSubtreeIsHidden ||
                offscreenSubtreeWasHidden ||
                recursivelyTraverseDisappearLayoutEffects(finishedWork)),
            current = null,
            root = finishedWork;
          ;

        ) {
          if (5 === root.tag || 26 === root.tag) {
            if (null === current) {
              wasHidden = current = root;
              try {
                if (((currentResource = wasHidden.stateNode), hoistableRoot))
                  (maybeNodes = currentResource.style),
                    "function" === typeof maybeNodes.setProperty
                      ? maybeNodes.setProperty("display", "none", "important")
                      : (maybeNodes.display = "none");
                else {
                  i = wasHidden.stateNode;
                  var styleProp = wasHidden.memoizedProps.style,
                    display =
                      void 0 !== styleProp &&
                      null !== styleProp &&
                      styleProp.hasOwnProperty("display")
                        ? styleProp.display
                        : null;
                  i.style.display =
                    null == display || "boolean" === typeof display
                      ? ""
                      : ("" + display).trim();
                }
              } catch (error) {
                captureCommitPhaseError(wasHidden, wasHidden.return, error);
              }
            }
          } else if (6 === root.tag) {
            if (null === current) {
              wasHidden = root;
              try {
                wasHidden.stateNode.nodeValue = hoistableRoot
                  ? ""
                  : wasHidden.memoizedProps;
              } catch (error) {
                captureCommitPhaseError(wasHidden, wasHidden.return, error);
              }
            }
          } else if (18 === root.tag) {
            if (null === current) {
              wasHidden = root;
              try {
                var instance = wasHidden.stateNode;
                hoistableRoot
                  ? hideOrUnhideDehydratedBoundary(instance, !0)
                  : hideOrUnhideDehydratedBoundary(wasHidden.stateNode, !1);
              } catch (error) {
                captureCommitPhaseError(wasHidden, wasHidden.return, error);
              }
            }
          } else if (
            ((22 !== root.tag && 23 !== root.tag) ||
              null === root.memoizedState ||
              root === finishedWork) &&
            null !== root.child
          ) {
            root.child.return = root;
            root = root.child;
            continue;
          }
          if (root === finishedWork) break a;
          for (; null === root.sibling; ) {
            if (null === root.return || root.return === finishedWork) break a;
            current === root && (current = null);
            root = root.return;
          }
          current === root && (current = null);
          root.sibling.return = root.return;
          root = root.sibling;
        }
      flags & 4 &&
        ((flags = finishedWork.updateQueue),
        null !== flags &&
          ((current = flags.retryQueue),
          null !== current &&
            ((flags.retryQueue = null),
            attachSuspenseRetryListeners(finishedWork, current))));
      break;
    case 19:
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        ((flags = finishedWork.updateQueue),
        null !== flags &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, flags)));
      break;
    case 30:
      break;
    case 21:
      break;
    default:
      recursivelyTraverseMutationEffects(root, finishedWork),
        commitReconciliationEffects(finishedWork);
  }
}
function commitReconciliationEffects(finishedWork) {
  var flags = finishedWork.flags;
  if (flags & 2) {
    try {
      for (
        var hostParentFiber, parentFiber = finishedWork.return;
        null !== parentFiber;

      ) {
        if (isHostParent(parentFiber)) {
          hostParentFiber = parentFiber;
          break;
        }
        parentFiber = parentFiber.return;
      }
      if (null == hostParentFiber) throw Error(formatProdErrorMessage(160));
      switch (hostParentFiber.tag) {
        case 27:
          var parent = hostParentFiber.stateNode,
            before = getHostSibling(finishedWork);
          insertOrAppendPlacementNode(finishedWork, before, parent);
          break;
        case 5:
          var parent$141 = hostParentFiber.stateNode;
          hostParentFiber.flags & 32 &&
            (setTextContent(parent$141, ""), (hostParentFiber.flags &= -33));
          var before$142 = getHostSibling(finishedWork);
          insertOrAppendPlacementNode(finishedWork, before$142, parent$141);
          break;
        case 3:
        case 4:
          var parent$143 = hostParentFiber.stateNode.containerInfo,
            before$144 = getHostSibling(finishedWork);
          insertOrAppendPlacementNodeIntoContainer(
            finishedWork,
            before$144,
            parent$143
          );
          break;
        default:
          throw Error(formatProdErrorMessage(161));
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
    finishedWork.flags &= -3;
  }
  flags & 4096 && (finishedWork.flags &= -4097);
}
function recursivelyResetForms(parentFiber) {
  if (parentFiber.subtreeFlags & 1024)
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var fiber = parentFiber;
      recursivelyResetForms(fiber);
      5 === fiber.tag && fiber.flags & 1024 && fiber.stateNode.reset();
      parentFiber = parentFiber.sibling;
    }
}
function recursivelyTraverseLayoutEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & 8772)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitLayoutEffectOnFiber(root, parentFiber.alternate, parentFiber),
        (parentFiber = parentFiber.sibling);
}
function recursivelyTraverseDisappearLayoutEffects(parentFiber) {
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    var finishedWork = parentFiber;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 1:
        safelyDetachRef(finishedWork, finishedWork.return);
        var instance = finishedWork.stateNode;
        "function" === typeof instance.componentWillUnmount &&
          safelyCallComponentWillUnmount(
            finishedWork,
            finishedWork.return,
            instance
          );
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 27:
        releaseSingletonInstance(finishedWork.stateNode);
      case 26:
      case 5:
        safelyDetachRef(finishedWork, finishedWork.return);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 22:
        null === finishedWork.memoizedState &&
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 30:
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      default:
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
    }
    parentFiber = parentFiber.sibling;
  }
}
function recursivelyTraverseReappearLayoutEffects(
  finishedRoot$jscomp$0,
  parentFiber,
  includeWorkInProgressEffects
) {
  includeWorkInProgressEffects =
    includeWorkInProgressEffects && 0 !== (parentFiber.subtreeFlags & 8772);
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    var current = parentFiber.alternate,
      finishedRoot = finishedRoot$jscomp$0,
      finishedWork = parentFiber,
      flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        commitHookEffectListMount(4, finishedWork);
        break;
      case 1:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        current = finishedWork;
        finishedRoot = current.stateNode;
        if ("function" === typeof finishedRoot.componentDidMount)
          try {
            finishedRoot.componentDidMount();
          } catch (error) {
            captureCommitPhaseError(current, current.return, error);
          }
        current = finishedWork;
        finishedRoot = current.updateQueue;
        if (null !== finishedRoot) {
          var instance = current.stateNode;
          try {
            var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
            if (null !== hiddenCallbacks)
              for (
                finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0;
                finishedRoot < hiddenCallbacks.length;
                finishedRoot++
              )
                callCallback(hiddenCallbacks[finishedRoot], instance);
          } catch (error) {
            captureCommitPhaseError(current, current.return, error);
          }
        }
        includeWorkInProgressEffects &&
          flags & 64 &&
          commitClassCallbacks(finishedWork);
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 27:
        commitHostSingletonAcquisition(finishedWork);
      case 26:
      case 5:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        includeWorkInProgressEffects &&
          null === current &&
          flags & 4 &&
          commitHostMount(finishedWork);
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        break;
      case 31:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        includeWorkInProgressEffects &&
          flags & 4 &&
          commitActivityHydrationCallbacks(finishedRoot, finishedWork);
        break;
      case 13:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        includeWorkInProgressEffects &&
          flags & 4 &&
          commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
        break;
      case 22:
        null === finishedWork.memoizedState &&
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 30:
        break;
      default:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
    }
    parentFiber = parentFiber.sibling;
  }
}
function commitOffscreenPassiveMountEffects(current, finishedWork) {
  var previousCache = null;
  null !== current &&
    null !== current.memoizedState &&
    null !== current.memoizedState.cachePool &&
    (previousCache = current.memoizedState.cachePool.pool);
  current = null;
  null !== finishedWork.memoizedState &&
    null !== finishedWork.memoizedState.cachePool &&
    (current = finishedWork.memoizedState.cachePool.pool);
  current !== previousCache &&
    (null != current && current.refCount++,
    null != previousCache && releaseCache(previousCache));
}
function commitCachePassiveMountEffect(current, finishedWork) {
  current = null;
  null !== finishedWork.alternate &&
    (current = finishedWork.alternate.memoizedState.cache);
  finishedWork = finishedWork.memoizedState.cache;
  finishedWork !== current &&
    (finishedWork.refCount++, null != current && releaseCache(current));
}
function recursivelyTraversePassiveMountEffects(
  root,
  parentFiber,
  committedLanes,
  committedTransitions
) {
  if (parentFiber.subtreeFlags & 10256)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitPassiveMountOnFiber(
        root,
        parentFiber,
        committedLanes,
        committedTransitions
      ),
        (parentFiber = parentFiber.sibling);
}
function commitPassiveMountOnFiber(
  finishedRoot,
  finishedWork,
  committedLanes,
  committedTransitions
) {
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 && commitHookEffectListMount(9, finishedWork);
      break;
    case 1:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 3:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 &&
        ((finishedRoot = null),
        null !== finishedWork.alternate &&
          (finishedRoot = finishedWork.alternate.memoizedState.cache),
        (finishedWork = finishedWork.memoizedState.cache),
        finishedWork !== finishedRoot &&
          (finishedWork.refCount++,
          null != finishedRoot && releaseCache(finishedRoot)));
      break;
    case 12:
      if (flags & 2048) {
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        finishedRoot = finishedWork.stateNode;
        try {
          var _finishedWork$memoize2 = finishedWork.memoizedProps,
            id = _finishedWork$memoize2.id,
            onPostCommit = _finishedWork$memoize2.onPostCommit;
          "function" === typeof onPostCommit &&
            onPostCommit(
              id,
              null === finishedWork.alternate ? "mount" : "update",
              finishedRoot.passiveEffectDuration,
              -0
            );
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      } else
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
      break;
    case 31:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 13:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 23:
      break;
    case 22:
      _finishedWork$memoize2 = finishedWork.stateNode;
      id = finishedWork.alternate;
      null !== finishedWork.memoizedState
        ? _finishedWork$memoize2._visibility & 2
          ? recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions
            )
          : recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork)
        : _finishedWork$memoize2._visibility & 2
          ? recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions
            )
          : ((_finishedWork$memoize2._visibility |= 2),
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              0 !== (finishedWork.subtreeFlags & 10256) || !1
            ));
      flags & 2048 && commitOffscreenPassiveMountEffects(id, finishedWork);
      break;
    case 24:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 &&
        commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
      break;
    default:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
  }
}
function recursivelyTraverseReconnectPassiveEffects(
  finishedRoot$jscomp$0,
  parentFiber,
  committedLanes$jscomp$0,
  committedTransitions$jscomp$0,
  includeWorkInProgressEffects
) {
  includeWorkInProgressEffects =
    includeWorkInProgressEffects &&
    (0 !== (parentFiber.subtreeFlags & 10256) || !1);
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    var finishedRoot = finishedRoot$jscomp$0,
      finishedWork = parentFiber,
      committedLanes = committedLanes$jscomp$0,
      committedTransitions = committedTransitions$jscomp$0,
      flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
        commitHookEffectListMount(8, finishedWork);
        break;
      case 23:
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState
          ? instance._visibility & 2
            ? recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                includeWorkInProgressEffects
              )
            : recursivelyTraverseAtomicPassiveEffects(
                finishedRoot,
                finishedWork
              )
          : ((instance._visibility |= 2),
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              includeWorkInProgressEffects
            ));
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork
          );
        break;
      case 24:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
        break;
      default:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
    }
    parentFiber = parentFiber.sibling;
  }
}
function recursivelyTraverseAtomicPassiveEffects(
  finishedRoot$jscomp$0,
  parentFiber
) {
  if (parentFiber.subtreeFlags & 10256)
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedRoot = finishedRoot$jscomp$0,
        finishedWork = parentFiber,
        flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 22:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          flags & 2048 &&
            commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork
            );
          break;
        case 24:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          flags & 2048 &&
            commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
      }
      parentFiber = parentFiber.sibling;
    }
}
var suspenseyCommitFlag = 8192;
function recursivelyAccumulateSuspenseyCommit(
  parentFiber,
  committedLanes,
  suspendedState
) {
  if (parentFiber.subtreeFlags & suspenseyCommitFlag)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      accumulateSuspenseyCommitOnFiber(
        parentFiber,
        committedLanes,
        suspendedState
      ),
        (parentFiber = parentFiber.sibling);
}
function accumulateSuspenseyCommitOnFiber(
  fiber,
  committedLanes,
  suspendedState
) {
  switch (fiber.tag) {
    case 26:
      recursivelyAccumulateSuspenseyCommit(
        fiber,
        committedLanes,
        suspendedState
      );
      fiber.flags & suspenseyCommitFlag &&
        null !== fiber.memoizedState &&
        suspendResource(
          suspendedState,
          currentHoistableRoot,
          fiber.memoizedState,
          fiber.memoizedProps
        );
      break;
    case 5:
      recursivelyAccumulateSuspenseyCommit(
        fiber,
        committedLanes,
        suspendedState
      );
      break;
    case 3:
    case 4:
      var previousHoistableRoot = currentHoistableRoot;
      currentHoistableRoot = getHoistableRoot(fiber.stateNode.containerInfo);
      recursivelyAccumulateSuspenseyCommit(
        fiber,
        committedLanes,
        suspendedState
      );
      currentHoistableRoot = previousHoistableRoot;
      break;
    case 22:
      null === fiber.memoizedState &&
        ((previousHoistableRoot = fiber.alternate),
        null !== previousHoistableRoot &&
        null !== previousHoistableRoot.memoizedState
          ? ((previousHoistableRoot = suspenseyCommitFlag),
            (suspenseyCommitFlag = 16777216),
            recursivelyAccumulateSuspenseyCommit(
              fiber,
              committedLanes,
              suspendedState
            ),
            (suspenseyCommitFlag = previousHoistableRoot))
          : recursivelyAccumulateSuspenseyCommit(
              fiber,
              committedLanes,
              suspendedState
            ));
      break;
    default:
      recursivelyAccumulateSuspenseyCommit(
        fiber,
        committedLanes,
        suspendedState
      );
  }
}
function detachAlternateSiblings(parentFiber) {
  var previousFiber = parentFiber.alternate;
  if (
    null !== previousFiber &&
    ((parentFiber = previousFiber.child), null !== parentFiber)
  ) {
    previousFiber.child = null;
    do
      (previousFiber = parentFiber.sibling),
        (parentFiber.sibling = null),
        (parentFiber = previousFiber);
    while (null !== parentFiber);
  }
}
function recursivelyTraversePassiveUnmountEffects(parentFiber) {
  var deletions = parentFiber.deletions;
  if (0 !== (parentFiber.flags & 16)) {
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i];
        nextEffect = childToDelete;
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          parentFiber
        );
      }
    detachAlternateSiblings(parentFiber);
  }
  if (parentFiber.subtreeFlags & 10256)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitPassiveUnmountOnFiber(parentFiber),
        (parentFiber = parentFiber.sibling);
}
function commitPassiveUnmountOnFiber(finishedWork) {
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      finishedWork.flags & 2048 &&
        commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
      break;
    case 3:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    case 12:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    case 22:
      var instance = finishedWork.stateNode;
      null !== finishedWork.memoizedState &&
      instance._visibility & 2 &&
      (null === finishedWork.return || 13 !== finishedWork.return.tag)
        ? ((instance._visibility &= -3),
          recursivelyTraverseDisconnectPassiveEffects(finishedWork))
        : recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    default:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
  }
}
function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
  var deletions = parentFiber.deletions;
  if (0 !== (parentFiber.flags & 16)) {
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i];
        nextEffect = childToDelete;
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          parentFiber
        );
      }
    detachAlternateSiblings(parentFiber);
  }
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    deletions = parentFiber;
    switch (deletions.tag) {
      case 0:
      case 11:
      case 15:
        commitHookEffectListUnmount(8, deletions, deletions.return);
        recursivelyTraverseDisconnectPassiveEffects(deletions);
        break;
      case 22:
        i = deletions.stateNode;
        i._visibility & 2 &&
          ((i._visibility &= -3),
          recursivelyTraverseDisconnectPassiveEffects(deletions));
        break;
      default:
        recursivelyTraverseDisconnectPassiveEffects(deletions);
    }
    parentFiber = parentFiber.sibling;
  }
}
function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
  deletedSubtreeRoot,
  nearestMountedAncestor
) {
  for (; null !== nextEffect; ) {
    var fiber = nextEffect;
    switch (fiber.tag) {
      case 0:
      case 11:
      case 15:
        commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
        break;
      case 23:
      case 22:
        if (
          null !== fiber.memoizedState &&
          null !== fiber.memoizedState.cachePool
        ) {
          var cache = fiber.memoizedState.cachePool.pool;
          null != cache && cache.refCount++;
        }
        break;
      case 24:
        releaseCache(fiber.memoizedState.cache);
    }
    cache = fiber.child;
    if (null !== cache) (cache.return = fiber), (nextEffect = cache);
    else
      a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
        cache = nextEffect;
        var sibling = cache.sibling,
          returnFiber = cache.return;
        detachFiberAfterEffects(cache);
        if (cache === fiber) {
          nextEffect = null;
          break a;
        }
        if (null !== sibling) {
          sibling.return = returnFiber;
          nextEffect = sibling;
          break a;
        }
        nextEffect = returnFiber;
      }
  }
}
var DefaultAsyncDispatcher = {
    getCacheForType: function (resourceType) {
      var cache = readContext(CacheContext),
        cacheForType = cache.data.get(resourceType);
      void 0 === cacheForType &&
        ((cacheForType = resourceType()),
        cache.data.set(resourceType, cacheForType));
      return cacheForType;
    },
    cacheSignal: function () {
      return readContext(CacheContext).controller.signal;
    }
  },
  PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map,
  executionContext = 0,
  workInProgressRoot = null,
  workInProgress = null,
  workInProgressRootRenderLanes = 0,
  workInProgressSuspendedReason = 0,
  workInProgressThrownValue = null,
  workInProgressRootDidSkipSuspendedSiblings = !1,
  workInProgressRootIsPrerendering = !1,
  workInProgressRootDidAttachPingListener = !1,
  entangledRenderLanes = 0,
  workInProgressRootExitStatus = 0,
  workInProgressRootSkippedLanes = 0,
  workInProgressRootInterleavedUpdatedLanes = 0,
  workInProgressRootPingedLanes = 0,
  workInProgressDeferredLane = 0,
  workInProgressSuspendedRetryLanes = 0,
  workInProgressRootConcurrentErrors = null,
  workInProgressRootRecoverableErrors = null,
  workInProgressRootDidIncludeRecursiveRenderUpdate = !1,
  globalMostRecentFallbackTime = 0,
  globalMostRecentTransitionTime = 0,
  workInProgressRootRenderTargetTime = Infinity,
  workInProgressTransitions = null,
  legacyErrorBoundariesThatAlreadyFailed = null,
  pendingEffectsStatus = 0,
  pendingEffectsRoot = null,
  pendingFinishedWork = null,
  pendingEffectsLanes = 0,
  pendingEffectsRemainingLanes = 0,
  pendingPassiveTransitions = null,
  pendingRecoverableErrors = null,
  nestedUpdateCount = 0,
  rootWithNestedUpdates = null;
function requestUpdateLane() {
  return 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes
    ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes
    : null !== ReactSharedInternals.T
      ? requestTransitionLane()
      : resolveUpdatePriority();
}
function requestDeferredLane() {
  if (0 === workInProgressDeferredLane)
    if (0 === (workInProgressRootRenderLanes & 536870912) || isHydrating) {
      var lane = nextTransitionDeferredLane;
      nextTransitionDeferredLane <<= 1;
      0 === (nextTransitionDeferredLane & 3932160) &&
        (nextTransitionDeferredLane = 262144);
      workInProgressDeferredLane = lane;
    } else workInProgressDeferredLane = 536870912;
  lane = suspenseHandlerStackCursor.current;
  null !== lane && (lane.flags |= 32);
  return workInProgressDeferredLane;
}
function scheduleUpdateOnFiber(root, fiber, lane) {
  if (
    (root === workInProgressRoot &&
      (2 === workInProgressSuspendedReason ||
        9 === workInProgressSuspendedReason)) ||
    null !== root.cancelPendingCommit
  )
    prepareFreshStack(root, 0),
      markRootSuspended(
        root,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        !1
      );
  markRootUpdated$1(root, lane);
  if (0 === (executionContext & 2) || root !== workInProgressRoot)
    root === workInProgressRoot &&
      (0 === (executionContext & 2) &&
        (workInProgressRootInterleavedUpdatedLanes |= lane),
      4 === workInProgressRootExitStatus &&
        markRootSuspended(
          root,
          workInProgressRootRenderLanes,
          workInProgressDeferredLane,
          !1
        )),
      ensureRootIsScheduled(root);
}
function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
  if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
  var shouldTimeSlice =
      (!forceSync &&
        0 === (lanes & 127) &&
        0 === (lanes & root$jscomp$0.expiredLanes)) ||
      checkIfRootIsPrerendering(root$jscomp$0, lanes),
    exitStatus = shouldTimeSlice
      ? renderRootConcurrent(root$jscomp$0, lanes)
      : renderRootSync(root$jscomp$0, lanes, !0),
    renderWasConcurrent = shouldTimeSlice;
  do {
    if (0 === exitStatus) {
      workInProgressRootIsPrerendering &&
        !shouldTimeSlice &&
        markRootSuspended(root$jscomp$0, lanes, 0, !1);
      break;
    } else {
      forceSync = root$jscomp$0.current.alternate;
      if (
        renderWasConcurrent &&
        !isRenderConsistentWithExternalStores(forceSync)
      ) {
        exitStatus = renderRootSync(root$jscomp$0, lanes, !1);
        renderWasConcurrent = !1;
        continue;
      }
      if (2 === exitStatus) {
        renderWasConcurrent = lanes;
        if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
          var JSCompiler_inline_result = 0;
        else
          (JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913),
            (JSCompiler_inline_result =
              0 !== JSCompiler_inline_result
                ? JSCompiler_inline_result
                : JSCompiler_inline_result & 536870912
                  ? 536870912
                  : 0);
        if (0 !== JSCompiler_inline_result) {
          lanes = JSCompiler_inline_result;
          a: {
            var root = root$jscomp$0;
            exitStatus = workInProgressRootConcurrentErrors;
            var wasRootDehydrated = root.current.memoizedState.isDehydrated;
            wasRootDehydrated &&
              (prepareFreshStack(root, JSCompiler_inline_result).flags |= 256);
            JSCompiler_inline_result = renderRootSync(
              root,
              JSCompiler_inline_result,
              !1
            );
            if (2 !== JSCompiler_inline_result) {
              if (
                workInProgressRootDidAttachPingListener &&
                !wasRootDehydrated
              ) {
                root.errorRecoveryDisabledLanes |= renderWasConcurrent;
                workInProgressRootInterleavedUpdatedLanes |=
                  renderWasConcurrent;
                exitStatus = 4;
                break a;
              }
              renderWasConcurrent = workInProgressRootRecoverableErrors;
              workInProgressRootRecoverableErrors = exitStatus;
              null !== renderWasConcurrent &&
                (null === workInProgressRootRecoverableErrors
                  ? (workInProgressRootRecoverableErrors = renderWasConcurrent)
                  : workInProgressRootRecoverableErrors.push.apply(
                      workInProgressRootRecoverableErrors,
                      renderWasConcurrent
                    ));
            }
            exitStatus = JSCompiler_inline_result;
          }
          renderWasConcurrent = !1;
          if (2 !== exitStatus) continue;
        }
      }
      if (1 === exitStatus) {
        prepareFreshStack(root$jscomp$0, 0);
        markRootSuspended(root$jscomp$0, lanes, 0, !0);
        break;
      }
      a: {
        shouldTimeSlice = root$jscomp$0;
        renderWasConcurrent = exitStatus;
        switch (renderWasConcurrent) {
          case 0:
          case 1:
            throw Error(formatProdErrorMessage(345));
          case 4:
            if ((lanes & 4194048) !== lanes) break;
          case 6:
            markRootSuspended(
              shouldTimeSlice,
              lanes,
              workInProgressDeferredLane,
              !workInProgressRootDidSkipSuspendedSiblings
            );
            break a;
          case 2:
            workInProgressRootRecoverableErrors = null;
            break;
          case 3:
          case 5:
            break;
          default:
            throw Error(formatProdErrorMessage(329));
        }
        if (
          (lanes & 62914560) === lanes &&
          ((exitStatus = globalMostRecentFallbackTime + 300 - now()),
          10 < exitStatus)
        ) {
          markRootSuspended(
            shouldTimeSlice,
            lanes,
            workInProgressDeferredLane,
            !workInProgressRootDidSkipSuspendedSiblings
          );
          if (0 !== getNextLanes(shouldTimeSlice, 0, !0)) break a;
          pendingEffectsLanes = lanes;
          shouldTimeSlice.timeoutHandle = scheduleTimeout(
            commitRootWhenReady.bind(
              null,
              shouldTimeSlice,
              forceSync,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions,
              workInProgressRootDidIncludeRecursiveRenderUpdate,
              lanes,
              workInProgressDeferredLane,
              workInProgressRootInterleavedUpdatedLanes,
              workInProgressSuspendedRetryLanes,
              workInProgressRootDidSkipSuspendedSiblings,
              renderWasConcurrent,
              "Throttled",
              -0,
              0
            ),
            exitStatus
          );
          break a;
        }
        commitRootWhenReady(
          shouldTimeSlice,
          forceSync,
          workInProgressRootRecoverableErrors,
          workInProgressTransitions,
          workInProgressRootDidIncludeRecursiveRenderUpdate,
          lanes,
          workInProgressDeferredLane,
          workInProgressRootInterleavedUpdatedLanes,
          workInProgressSuspendedRetryLanes,
          workInProgressRootDidSkipSuspendedSiblings,
          renderWasConcurrent,
          null,
          -0,
          0
        );
      }
    }
    break;
  } while (1);
  ensureRootIsScheduled(root$jscomp$0);
}
function commitRootWhenReady(
  root,
  finishedWork,
  recoverableErrors,
  transitions,
  didIncludeRenderPhaseUpdate,
  lanes,
  spawnedLane,
  updatedLanes,
  suspendedRetryLanes,
  didSkipSuspendedSiblings,
  exitStatus,
  suspendedCommitReason,
  completedRenderStartTime,
  completedRenderEndTime
) {
  root.timeoutHandle = -1;
  suspendedCommitReason = finishedWork.subtreeFlags;
  if (
    suspendedCommitReason & 8192 ||
    16785408 === (suspendedCommitReason & 16785408)
  ) {
    suspendedCommitReason = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: noop$1
    };
    accumulateSuspenseyCommitOnFiber(
      finishedWork,
      lanes,
      suspendedCommitReason
    );
    var timeoutOffset =
      (lanes & 62914560) === lanes
        ? globalMostRecentFallbackTime - now()
        : (lanes & 4194048) === lanes
          ? globalMostRecentTransitionTime - now()
          : 0;
    timeoutOffset = waitForCommitToBeReady(
      suspendedCommitReason,
      timeoutOffset
    );
    if (null !== timeoutOffset) {
      pendingEffectsLanes = lanes;
      root.cancelPendingCommit = timeoutOffset(
        commitRoot.bind(
          null,
          root,
          finishedWork,
          lanes,
          recoverableErrors,
          transitions,
          didIncludeRenderPhaseUpdate,
          spawnedLane,
          updatedLanes,
          suspendedRetryLanes,
          exitStatus,
          suspendedCommitReason,
          null,
          completedRenderStartTime,
          completedRenderEndTime
        )
      );
      markRootSuspended(root, lanes, spawnedLane, !didSkipSuspendedSiblings);
      return;
    }
  }
  commitRoot(
    root,
    finishedWork,
    lanes,
    recoverableErrors,
    transitions,
    didIncludeRenderPhaseUpdate,
    spawnedLane,
    updatedLanes,
    suspendedRetryLanes
  );
}
function isRenderConsistentWithExternalStores(finishedWork) {
  for (var node = finishedWork; ; ) {
    var tag = node.tag;
    if (
      (0 === tag || 11 === tag || 15 === tag) &&
      node.flags & 16384 &&
      ((tag = node.updateQueue),
      null !== tag && ((tag = tag.stores), null !== tag))
    )
      for (var i = 0; i < tag.length; i++) {
        var check = tag[i],
          getSnapshot = check.getSnapshot;
        check = check.value;
        try {
          if (!objectIs(getSnapshot(), check)) return !1;
        } catch (error) {
          return !1;
        }
      }
    tag = node.child;
    if (node.subtreeFlags & 16384 && null !== tag)
      (tag.return = node), (node = tag);
    else {
      if (node === finishedWork) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === finishedWork) return !0;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
  return !0;
}
function markRootSuspended(
  root,
  suspendedLanes,
  spawnedLane,
  didAttemptEntireTree
) {
  suspendedLanes &= ~workInProgressRootPingedLanes;
  suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
  root.suspendedLanes |= suspendedLanes;
  root.pingedLanes &= ~suspendedLanes;
  didAttemptEntireTree && (root.warmLanes |= suspendedLanes);
  didAttemptEntireTree = root.expirationTimes;
  for (var lanes = suspendedLanes; 0 < lanes; ) {
    var index$6 = 31 - clz32(lanes),
      lane = 1 << index$6;
    didAttemptEntireTree[index$6] = -1;
    lanes &= ~lane;
  }
  0 !== spawnedLane &&
    markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
}
function flushSyncWork$1() {
  return 0 === (executionContext & 6)
    ? (flushSyncWorkAcrossRoots_impl(0, !1), !1)
    : !0;
}
function resetWorkInProgressStack() {
  if (null !== workInProgress) {
    if (0 === workInProgressSuspendedReason)
      var interruptedWork = workInProgress.return;
    else
      (interruptedWork = workInProgress),
        (lastContextDependency = currentlyRenderingFiber$1 = null),
        resetHooksOnUnwind(interruptedWork),
        (thenableState$1 = null),
        (thenableIndexCounter$1 = 0),
        (interruptedWork = workInProgress);
    for (; null !== interruptedWork; )
      unwindInterruptedWork(interruptedWork.alternate, interruptedWork),
        (interruptedWork = interruptedWork.return);
    workInProgress = null;
  }
}
function prepareFreshStack(root, lanes) {
  var timeoutHandle = root.timeoutHandle;
  -1 !== timeoutHandle &&
    ((root.timeoutHandle = -1), cancelTimeout(timeoutHandle));
  timeoutHandle = root.cancelPendingCommit;
  null !== timeoutHandle &&
    ((root.cancelPendingCommit = null), timeoutHandle());
  pendingEffectsLanes = 0;
  resetWorkInProgressStack();
  workInProgressRoot = root;
  workInProgress = timeoutHandle = createWorkInProgress(root.current, null);
  workInProgressRootRenderLanes = lanes;
  workInProgressSuspendedReason = 0;
  workInProgressThrownValue = null;
  workInProgressRootDidSkipSuspendedSiblings = !1;
  workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
  workInProgressRootDidAttachPingListener = !1;
  workInProgressSuspendedRetryLanes =
    workInProgressDeferredLane =
    workInProgressRootPingedLanes =
    workInProgressRootInterleavedUpdatedLanes =
    workInProgressRootSkippedLanes =
    workInProgressRootExitStatus =
      0;
  workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors =
    null;
  workInProgressRootDidIncludeRecursiveRenderUpdate = !1;
  0 !== (lanes & 8) && (lanes |= lanes & 32);
  var allEntangledLanes = root.entangledLanes;
  if (0 !== allEntangledLanes)
    for (
      root = root.entanglements, allEntangledLanes &= lanes;
      0 < allEntangledLanes;

    ) {
      var index$4 = 31 - clz32(allEntangledLanes),
        lane = 1 << index$4;
      lanes |= root[index$4];
      allEntangledLanes &= ~lane;
    }
  entangledRenderLanes = lanes;
  finishQueueingConcurrentUpdates();
  return timeoutHandle;
}
function handleThrow(root, thrownValue) {
  currentlyRenderingFiber = null;
  ReactSharedInternals.H = ContextOnlyDispatcher;
  thrownValue === SuspenseException || thrownValue === SuspenseActionException
    ? ((thrownValue = getSuspendedThenable()),
      (workInProgressSuspendedReason = 3))
    : thrownValue === SuspenseyCommitException
      ? ((thrownValue = getSuspendedThenable()),
        (workInProgressSuspendedReason = 4))
      : (workInProgressSuspendedReason =
          thrownValue === SelectiveHydrationException
            ? 8
            : null !== thrownValue &&
                "object" === typeof thrownValue &&
                "function" === typeof thrownValue.then
              ? 6
              : 1);
  workInProgressThrownValue = thrownValue;
  null === workInProgress &&
    ((workInProgressRootExitStatus = 1),
    logUncaughtError(
      root,
      createCapturedValueAtFiber(thrownValue, root.current)
    ));
}
function shouldRemainOnPreviousScreen() {
  var handler = suspenseHandlerStackCursor.current;
  return null === handler
    ? !0
    : (workInProgressRootRenderLanes & 4194048) ===
        workInProgressRootRenderLanes
      ? null === shellBoundary
        ? !0
        : !1
      : (workInProgressRootRenderLanes & 62914560) ===
            workInProgressRootRenderLanes ||
          0 !== (workInProgressRootRenderLanes & 536870912)
        ? handler === shellBoundary
        : !1;
}
function pushDispatcher() {
  var prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = ContextOnlyDispatcher;
  return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
}
function pushAsyncDispatcher() {
  var prevAsyncDispatcher = ReactSharedInternals.A;
  ReactSharedInternals.A = DefaultAsyncDispatcher;
  return prevAsyncDispatcher;
}
function renderDidSuspendDelayIfPossible() {
  workInProgressRootExitStatus = 4;
  workInProgressRootDidSkipSuspendedSiblings ||
    ((workInProgressRootRenderLanes & 4194048) !==
      workInProgressRootRenderLanes &&
      null !== suspenseHandlerStackCursor.current) ||
    (workInProgressRootIsPrerendering = !0);
  (0 === (workInProgressRootSkippedLanes & 134217727) &&
    0 === (workInProgressRootInterleavedUpdatedLanes & 134217727)) ||
    null === workInProgressRoot ||
    markRootSuspended(
      workInProgressRoot,
      workInProgressRootRenderLanes,
      workInProgressDeferredLane,
      !1
    );
}
function renderRootSync(root, lanes, shouldYieldForPrerendering) {
  var prevExecutionContext = executionContext;
  executionContext |= 2;
  var prevDispatcher = pushDispatcher(),
    prevAsyncDispatcher = pushAsyncDispatcher();
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes)
    (workInProgressTransitions = null), prepareFreshStack(root, lanes);
  lanes = !1;
  var exitStatus = workInProgressRootExitStatus;
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
        var unitOfWork = workInProgress,
          thrownValue = workInProgressThrownValue;
        switch (workInProgressSuspendedReason) {
          case 8:
            resetWorkInProgressStack();
            exitStatus = 6;
            break a;
          case 3:
          case 2:
          case 9:
          case 6:
            null === suspenseHandlerStackCursor.current && (lanes = !0);
            var reason = workInProgressSuspendedReason;
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
            if (
              shouldYieldForPrerendering &&
              workInProgressRootIsPrerendering
            ) {
              exitStatus = 0;
              break a;
            }
            break;
          default:
            (reason = workInProgressSuspendedReason),
              (workInProgressSuspendedReason = 0),
              (workInProgressThrownValue = null),
              throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
        }
      }
      workLoopSync();
      exitStatus = workInProgressRootExitStatus;
      break;
    } catch (thrownValue$165) {
      handleThrow(root, thrownValue$165);
    }
  while (1);
  lanes && root.shellSuspendCounter++;
  lastContextDependency = currentlyRenderingFiber$1 = null;
  executionContext = prevExecutionContext;
  ReactSharedInternals.H = prevDispatcher;
  ReactSharedInternals.A = prevAsyncDispatcher;
  null === workInProgress &&
    ((workInProgressRoot = null),
    (workInProgressRootRenderLanes = 0),
    finishQueueingConcurrentUpdates());
  return exitStatus;
}
function workLoopSync() {
  for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
}
function renderRootConcurrent(root, lanes) {
  var prevExecutionContext = executionContext;
  executionContext |= 2;
  var prevDispatcher = pushDispatcher(),
    prevAsyncDispatcher = pushAsyncDispatcher();
  workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes
    ? ((workInProgressTransitions = null),
      (workInProgressRootRenderTargetTime = now() + 500),
      prepareFreshStack(root, lanes))
    : (workInProgressRootIsPrerendering = checkIfRootIsPrerendering(
        root,
        lanes
      ));
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
        lanes = workInProgress;
        var thrownValue = workInProgressThrownValue;
        b: switch (workInProgressSuspendedReason) {
          case 1:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 1);
            break;
          case 2:
          case 9:
            if (isThenableResolved(thrownValue)) {
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              replaySuspendedUnitOfWork(lanes);
              break;
            }
            lanes = function () {
              (2 !== workInProgressSuspendedReason &&
                9 !== workInProgressSuspendedReason) ||
                workInProgressRoot !== root ||
                (workInProgressSuspendedReason = 7);
              ensureRootIsScheduled(root);
            };
            thrownValue.then(lanes, lanes);
            break a;
          case 3:
            workInProgressSuspendedReason = 7;
            break a;
          case 4:
            workInProgressSuspendedReason = 5;
            break a;
          case 7:
            isThenableResolved(thrownValue)
              ? ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                replaySuspendedUnitOfWork(lanes))
              : ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                throwAndUnwindWorkLoop(root, lanes, thrownValue, 7));
            break;
          case 5:
            var resource = null;
            switch (workInProgress.tag) {
              case 26:
                resource = workInProgress.memoizedState;
              case 5:
              case 27:
                var hostFiber = workInProgress;
                if (
                  resource
                    ? preloadResource(resource)
                    : hostFiber.stateNode.complete
                ) {
                  workInProgressSuspendedReason = 0;
                  workInProgressThrownValue = null;
                  var sibling = hostFiber.sibling;
                  if (null !== sibling) workInProgress = sibling;
                  else {
                    var returnFiber = hostFiber.return;
                    null !== returnFiber
                      ? ((workInProgress = returnFiber),
                        completeUnitOfWork(returnFiber))
                      : (workInProgress = null);
                  }
                  break b;
                }
            }
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 5);
            break;
          case 6:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 6);
            break;
          case 8:
            resetWorkInProgressStack();
            workInProgressRootExitStatus = 6;
            break a;
          default:
            throw Error(formatProdErrorMessage(462));
        }
      }
      workLoopConcurrentByScheduler();
      break;
    } catch (thrownValue$167) {
      handleThrow(root, thrownValue$167);
    }
  while (1);
  lastContextDependency = currentlyRenderingFiber$1 = null;
  ReactSharedInternals.H = prevDispatcher;
  ReactSharedInternals.A = prevAsyncDispatcher;
  executionContext = prevExecutionContext;
  if (null !== workInProgress) return 0;
  workInProgressRoot = null;
  workInProgressRootRenderLanes = 0;
  finishQueueingConcurrentUpdates();
  return workInProgressRootExitStatus;
}
function workLoopConcurrentByScheduler() {
  for (; null !== workInProgress && !shouldYield(); )
    performUnitOfWork(workInProgress);
}
function performUnitOfWork(unitOfWork) {
  var next = beginWork(unitOfWork.alternate, unitOfWork, entangledRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
}
function replaySuspendedUnitOfWork(unitOfWork) {
  var next = unitOfWork;
  var current = next.alternate;
  switch (next.tag) {
    case 15:
    case 0:
      next = replayFunctionComponent(
        current,
        next,
        next.pendingProps,
        next.type,
        void 0,
        workInProgressRootRenderLanes
      );
      break;
    case 11:
      next = replayFunctionComponent(
        current,
        next,
        next.pendingProps,
        next.type.render,
        next.ref,
        workInProgressRootRenderLanes
      );
      break;
    case 5:
      resetHooksOnUnwind(next);
    default:
      unwindInterruptedWork(current, next),
        (next = workInProgress =
          resetWorkInProgress(next, entangledRenderLanes)),
        (next = beginWork(current, next, entangledRenderLanes));
  }
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
}
function throwAndUnwindWorkLoop(
  root,
  unitOfWork,
  thrownValue,
  suspendedReason
) {
  lastContextDependency = currentlyRenderingFiber$1 = null;
  resetHooksOnUnwind(unitOfWork);
  thenableState$1 = null;
  thenableIndexCounter$1 = 0;
  var returnFiber = unitOfWork.return;
  try {
    if (
      throwException(
        root,
        returnFiber,
        unitOfWork,
        thrownValue,
        workInProgressRootRenderLanes
      )
    ) {
      workInProgressRootExitStatus = 1;
      logUncaughtError(
        root,
        createCapturedValueAtFiber(thrownValue, root.current)
      );
      workInProgress = null;
      return;
    }
  } catch (error) {
    if (null !== returnFiber) throw ((workInProgress = returnFiber), error);
    workInProgressRootExitStatus = 1;
    logUncaughtError(
      root,
      createCapturedValueAtFiber(thrownValue, root.current)
    );
    workInProgress = null;
    return;
  }
  if (unitOfWork.flags & 32768) {
    if (isHydrating || 1 === suspendedReason) root = !0;
    else if (
      workInProgressRootIsPrerendering ||
      0 !== (workInProgressRootRenderLanes & 536870912)
    )
      root = !1;
    else if (
      ((workInProgressRootDidSkipSuspendedSiblings = root = !0),
      2 === suspendedReason ||
        9 === suspendedReason ||
        3 === suspendedReason ||
        6 === suspendedReason)
    )
      (suspendedReason = suspenseHandlerStackCursor.current),
        null !== suspendedReason &&
          13 === suspendedReason.tag &&
          (suspendedReason.flags |= 16384);
    unwindUnitOfWork(unitOfWork, root);
  } else completeUnitOfWork(unitOfWork);
}
function completeUnitOfWork(unitOfWork) {
  var completedWork = unitOfWork;
  do {
    if (0 !== (completedWork.flags & 32768)) {
      unwindUnitOfWork(
        completedWork,
        workInProgressRootDidSkipSuspendedSiblings
      );
      return;
    }
    unitOfWork = completedWork.return;
    var next = completeWork(
      completedWork.alternate,
      completedWork,
      entangledRenderLanes
    );
    if (null !== next) {
      workInProgress = next;
      return;
    }
    completedWork = completedWork.sibling;
    if (null !== completedWork) {
      workInProgress = completedWork;
      return;
    }
    workInProgress = completedWork = unitOfWork;
  } while (null !== completedWork);
  0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
}
function unwindUnitOfWork(unitOfWork, skipSiblings) {
  do {
    var next = unwindWork(unitOfWork.alternate, unitOfWork);
    if (null !== next) {
      next.flags &= 32767;
      workInProgress = next;
      return;
    }
    next = unitOfWork.return;
    null !== next &&
      ((next.flags |= 32768), (next.subtreeFlags = 0), (next.deletions = null));
    if (
      !skipSiblings &&
      ((unitOfWork = unitOfWork.sibling), null !== unitOfWork)
    ) {
      workInProgress = unitOfWork;
      return;
    }
    workInProgress = unitOfWork = next;
  } while (null !== unitOfWork);
  workInProgressRootExitStatus = 6;
  workInProgress = null;
}
function commitRoot(
  root,
  finishedWork,
  lanes,
  recoverableErrors,
  transitions,
  didIncludeRenderPhaseUpdate,
  spawnedLane,
  updatedLanes,
  suspendedRetryLanes
) {
  root.cancelPendingCommit = null;
  do flushPendingEffects();
  while (0 !== pendingEffectsStatus);
  if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
  if (null !== finishedWork) {
    if (finishedWork === root.current) throw Error(formatProdErrorMessage(177));
    didIncludeRenderPhaseUpdate = finishedWork.lanes | finishedWork.childLanes;
    didIncludeRenderPhaseUpdate |= concurrentlyUpdatedLanes;
    markRootFinished(
      root,
      lanes,
      didIncludeRenderPhaseUpdate,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes
    );
    root === workInProgressRoot &&
      ((workInProgress = workInProgressRoot = null),
      (workInProgressRootRenderLanes = 0));
    pendingFinishedWork = finishedWork;
    pendingEffectsRoot = root;
    pendingEffectsLanes = lanes;
    pendingEffectsRemainingLanes = didIncludeRenderPhaseUpdate;
    pendingPassiveTransitions = transitions;
    pendingRecoverableErrors = recoverableErrors;
    0 !== (finishedWork.subtreeFlags & 10256) ||
    0 !== (finishedWork.flags & 10256)
      ? ((root.callbackNode = null),
        (root.callbackPriority = 0),
        scheduleCallback$1(NormalPriority$1, function () {
          flushPassiveEffects();
          return null;
        }))
      : ((root.callbackNode = null), (root.callbackPriority = 0));
    recoverableErrors = 0 !== (finishedWork.flags & 13878);
    if (0 !== (finishedWork.subtreeFlags & 13878) || recoverableErrors) {
      recoverableErrors = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      transitions = ReactDOMSharedInternals.p;
      ReactDOMSharedInternals.p = 2;
      spawnedLane = executionContext;
      executionContext |= 4;
      try {
        commitBeforeMutationEffects(root, finishedWork, lanes);
      } finally {
        (executionContext = spawnedLane),
          (ReactDOMSharedInternals.p = transitions),
          (ReactSharedInternals.T = recoverableErrors);
      }
    }
    pendingEffectsStatus = 1;
    flushMutationEffects();
    flushLayoutEffects();
    flushSpawnedWork();
  }
}
function flushMutationEffects() {
  if (1 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var root = pendingEffectsRoot,
      finishedWork = pendingFinishedWork,
      rootMutationHasEffect = 0 !== (finishedWork.flags & 13878);
    if (0 !== (finishedWork.subtreeFlags & 13878) || rootMutationHasEffect) {
      rootMutationHasEffect = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      var previousPriority = ReactDOMSharedInternals.p;
      ReactDOMSharedInternals.p = 2;
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      try {
        commitMutationEffectsOnFiber(finishedWork, root);
        var priorSelectionInformation = selectionInformation,
          curFocusedElem = getActiveElementDeep(root.containerInfo),
          priorFocusedElem = priorSelectionInformation.focusedElem,
          priorSelectionRange = priorSelectionInformation.selectionRange;
        if (
          curFocusedElem !== priorFocusedElem &&
          priorFocusedElem &&
          priorFocusedElem.ownerDocument &&
          containsNode(
            priorFocusedElem.ownerDocument.documentElement,
            priorFocusedElem
          )
        ) {
          if (
            null !== priorSelectionRange &&
            hasSelectionCapabilities(priorFocusedElem)
          ) {
            var start = priorSelectionRange.start,
              end = priorSelectionRange.end;
            void 0 === end && (end = start);
            if ("selectionStart" in priorFocusedElem)
              (priorFocusedElem.selectionStart = start),
                (priorFocusedElem.selectionEnd = Math.min(
                  end,
                  priorFocusedElem.value.length
                ));
            else {
              var doc = priorFocusedElem.ownerDocument || document,
                win = (doc && doc.defaultView) || window;
              if (win.getSelection) {
                var selection = win.getSelection(),
                  length = priorFocusedElem.textContent.length,
                  start$jscomp$0 = Math.min(priorSelectionRange.start, length),
                  end$jscomp$0 =
                    void 0 === priorSelectionRange.end
                      ? start$jscomp$0
                      : Math.min(priorSelectionRange.end, length);
                !selection.extend &&
                  start$jscomp$0 > end$jscomp$0 &&
                  ((curFocusedElem = end$jscomp$0),
                  (end$jscomp$0 = start$jscomp$0),
                  (start$jscomp$0 = curFocusedElem));
                var startMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    start$jscomp$0
                  ),
                  endMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    end$jscomp$0
                  );
                if (
                  startMarker &&
                  endMarker &&
                  (1 !== selection.rangeCount ||
                    selection.anchorNode !== startMarker.node ||
                    selection.anchorOffset !== startMarker.offset ||
                    selection.focusNode !== endMarker.node ||
                    selection.focusOffset !== endMarker.offset)
                ) {
                  var range = doc.createRange();
                  range.setStart(startMarker.node, startMarker.offset);
                  selection.removeAllRanges();
                  start$jscomp$0 > end$jscomp$0
                    ? (selection.addRange(range),
                      selection.extend(endMarker.node, endMarker.offset))
                    : (range.setEnd(endMarker.node, endMarker.offset),
                      selection.addRange(range));
                }
              }
            }
          }
          doc = [];
          for (
            selection = priorFocusedElem;
            (selection = selection.parentNode);

          )
            1 === selection.nodeType &&
              doc.push({
                element: selection,
                left: selection.scrollLeft,
                top: selection.scrollTop
              });
          "function" === typeof priorFocusedElem.focus &&
            priorFocusedElem.focus();
          for (
            priorFocusedElem = 0;
            priorFocusedElem < doc.length;
            priorFocusedElem++
          ) {
            var info = doc[priorFocusedElem];
            info.element.scrollLeft = info.left;
            info.element.scrollTop = info.top;
          }
        }
        _enabled = !!eventsEnabled;
        selectionInformation = eventsEnabled = null;
      } finally {
        (executionContext = prevExecutionContext),
          (ReactDOMSharedInternals.p = previousPriority),
          (ReactSharedInternals.T = rootMutationHasEffect);
      }
    }
    root.current = finishedWork;
    pendingEffectsStatus = 2;
  }
}
function flushLayoutEffects() {
  if (2 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var root = pendingEffectsRoot,
      finishedWork = pendingFinishedWork,
      rootHasLayoutEffect = 0 !== (finishedWork.flags & 8772);
    if (0 !== (finishedWork.subtreeFlags & 8772) || rootHasLayoutEffect) {
      rootHasLayoutEffect = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      var previousPriority = ReactDOMSharedInternals.p;
      ReactDOMSharedInternals.p = 2;
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      try {
        commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork);
      } finally {
        (executionContext = prevExecutionContext),
          (ReactDOMSharedInternals.p = previousPriority),
          (ReactSharedInternals.T = rootHasLayoutEffect);
      }
    }
    pendingEffectsStatus = 3;
  }
}
function flushSpawnedWork() {
  if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    requestPaint();
    var root = pendingEffectsRoot,
      finishedWork = pendingFinishedWork,
      lanes = pendingEffectsLanes,
      recoverableErrors = pendingRecoverableErrors;
    0 !== (finishedWork.subtreeFlags & 10256) ||
    0 !== (finishedWork.flags & 10256)
      ? (pendingEffectsStatus = 5)
      : ((pendingEffectsStatus = 0),
        (pendingFinishedWork = pendingEffectsRoot = null),
        releaseRootPooledCache(root, root.pendingLanes));
    var remainingLanes = root.pendingLanes;
    0 === remainingLanes && (legacyErrorBoundariesThatAlreadyFailed = null);
    lanesToEventPriority(lanes);
    finishedWork = finishedWork.stateNode;
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
      try {
        injectedHook.onCommitFiberRoot(
          rendererID,
          finishedWork,
          void 0,
          128 === (finishedWork.current.flags & 128)
        );
      } catch (err) {}
    if (null !== recoverableErrors) {
      finishedWork = ReactSharedInternals.T;
      remainingLanes = ReactDOMSharedInternals.p;
      ReactDOMSharedInternals.p = 2;
      ReactSharedInternals.T = null;
      try {
        for (
          var onRecoverableError = root.onRecoverableError, i = 0;
          i < recoverableErrors.length;
          i++
        ) {
          var recoverableError = recoverableErrors[i];
          onRecoverableError(recoverableError.value, {
            componentStack: recoverableError.stack
          });
        }
      } finally {
        (ReactSharedInternals.T = finishedWork),
          (ReactDOMSharedInternals.p = remainingLanes);
      }
    }
    0 !== (pendingEffectsLanes & 3) && flushPendingEffects();
    ensureRootIsScheduled(root);
    remainingLanes = root.pendingLanes;
    0 !== (lanes & 261930) && 0 !== (remainingLanes & 42)
      ? root === rootWithNestedUpdates
        ? nestedUpdateCount++
        : ((nestedUpdateCount = 0), (rootWithNestedUpdates = root))
      : (nestedUpdateCount = 0);
    flushSyncWorkAcrossRoots_impl(0, !1);
  }
}
function releaseRootPooledCache(root, remainingLanes) {
  0 === (root.pooledCacheLanes &= remainingLanes) &&
    ((remainingLanes = root.pooledCache),
    null != remainingLanes &&
      ((root.pooledCache = null), releaseCache(remainingLanes)));
}
function flushPendingEffects() {
  flushMutationEffects();
  flushLayoutEffects();
  flushSpawnedWork();
  return flushPassiveEffects();
}
function flushPassiveEffects() {
  if (5 !== pendingEffectsStatus) return !1;
  var root = pendingEffectsRoot,
    remainingLanes = pendingEffectsRemainingLanes;
  pendingEffectsRemainingLanes = 0;
  var renderPriority = lanesToEventPriority(pendingEffectsLanes),
    prevTransition = ReactSharedInternals.T,
    previousPriority = ReactDOMSharedInternals.p;
  try {
    ReactDOMSharedInternals.p = 32 > renderPriority ? 32 : renderPriority;
    ReactSharedInternals.T = null;
    renderPriority = pendingPassiveTransitions;
    pendingPassiveTransitions = null;
    var root$jscomp$0 = pendingEffectsRoot,
      lanes = pendingEffectsLanes;
    pendingEffectsStatus = 0;
    pendingFinishedWork = pendingEffectsRoot = null;
    pendingEffectsLanes = 0;
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(331));
    var prevExecutionContext = executionContext;
    executionContext |= 4;
    commitPassiveUnmountOnFiber(root$jscomp$0.current);
    commitPassiveMountOnFiber(
      root$jscomp$0,
      root$jscomp$0.current,
      lanes,
      renderPriority
    );
    executionContext = prevExecutionContext;
    flushSyncWorkAcrossRoots_impl(0, !1);
    if (
      injectedHook &&
      "function" === typeof injectedHook.onPostCommitFiberRoot
    )
      try {
        injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
      } catch (err) {}
    return !0;
  } finally {
    (ReactDOMSharedInternals.p = previousPriority),
      (ReactSharedInternals.T = prevTransition),
      releaseRootPooledCache(root, remainingLanes);
  }
}
function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
  sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
  sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
  rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
  null !== rootFiber &&
    (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
}
function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
  if (3 === sourceFiber.tag)
    captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
  else
    for (; null !== nearestMountedAncestor; ) {
      if (3 === nearestMountedAncestor.tag) {
        captureCommitPhaseErrorOnRoot(
          nearestMountedAncestor,
          sourceFiber,
          error
        );
        break;
      } else if (1 === nearestMountedAncestor.tag) {
        var instance = nearestMountedAncestor.stateNode;
        if (
          "function" ===
            typeof nearestMountedAncestor.type.getDerivedStateFromError ||
          ("function" === typeof instance.componentDidCatch &&
            (null === legacyErrorBoundariesThatAlreadyFailed ||
              !legacyErrorBoundariesThatAlreadyFailed.has(instance)))
        ) {
          sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
          error = createClassErrorUpdate(2);
          instance = enqueueUpdate(nearestMountedAncestor, error, 2);
          null !== instance &&
            (initializeClassErrorUpdate(
              error,
              instance,
              nearestMountedAncestor,
              sourceFiber
            ),
            markRootUpdated$1(instance, 2),
            ensureRootIsScheduled(instance));
          break;
        }
      }
      nearestMountedAncestor = nearestMountedAncestor.return;
    }
}
function attachPingListener(root, wakeable, lanes) {
  var pingCache = root.pingCache;
  if (null === pingCache) {
    pingCache = root.pingCache = new PossiblyWeakMap();
    var threadIDs = new Set();
    pingCache.set(wakeable, threadIDs);
  } else
    (threadIDs = pingCache.get(wakeable)),
      void 0 === threadIDs &&
        ((threadIDs = new Set()), pingCache.set(wakeable, threadIDs));
  threadIDs.has(lanes) ||
    ((workInProgressRootDidAttachPingListener = !0),
    threadIDs.add(lanes),
    (root = pingSuspendedRoot.bind(null, root, wakeable, lanes)),
    wakeable.then(root, root));
}
function pingSuspendedRoot(root, wakeable, pingedLanes) {
  var pingCache = root.pingCache;
  null !== pingCache && pingCache.delete(wakeable);
  root.pingedLanes |= root.suspendedLanes & pingedLanes;
  root.warmLanes &= ~pingedLanes;
  workInProgressRoot === root &&
    (workInProgressRootRenderLanes & pingedLanes) === pingedLanes &&
    (4 === workInProgressRootExitStatus ||
    (3 === workInProgressRootExitStatus &&
      (workInProgressRootRenderLanes & 62914560) ===
        workInProgressRootRenderLanes &&
      300 > now() - globalMostRecentFallbackTime)
      ? 0 === (executionContext & 2) && prepareFreshStack(root, 0)
      : (workInProgressRootPingedLanes |= pingedLanes),
    workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes &&
      (workInProgressSuspendedRetryLanes = 0));
  ensureRootIsScheduled(root);
}
function retryTimedOutBoundary(boundaryFiber, retryLane) {
  0 === retryLane && (retryLane = claimNextRetryLane());
  boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
  null !== boundaryFiber &&
    (markRootUpdated$1(boundaryFiber, retryLane),
    ensureRootIsScheduled(boundaryFiber));
}
function retryDehydratedSuspenseBoundary(boundaryFiber) {
  var suspenseState = boundaryFiber.memoizedState,
    retryLane = 0;
  null !== suspenseState && (retryLane = suspenseState.retryLane);
  retryTimedOutBoundary(boundaryFiber, retryLane);
}
function resolveRetryWakeable(boundaryFiber, wakeable) {
  var retryLane = 0;
  switch (boundaryFiber.tag) {
    case 31:
    case 13:
      var retryCache = boundaryFiber.stateNode;
      var suspenseState = boundaryFiber.memoizedState;
      null !== suspenseState && (retryLane = suspenseState.retryLane);
      break;
    case 19:
      retryCache = boundaryFiber.stateNode;
      break;
    case 22:
      retryCache = boundaryFiber.stateNode._retryCache;
      break;
    default:
      throw Error(formatProdErrorMessage(314));
  }
  null !== retryCache && retryCache.delete(wakeable);
  retryTimedOutBoundary(boundaryFiber, retryLane);
}
function scheduleCallback$1(priorityLevel, callback) {
  return scheduleCallback$3(priorityLevel, callback);
}
var firstScheduledRoot = null,
  lastScheduledRoot = null,
  didScheduleMicrotask = !1,
  mightHavePendingSyncWork = !1,
  isFlushingWork = !1,
  currentEventTransitionLane = 0;
function ensureRootIsScheduled(root) {
  root !== lastScheduledRoot &&
    null === root.next &&
    (null === lastScheduledRoot
      ? (firstScheduledRoot = lastScheduledRoot = root)
      : (lastScheduledRoot = lastScheduledRoot.next = root));
  mightHavePendingSyncWork = !0;
  didScheduleMicrotask ||
    ((didScheduleMicrotask = !0), scheduleImmediateRootScheduleTask());
}
function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
  if (!isFlushingWork && mightHavePendingSyncWork) {
    isFlushingWork = !0;
    do {
      var didPerformSomeWork = !1;
      for (var root$170 = firstScheduledRoot; null !== root$170; ) {
        if (!onlyLegacy)
          if (0 !== syncTransitionLanes) {
            var pendingLanes = root$170.pendingLanes;
            if (0 === pendingLanes) var JSCompiler_inline_result = 0;
            else {
              var suspendedLanes = root$170.suspendedLanes,
                pingedLanes = root$170.pingedLanes;
              JSCompiler_inline_result =
                (1 << (31 - clz32(42 | syncTransitionLanes) + 1)) - 1;
              JSCompiler_inline_result &=
                pendingLanes & ~(suspendedLanes & ~pingedLanes);
              JSCompiler_inline_result =
                JSCompiler_inline_result & 201326741
                  ? (JSCompiler_inline_result & 201326741) | 1
                  : JSCompiler_inline_result
                    ? JSCompiler_inline_result | 2
                    : 0;
            }
            0 !== JSCompiler_inline_result &&
              ((didPerformSomeWork = !0),
              performSyncWorkOnRoot(root$170, JSCompiler_inline_result));
          } else
            (JSCompiler_inline_result = workInProgressRootRenderLanes),
              (JSCompiler_inline_result = getNextLanes(
                root$170,
                root$170 === workInProgressRoot ? JSCompiler_inline_result : 0,
                null !== root$170.cancelPendingCommit ||
                  -1 !== root$170.timeoutHandle
              )),
              0 === (JSCompiler_inline_result & 3) ||
                checkIfRootIsPrerendering(root$170, JSCompiler_inline_result) ||
                ((didPerformSomeWork = !0),
                performSyncWorkOnRoot(root$170, JSCompiler_inline_result));
        root$170 = root$170.next;
      }
    } while (didPerformSomeWork);
    isFlushingWork = !1;
  }
}
function processRootScheduleInImmediateTask() {
  processRootScheduleInMicrotask();
}
function processRootScheduleInMicrotask() {
  mightHavePendingSyncWork = didScheduleMicrotask = !1;
  var syncTransitionLanes = 0;
  0 !== currentEventTransitionLane &&
    shouldAttemptEagerTransition() &&
    (syncTransitionLanes = currentEventTransitionLane);
  for (
    var currentTime = now(), prev = null, root = firstScheduledRoot;
    null !== root;

  ) {
    var next = root.next,
      nextLanes = scheduleTaskForRootDuringMicrotask(root, currentTime);
    if (0 === nextLanes)
      (root.next = null),
        null === prev ? (firstScheduledRoot = next) : (prev.next = next),
        null === next && (lastScheduledRoot = prev);
    else if (
      ((prev = root), 0 !== syncTransitionLanes || 0 !== (nextLanes & 3))
    )
      mightHavePendingSyncWork = !0;
    root = next;
  }
  (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus) ||
    flushSyncWorkAcrossRoots_impl(syncTransitionLanes, !1);
  0 !== currentEventTransitionLane && (currentEventTransitionLane = 0);
}
function scheduleTaskForRootDuringMicrotask(root, currentTime) {
  for (
    var suspendedLanes = root.suspendedLanes,
      pingedLanes = root.pingedLanes,
      expirationTimes = root.expirationTimes,
      lanes = root.pendingLanes & -62914561;
    0 < lanes;

  ) {
    var index$5 = 31 - clz32(lanes),
      lane = 1 << index$5,
      expirationTime = expirationTimes[index$5];
    if (-1 === expirationTime) {
      if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
        expirationTimes[index$5] = computeExpirationTime(lane, currentTime);
    } else expirationTime <= currentTime && (root.expiredLanes |= lane);
    lanes &= ~lane;
  }
  currentTime = workInProgressRoot;
  suspendedLanes = workInProgressRootRenderLanes;
  suspendedLanes = getNextLanes(
    root,
    root === currentTime ? suspendedLanes : 0,
    null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
  );
  pingedLanes = root.callbackNode;
  if (
    0 === suspendedLanes ||
    (root === currentTime &&
      (2 === workInProgressSuspendedReason ||
        9 === workInProgressSuspendedReason)) ||
    null !== root.cancelPendingCommit
  )
    return (
      null !== pingedLanes &&
        null !== pingedLanes &&
        cancelCallback$1(pingedLanes),
      (root.callbackNode = null),
      (root.callbackPriority = 0)
    );
  if (
    0 === (suspendedLanes & 3) ||
    checkIfRootIsPrerendering(root, suspendedLanes)
  ) {
    currentTime = suspendedLanes & -suspendedLanes;
    if (currentTime === root.callbackPriority) return currentTime;
    null !== pingedLanes && cancelCallback$1(pingedLanes);
    switch (lanesToEventPriority(suspendedLanes)) {
      case 2:
      case 8:
        suspendedLanes = UserBlockingPriority;
        break;
      case 32:
        suspendedLanes = NormalPriority$1;
        break;
      case 268435456:
        suspendedLanes = IdlePriority;
        break;
      default:
        suspendedLanes = NormalPriority$1;
    }
    pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root);
    suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
    root.callbackPriority = currentTime;
    root.callbackNode = suspendedLanes;
    return currentTime;
  }
  null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes);
  root.callbackPriority = 2;
  root.callbackNode = null;
  return 2;
}
function performWorkOnRootViaSchedulerTask(root, didTimeout) {
  if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
    return (root.callbackNode = null), (root.callbackPriority = 0), null;
  var originalCallbackNode = root.callbackNode;
  if (flushPendingEffects() && root.callbackNode !== originalCallbackNode)
    return null;
  var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
  workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
    null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
  );
  if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
  performWorkOnRoot(root, workInProgressRootRenderLanes$jscomp$0, didTimeout);
  scheduleTaskForRootDuringMicrotask(root, now());
  return null != root.callbackNode && root.callbackNode === originalCallbackNode
    ? performWorkOnRootViaSchedulerTask.bind(null, root)
    : null;
}
function performSyncWorkOnRoot(root, lanes) {
  if (flushPendingEffects()) return null;
  performWorkOnRoot(root, lanes, !0);
}
function scheduleImmediateRootScheduleTask() {
  scheduleMicrotask(function () {
    0 !== (executionContext & 6)
      ? scheduleCallback$3(
          ImmediatePriority,
          processRootScheduleInImmediateTask
        )
      : processRootScheduleInMicrotask();
  });
}
function requestTransitionLane() {
  if (0 === currentEventTransitionLane) {
    var actionScopeLane = currentEntangledLane;
    0 === actionScopeLane &&
      ((actionScopeLane = nextTransitionUpdateLane),
      (nextTransitionUpdateLane <<= 1),
      0 === (nextTransitionUpdateLane & 261888) &&
        (nextTransitionUpdateLane = 256));
    currentEventTransitionLane = actionScopeLane;
  }
  return currentEventTransitionLane;
}
function coerceFormActionProp(actionProp) {
  return null == actionProp ||
    "symbol" === typeof actionProp ||
    "boolean" === typeof actionProp
    ? null
    : "function" === typeof actionProp
      ? actionProp
      : sanitizeURL("" + actionProp);
}
function createFormDataWithSubmitter(form, submitter) {
  var temp = submitter.ownerDocument.createElement("input");
  temp.name = submitter.name;
  temp.value = submitter.value;
  form.id && temp.setAttribute("form", form.id);
  submitter.parentNode.insertBefore(temp, submitter);
  form = new FormData(form);
  temp.parentNode.removeChild(temp);
  return form;
}
function extractEvents$1(
  dispatchQueue,
  domEventName,
  maybeTargetInst,
  nativeEvent,
  nativeEventTarget
) {
  if (
    "submit" === domEventName &&
    maybeTargetInst &&
    maybeTargetInst.stateNode === nativeEventTarget
  ) {
    var action = coerceFormActionProp(
        (nativeEventTarget[internalPropsKey] || null).action
      ),
      submitter = nativeEvent.submitter;
    submitter &&
      ((domEventName = (domEventName = submitter[internalPropsKey] || null)
        ? coerceFormActionProp(domEventName.formAction)
        : submitter.getAttribute("formAction")),
      null !== domEventName && ((action = domEventName), (submitter = null)));
    var event = new SyntheticEvent(
      "action",
      "action",
      null,
      nativeEvent,
      nativeEventTarget
    );
    dispatchQueue.push({
      event: event,
      listeners: [
        {
          instance: null,
          listener: function () {
            if (nativeEvent.defaultPrevented) {
              if (0 !== currentEventTransitionLane) {
                var formData = submitter
                  ? createFormDataWithSubmitter(nativeEventTarget, submitter)
                  : new FormData(nativeEventTarget);
                startHostTransition(
                  maybeTargetInst,
                  {
                    pending: !0,
                    data: formData,
                    method: nativeEventTarget.method,
                    action: action
                  },
                  null,
                  formData
                );
              }
            } else
              "function" === typeof action &&
                (event.preventDefault(),
                (formData = submitter
                  ? createFormDataWithSubmitter(nativeEventTarget, submitter)
                  : new FormData(nativeEventTarget)),
                startHostTransition(
                  maybeTargetInst,
                  {
                    pending: !0,
                    data: formData,
                    method: nativeEventTarget.method,
                    action: action
                  },
                  action,
                  formData
                ));
          },
          currentTarget: nativeEventTarget
        }
      ]
    });
  }
}
for (
  var i$jscomp$inline_1577 = 0;
  i$jscomp$inline_1577 < simpleEventPluginEvents.length;
  i$jscomp$inline_1577++
) {
  var eventName$jscomp$inline_1578 =
      simpleEventPluginEvents[i$jscomp$inline_1577],
    domEventName$jscomp$inline_1579 =
      eventName$jscomp$inline_1578.toLowerCase(),
    capitalizedEvent$jscomp$inline_1580 =
      eventName$jscomp$inline_1578[0].toUpperCase() +
      eventName$jscomp$inline_1578.slice(1);
  registerSimpleEvent(
    domEventName$jscomp$inline_1579,
    "on" + capitalizedEvent$jscomp$inline_1580
  );
}
registerSimpleEvent(ANIMATION_END, "onAnimationEnd");
registerSimpleEvent(ANIMATION_ITERATION, "onAnimationIteration");
registerSimpleEvent(ANIMATION_START, "onAnimationStart");
registerSimpleEvent("dblclick", "onDoubleClick");
registerSimpleEvent("focusin", "onFocus");
registerSimpleEvent("focusout", "onBlur");
registerSimpleEvent(TRANSITION_RUN, "onTransitionRun");
registerSimpleEvent(TRANSITION_START, "onTransitionStart");
registerSimpleEvent(TRANSITION_CANCEL, "onTransitionCancel");
registerSimpleEvent(TRANSITION_END, "onTransitionEnd");
registerDirectEvent("onMouseEnter", ["mouseout", "mouseover"]);
registerDirectEvent("onMouseLeave", ["mouseout", "mouseover"]);
registerDirectEvent("onPointerEnter", ["pointerout", "pointerover"]);
registerDirectEvent("onPointerLeave", ["pointerout", "pointerover"]);
registerTwoPhaseEvent(
  "onChange",
  "change click focusin focusout input keydown keyup selectionchange".split(" ")
);
registerTwoPhaseEvent(
  "onSelect",
  "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
    " "
  )
);
registerTwoPhaseEvent("onBeforeInput", [
  "compositionend",
  "keypress",
  "textInput",
  "paste"
]);
registerTwoPhaseEvent(
  "onCompositionEnd",
  "compositionend focusout keydown keypress keyup mousedown".split(" ")
);
registerTwoPhaseEvent(
  "onCompositionStart",
  "compositionstart focusout keydown keypress keyup mousedown".split(" ")
);
registerTwoPhaseEvent(
  "onCompositionUpdate",
  "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
);
var mediaEventTypes =
    "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
      " "
    ),
  nonDelegatedEvents = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle"
      .split(" ")
      .concat(mediaEventTypes)
  );
function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  eventSystemFlags = 0 !== (eventSystemFlags & 4);
  for (var i = 0; i < dispatchQueue.length; i++) {
    var _dispatchQueue$i = dispatchQueue[i],
      event = _dispatchQueue$i.event;
    _dispatchQueue$i = _dispatchQueue$i.listeners;
    a: {
      var previousInstance = void 0;
      if (eventSystemFlags)
        for (
          var i$jscomp$0 = _dispatchQueue$i.length - 1;
          0 <= i$jscomp$0;
          i$jscomp$0--
        ) {
          var _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0],
            instance = _dispatchListeners$i.instance,
            currentTarget = _dispatchListeners$i.currentTarget;
          _dispatchListeners$i = _dispatchListeners$i.listener;
          if (instance !== previousInstance && event.isPropagationStopped())
            break a;
          previousInstance = _dispatchListeners$i;
          event.currentTarget = currentTarget;
          try {
            previousInstance(event);
          } catch (error) {
            reportGlobalError(error);
          }
          event.currentTarget = null;
          previousInstance = instance;
        }
      else
        for (
          i$jscomp$0 = 0;
          i$jscomp$0 < _dispatchQueue$i.length;
          i$jscomp$0++
        ) {
          _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0];
          instance = _dispatchListeners$i.instance;
          currentTarget = _dispatchListeners$i.currentTarget;
          _dispatchListeners$i = _dispatchListeners$i.listener;
          if (instance !== previousInstance && event.isPropagationStopped())
            break a;
          previousInstance = _dispatchListeners$i;
          event.currentTarget = currentTarget;
          try {
            previousInstance(event);
          } catch (error) {
            reportGlobalError(error);
          }
          event.currentTarget = null;
          previousInstance = instance;
        }
    }
  }
}
function listenToNonDelegatedEvent(domEventName, targetElement) {
  var JSCompiler_inline_result = targetElement[internalEventHandlersKey];
  void 0 === JSCompiler_inline_result &&
    (JSCompiler_inline_result = targetElement[internalEventHandlersKey] =
      new Set());
  var listenerSetKey = domEventName + "__bubble";
  JSCompiler_inline_result.has(listenerSetKey) ||
    (addTrappedEventListener(targetElement, domEventName, 2, !1),
    JSCompiler_inline_result.add(listenerSetKey));
}
function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
  var eventSystemFlags = 0;
  isCapturePhaseListener && (eventSystemFlags |= 4);
  addTrappedEventListener(
    target,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener
  );
}
var listeningMarker = "_reactListening" + Math.random().toString(36).slice(2);
function listenToAllSupportedEvents(rootContainerElement) {
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = !0;
    allNativeEvents.forEach(function (domEventName) {
      "selectionchange" !== domEventName &&
        (nonDelegatedEvents.has(domEventName) ||
          listenToNativeEvent(domEventName, !1, rootContainerElement),
        listenToNativeEvent(domEventName, !0, rootContainerElement));
    });
    var ownerDocument =
      9 === rootContainerElement.nodeType
        ? rootContainerElement
        : rootContainerElement.ownerDocument;
    null === ownerDocument ||
      ownerDocument[listeningMarker] ||
      ((ownerDocument[listeningMarker] = !0),
      listenToNativeEvent("selectionchange", !1, ownerDocument));
  }
}
function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener
) {
  switch (getEventPriority(domEventName)) {
    case 2:
      var listenerWrapper = dispatchDiscreteEvent;
      break;
    case 8:
      listenerWrapper = dispatchContinuousEvent;
      break;
    default:
      listenerWrapper = dispatchEvent;
  }
  eventSystemFlags = listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer
  );
  listenerWrapper = void 0;
  !passiveBrowserEventsSupported ||
    ("touchstart" !== domEventName &&
      "touchmove" !== domEventName &&
      "wheel" !== domEventName) ||
    (listenerWrapper = !0);
  isCapturePhaseListener
    ? void 0 !== listenerWrapper
      ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
          capture: !0,
          passive: listenerWrapper
        })
      : targetContainer.addEventListener(domEventName, eventSystemFlags, !0)
    : void 0 !== listenerWrapper
      ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
          passive: listenerWrapper
        })
      : targetContainer.addEventListener(domEventName, eventSystemFlags, !1);
}
function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst$jscomp$0,
  targetContainer
) {
  var ancestorInst = targetInst$jscomp$0;
  if (
    0 === (eventSystemFlags & 1) &&
    0 === (eventSystemFlags & 2) &&
    null !== targetInst$jscomp$0
  )
    a: for (;;) {
      if (null === targetInst$jscomp$0) return;
      var nodeTag = targetInst$jscomp$0.tag;
      if (3 === nodeTag || 4 === nodeTag) {
        var container = targetInst$jscomp$0.stateNode.containerInfo;
        if (container === targetContainer) break;
        if (4 === nodeTag)
          for (nodeTag = targetInst$jscomp$0.return; null !== nodeTag; ) {
            var grandTag = nodeTag.tag;
            if (
              (3 === grandTag || 4 === grandTag) &&
              nodeTag.stateNode.containerInfo === targetContainer
            )
              return;
            nodeTag = nodeTag.return;
          }
        for (; null !== container; ) {
          nodeTag = getClosestInstanceFromNode(container);
          if (null === nodeTag) return;
          grandTag = nodeTag.tag;
          if (
            5 === grandTag ||
            6 === grandTag ||
            26 === grandTag ||
            27 === grandTag
          ) {
            targetInst$jscomp$0 = ancestorInst = nodeTag;
            continue a;
          }
          container = container.parentNode;
        }
      }
      targetInst$jscomp$0 = targetInst$jscomp$0.return;
    }
  batchedUpdates$1(function () {
    var targetInst = ancestorInst,
      nativeEventTarget = getEventTarget(nativeEvent),
      dispatchQueue = [];
    a: {
      var reactName = topLevelEventsToReactNames.get(domEventName);
      if (void 0 !== reactName) {
        var SyntheticEventCtor = SyntheticEvent,
          reactEventType = domEventName;
        switch (domEventName) {
          case "keypress":
            if (0 === getEventCharCode(nativeEvent)) break a;
          case "keydown":
          case "keyup":
            SyntheticEventCtor = SyntheticKeyboardEvent;
            break;
          case "focusin":
            reactEventType = "focus";
            SyntheticEventCtor = SyntheticFocusEvent;
            break;
          case "focusout":
            reactEventType = "blur";
            SyntheticEventCtor = SyntheticFocusEvent;
            break;
          case "beforeblur":
          case "afterblur":
            SyntheticEventCtor = SyntheticFocusEvent;
            break;
          case "click":
            if (2 === nativeEvent.button) break a;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            SyntheticEventCtor = SyntheticMouseEvent;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            SyntheticEventCtor = SyntheticDragEvent;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            SyntheticEventCtor = SyntheticTouchEvent;
            break;
          case ANIMATION_END:
          case ANIMATION_ITERATION:
          case ANIMATION_START:
            SyntheticEventCtor = SyntheticAnimationEvent;
            break;
          case TRANSITION_END:
            SyntheticEventCtor = SyntheticTransitionEvent;
            break;
          case "scroll":
          case "scrollend":
            SyntheticEventCtor = SyntheticUIEvent;
            break;
          case "wheel":
            SyntheticEventCtor = SyntheticWheelEvent;
            break;
          case "copy":
          case "cut":
          case "paste":
            SyntheticEventCtor = SyntheticClipboardEvent;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            SyntheticEventCtor = SyntheticPointerEvent;
            break;
          case "toggle":
          case "beforetoggle":
            SyntheticEventCtor = SyntheticToggleEvent;
        }
        var inCapturePhase = 0 !== (eventSystemFlags & 4),
          accumulateTargetOnly =
            !inCapturePhase &&
            ("scroll" === domEventName || "scrollend" === domEventName),
          reactEventName = inCapturePhase
            ? null !== reactName
              ? reactName + "Capture"
              : null
            : reactName;
        inCapturePhase = [];
        for (
          var instance = targetInst, lastHostComponent;
          null !== instance;

        ) {
          var _instance = instance;
          lastHostComponent = _instance.stateNode;
          _instance = _instance.tag;
          (5 !== _instance && 26 !== _instance && 27 !== _instance) ||
            null === lastHostComponent ||
            null === reactEventName ||
            ((_instance = getListener(instance, reactEventName)),
            null != _instance &&
              inCapturePhase.push(
                createDispatchListener(instance, _instance, lastHostComponent)
              ));
          if (accumulateTargetOnly) break;
          instance = instance.return;
        }
        0 < inCapturePhase.length &&
          ((reactName = new SyntheticEventCtor(
            reactName,
            reactEventType,
            null,
            nativeEvent,
            nativeEventTarget
          )),
          dispatchQueue.push({ event: reactName, listeners: inCapturePhase }));
      }
    }
    if (0 === (eventSystemFlags & 7)) {
      a: {
        reactName =
          "mouseover" === domEventName || "pointerover" === domEventName;
        SyntheticEventCtor =
          "mouseout" === domEventName || "pointerout" === domEventName;
        if (
          reactName &&
          nativeEvent !== currentReplayingEvent &&
          (reactEventType =
            nativeEvent.relatedTarget || nativeEvent.fromElement) &&
          (getClosestInstanceFromNode(reactEventType) ||
            reactEventType[internalContainerInstanceKey])
        )
          break a;
        if (SyntheticEventCtor || reactName) {
          reactName =
            nativeEventTarget.window === nativeEventTarget
              ? nativeEventTarget
              : (reactName = nativeEventTarget.ownerDocument)
                ? reactName.defaultView || reactName.parentWindow
                : window;
          if (SyntheticEventCtor) {
            if (
              ((reactEventType =
                nativeEvent.relatedTarget || nativeEvent.toElement),
              (SyntheticEventCtor = targetInst),
              (reactEventType = reactEventType
                ? getClosestInstanceFromNode(reactEventType)
                : null),
              null !== reactEventType &&
                ((accumulateTargetOnly =
                  getNearestMountedFiber(reactEventType)),
                (inCapturePhase = reactEventType.tag),
                reactEventType !== accumulateTargetOnly ||
                  (5 !== inCapturePhase &&
                    27 !== inCapturePhase &&
                    6 !== inCapturePhase)))
            )
              reactEventType = null;
          } else (SyntheticEventCtor = null), (reactEventType = targetInst);
          if (SyntheticEventCtor !== reactEventType) {
            inCapturePhase = SyntheticMouseEvent;
            _instance = "onMouseLeave";
            reactEventName = "onMouseEnter";
            instance = "mouse";
            if ("pointerout" === domEventName || "pointerover" === domEventName)
              (inCapturePhase = SyntheticPointerEvent),
                (_instance = "onPointerLeave"),
                (reactEventName = "onPointerEnter"),
                (instance = "pointer");
            accumulateTargetOnly =
              null == SyntheticEventCtor
                ? reactName
                : getNodeFromInstance(SyntheticEventCtor);
            lastHostComponent =
              null == reactEventType
                ? reactName
                : getNodeFromInstance(reactEventType);
            reactName = new inCapturePhase(
              _instance,
              instance + "leave",
              SyntheticEventCtor,
              nativeEvent,
              nativeEventTarget
            );
            reactName.target = accumulateTargetOnly;
            reactName.relatedTarget = lastHostComponent;
            _instance = null;
            getClosestInstanceFromNode(nativeEventTarget) === targetInst &&
              ((inCapturePhase = new inCapturePhase(
                reactEventName,
                instance + "enter",
                reactEventType,
                nativeEvent,
                nativeEventTarget
              )),
              (inCapturePhase.target = lastHostComponent),
              (inCapturePhase.relatedTarget = accumulateTargetOnly),
              (_instance = inCapturePhase));
            accumulateTargetOnly = _instance;
            if (SyntheticEventCtor && reactEventType)
              b: {
                inCapturePhase = getParent;
                reactEventName = SyntheticEventCtor;
                instance = reactEventType;
                lastHostComponent = 0;
                for (
                  _instance = reactEventName;
                  _instance;
                  _instance = inCapturePhase(_instance)
                )
                  lastHostComponent++;
                _instance = 0;
                for (var tempB = instance; tempB; tempB = inCapturePhase(tempB))
                  _instance++;
                for (; 0 < lastHostComponent - _instance; )
                  (reactEventName = inCapturePhase(reactEventName)),
                    lastHostComponent--;
                for (; 0 < _instance - lastHostComponent; )
                  (instance = inCapturePhase(instance)), _instance--;
                for (; lastHostComponent--; ) {
                  if (
                    reactEventName === instance ||
                    (null !== instance && reactEventName === instance.alternate)
                  ) {
                    inCapturePhase = reactEventName;
                    break b;
                  }
                  reactEventName = inCapturePhase(reactEventName);
                  instance = inCapturePhase(instance);
                }
                inCapturePhase = null;
              }
            else inCapturePhase = null;
            null !== SyntheticEventCtor &&
              accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                reactName,
                SyntheticEventCtor,
                inCapturePhase,
                !1
              );
            null !== reactEventType &&
              null !== accumulateTargetOnly &&
              accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                accumulateTargetOnly,
                reactEventType,
                inCapturePhase,
                !0
              );
          }
        }
      }
      a: {
        reactName = targetInst ? getNodeFromInstance(targetInst) : window;
        SyntheticEventCtor =
          reactName.nodeName && reactName.nodeName.toLowerCase();
        if (
          "select" === SyntheticEventCtor ||
          ("input" === SyntheticEventCtor && "file" === reactName.type)
        )
          var getTargetInstFunc = getTargetInstForChangeEvent;
        else if (isTextInputElement(reactName))
          if (isInputEventSupported)
            getTargetInstFunc = getTargetInstForInputOrChangeEvent;
          else {
            getTargetInstFunc = getTargetInstForInputEventPolyfill;
            var handleEventFunc = handleEventsForInputEventPolyfill;
          }
        else
          (SyntheticEventCtor = reactName.nodeName),
            !SyntheticEventCtor ||
            "input" !== SyntheticEventCtor.toLowerCase() ||
            ("checkbox" !== reactName.type && "radio" !== reactName.type)
              ? targetInst &&
                isCustomElement(targetInst.elementType) &&
                (getTargetInstFunc = getTargetInstForChangeEvent)
              : (getTargetInstFunc = getTargetInstForClickEvent);
        if (
          getTargetInstFunc &&
          (getTargetInstFunc = getTargetInstFunc(domEventName, targetInst))
        ) {
          createAndAccumulateChangeEvent(
            dispatchQueue,
            getTargetInstFunc,
            nativeEvent,
            nativeEventTarget
          );
          break a;
        }
        handleEventFunc && handleEventFunc(domEventName, reactName, targetInst);
        "focusout" === domEventName &&
          targetInst &&
          "number" === reactName.type &&
          null != targetInst.memoizedProps.value &&
          setDefaultValue(reactName, "number", reactName.value);
      }
      handleEventFunc = targetInst ? getNodeFromInstance(targetInst) : window;
      switch (domEventName) {
        case "focusin":
          if (
            isTextInputElement(handleEventFunc) ||
            "true" === handleEventFunc.contentEditable
          )
            (activeElement = handleEventFunc),
              (activeElementInst = targetInst),
              (lastSelection = null);
          break;
        case "focusout":
          lastSelection = activeElementInst = activeElement = null;
          break;
        case "mousedown":
          mouseDown = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          mouseDown = !1;
          constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
          break;
        case "selectionchange":
          if (skipSelectionChangeEvent) break;
        case "keydown":
        case "keyup":
          constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
      }
      var fallbackData;
      if (canUseCompositionEvent)
        b: {
          switch (domEventName) {
            case "compositionstart":
              var eventType = "onCompositionStart";
              break b;
            case "compositionend":
              eventType = "onCompositionEnd";
              break b;
            case "compositionupdate":
              eventType = "onCompositionUpdate";
              break b;
          }
          eventType = void 0;
        }
      else
        isComposing
          ? isFallbackCompositionEnd(domEventName, nativeEvent) &&
            (eventType = "onCompositionEnd")
          : "keydown" === domEventName &&
            229 === nativeEvent.keyCode &&
            (eventType = "onCompositionStart");
      eventType &&
        (useFallbackCompositionData &&
          "ko" !== nativeEvent.locale &&
          (isComposing || "onCompositionStart" !== eventType
            ? "onCompositionEnd" === eventType &&
              isComposing &&
              (fallbackData = getData())
            : ((root = nativeEventTarget),
              (startText = "value" in root ? root.value : root.textContent),
              (isComposing = !0))),
        (handleEventFunc = accumulateTwoPhaseListeners(targetInst, eventType)),
        0 < handleEventFunc.length &&
          ((eventType = new SyntheticCompositionEvent(
            eventType,
            domEventName,
            null,
            nativeEvent,
            nativeEventTarget
          )),
          dispatchQueue.push({ event: eventType, listeners: handleEventFunc }),
          fallbackData
            ? (eventType.data = fallbackData)
            : ((fallbackData = getDataFromCustomEvent(nativeEvent)),
              null !== fallbackData && (eventType.data = fallbackData))));
      if (
        (fallbackData = canUseTextInputEvent
          ? getNativeBeforeInputChars(domEventName, nativeEvent)
          : getFallbackBeforeInputChars(domEventName, nativeEvent))
      )
        (eventType = accumulateTwoPhaseListeners(targetInst, "onBeforeInput")),
          0 < eventType.length &&
            ((handleEventFunc = new SyntheticCompositionEvent(
              "onBeforeInput",
              "beforeinput",
              null,
              nativeEvent,
              nativeEventTarget
            )),
            dispatchQueue.push({
              event: handleEventFunc,
              listeners: eventType
            }),
            (handleEventFunc.data = fallbackData));
      extractEvents$1(
        dispatchQueue,
        domEventName,
        targetInst,
        nativeEvent,
        nativeEventTarget
      );
    }
    processDispatchQueue(dispatchQueue, eventSystemFlags);
  });
}
function createDispatchListener(instance, listener, currentTarget) {
  return {
    instance: instance,
    listener: listener,
    currentTarget: currentTarget
  };
}
function accumulateTwoPhaseListeners(targetFiber, reactName) {
  for (
    var captureName = reactName + "Capture", listeners = [];
    null !== targetFiber;

  ) {
    var _instance2 = targetFiber,
      stateNode = _instance2.stateNode;
    _instance2 = _instance2.tag;
    (5 !== _instance2 && 26 !== _instance2 && 27 !== _instance2) ||
      null === stateNode ||
      ((_instance2 = getListener(targetFiber, captureName)),
      null != _instance2 &&
        listeners.unshift(
          createDispatchListener(targetFiber, _instance2, stateNode)
        ),
      (_instance2 = getListener(targetFiber, reactName)),
      null != _instance2 &&
        listeners.push(
          createDispatchListener(targetFiber, _instance2, stateNode)
        ));
    if (3 === targetFiber.tag) return listeners;
    targetFiber = targetFiber.return;
  }
  return [];
}
function getParent(inst) {
  if (null === inst) return null;
  do inst = inst.return;
  while (inst && 5 !== inst.tag && 27 !== inst.tag);
  return inst ? inst : null;
}
function accumulateEnterLeaveListenersForEvent(
  dispatchQueue,
  event,
  target,
  common,
  inCapturePhase
) {
  for (
    var registrationName = event._reactName, listeners = [];
    null !== target && target !== common;

  ) {
    var _instance3 = target,
      alternate = _instance3.alternate,
      stateNode = _instance3.stateNode;
    _instance3 = _instance3.tag;
    if (null !== alternate && alternate === common) break;
    (5 !== _instance3 && 26 !== _instance3 && 27 !== _instance3) ||
      null === stateNode ||
      ((alternate = stateNode),
      inCapturePhase
        ? ((stateNode = getListener(target, registrationName)),
          null != stateNode &&
            listeners.unshift(
              createDispatchListener(target, stateNode, alternate)
            ))
        : inCapturePhase ||
          ((stateNode = getListener(target, registrationName)),
          null != stateNode &&
            listeners.push(
              createDispatchListener(target, stateNode, alternate)
            )));
    target = target.return;
  }
  0 !== listeners.length &&
    dispatchQueue.push({ event: event, listeners: listeners });
}
var NORMALIZE_NEWLINES_REGEX = /\r\n?/g,
  NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;
function normalizeMarkupForTextOrAttribute(markup) {
  return ("string" === typeof markup ? markup : "" + markup)
    .replace(NORMALIZE_NEWLINES_REGEX, "\n")
    .replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, "");
}
function checkForUnmatchedText(serverText, clientText) {
  clientText = normalizeMarkupForTextOrAttribute(clientText);
  return normalizeMarkupForTextOrAttribute(serverText) === clientText ? !0 : !1;
}
function setProp(domElement, tag, key, value, props, prevValue) {
  switch (key) {
    case "children":
      "string" === typeof value
        ? "body" === tag ||
          ("textarea" === tag && "" === value) ||
          setTextContent(domElement, value)
        : ("number" === typeof value || "bigint" === typeof value) &&
          "body" !== tag &&
          setTextContent(domElement, "" + value);
      break;
    case "className":
      setValueForKnownAttribute(domElement, "class", value);
      break;
    case "tabIndex":
      setValueForKnownAttribute(domElement, "tabindex", value);
      break;
    case "dir":
    case "role":
    case "viewBox":
    case "width":
    case "height":
      setValueForKnownAttribute(domElement, key, value);
      break;
    case "style":
      setValueForStyles(domElement, value, prevValue);
      break;
    case "data":
      if ("object" !== tag) {
        setValueForKnownAttribute(domElement, "data", value);
        break;
      }
    case "src":
    case "href":
      if ("" === value && ("a" !== tag || "href" !== key)) {
        domElement.removeAttribute(key);
        break;
      }
      if (
        null == value ||
        "function" === typeof value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      ) {
        domElement.removeAttribute(key);
        break;
      }
      value = sanitizeURL("" + value);
      domElement.setAttribute(key, value);
      break;
    case "action":
    case "formAction":
      if ("function" === typeof value) {
        domElement.setAttribute(
          key,
          "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
        );
        break;
      } else
        "function" === typeof prevValue &&
          ("formAction" === key
            ? ("input" !== tag &&
                setProp(domElement, tag, "name", props.name, props, null),
              setProp(
                domElement,
                tag,
                "formEncType",
                props.formEncType,
                props,
                null
              ),
              setProp(
                domElement,
                tag,
                "formMethod",
                props.formMethod,
                props,
                null
              ),
              setProp(
                domElement,
                tag,
                "formTarget",
                props.formTarget,
                props,
                null
              ))
            : (setProp(domElement, tag, "encType", props.encType, props, null),
              setProp(domElement, tag, "method", props.method, props, null),
              setProp(domElement, tag, "target", props.target, props, null)));
      if (
        null == value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      ) {
        domElement.removeAttribute(key);
        break;
      }
      value = sanitizeURL("" + value);
      domElement.setAttribute(key, value);
      break;
    case "onClick":
      null != value && (domElement.onclick = noop$1);
      break;
    case "onScroll":
      null != value && listenToNonDelegatedEvent("scroll", domElement);
      break;
    case "onScrollEnd":
      null != value && listenToNonDelegatedEvent("scrollend", domElement);
      break;
    case "dangerouslySetInnerHTML":
      if (null != value) {
        if ("object" !== typeof value || !("__html" in value))
          throw Error(formatProdErrorMessage(61));
        key = value.__html;
        if (null != key) {
          if (null != props.children) throw Error(formatProdErrorMessage(60));
          domElement.innerHTML = key;
        }
      }
      break;
    case "multiple":
      domElement.multiple =
        value && "function" !== typeof value && "symbol" !== typeof value;
      break;
    case "muted":
      domElement.muted =
        value && "function" !== typeof value && "symbol" !== typeof value;
      break;
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "defaultValue":
    case "defaultChecked":
    case "innerHTML":
    case "ref":
      break;
    case "autoFocus":
      break;
    case "xlinkHref":
      if (
        null == value ||
        "function" === typeof value ||
        "boolean" === typeof value ||
        "symbol" === typeof value
      ) {
        domElement.removeAttribute("xlink:href");
        break;
      }
      key = sanitizeURL("" + value);
      domElement.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        key
      );
      break;
    case "contentEditable":
    case "spellCheck":
    case "draggable":
    case "value":
    case "autoReverse":
    case "externalResourcesRequired":
    case "focusable":
    case "preserveAlpha":
      null != value && "function" !== typeof value && "symbol" !== typeof value
        ? domElement.setAttribute(key, "" + value)
        : domElement.removeAttribute(key);
      break;
    case "inert":
    case "allowFullScreen":
    case "async":
    case "autoPlay":
    case "controls":
    case "default":
    case "defer":
    case "disabled":
    case "disablePictureInPicture":
    case "disableRemotePlayback":
    case "formNoValidate":
    case "hidden":
    case "loop":
    case "noModule":
    case "noValidate":
    case "open":
    case "playsInline":
    case "readOnly":
    case "required":
    case "reversed":
    case "scoped":
    case "seamless":
    case "itemScope":
      value && "function" !== typeof value && "symbol" !== typeof value
        ? domElement.setAttribute(key, "")
        : domElement.removeAttribute(key);
      break;
    case "capture":
    case "download":
      !0 === value
        ? domElement.setAttribute(key, "")
        : !1 !== value &&
            null != value &&
            "function" !== typeof value &&
            "symbol" !== typeof value
          ? domElement.setAttribute(key, value)
          : domElement.removeAttribute(key);
      break;
    case "cols":
    case "rows":
    case "size":
    case "span":
      null != value &&
      "function" !== typeof value &&
      "symbol" !== typeof value &&
      !isNaN(value) &&
      1 <= value
        ? domElement.setAttribute(key, value)
        : domElement.removeAttribute(key);
      break;
    case "rowSpan":
    case "start":
      null == value ||
      "function" === typeof value ||
      "symbol" === typeof value ||
      isNaN(value)
        ? domElement.removeAttribute(key)
        : domElement.setAttribute(key, value);
      break;
    case "popover":
      listenToNonDelegatedEvent("beforetoggle", domElement);
      listenToNonDelegatedEvent("toggle", domElement);
      setValueForAttribute(domElement, "popover", value);
      break;
    case "xlinkActuate":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/1999/xlink",
        "xlink:actuate",
        value
      );
      break;
    case "xlinkArcrole":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/1999/xlink",
        "xlink:arcrole",
        value
      );
      break;
    case "xlinkRole":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/1999/xlink",
        "xlink:role",
        value
      );
      break;
    case "xlinkShow":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/1999/xlink",
        "xlink:show",
        value
      );
      break;
    case "xlinkTitle":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/1999/xlink",
        "xlink:title",
        value
      );
      break;
    case "xlinkType":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/1999/xlink",
        "xlink:type",
        value
      );
      break;
    case "xmlBase":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/XML/1998/namespace",
        "xml:base",
        value
      );
      break;
    case "xmlLang":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/XML/1998/namespace",
        "xml:lang",
        value
      );
      break;
    case "xmlSpace":
      setValueForNamespacedAttribute(
        domElement,
        "http://www.w3.org/XML/1998/namespace",
        "xml:space",
        value
      );
      break;
    case "is":
      setValueForAttribute(domElement, "is", value);
      break;
    case "innerText":
    case "textContent":
      break;
    default:
      if (
        !(2 < key.length) ||
        ("o" !== key[0] && "O" !== key[0]) ||
        ("n" !== key[1] && "N" !== key[1])
      )
        (key = aliases.get(key) || key),
          setValueForAttribute(domElement, key, value);
  }
}
function setPropOnCustomElement(domElement, tag, key, value, props, prevValue) {
  switch (key) {
    case "style":
      setValueForStyles(domElement, value, prevValue);
      break;
    case "dangerouslySetInnerHTML":
      if (null != value) {
        if ("object" !== typeof value || !("__html" in value))
          throw Error(formatProdErrorMessage(61));
        key = value.__html;
        if (null != key) {
          if (null != props.children) throw Error(formatProdErrorMessage(60));
          domElement.innerHTML = key;
        }
      }
      break;
    case "children":
      "string" === typeof value
        ? setTextContent(domElement, value)
        : ("number" === typeof value || "bigint" === typeof value) &&
          setTextContent(domElement, "" + value);
      break;
    case "onScroll":
      null != value && listenToNonDelegatedEvent("scroll", domElement);
      break;
    case "onScrollEnd":
      null != value && listenToNonDelegatedEvent("scrollend", domElement);
      break;
    case "onClick":
      null != value && (domElement.onclick = noop$1);
      break;
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "innerHTML":
    case "ref":
      break;
    case "innerText":
    case "textContent":
      break;
    default:
      if (!registrationNameDependencies.hasOwnProperty(key))
        a: {
          if (
            "o" === key[0] &&
            "n" === key[1] &&
            ((props = key.endsWith("Capture")),
            (tag = key.slice(2, props ? key.length - 7 : void 0)),
            (prevValue = domElement[internalPropsKey] || null),
            (prevValue = null != prevValue ? prevValue[key] : null),
            "function" === typeof prevValue &&
              domElement.removeEventListener(tag, prevValue, props),
            "function" === typeof value)
          ) {
            "function" !== typeof prevValue &&
              null !== prevValue &&
              (key in domElement
                ? (domElement[key] = null)
                : domElement.hasAttribute(key) &&
                  domElement.removeAttribute(key));
            domElement.addEventListener(tag, value, props);
            break a;
          }
          key in domElement
            ? (domElement[key] = value)
            : !0 === value
              ? domElement.setAttribute(key, "")
              : setValueForAttribute(domElement, key, value);
        }
  }
}
function setInitialProperties(domElement, tag, props) {
  switch (tag) {
    case "div":
    case "span":
    case "svg":
    case "path":
    case "a":
    case "g":
    case "p":
    case "li":
      break;
    case "img":
      listenToNonDelegatedEvent("error", domElement);
      listenToNonDelegatedEvent("load", domElement);
      var hasSrc = !1,
        hasSrcSet = !1,
        propKey;
      for (propKey in props)
        if (props.hasOwnProperty(propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "src":
                hasSrc = !0;
                break;
              case "srcSet":
                hasSrcSet = !0;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(137, tag));
              default:
                setProp(domElement, tag, propKey, propValue, props, null);
            }
        }
      hasSrcSet &&
        setProp(domElement, tag, "srcSet", props.srcSet, props, null);
      hasSrc && setProp(domElement, tag, "src", props.src, props, null);
      return;
    case "input":
      listenToNonDelegatedEvent("invalid", domElement);
      var defaultValue = (propKey = propValue = hasSrcSet = null),
        checked = null,
        defaultChecked = null;
      for (hasSrc in props)
        if (props.hasOwnProperty(hasSrc)) {
          var propValue$184 = props[hasSrc];
          if (null != propValue$184)
            switch (hasSrc) {
              case "name":
                hasSrcSet = propValue$184;
                break;
              case "type":
                propValue = propValue$184;
                break;
              case "checked":
                checked = propValue$184;
                break;
              case "defaultChecked":
                defaultChecked = propValue$184;
                break;
              case "value":
                propKey = propValue$184;
                break;
              case "defaultValue":
                defaultValue = propValue$184;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (null != propValue$184)
                  throw Error(formatProdErrorMessage(137, tag));
                break;
              default:
                setProp(domElement, tag, hasSrc, propValue$184, props, null);
            }
        }
      initInput(
        domElement,
        propKey,
        defaultValue,
        checked,
        defaultChecked,
        propValue,
        hasSrcSet,
        !1
      );
      return;
    case "select":
      listenToNonDelegatedEvent("invalid", domElement);
      hasSrc = propValue = propKey = null;
      for (hasSrcSet in props)
        if (
          props.hasOwnProperty(hasSrcSet) &&
          ((defaultValue = props[hasSrcSet]), null != defaultValue)
        )
          switch (hasSrcSet) {
            case "value":
              propKey = defaultValue;
              break;
            case "defaultValue":
              propValue = defaultValue;
              break;
            case "multiple":
              hasSrc = defaultValue;
            default:
              setProp(domElement, tag, hasSrcSet, defaultValue, props, null);
          }
      tag = propKey;
      props = propValue;
      domElement.multiple = !!hasSrc;
      null != tag
        ? updateOptions(domElement, !!hasSrc, tag, !1)
        : null != props && updateOptions(domElement, !!hasSrc, props, !0);
      return;
    case "textarea":
      listenToNonDelegatedEvent("invalid", domElement);
      propKey = hasSrcSet = hasSrc = null;
      for (propValue in props)
        if (
          props.hasOwnProperty(propValue) &&
          ((defaultValue = props[propValue]), null != defaultValue)
        )
          switch (propValue) {
            case "value":
              hasSrc = defaultValue;
              break;
            case "defaultValue":
              hasSrcSet = defaultValue;
              break;
            case "children":
              propKey = defaultValue;
              break;
            case "dangerouslySetInnerHTML":
              if (null != defaultValue) throw Error(formatProdErrorMessage(91));
              break;
            default:
              setProp(domElement, tag, propValue, defaultValue, props, null);
          }
      initTextarea(domElement, hasSrc, hasSrcSet, propKey);
      return;
    case "option":
      for (checked in props)
        if (
          props.hasOwnProperty(checked) &&
          ((hasSrc = props[checked]), null != hasSrc)
        )
          switch (checked) {
            case "selected":
              domElement.selected =
                hasSrc &&
                "function" !== typeof hasSrc &&
                "symbol" !== typeof hasSrc;
              break;
            default:
              setProp(domElement, tag, checked, hasSrc, props, null);
          }
      return;
    case "dialog":
      listenToNonDelegatedEvent("beforetoggle", domElement);
      listenToNonDelegatedEvent("toggle", domElement);
      listenToNonDelegatedEvent("cancel", domElement);
      listenToNonDelegatedEvent("close", domElement);
      break;
    case "iframe":
    case "object":
      listenToNonDelegatedEvent("load", domElement);
      break;
    case "video":
    case "audio":
      for (hasSrc = 0; hasSrc < mediaEventTypes.length; hasSrc++)
        listenToNonDelegatedEvent(mediaEventTypes[hasSrc], domElement);
      break;
    case "image":
      listenToNonDelegatedEvent("error", domElement);
      listenToNonDelegatedEvent("load", domElement);
      break;
    case "details":
      listenToNonDelegatedEvent("toggle", domElement);
      break;
    case "embed":
    case "source":
    case "link":
      listenToNonDelegatedEvent("error", domElement),
        listenToNonDelegatedEvent("load", domElement);
    case "area":
    case "base":
    case "br":
    case "col":
    case "hr":
    case "keygen":
    case "meta":
    case "param":
    case "track":
    case "wbr":
    case "menuitem":
      for (defaultChecked in props)
        if (
          props.hasOwnProperty(defaultChecked) &&
          ((hasSrc = props[defaultChecked]), null != hasSrc)
        )
          switch (defaultChecked) {
            case "children":
            case "dangerouslySetInnerHTML":
              throw Error(formatProdErrorMessage(137, tag));
            default:
              setProp(domElement, tag, defaultChecked, hasSrc, props, null);
          }
      return;
    default:
      if (isCustomElement(tag)) {
        for (propValue$184 in props)
          props.hasOwnProperty(propValue$184) &&
            ((hasSrc = props[propValue$184]),
            void 0 !== hasSrc &&
              setPropOnCustomElement(
                domElement,
                tag,
                propValue$184,
                hasSrc,
                props,
                void 0
              ));
        return;
      }
  }
  for (defaultValue in props)
    props.hasOwnProperty(defaultValue) &&
      ((hasSrc = props[defaultValue]),
      null != hasSrc &&
        setProp(domElement, tag, defaultValue, hasSrc, props, null));
}
function updateProperties(domElement, tag, lastProps, nextProps) {
  switch (tag) {
    case "div":
    case "span":
    case "svg":
    case "path":
    case "a":
    case "g":
    case "p":
    case "li":
      break;
    case "input":
      var name = null,
        type = null,
        value = null,
        defaultValue = null,
        lastDefaultValue = null,
        checked = null,
        defaultChecked = null;
      for (propKey in lastProps) {
        var lastProp = lastProps[propKey];
        if (lastProps.hasOwnProperty(propKey) && null != lastProp)
          switch (propKey) {
            case "checked":
              break;
            case "value":
              break;
            case "defaultValue":
              lastDefaultValue = lastProp;
            default:
              nextProps.hasOwnProperty(propKey) ||
                setProp(domElement, tag, propKey, null, nextProps, lastProp);
          }
      }
      for (var propKey$201 in nextProps) {
        var propKey = nextProps[propKey$201];
        lastProp = lastProps[propKey$201];
        if (
          nextProps.hasOwnProperty(propKey$201) &&
          (null != propKey || null != lastProp)
        )
          switch (propKey$201) {
            case "type":
              type = propKey;
              break;
            case "name":
              name = propKey;
              break;
            case "checked":
              checked = propKey;
              break;
            case "defaultChecked":
              defaultChecked = propKey;
              break;
            case "value":
              value = propKey;
              break;
            case "defaultValue":
              defaultValue = propKey;
              break;
            case "children":
            case "dangerouslySetInnerHTML":
              if (null != propKey)
                throw Error(formatProdErrorMessage(137, tag));
              break;
            default:
              propKey !== lastProp &&
                setProp(
                  domElement,
                  tag,
                  propKey$201,
                  propKey,
                  nextProps,
                  lastProp
                );
          }
      }
      updateInput(
        domElement,
        value,
        defaultValue,
        lastDefaultValue,
        checked,
        defaultChecked,
        type,
        name
      );
      return;
    case "select":
      propKey = value = defaultValue = propKey$201 = null;
      for (type in lastProps)
        if (
          ((lastDefaultValue = lastProps[type]),
          lastProps.hasOwnProperty(type) && null != lastDefaultValue)
        )
          switch (type) {
            case "value":
              break;
            case "multiple":
              propKey = lastDefaultValue;
            default:
              nextProps.hasOwnProperty(type) ||
                setProp(
                  domElement,
                  tag,
                  type,
                  null,
                  nextProps,
                  lastDefaultValue
                );
          }
      for (name in nextProps)
        if (
          ((type = nextProps[name]),
          (lastDefaultValue = lastProps[name]),
          nextProps.hasOwnProperty(name) &&
            (null != type || null != lastDefaultValue))
        )
          switch (name) {
            case "value":
              propKey$201 = type;
              break;
            case "defaultValue":
              defaultValue = type;
              break;
            case "multiple":
              value = type;
            default:
              type !== lastDefaultValue &&
                setProp(
                  domElement,
                  tag,
                  name,
                  type,
                  nextProps,
                  lastDefaultValue
                );
          }
      tag = defaultValue;
      lastProps = value;
      nextProps = propKey;
      null != propKey$201
        ? updateOptions(domElement, !!lastProps, propKey$201, !1)
        : !!nextProps !== !!lastProps &&
          (null != tag
            ? updateOptions(domElement, !!lastProps, tag, !0)
            : updateOptions(domElement, !!lastProps, lastProps ? [] : "", !1));
      return;
    case "textarea":
      propKey = propKey$201 = null;
      for (defaultValue in lastProps)
        if (
          ((name = lastProps[defaultValue]),
          lastProps.hasOwnProperty(defaultValue) &&
            null != name &&
            !nextProps.hasOwnProperty(defaultValue))
        )
          switch (defaultValue) {
            case "value":
              break;
            case "children":
              break;
            default:
              setProp(domElement, tag, defaultValue, null, nextProps, name);
          }
      for (value in nextProps)
        if (
          ((name = nextProps[value]),
          (type = lastProps[value]),
          nextProps.hasOwnProperty(value) && (null != name || null != type))
        )
          switch (value) {
            case "value":
              propKey$201 = name;
              break;
            case "defaultValue":
              propKey = name;
              break;
            case "children":
              break;
            case "dangerouslySetInnerHTML":
              if (null != name) throw Error(formatProdErrorMessage(91));
              break;
            default:
              name !== type &&
                setProp(domElement, tag, value, name, nextProps, type);
          }
      updateTextarea(domElement, propKey$201, propKey);
      return;
    case "option":
      for (var propKey$217 in lastProps)
        if (
          ((propKey$201 = lastProps[propKey$217]),
          lastProps.hasOwnProperty(propKey$217) &&
            null != propKey$201 &&
            !nextProps.hasOwnProperty(propKey$217))
        )
          switch (propKey$217) {
            case "selected":
              domElement.selected = !1;
              break;
            default:
              setProp(
                domElement,
                tag,
                propKey$217,
                null,
                nextProps,
                propKey$201
              );
          }
      for (lastDefaultValue in nextProps)
        if (
          ((propKey$201 = nextProps[lastDefaultValue]),
          (propKey = lastProps[lastDefaultValue]),
          nextProps.hasOwnProperty(lastDefaultValue) &&
            propKey$201 !== propKey &&
            (null != propKey$201 || null != propKey))
        )
          switch (lastDefaultValue) {
            case "selected":
              domElement.selected =
                propKey$201 &&
                "function" !== typeof propKey$201 &&
                "symbol" !== typeof propKey$201;
              break;
            default:
              setProp(
                domElement,
                tag,
                lastDefaultValue,
                propKey$201,
                nextProps,
                propKey
              );
          }
      return;
    case "img":
    case "link":
    case "area":
    case "base":
    case "br":
    case "col":
    case "embed":
    case "hr":
    case "keygen":
    case "meta":
    case "param":
    case "source":
    case "track":
    case "wbr":
    case "menuitem":
      for (var propKey$222 in lastProps)
        (propKey$201 = lastProps[propKey$222]),
          lastProps.hasOwnProperty(propKey$222) &&
            null != propKey$201 &&
            !nextProps.hasOwnProperty(propKey$222) &&
            setProp(domElement, tag, propKey$222, null, nextProps, propKey$201);
      for (checked in nextProps)
        if (
          ((propKey$201 = nextProps[checked]),
          (propKey = lastProps[checked]),
          nextProps.hasOwnProperty(checked) &&
            propKey$201 !== propKey &&
            (null != propKey$201 || null != propKey))
        )
          switch (checked) {
            case "children":
            case "dangerouslySetInnerHTML":
              if (null != propKey$201)
                throw Error(formatProdErrorMessage(137, tag));
              break;
            default:
              setProp(
                domElement,
                tag,
                checked,
                propKey$201,
                nextProps,
                propKey
              );
          }
      return;
    default:
      if (isCustomElement(tag)) {
        for (var propKey$227 in lastProps)
          (propKey$201 = lastProps[propKey$227]),
            lastProps.hasOwnProperty(propKey$227) &&
              void 0 !== propKey$201 &&
              !nextProps.hasOwnProperty(propKey$227) &&
              setPropOnCustomElement(
                domElement,
                tag,
                propKey$227,
                void 0,
                nextProps,
                propKey$201
              );
        for (defaultChecked in nextProps)
          (propKey$201 = nextProps[defaultChecked]),
            (propKey = lastProps[defaultChecked]),
            !nextProps.hasOwnProperty(defaultChecked) ||
              propKey$201 === propKey ||
              (void 0 === propKey$201 && void 0 === propKey) ||
              setPropOnCustomElement(
                domElement,
                tag,
                defaultChecked,
                propKey$201,
                nextProps,
                propKey
              );
        return;
      }
  }
  for (var propKey$232 in lastProps)
    (propKey$201 = lastProps[propKey$232]),
      lastProps.hasOwnProperty(propKey$232) &&
        null != propKey$201 &&
        !nextProps.hasOwnProperty(propKey$232) &&
        setProp(domElement, tag, propKey$232, null, nextProps, propKey$201);
  for (lastProp in nextProps)
    (propKey$201 = nextProps[lastProp]),
      (propKey = lastProps[lastProp]),
      !nextProps.hasOwnProperty(lastProp) ||
        propKey$201 === propKey ||
        (null == propKey$201 && null == propKey) ||
        setProp(domElement, tag, lastProp, propKey$201, nextProps, propKey);
}
function isLikelyStaticResource(initiatorType) {
  switch (initiatorType) {
    case "css":
    case "script":
    case "font":
    case "img":
    case "image":
    case "input":
    case "link":
      return !0;
    default:
      return !1;
  }
}
function estimateBandwidth() {
  if ("function" === typeof performance.getEntriesByType) {
    for (
      var count = 0,
        bits = 0,
        resourceEntries = performance.getEntriesByType("resource"),
        i = 0;
      i < resourceEntries.length;
      i++
    ) {
      var entry = resourceEntries[i],
        transferSize = entry.transferSize,
        initiatorType = entry.initiatorType,
        duration = entry.duration;
      if (transferSize && duration && isLikelyStaticResource(initiatorType)) {
        initiatorType = 0;
        duration = entry.responseEnd;
        for (i += 1; i < resourceEntries.length; i++) {
          var overlapEntry = resourceEntries[i],
            overlapStartTime = overlapEntry.startTime;
          if (overlapStartTime > duration) break;
          var overlapTransferSize = overlapEntry.transferSize,
            overlapInitiatorType = overlapEntry.initiatorType;
          overlapTransferSize &&
            isLikelyStaticResource(overlapInitiatorType) &&
            ((overlapEntry = overlapEntry.responseEnd),
            (initiatorType +=
              overlapTransferSize *
              (overlapEntry < duration
                ? 1
                : (duration - overlapStartTime) /
                  (overlapEntry - overlapStartTime))));
        }
        --i;
        bits += (8 * (transferSize + initiatorType)) / (entry.duration / 1e3);
        count++;
        if (10 < count) break;
      }
    }
    if (0 < count) return bits / count / 1e6;
  }
  return navigator.connection &&
    ((count = navigator.connection.downlink), "number" === typeof count)
    ? count
    : 5;
}
var eventsEnabled = null,
  selectionInformation = null;
function getOwnerDocumentFromRootContainer(rootContainerElement) {
  return 9 === rootContainerElement.nodeType
    ? rootContainerElement
    : rootContainerElement.ownerDocument;
}
function getOwnHostContext(namespaceURI) {
  switch (namespaceURI) {
    case "http://www.w3.org/2000/svg":
      return 1;
    case "http://www.w3.org/1998/Math/MathML":
      return 2;
    default:
      return 0;
  }
}
function getChildHostContextProd(parentNamespace, type) {
  if (0 === parentNamespace)
    switch (type) {
      case "svg":
        return 1;
      case "math":
        return 2;
      default:
        return 0;
    }
  return 1 === parentNamespace && "foreignObject" === type
    ? 0
    : parentNamespace;
}
function shouldSetTextContent(type, props) {
  return (
    "textarea" === type ||
    "noscript" === type ||
    "string" === typeof props.children ||
    "number" === typeof props.children ||
    "bigint" === typeof props.children ||
    ("object" === typeof props.dangerouslySetInnerHTML &&
      null !== props.dangerouslySetInnerHTML &&
      null != props.dangerouslySetInnerHTML.__html)
  );
}
var currentPopstateTransitionEvent = null;
function shouldAttemptEagerTransition() {
  var event = window.event;
  if (event && "popstate" === event.type) {
    if (event === currentPopstateTransitionEvent) return !1;
    currentPopstateTransitionEvent = event;
    return !0;
  }
  currentPopstateTransitionEvent = null;
  return !1;
}
var scheduleTimeout = "function" === typeof setTimeout ? setTimeout : void 0,
  cancelTimeout = "function" === typeof clearTimeout ? clearTimeout : void 0,
  localPromise = "function" === typeof Promise ? Promise : void 0,
  scheduleMicrotask =
    "function" === typeof queueMicrotask
      ? queueMicrotask
      : "undefined" !== typeof localPromise
        ? function (callback) {
            return localPromise
              .resolve(null)
              .then(callback)
              .catch(handleErrorInNextTick);
          }
        : scheduleTimeout;
function handleErrorInNextTick(error) {
  setTimeout(function () {
    throw error;
  });
}
function isSingletonScope(type) {
  return "head" === type;
}
function clearHydrationBoundary(parentInstance, hydrationInstance) {
  var node = hydrationInstance,
    depth = 0;
  do {
    var nextNode = node.nextSibling;
    parentInstance.removeChild(node);
    if (nextNode && 8 === nextNode.nodeType)
      if (((node = nextNode.data), "/$" === node || "/&" === node)) {
        if (0 === depth) {
          parentInstance.removeChild(nextNode);
          retryIfBlockedOn(hydrationInstance);
          return;
        }
        depth--;
      } else if (
        "$" === node ||
        "$?" === node ||
        "$~" === node ||
        "$!" === node ||
        "&" === node
      )
        depth++;
      else if ("html" === node)
        releaseSingletonInstance(parentInstance.ownerDocument.documentElement);
      else if ("head" === node) {
        node = parentInstance.ownerDocument.head;
        releaseSingletonInstance(node);
        for (var node$jscomp$0 = node.firstChild; node$jscomp$0; ) {
          var nextNode$jscomp$0 = node$jscomp$0.nextSibling,
            nodeName = node$jscomp$0.nodeName;
          node$jscomp$0[internalHoistableMarker] ||
            "SCRIPT" === nodeName ||
            "STYLE" === nodeName ||
            ("LINK" === nodeName &&
              "stylesheet" === node$jscomp$0.rel.toLowerCase()) ||
            node.removeChild(node$jscomp$0);
          node$jscomp$0 = nextNode$jscomp$0;
        }
      } else
        "body" === node &&
          releaseSingletonInstance(parentInstance.ownerDocument.body);
    node = nextNode;
  } while (node);
  retryIfBlockedOn(hydrationInstance);
}
function hideOrUnhideDehydratedBoundary(suspenseInstance, isHidden) {
  var node = suspenseInstance;
  suspenseInstance = 0;
  do {
    var nextNode = node.nextSibling;
    1 === node.nodeType
      ? isHidden
        ? ((node._stashedDisplay = node.style.display),
          (node.style.display = "none"))
        : ((node.style.display = node._stashedDisplay || ""),
          "" === node.getAttribute("style") && node.removeAttribute("style"))
      : 3 === node.nodeType &&
        (isHidden
          ? ((node._stashedText = node.nodeValue), (node.nodeValue = ""))
          : (node.nodeValue = node._stashedText || ""));
    if (nextNode && 8 === nextNode.nodeType)
      if (((node = nextNode.data), "/$" === node))
        if (0 === suspenseInstance) break;
        else suspenseInstance--;
      else
        ("$" !== node && "$?" !== node && "$~" !== node && "$!" !== node) ||
          suspenseInstance++;
    node = nextNode;
  } while (node);
}
function clearContainerSparingly(container) {
  var nextNode = container.firstChild;
  nextNode && 10 === nextNode.nodeType && (nextNode = nextNode.nextSibling);
  for (; nextNode; ) {
    var node = nextNode;
    nextNode = nextNode.nextSibling;
    switch (node.nodeName) {
      case "HTML":
      case "HEAD":
      case "BODY":
        clearContainerSparingly(node);
        detachDeletedInstance(node);
        continue;
      case "SCRIPT":
      case "STYLE":
        continue;
      case "LINK":
        if ("stylesheet" === node.rel.toLowerCase()) continue;
    }
    container.removeChild(node);
  }
}
function canHydrateInstance(instance, type, props, inRootOrSingleton) {
  for (; 1 === instance.nodeType; ) {
    var anyProps = props;
    if (instance.nodeName.toLowerCase() !== type.toLowerCase()) {
      if (
        !inRootOrSingleton &&
        ("INPUT" !== instance.nodeName || "hidden" !== instance.type)
      )
        break;
    } else if (!inRootOrSingleton)
      if ("input" === type && "hidden" === instance.type) {
        var name = null == anyProps.name ? null : "" + anyProps.name;
        if (
          "hidden" === anyProps.type &&
          instance.getAttribute("name") === name
        )
          return instance;
      } else return instance;
    else if (!instance[internalHoistableMarker])
      switch (type) {
        case "meta":
          if (!instance.hasAttribute("itemprop")) break;
          return instance;
        case "link":
          name = instance.getAttribute("rel");
          if ("stylesheet" === name && instance.hasAttribute("data-precedence"))
            break;
          else if (
            name !== anyProps.rel ||
            instance.getAttribute("href") !==
              (null == anyProps.href || "" === anyProps.href
                ? null
                : anyProps.href) ||
            instance.getAttribute("crossorigin") !==
              (null == anyProps.crossOrigin ? null : anyProps.crossOrigin) ||
            instance.getAttribute("title") !==
              (null == anyProps.title ? null : anyProps.title)
          )
            break;
          return instance;
        case "style":
          if (instance.hasAttribute("data-precedence")) break;
          return instance;
        case "script":
          name = instance.getAttribute("src");
          if (
            (name !== (null == anyProps.src ? null : anyProps.src) ||
              instance.getAttribute("type") !==
                (null == anyProps.type ? null : anyProps.type) ||
              instance.getAttribute("crossorigin") !==
                (null == anyProps.crossOrigin ? null : anyProps.crossOrigin)) &&
            name &&
            instance.hasAttribute("async") &&
            !instance.hasAttribute("itemprop")
          )
            break;
          return instance;
        default:
          return instance;
      }
    instance = getNextHydratable(instance.nextSibling);
    if (null === instance) break;
  }
  return null;
}
function canHydrateTextInstance(instance, text, inRootOrSingleton) {
  if ("" === text) return null;
  for (; 3 !== instance.nodeType; ) {
    if (
      (1 !== instance.nodeType ||
        "INPUT" !== instance.nodeName ||
        "hidden" !== instance.type) &&
      !inRootOrSingleton
    )
      return null;
    instance = getNextHydratable(instance.nextSibling);
    if (null === instance) return null;
  }
  return instance;
}
function canHydrateHydrationBoundary(instance, inRootOrSingleton) {
  for (; 8 !== instance.nodeType; ) {
    if (
      (1 !== instance.nodeType ||
        "INPUT" !== instance.nodeName ||
        "hidden" !== instance.type) &&
      !inRootOrSingleton
    )
      return null;
    instance = getNextHydratable(instance.nextSibling);
    if (null === instance) return null;
  }
  return instance;
}
function isSuspenseInstancePending(instance) {
  return "$?" === instance.data || "$~" === instance.data;
}
function isSuspenseInstanceFallback(instance) {
  return (
    "$!" === instance.data ||
    ("$?" === instance.data && "loading" !== instance.ownerDocument.readyState)
  );
}
function registerSuspenseInstanceRetry(instance, callback) {
  var ownerDocument = instance.ownerDocument;
  if ("$~" === instance.data) instance._reactRetry = callback;
  else if ("$?" !== instance.data || "loading" !== ownerDocument.readyState)
    callback();
  else {
    var listener = function () {
      callback();
      ownerDocument.removeEventListener("DOMContentLoaded", listener);
    };
    ownerDocument.addEventListener("DOMContentLoaded", listener);
    instance._reactRetry = listener;
  }
}
function getNextHydratable(node) {
  for (; null != node; node = node.nextSibling) {
    var nodeType = node.nodeType;
    if (1 === nodeType || 3 === nodeType) break;
    if (8 === nodeType) {
      nodeType = node.data;
      if (
        "$" === nodeType ||
        "$!" === nodeType ||
        "$?" === nodeType ||
        "$~" === nodeType ||
        "&" === nodeType ||
        "F!" === nodeType ||
        "F" === nodeType
      )
        break;
      if ("/$" === nodeType || "/&" === nodeType) return null;
    }
  }
  return node;
}
var previousHydratableOnEnteringScopedSingleton = null;
function getNextHydratableInstanceAfterHydrationBoundary(hydrationInstance) {
  hydrationInstance = hydrationInstance.nextSibling;
  for (var depth = 0; hydrationInstance; ) {
    if (8 === hydrationInstance.nodeType) {
      var data = hydrationInstance.data;
      if ("/$" === data || "/&" === data) {
        if (0 === depth)
          return getNextHydratable(hydrationInstance.nextSibling);
        depth--;
      } else
        ("$" !== data &&
          "$!" !== data &&
          "$?" !== data &&
          "$~" !== data &&
          "&" !== data) ||
          depth++;
    }
    hydrationInstance = hydrationInstance.nextSibling;
  }
  return null;
}
function getParentHydrationBoundary(targetInstance) {
  targetInstance = targetInstance.previousSibling;
  for (var depth = 0; targetInstance; ) {
    if (8 === targetInstance.nodeType) {
      var data = targetInstance.data;
      if (
        "$" === data ||
        "$!" === data ||
        "$?" === data ||
        "$~" === data ||
        "&" === data
      ) {
        if (0 === depth) return targetInstance;
        depth--;
      } else ("/$" !== data && "/&" !== data) || depth++;
    }
    targetInstance = targetInstance.previousSibling;
  }
  return null;
}
function resolveSingletonInstance(type, props, rootContainerInstance) {
  props = getOwnerDocumentFromRootContainer(rootContainerInstance);
  switch (type) {
    case "html":
      type = props.documentElement;
      if (!type) throw Error(formatProdErrorMessage(452));
      return type;
    case "head":
      type = props.head;
      if (!type) throw Error(formatProdErrorMessage(453));
      return type;
    case "body":
      type = props.body;
      if (!type) throw Error(formatProdErrorMessage(454));
      return type;
    default:
      throw Error(formatProdErrorMessage(451));
  }
}
function releaseSingletonInstance(instance) {
  for (var attributes = instance.attributes; attributes.length; )
    instance.removeAttributeNode(attributes[0]);
  detachDeletedInstance(instance);
}
var preloadPropsMap = new Map(),
  preconnectsSet = new Set();
function getHoistableRoot(container) {
  return "function" === typeof container.getRootNode
    ? container.getRootNode()
    : 9 === container.nodeType
      ? container
      : container.ownerDocument;
}
var previousDispatcher = ReactDOMSharedInternals.d;
ReactDOMSharedInternals.d = {
  f: flushSyncWork,
  r: requestFormReset,
  D: prefetchDNS,
  C: preconnect,
  L: preload,
  m: preloadModule,
  X: preinitScript,
  S: preinitStyle,
  M: preinitModuleScript
};
function flushSyncWork() {
  var previousWasRendering = previousDispatcher.f(),
    wasRendering = flushSyncWork$1();
  return previousWasRendering || wasRendering;
}
function requestFormReset(form) {
  var formInst = getInstanceFromNode(form);
  null !== formInst && 5 === formInst.tag && "form" === formInst.type
    ? requestFormReset$1(formInst)
    : previousDispatcher.r(form);
}
var globalDocument = "undefined" === typeof document ? null : document;
function preconnectAs(rel, href, crossOrigin) {
  var ownerDocument = globalDocument;
  if (ownerDocument && "string" === typeof href && href) {
    var limitedEscapedHref =
      escapeSelectorAttributeValueInsideDoubleQuotes(href);
    limitedEscapedHref =
      'link[rel="' + rel + '"][href="' + limitedEscapedHref + '"]';
    "string" === typeof crossOrigin &&
      (limitedEscapedHref += '[crossorigin="' + crossOrigin + '"]');
    preconnectsSet.has(limitedEscapedHref) ||
      (preconnectsSet.add(limitedEscapedHref),
      (rel = { rel: rel, crossOrigin: crossOrigin, href: href }),
      null === ownerDocument.querySelector(limitedEscapedHref) &&
        ((href = ownerDocument.createElement("link")),
        setInitialProperties(href, "link", rel),
        markNodeAsHoistable(href),
        ownerDocument.head.appendChild(href)));
  }
}
function prefetchDNS(href) {
  previousDispatcher.D(href);
  preconnectAs("dns-prefetch", href, null);
}
function preconnect(href, crossOrigin) {
  previousDispatcher.C(href, crossOrigin);
  preconnectAs("preconnect", href, crossOrigin);
}
function preload(href, as, options) {
  previousDispatcher.L(href, as, options);
  var ownerDocument = globalDocument;
  if (ownerDocument && href && as) {
    var preloadSelector =
      'link[rel="preload"][as="' +
      escapeSelectorAttributeValueInsideDoubleQuotes(as) +
      '"]';
    "image" === as
      ? options && options.imageSrcSet
        ? ((preloadSelector +=
            '[imagesrcset="' +
            escapeSelectorAttributeValueInsideDoubleQuotes(
              options.imageSrcSet
            ) +
            '"]'),
          "string" === typeof options.imageSizes &&
            (preloadSelector +=
              '[imagesizes="' +
              escapeSelectorAttributeValueInsideDoubleQuotes(
                options.imageSizes
              ) +
              '"]'))
        : (preloadSelector +=
            '[href="' +
            escapeSelectorAttributeValueInsideDoubleQuotes(href) +
            '"]')
      : (preloadSelector +=
          '[href="' +
          escapeSelectorAttributeValueInsideDoubleQuotes(href) +
          '"]');
    var key = preloadSelector;
    switch (as) {
      case "style":
        key = getStyleKey(href);
        break;
      case "script":
        key = getScriptKey(href);
    }
    preloadPropsMap.has(key) ||
      ((href = assign(
        {
          rel: "preload",
          href:
            "image" === as && options && options.imageSrcSet ? void 0 : href,
          as: as
        },
        options
      )),
      preloadPropsMap.set(key, href),
      null !== ownerDocument.querySelector(preloadSelector) ||
        ("style" === as &&
          ownerDocument.querySelector(getStylesheetSelectorFromKey(key))) ||
        ("script" === as &&
          ownerDocument.querySelector(getScriptSelectorFromKey(key))) ||
        ((as = ownerDocument.createElement("link")),
        setInitialProperties(as, "link", href),
        markNodeAsHoistable(as),
        ownerDocument.head.appendChild(as)));
  }
}
function preloadModule(href, options) {
  previousDispatcher.m(href, options);
  var ownerDocument = globalDocument;
  if (ownerDocument && href) {
    var as = options && "string" === typeof options.as ? options.as : "script",
      preloadSelector =
        'link[rel="modulepreload"][as="' +
        escapeSelectorAttributeValueInsideDoubleQuotes(as) +
        '"][href="' +
        escapeSelectorAttributeValueInsideDoubleQuotes(href) +
        '"]',
      key = preloadSelector;
    switch (as) {
      case "audioworklet":
      case "paintworklet":
      case "serviceworker":
      case "sharedworker":
      case "worker":
      case "script":
        key = getScriptKey(href);
    }
    if (
      !preloadPropsMap.has(key) &&
      ((href = assign({ rel: "modulepreload", href: href }, options)),
      preloadPropsMap.set(key, href),
      null === ownerDocument.querySelector(preloadSelector))
    ) {
      switch (as) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          if (ownerDocument.querySelector(getScriptSelectorFromKey(key)))
            return;
      }
      as = ownerDocument.createElement("link");
      setInitialProperties(as, "link", href);
      markNodeAsHoistable(as);
      ownerDocument.head.appendChild(as);
    }
  }
}
function preinitStyle(href, precedence, options) {
  previousDispatcher.S(href, precedence, options);
  var ownerDocument = globalDocument;
  if (ownerDocument && href) {
    var styles = getResourcesFromRoot(ownerDocument).hoistableStyles,
      key = getStyleKey(href);
    precedence = precedence || "default";
    var resource = styles.get(key);
    if (!resource) {
      var state = { loading: 0, preload: null };
      if (
        (resource = ownerDocument.querySelector(
          getStylesheetSelectorFromKey(key)
        ))
      )
        state.loading = 5;
      else {
        href = assign(
          { rel: "stylesheet", href: href, "data-precedence": precedence },
          options
        );
        (options = preloadPropsMap.get(key)) &&
          adoptPreloadPropsForStylesheet(href, options);
        var link = (resource = ownerDocument.createElement("link"));
        markNodeAsHoistable(link);
        setInitialProperties(link, "link", href);
        link._p = new Promise(function (resolve, reject) {
          link.onload = resolve;
          link.onerror = reject;
        });
        link.addEventListener("load", function () {
          state.loading |= 1;
        });
        link.addEventListener("error", function () {
          state.loading |= 2;
        });
        state.loading |= 4;
        insertStylesheet(resource, precedence, ownerDocument);
      }
      resource = {
        type: "stylesheet",
        instance: resource,
        count: 1,
        state: state
      };
      styles.set(key, resource);
    }
  }
}
function preinitScript(src, options) {
  previousDispatcher.X(src, options);
  var ownerDocument = globalDocument;
  if (ownerDocument && src) {
    var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts,
      key = getScriptKey(src),
      resource = scripts.get(key);
    resource ||
      ((resource = ownerDocument.querySelector(getScriptSelectorFromKey(key))),
      resource ||
        ((src = assign({ src: src, async: !0 }, options)),
        (options = preloadPropsMap.get(key)) &&
          adoptPreloadPropsForScript(src, options),
        (resource = ownerDocument.createElement("script")),
        markNodeAsHoistable(resource),
        setInitialProperties(resource, "link", src),
        ownerDocument.head.appendChild(resource)),
      (resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }),
      scripts.set(key, resource));
  }
}
function preinitModuleScript(src, options) {
  previousDispatcher.M(src, options);
  var ownerDocument = globalDocument;
  if (ownerDocument && src) {
    var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts,
      key = getScriptKey(src),
      resource = scripts.get(key);
    resource ||
      ((resource = ownerDocument.querySelector(getScriptSelectorFromKey(key))),
      resource ||
        ((src = assign({ src: src, async: !0, type: "module" }, options)),
        (options = preloadPropsMap.get(key)) &&
          adoptPreloadPropsForScript(src, options),
        (resource = ownerDocument.createElement("script")),
        markNodeAsHoistable(resource),
        setInitialProperties(resource, "link", src),
        ownerDocument.head.appendChild(resource)),
      (resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }),
      scripts.set(key, resource));
  }
}
function getResource(type, currentProps, pendingProps, currentResource) {
  var JSCompiler_inline_result = (JSCompiler_inline_result =
    rootInstanceStackCursor.current)
    ? getHoistableRoot(JSCompiler_inline_result)
    : null;
  if (!JSCompiler_inline_result) throw Error(formatProdErrorMessage(446));
  switch (type) {
    case "meta":
    case "title":
      return null;
    case "style":
      return "string" === typeof pendingProps.precedence &&
        "string" === typeof pendingProps.href
        ? ((currentProps = getStyleKey(pendingProps.href)),
          (pendingProps = getResourcesFromRoot(
            JSCompiler_inline_result
          ).hoistableStyles),
          (currentResource = pendingProps.get(currentProps)),
          currentResource ||
            ((currentResource = {
              type: "style",
              instance: null,
              count: 0,
              state: null
            }),
            pendingProps.set(currentProps, currentResource)),
          currentResource)
        : { type: "void", instance: null, count: 0, state: null };
    case "link":
      if (
        "stylesheet" === pendingProps.rel &&
        "string" === typeof pendingProps.href &&
        "string" === typeof pendingProps.precedence
      ) {
        type = getStyleKey(pendingProps.href);
        var styles$243 = getResourcesFromRoot(
            JSCompiler_inline_result
          ).hoistableStyles,
          resource$244 = styles$243.get(type);
        resource$244 ||
          ((JSCompiler_inline_result =
            JSCompiler_inline_result.ownerDocument || JSCompiler_inline_result),
          (resource$244 = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }),
          styles$243.set(type, resource$244),
          (styles$243 = JSCompiler_inline_result.querySelector(
            getStylesheetSelectorFromKey(type)
          )) &&
            !styles$243._p &&
            ((resource$244.instance = styles$243),
            (resource$244.state.loading = 5)),
          preloadPropsMap.has(type) ||
            ((pendingProps = {
              rel: "preload",
              as: "style",
              href: pendingProps.href,
              crossOrigin: pendingProps.crossOrigin,
              integrity: pendingProps.integrity,
              media: pendingProps.media,
              hrefLang: pendingProps.hrefLang,
              referrerPolicy: pendingProps.referrerPolicy
            }),
            preloadPropsMap.set(type, pendingProps),
            styles$243 ||
              preloadStylesheet(
                JSCompiler_inline_result,
                type,
                pendingProps,
                resource$244.state
              )));
        if (currentProps && null === currentResource)
          throw Error(formatProdErrorMessage(528, ""));
        return resource$244;
      }
      if (currentProps && null !== currentResource)
        throw Error(formatProdErrorMessage(529, ""));
      return null;
    case "script":
      return (
        (currentProps = pendingProps.async),
        (pendingProps = pendingProps.src),
        "string" === typeof pendingProps &&
        currentProps &&
        "function" !== typeof currentProps &&
        "symbol" !== typeof currentProps
          ? ((currentProps = getScriptKey(pendingProps)),
            (pendingProps = getResourcesFromRoot(
              JSCompiler_inline_result
            ).hoistableScripts),
            (currentResource = pendingProps.get(currentProps)),
            currentResource ||
              ((currentResource = {
                type: "script",
                instance: null,
                count: 0,
                state: null
              }),
              pendingProps.set(currentProps, currentResource)),
            currentResource)
          : { type: "void", instance: null, count: 0, state: null }
      );
    default:
      throw Error(formatProdErrorMessage(444, type));
  }
}
function getStyleKey(href) {
  return 'href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"';
}
function getStylesheetSelectorFromKey(key) {
  return 'link[rel="stylesheet"][' + key + "]";
}
function stylesheetPropsFromRawProps(rawProps) {
  return assign({}, rawProps, {
    "data-precedence": rawProps.precedence,
    precedence: null
  });
}
function preloadStylesheet(ownerDocument, key, preloadProps, state) {
  ownerDocument.querySelector('link[rel="preload"][as="style"][' + key + "]")
    ? (state.loading = 1)
    : ((key = ownerDocument.createElement("link")),
      (state.preload = key),
      key.addEventListener("load", function () {
        return (state.loading |= 1);
      }),
      key.addEventListener("error", function () {
        return (state.loading |= 2);
      }),
      setInitialProperties(key, "link", preloadProps),
      markNodeAsHoistable(key),
      ownerDocument.head.appendChild(key));
}
function getScriptKey(src) {
  return '[src="' + escapeSelectorAttributeValueInsideDoubleQuotes(src) + '"]';
}
function getScriptSelectorFromKey(key) {
  return "script[async]" + key;
}
function acquireResource(hoistableRoot, resource, props) {
  resource.count++;
  if (null === resource.instance)
    switch (resource.type) {
      case "style":
        var instance = hoistableRoot.querySelector(
          'style[data-href~="' +
            escapeSelectorAttributeValueInsideDoubleQuotes(props.href) +
            '"]'
        );
        if (instance)
          return (
            (resource.instance = instance),
            markNodeAsHoistable(instance),
            instance
          );
        var styleProps = assign({}, props, {
          "data-href": props.href,
          "data-precedence": props.precedence,
          href: null,
          precedence: null
        });
        instance = (hoistableRoot.ownerDocument || hoistableRoot).createElement(
          "style"
        );
        markNodeAsHoistable(instance);
        setInitialProperties(instance, "style", styleProps);
        insertStylesheet(instance, props.precedence, hoistableRoot);
        return (resource.instance = instance);
      case "stylesheet":
        styleProps = getStyleKey(props.href);
        var instance$249 = hoistableRoot.querySelector(
          getStylesheetSelectorFromKey(styleProps)
        );
        if (instance$249)
          return (
            (resource.state.loading |= 4),
            (resource.instance = instance$249),
            markNodeAsHoistable(instance$249),
            instance$249
          );
        instance = stylesheetPropsFromRawProps(props);
        (styleProps = preloadPropsMap.get(styleProps)) &&
          adoptPreloadPropsForStylesheet(instance, styleProps);
        instance$249 = (
          hoistableRoot.ownerDocument || hoistableRoot
        ).createElement("link");
        markNodeAsHoistable(instance$249);
        var linkInstance = instance$249;
        linkInstance._p = new Promise(function (resolve, reject) {
          linkInstance.onload = resolve;
          linkInstance.onerror = reject;
        });
        setInitialProperties(instance$249, "link", instance);
        resource.state.loading |= 4;
        insertStylesheet(instance$249, props.precedence, hoistableRoot);
        return (resource.instance = instance$249);
      case "script":
        instance$249 = getScriptKey(props.src);
        if (
          (styleProps = hoistableRoot.querySelector(
            getScriptSelectorFromKey(instance$249)
          ))
        )
          return (
            (resource.instance = styleProps),
            markNodeAsHoistable(styleProps),
            styleProps
          );
        instance = props;
        if ((styleProps = preloadPropsMap.get(instance$249)))
          (instance = assign({}, props)),
            adoptPreloadPropsForScript(instance, styleProps);
        hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
        styleProps = hoistableRoot.createElement("script");
        markNodeAsHoistable(styleProps);
        setInitialProperties(styleProps, "link", instance);
        hoistableRoot.head.appendChild(styleProps);
        return (resource.instance = styleProps);
      case "void":
        return null;
      default:
        throw Error(formatProdErrorMessage(443, resource.type));
    }
  else
    "stylesheet" === resource.type &&
      0 === (resource.state.loading & 4) &&
      ((instance = resource.instance),
      (resource.state.loading |= 4),
      insertStylesheet(instance, props.precedence, hoistableRoot));
  return resource.instance;
}
function insertStylesheet(instance, precedence, root) {
  for (
    var nodes = root.querySelectorAll(
        'link[rel="stylesheet"][data-precedence],style[data-precedence]'
      ),
      last = nodes.length ? nodes[nodes.length - 1] : null,
      prior = last,
      i = 0;
    i < nodes.length;
    i++
  ) {
    var node = nodes[i];
    if (node.dataset.precedence === precedence) prior = node;
    else if (prior !== last) break;
  }
  prior
    ? prior.parentNode.insertBefore(instance, prior.nextSibling)
    : ((precedence = 9 === root.nodeType ? root.head : root),
      precedence.insertBefore(instance, precedence.firstChild));
}
function adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps) {
  null == stylesheetProps.crossOrigin &&
    (stylesheetProps.crossOrigin = preloadProps.crossOrigin);
  null == stylesheetProps.referrerPolicy &&
    (stylesheetProps.referrerPolicy = preloadProps.referrerPolicy);
  null == stylesheetProps.title && (stylesheetProps.title = preloadProps.title);
}
function adoptPreloadPropsForScript(scriptProps, preloadProps) {
  null == scriptProps.crossOrigin &&
    (scriptProps.crossOrigin = preloadProps.crossOrigin);
  null == scriptProps.referrerPolicy &&
    (scriptProps.referrerPolicy = preloadProps.referrerPolicy);
  null == scriptProps.integrity &&
    (scriptProps.integrity = preloadProps.integrity);
}
var tagCaches = null;
function getHydratableHoistableCache(type, keyAttribute, ownerDocument) {
  if (null === tagCaches) {
    var cache = new Map();
    var caches = (tagCaches = new Map());
    caches.set(ownerDocument, cache);
  } else
    (caches = tagCaches),
      (cache = caches.get(ownerDocument)),
      cache || ((cache = new Map()), caches.set(ownerDocument, cache));
  if (cache.has(type)) return cache;
  cache.set(type, null);
  ownerDocument = ownerDocument.getElementsByTagName(type);
  for (caches = 0; caches < ownerDocument.length; caches++) {
    var node = ownerDocument[caches];
    if (
      !(
        node[internalHoistableMarker] ||
        node[internalInstanceKey] ||
        ("link" === type && "stylesheet" === node.getAttribute("rel"))
      ) &&
      "http://www.w3.org/2000/svg" !== node.namespaceURI
    ) {
      var nodeKey = node.getAttribute(keyAttribute) || "";
      nodeKey = type + nodeKey;
      var existing = cache.get(nodeKey);
      existing ? existing.push(node) : cache.set(nodeKey, [node]);
    }
  }
  return cache;
}
function mountHoistable(hoistableRoot, type, instance) {
  hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
  hoistableRoot.head.insertBefore(
    instance,
    "title" === type ? hoistableRoot.querySelector("head > title") : null
  );
}
function isHostHoistableType(type, props, hostContext) {
  if (1 === hostContext || null != props.itemProp) return !1;
  switch (type) {
    case "meta":
    case "title":
      return !0;
    case "style":
      if (
        "string" !== typeof props.precedence ||
        "string" !== typeof props.href ||
        "" === props.href
      )
        break;
      return !0;
    case "link":
      if (
        "string" !== typeof props.rel ||
        "string" !== typeof props.href ||
        "" === props.href ||
        props.onLoad ||
        props.onError
      )
        break;
      switch (props.rel) {
        case "stylesheet":
          return (
            (type = props.disabled),
            "string" === typeof props.precedence && null == type
          );
        default:
          return !0;
      }
    case "script":
      if (
        props.async &&
        "function" !== typeof props.async &&
        "symbol" !== typeof props.async &&
        !props.onLoad &&
        !props.onError &&
        props.src &&
        "string" === typeof props.src
      )
        return !0;
  }
  return !1;
}
function preloadResource(resource) {
  return "stylesheet" === resource.type && 0 === (resource.state.loading & 3)
    ? !1
    : !0;
}
function suspendResource(state, hoistableRoot, resource, props) {
  if (
    "stylesheet" === resource.type &&
    ("string" !== typeof props.media ||
      !1 !== matchMedia(props.media).matches) &&
    0 === (resource.state.loading & 4)
  ) {
    if (null === resource.instance) {
      var key = getStyleKey(props.href),
        instance = hoistableRoot.querySelector(
          getStylesheetSelectorFromKey(key)
        );
      if (instance) {
        hoistableRoot = instance._p;
        null !== hoistableRoot &&
          "object" === typeof hoistableRoot &&
          "function" === typeof hoistableRoot.then &&
          (state.count++,
          (state = onUnsuspend.bind(state)),
          hoistableRoot.then(state, state));
        resource.state.loading |= 4;
        resource.instance = instance;
        markNodeAsHoistable(instance);
        return;
      }
      instance = hoistableRoot.ownerDocument || hoistableRoot;
      props = stylesheetPropsFromRawProps(props);
      (key = preloadPropsMap.get(key)) &&
        adoptPreloadPropsForStylesheet(props, key);
      instance = instance.createElement("link");
      markNodeAsHoistable(instance);
      var linkInstance = instance;
      linkInstance._p = new Promise(function (resolve, reject) {
        linkInstance.onload = resolve;
        linkInstance.onerror = reject;
      });
      setInitialProperties(instance, "link", props);
      resource.instance = instance;
    }
    null === state.stylesheets && (state.stylesheets = new Map());
    state.stylesheets.set(resource, hoistableRoot);
    (hoistableRoot = resource.state.preload) &&
      0 === (resource.state.loading & 3) &&
      (state.count++,
      (resource = onUnsuspend.bind(state)),
      hoistableRoot.addEventListener("load", resource),
      hoistableRoot.addEventListener("error", resource));
  }
}
var estimatedBytesWithinLimit = 0;
function waitForCommitToBeReady(state, timeoutOffset) {
  state.stylesheets &&
    0 === state.count &&
    insertSuspendedStylesheets(state, state.stylesheets);
  return 0 < state.count || 0 < state.imgCount
    ? function (commit) {
        var stylesheetTimer = setTimeout(function () {
          state.stylesheets &&
            insertSuspendedStylesheets(state, state.stylesheets);
          if (state.unsuspend) {
            var unsuspend = state.unsuspend;
            state.unsuspend = null;
            unsuspend();
          }
        }, 6e4 + timeoutOffset);
        0 < state.imgBytes &&
          0 === estimatedBytesWithinLimit &&
          (estimatedBytesWithinLimit = 62500 * estimateBandwidth());
        var imgTimer = setTimeout(
          function () {
            state.waitingForImages = !1;
            if (
              0 === state.count &&
              (state.stylesheets &&
                insertSuspendedStylesheets(state, state.stylesheets),
              state.unsuspend)
            ) {
              var unsuspend = state.unsuspend;
              state.unsuspend = null;
              unsuspend();
            }
          },
          (state.imgBytes > estimatedBytesWithinLimit ? 50 : 800) +
            timeoutOffset
        );
        state.unsuspend = commit;
        return function () {
          state.unsuspend = null;
          clearTimeout(stylesheetTimer);
          clearTimeout(imgTimer);
        };
      }
    : null;
}
function onUnsuspend() {
  this.count--;
  if (0 === this.count && (0 === this.imgCount || !this.waitingForImages))
    if (this.stylesheets) insertSuspendedStylesheets(this, this.stylesheets);
    else if (this.unsuspend) {
      var unsuspend = this.unsuspend;
      this.unsuspend = null;
      unsuspend();
    }
}
var precedencesByRoot = null;
function insertSuspendedStylesheets(state, resources) {
  state.stylesheets = null;
  null !== state.unsuspend &&
    (state.count++,
    (precedencesByRoot = new Map()),
    resources.forEach(insertStylesheetIntoRoot, state),
    (precedencesByRoot = null),
    onUnsuspend.call(state));
}
function insertStylesheetIntoRoot(root, resource) {
  if (!(resource.state.loading & 4)) {
    var precedences = precedencesByRoot.get(root);
    if (precedences) var last = precedences.get(null);
    else {
      precedences = new Map();
      precedencesByRoot.set(root, precedences);
      for (
        var nodes = root.querySelectorAll(
            "link[data-precedence],style[data-precedence]"
          ),
          i = 0;
        i < nodes.length;
        i++
      ) {
        var node = nodes[i];
        if (
          "LINK" === node.nodeName ||
          "not all" !== node.getAttribute("media")
        )
          precedences.set(node.dataset.precedence, node), (last = node);
      }
      last && precedences.set(null, last);
    }
    nodes = resource.instance;
    node = nodes.getAttribute("data-precedence");
    i = precedences.get(node) || last;
    i === last && precedences.set(null, nodes);
    precedences.set(node, nodes);
    this.count++;
    last = onUnsuspend.bind(this);
    nodes.addEventListener("load", last);
    nodes.addEventListener("error", last);
    i
      ? i.parentNode.insertBefore(nodes, i.nextSibling)
      : ((root = 9 === root.nodeType ? root.head : root),
        root.insertBefore(nodes, root.firstChild));
    resource.state.loading |= 4;
  }
}
var HostTransitionContext = {
  $$typeof: REACT_CONTEXT_TYPE,
  Provider: null,
  Consumer: null,
  _currentValue: sharedNotPendingObject,
  _currentValue2: sharedNotPendingObject,
  _threadCount: 0
};
function FiberRootNode(
  containerInfo,
  tag,
  hydrate,
  identifierPrefix,
  onUncaughtError,
  onCaughtError,
  onRecoverableError,
  onDefaultTransitionIndicator,
  formState
) {
  this.tag = 1;
  this.containerInfo = containerInfo;
  this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode =
    this.next =
    this.pendingContext =
    this.context =
    this.cancelPendingCommit =
      null;
  this.callbackPriority = 0;
  this.expirationTimes = createLaneMap(-1);
  this.entangledLanes =
    this.shellSuspendCounter =
    this.errorRecoveryDisabledLanes =
    this.expiredLanes =
    this.warmLanes =
    this.pingedLanes =
    this.suspendedLanes =
    this.pendingLanes =
      0;
  this.entanglements = createLaneMap(0);
  this.hiddenUpdates = createLaneMap(null);
  this.identifierPrefix = identifierPrefix;
  this.onUncaughtError = onUncaughtError;
  this.onCaughtError = onCaughtError;
  this.onRecoverableError = onRecoverableError;
  this.pooledCache = null;
  this.pooledCacheLanes = 0;
  this.formState = formState;
  this.incompleteTransitions = new Map();
}
function createFiberRoot(
  containerInfo,
  tag,
  hydrate,
  initialChildren,
  hydrationCallbacks,
  isStrictMode,
  identifierPrefix,
  formState,
  onUncaughtError,
  onCaughtError,
  onRecoverableError,
  onDefaultTransitionIndicator
) {
  containerInfo = new FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    onDefaultTransitionIndicator,
    formState
  );
  tag = 1;
  !0 === isStrictMode && (tag |= 24);
  isStrictMode = createFiberImplClass(3, null, null, tag);
  containerInfo.current = isStrictMode;
  isStrictMode.stateNode = containerInfo;
  tag = createCache();
  tag.refCount++;
  containerInfo.pooledCache = tag;
  tag.refCount++;
  isStrictMode.memoizedState = {
    element: initialChildren,
    isDehydrated: hydrate,
    cache: tag
  };
  initializeUpdateQueue(isStrictMode);
  return containerInfo;
}
function getContextForSubtree(parentComponent) {
  if (!parentComponent) return emptyContextObject;
  parentComponent = emptyContextObject;
  return parentComponent;
}
function updateContainerImpl(
  rootFiber,
  lane,
  element,
  container,
  parentComponent,
  callback
) {
  parentComponent = getContextForSubtree(parentComponent);
  null === container.context
    ? (container.context = parentComponent)
    : (container.pendingContext = parentComponent);
  container = createUpdate(lane);
  container.payload = { element: element };
  callback = void 0 === callback ? null : callback;
  null !== callback && (container.callback = callback);
  element = enqueueUpdate(rootFiber, container, lane);
  null !== element &&
    (scheduleUpdateOnFiber(element, rootFiber, lane),
    entangleTransitions(element, rootFiber, lane));
}
function markRetryLaneImpl(fiber, retryLane) {
  fiber = fiber.memoizedState;
  if (null !== fiber && null !== fiber.dehydrated) {
    var a = fiber.retryLane;
    fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
  }
}
function markRetryLaneIfNotHydrated(fiber, retryLane) {
  markRetryLaneImpl(fiber, retryLane);
  (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
}
function attemptContinuousHydration(fiber) {
  if (13 === fiber.tag || 31 === fiber.tag) {
    var root = enqueueConcurrentRenderForLane(fiber, 67108864);
    null !== root && scheduleUpdateOnFiber(root, fiber, 67108864);
    markRetryLaneIfNotHydrated(fiber, 67108864);
  }
}
function attemptHydrationAtCurrentPriority(fiber) {
  if (13 === fiber.tag || 31 === fiber.tag) {
    var lane = requestUpdateLane();
    lane = getBumpedLaneForHydrationByLane(lane);
    var root = enqueueConcurrentRenderForLane(fiber, lane);
    null !== root && scheduleUpdateOnFiber(root, fiber, lane);
    markRetryLaneIfNotHydrated(fiber, lane);
  }
}
var _enabled = !0;
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  var prevTransition = ReactSharedInternals.T;
  ReactSharedInternals.T = null;
  var previousPriority = ReactDOMSharedInternals.p;
  try {
    (ReactDOMSharedInternals.p = 2),
      dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    (ReactDOMSharedInternals.p = previousPriority),
      (ReactSharedInternals.T = prevTransition);
  }
}
function dispatchContinuousEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  var prevTransition = ReactSharedInternals.T;
  ReactSharedInternals.T = null;
  var previousPriority = ReactDOMSharedInternals.p;
  try {
    (ReactDOMSharedInternals.p = 8),
      dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    (ReactDOMSharedInternals.p = previousPriority),
      (ReactSharedInternals.T = prevTransition);
  }
}
function dispatchEvent(
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  if (_enabled) {
    var blockedOn = findInstanceBlockingEvent(nativeEvent);
    if (null === blockedOn)
      dispatchEventForPluginEventSystem(
        domEventName,
        eventSystemFlags,
        nativeEvent,
        return_targetInst,
        targetContainer
      ),
        clearIfContinuousEvent(domEventName, nativeEvent);
    else if (
      queueIfContinuousEvent(
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        nativeEvent
      )
    )
      nativeEvent.stopPropagation();
    else if (
      (clearIfContinuousEvent(domEventName, nativeEvent),
      eventSystemFlags & 4 &&
        -1 < discreteReplayableEvents.indexOf(domEventName))
    ) {
      for (; null !== blockedOn; ) {
        var fiber = getInstanceFromNode(blockedOn);
        if (null !== fiber)
          switch (fiber.tag) {
            case 3:
              fiber = fiber.stateNode;
              if (fiber.current.memoizedState.isDehydrated) {
                var lanes = getHighestPriorityLanes(fiber.pendingLanes);
                if (0 !== lanes) {
                  var root = fiber;
                  root.pendingLanes |= 2;
                  for (root.entangledLanes |= 2; lanes; ) {
                    var lane = 1 << (31 - clz32(lanes));
                    root.entanglements[1] |= lane;
                    lanes &= ~lane;
                  }
                  ensureRootIsScheduled(fiber);
                  0 === (executionContext & 6) &&
                    ((workInProgressRootRenderTargetTime = now() + 500),
                    flushSyncWorkAcrossRoots_impl(0, !1));
                }
              }
              break;
            case 31:
            case 13:
              (root = enqueueConcurrentRenderForLane(fiber, 2)),
                null !== root && scheduleUpdateOnFiber(root, fiber, 2),
                flushSyncWork$1(),
                markRetryLaneIfNotHydrated(fiber, 2);
          }
        fiber = findInstanceBlockingEvent(nativeEvent);
        null === fiber &&
          dispatchEventForPluginEventSystem(
            domEventName,
            eventSystemFlags,
            nativeEvent,
            return_targetInst,
            targetContainer
          );
        if (fiber === blockedOn) break;
        blockedOn = fiber;
      }
      null !== blockedOn && nativeEvent.stopPropagation();
    } else
      dispatchEventForPluginEventSystem(
        domEventName,
        eventSystemFlags,
        nativeEvent,
        null,
        targetContainer
      );
  }
}
function findInstanceBlockingEvent(nativeEvent) {
  nativeEvent = getEventTarget(nativeEvent);
  return findInstanceBlockingTarget(nativeEvent);
}
var return_targetInst = null;
function findInstanceBlockingTarget(targetNode) {
  return_targetInst = null;
  targetNode = getClosestInstanceFromNode(targetNode);
  if (null !== targetNode) {
    var nearestMounted = getNearestMountedFiber(targetNode);
    if (null === nearestMounted) targetNode = null;
    else {
      var tag = nearestMounted.tag;
      if (13 === tag) {
        targetNode = getSuspenseInstanceFromFiber(nearestMounted);
        if (null !== targetNode) return targetNode;
        targetNode = null;
      } else if (31 === tag) {
        targetNode = getActivityInstanceFromFiber(nearestMounted);
        if (null !== targetNode) return targetNode;
        targetNode = null;
      } else if (3 === tag) {
        if (nearestMounted.stateNode.current.memoizedState.isDehydrated)
          return 3 === nearestMounted.tag
            ? nearestMounted.stateNode.containerInfo
            : null;
        targetNode = null;
      } else nearestMounted !== targetNode && (targetNode = null);
    }
  }
  return_targetInst = targetNode;
  return null;
}
function getEventPriority(domEventName) {
  switch (domEventName) {
    case "beforetoggle":
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "toggle":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 2;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 8;
    case "message":
      switch (getCurrentPriorityLevel()) {
        case ImmediatePriority:
          return 2;
        case UserBlockingPriority:
          return 8;
        case NormalPriority$1:
        case LowPriority:
          return 32;
        case IdlePriority:
          return 268435456;
        default:
          return 32;
      }
    default:
      return 32;
  }
}
var hasScheduledReplayAttempt = !1,
  queuedFocus = null,
  queuedDrag = null,
  queuedMouse = null,
  queuedPointers = new Map(),
  queuedPointerCaptures = new Map(),
  queuedExplicitHydrationTargets = [],
  discreteReplayableEvents =
    "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
      " "
    );
function clearIfContinuousEvent(domEventName, nativeEvent) {
  switch (domEventName) {
    case "focusin":
    case "focusout":
      queuedFocus = null;
      break;
    case "dragenter":
    case "dragleave":
      queuedDrag = null;
      break;
    case "mouseover":
    case "mouseout":
      queuedMouse = null;
      break;
    case "pointerover":
    case "pointerout":
      queuedPointers.delete(nativeEvent.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      queuedPointerCaptures.delete(nativeEvent.pointerId);
  }
}
function accumulateOrCreateContinuousQueuedReplayableEvent(
  existingQueuedEvent,
  blockedOn,
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  if (
    null === existingQueuedEvent ||
    existingQueuedEvent.nativeEvent !== nativeEvent
  )
    return (
      (existingQueuedEvent = {
        blockedOn: blockedOn,
        domEventName: domEventName,
        eventSystemFlags: eventSystemFlags,
        nativeEvent: nativeEvent,
        targetContainers: [targetContainer]
      }),
      null !== blockedOn &&
        ((blockedOn = getInstanceFromNode(blockedOn)),
        null !== blockedOn && attemptContinuousHydration(blockedOn)),
      existingQueuedEvent
    );
  existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
  blockedOn = existingQueuedEvent.targetContainers;
  null !== targetContainer &&
    -1 === blockedOn.indexOf(targetContainer) &&
    blockedOn.push(targetContainer);
  return existingQueuedEvent;
}
function queueIfContinuousEvent(
  blockedOn,
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  switch (domEventName) {
    case "focusin":
      return (
        (queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedFocus,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        )),
        !0
      );
    case "dragenter":
      return (
        (queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedDrag,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        )),
        !0
      );
    case "mouseover":
      return (
        (queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedMouse,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        )),
        !0
      );
    case "pointerover":
      var pointerId = nativeEvent.pointerId;
      queuedPointers.set(
        pointerId,
        accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedPointers.get(pointerId) || null,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        )
      );
      return !0;
    case "gotpointercapture":
      return (
        (pointerId = nativeEvent.pointerId),
        queuedPointerCaptures.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointerCaptures.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        ),
        !0
      );
  }
  return !1;
}
function attemptExplicitHydrationTarget(queuedTarget) {
  var targetInst = getClosestInstanceFromNode(queuedTarget.target);
  if (null !== targetInst) {
    var nearestMounted = getNearestMountedFiber(targetInst);
    if (null !== nearestMounted)
      if (((targetInst = nearestMounted.tag), 13 === targetInst)) {
        if (
          ((targetInst = getSuspenseInstanceFromFiber(nearestMounted)),
          null !== targetInst)
        ) {
          queuedTarget.blockedOn = targetInst;
          runWithPriority(queuedTarget.priority, function () {
            attemptHydrationAtCurrentPriority(nearestMounted);
          });
          return;
        }
      } else if (31 === targetInst) {
        if (
          ((targetInst = getActivityInstanceFromFiber(nearestMounted)),
          null !== targetInst)
        ) {
          queuedTarget.blockedOn = targetInst;
          runWithPriority(queuedTarget.priority, function () {
            attemptHydrationAtCurrentPriority(nearestMounted);
          });
          return;
        }
      } else if (
        3 === targetInst &&
        nearestMounted.stateNode.current.memoizedState.isDehydrated
      ) {
        queuedTarget.blockedOn =
          3 === nearestMounted.tag
            ? nearestMounted.stateNode.containerInfo
            : null;
        return;
      }
  }
  queuedTarget.blockedOn = null;
}
function attemptReplayContinuousQueuedEvent(queuedEvent) {
  if (null !== queuedEvent.blockedOn) return !1;
  for (
    var targetContainers = queuedEvent.targetContainers;
    0 < targetContainers.length;

  ) {
    var nextBlockedOn = findInstanceBlockingEvent(queuedEvent.nativeEvent);
    if (null === nextBlockedOn) {
      nextBlockedOn = queuedEvent.nativeEvent;
      var nativeEventClone = new nextBlockedOn.constructor(
        nextBlockedOn.type,
        nextBlockedOn
      );
      currentReplayingEvent = nativeEventClone;
      nextBlockedOn.target.dispatchEvent(nativeEventClone);
      currentReplayingEvent = null;
    } else
      return (
        (targetContainers = getInstanceFromNode(nextBlockedOn)),
        null !== targetContainers &&
          attemptContinuousHydration(targetContainers),
        (queuedEvent.blockedOn = nextBlockedOn),
        !1
      );
    targetContainers.shift();
  }
  return !0;
}
function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
  attemptReplayContinuousQueuedEvent(queuedEvent) && map.delete(key);
}
function replayUnblockedEvents() {
  hasScheduledReplayAttempt = !1;
  null !== queuedFocus &&
    attemptReplayContinuousQueuedEvent(queuedFocus) &&
    (queuedFocus = null);
  null !== queuedDrag &&
    attemptReplayContinuousQueuedEvent(queuedDrag) &&
    (queuedDrag = null);
  null !== queuedMouse &&
    attemptReplayContinuousQueuedEvent(queuedMouse) &&
    (queuedMouse = null);
  queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
  queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
}
function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
  queuedEvent.blockedOn === unblocked &&
    ((queuedEvent.blockedOn = null),
    hasScheduledReplayAttempt ||
      ((hasScheduledReplayAttempt = !0),
      Scheduler.unstable_scheduleCallback(
        Scheduler.unstable_NormalPriority,
        replayUnblockedEvents
      )));
}
var lastScheduledReplayQueue = null;
function scheduleReplayQueueIfNeeded(formReplayingQueue) {
  lastScheduledReplayQueue !== formReplayingQueue &&
    ((lastScheduledReplayQueue = formReplayingQueue),
    Scheduler.unstable_scheduleCallback(
      Scheduler.unstable_NormalPriority,
      function () {
        lastScheduledReplayQueue === formReplayingQueue &&
          (lastScheduledReplayQueue = null);
        for (var i = 0; i < formReplayingQueue.length; i += 3) {
          var form = formReplayingQueue[i],
            submitterOrAction = formReplayingQueue[i + 1],
            formData = formReplayingQueue[i + 2];
          if ("function" !== typeof submitterOrAction)
            if (null === findInstanceBlockingTarget(submitterOrAction || form))
              continue;
            else break;
          var formInst = getInstanceFromNode(form);
          null !== formInst &&
            (formReplayingQueue.splice(i, 3),
            (i -= 3),
            startHostTransition(
              formInst,
              {
                pending: !0,
                data: formData,
                method: form.method,
                action: submitterOrAction
              },
              submitterOrAction,
              formData
            ));
        }
      }
    ));
}
function retryIfBlockedOn(unblocked) {
  function unblock(queuedEvent) {
    return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
  }
  null !== queuedFocus && scheduleCallbackIfUnblocked(queuedFocus, unblocked);
  null !== queuedDrag && scheduleCallbackIfUnblocked(queuedDrag, unblocked);
  null !== queuedMouse && scheduleCallbackIfUnblocked(queuedMouse, unblocked);
  queuedPointers.forEach(unblock);
  queuedPointerCaptures.forEach(unblock);
  for (var i = 0; i < queuedExplicitHydrationTargets.length; i++) {
    var queuedTarget = queuedExplicitHydrationTargets[i];
    queuedTarget.blockedOn === unblocked && (queuedTarget.blockedOn = null);
  }
  for (
    ;
    0 < queuedExplicitHydrationTargets.length &&
    ((i = queuedExplicitHydrationTargets[0]), null === i.blockedOn);

  )
    attemptExplicitHydrationTarget(i),
      null === i.blockedOn && queuedExplicitHydrationTargets.shift();
  i = (unblocked.ownerDocument || unblocked).$$reactFormReplay;
  if (null != i)
    for (queuedTarget = 0; queuedTarget < i.length; queuedTarget += 3) {
      var form = i[queuedTarget],
        submitterOrAction = i[queuedTarget + 1],
        formProps = form[internalPropsKey] || null;
      if ("function" === typeof submitterOrAction)
        formProps || scheduleReplayQueueIfNeeded(i);
      else if (formProps) {
        var action = null;
        if (submitterOrAction && submitterOrAction.hasAttribute("formAction"))
          if (
            ((form = submitterOrAction),
            (formProps = submitterOrAction[internalPropsKey] || null))
          )
            action = formProps.formAction;
          else {
            if (null !== findInstanceBlockingTarget(form)) continue;
          }
        else action = formProps.action;
        "function" === typeof action
          ? (i[queuedTarget + 1] = action)
          : (i.splice(queuedTarget, 3), (queuedTarget -= 3));
        scheduleReplayQueueIfNeeded(i);
      }
    }
}
function defaultOnDefaultTransitionIndicator() {
  function handleNavigate(event) {
    event.canIntercept &&
      "react-transition" === event.info &&
      event.intercept({
        handler: function () {
          return new Promise(function (resolve) {
            return (pendingResolve = resolve);
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
  }
  function handleNavigateComplete() {
    null !== pendingResolve && (pendingResolve(), (pendingResolve = null));
    isCancelled || setTimeout(startFakeNavigation, 20);
  }
  function startFakeNavigation() {
    if (!isCancelled && !navigation.transition) {
      var currentEntry = navigation.currentEntry;
      currentEntry &&
        null != currentEntry.url &&
        navigation.navigate(currentEntry.url, {
          state: currentEntry.getState(),
          info: "react-transition",
          history: "replace"
        });
    }
  }
  if ("object" === typeof navigation) {
    var isCancelled = !1,
      pendingResolve = null;
    navigation.addEventListener("navigate", handleNavigate);
    navigation.addEventListener("navigatesuccess", handleNavigateComplete);
    navigation.addEventListener("navigateerror", handleNavigateComplete);
    setTimeout(startFakeNavigation, 100);
    return function () {
      isCancelled = !0;
      navigation.removeEventListener("navigate", handleNavigate);
      navigation.removeEventListener("navigatesuccess", handleNavigateComplete);
      navigation.removeEventListener("navigateerror", handleNavigateComplete);
      null !== pendingResolve && (pendingResolve(), (pendingResolve = null));
    };
  }
}
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render =
  function (children) {
    var root = this._internalRoot;
    if (null === root) throw Error(formatProdErrorMessage(409));
    var current = root.current,
      lane = requestUpdateLane();
    updateContainerImpl(current, lane, children, root, null, null);
  };
ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount =
  function () {
    var root = this._internalRoot;
    if (null !== root) {
      this._internalRoot = null;
      var container = root.containerInfo;
      updateContainerImpl(root.current, 2, null, root, null, null);
      flushSyncWork$1();
      container[internalContainerInstanceKey] = null;
    }
  };
function ReactDOMHydrationRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = function (target) {
  if (target) {
    var updatePriority = resolveUpdatePriority();
    target = { blockedOn: null, target: target, priority: updatePriority };
    for (
      var i = 0;
      i < queuedExplicitHydrationTargets.length &&
      0 !== updatePriority &&
      updatePriority < queuedExplicitHydrationTargets[i].priority;
      i++
    );
    queuedExplicitHydrationTargets.splice(i, 0, target);
    0 === i && attemptExplicitHydrationTarget(target);
  }
};
var isomorphicReactPackageVersion$jscomp$inline_1840 = React.version;
if (
  "19.2.4" !==
  isomorphicReactPackageVersion$jscomp$inline_1840
)
  throw Error(
    formatProdErrorMessage(
      527,
      isomorphicReactPackageVersion$jscomp$inline_1840,
      "19.2.4"
    )
  );
ReactDOMSharedInternals.findDOMNode = function (componentOrElement) {
  var fiber = componentOrElement._reactInternals;
  if (void 0 === fiber) {
    if ("function" === typeof componentOrElement.render)
      throw Error(formatProdErrorMessage(188));
    componentOrElement = Object.keys(componentOrElement).join(",");
    throw Error(formatProdErrorMessage(268, componentOrElement));
  }
  componentOrElement = findCurrentFiberUsingSlowPath(fiber);
  componentOrElement =
    null !== componentOrElement
      ? findCurrentHostFiberImpl(componentOrElement)
      : null;
  componentOrElement =
    null === componentOrElement ? null : componentOrElement.stateNode;
  return componentOrElement;
};
var internals$jscomp$inline_2347 = {
  bundleType: 0,
  version: "19.2.4",
  rendererPackageName: "react-dom",
  currentDispatcherRef: ReactSharedInternals,
  reconcilerVersion: "19.2.4"
};
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var hook$jscomp$inline_2348 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (
    !hook$jscomp$inline_2348.isDisabled &&
    hook$jscomp$inline_2348.supportsFiber
  )
    try {
      (rendererID = hook$jscomp$inline_2348.inject(
        internals$jscomp$inline_2347
      )),
        (injectedHook = hook$jscomp$inline_2348);
    } catch (err) {}
}
exports.createRoot = function (container, options) {
  if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
  var isStrictMode = !1,
    identifierPrefix = "",
    onUncaughtError = defaultOnUncaughtError,
    onCaughtError = defaultOnCaughtError,
    onRecoverableError = defaultOnRecoverableError;
  null !== options &&
    void 0 !== options &&
    (!0 === options.unstable_strictMode && (isStrictMode = !0),
    void 0 !== options.identifierPrefix &&
      (identifierPrefix = options.identifierPrefix),
    void 0 !== options.onUncaughtError &&
      (onUncaughtError = options.onUncaughtError),
    void 0 !== options.onCaughtError && (onCaughtError = options.onCaughtError),
    void 0 !== options.onRecoverableError &&
      (onRecoverableError = options.onRecoverableError));
  options = createFiberRoot(
    container,
    1,
    !1,
    null,
    null,
    isStrictMode,
    identifierPrefix,
    null,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    defaultOnDefaultTransitionIndicator
  );
  container[internalContainerInstanceKey] = options.current;
  listenToAllSupportedEvents(container);
  return new ReactDOMRoot(options);
};
__webpack_unused_export__ = function (container, initialChildren, options) {
  if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
  var isStrictMode = !1,
    identifierPrefix = "",
    onUncaughtError = defaultOnUncaughtError,
    onCaughtError = defaultOnCaughtError,
    onRecoverableError = defaultOnRecoverableError,
    formState = null;
  null !== options &&
    void 0 !== options &&
    (!0 === options.unstable_strictMode && (isStrictMode = !0),
    void 0 !== options.identifierPrefix &&
      (identifierPrefix = options.identifierPrefix),
    void 0 !== options.onUncaughtError &&
      (onUncaughtError = options.onUncaughtError),
    void 0 !== options.onCaughtError && (onCaughtError = options.onCaughtError),
    void 0 !== options.onRecoverableError &&
      (onRecoverableError = options.onRecoverableError),
    void 0 !== options.formState && (formState = options.formState));
  initialChildren = createFiberRoot(
    container,
    1,
    !0,
    initialChildren,
    null != options ? options : null,
    isStrictMode,
    identifierPrefix,
    formState,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    defaultOnDefaultTransitionIndicator
  );
  initialChildren.context = getContextForSubtree(null);
  options = initialChildren.current;
  isStrictMode = requestUpdateLane();
  isStrictMode = getBumpedLaneForHydrationByLane(isStrictMode);
  identifierPrefix = createUpdate(isStrictMode);
  identifierPrefix.callback = null;
  enqueueUpdate(options, identifierPrefix, isStrictMode);
  options = isStrictMode;
  initialChildren.current.lanes = options;
  markRootUpdated$1(initialChildren, options);
  ensureRootIsScheduled(initialChildren);
  container[internalContainerInstanceKey] = initialChildren.current;
  listenToAllSupportedEvents(container);
  return new ReactDOMHydrationRoot(initialChildren);
};
__webpack_unused_export__ = "19.2.4";


/***/ }),

/***/ 338:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



function checkDCE() {
  /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
  if (
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' ||
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function'
  ) {
    return;
  }
  if (false) {}
  try {
    // Verify that the code above has been dead code eliminated (DCE'd).
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    // DevTools shouldn't crash React, no matter what.
    // We should still report in case we break this code.
    console.error(err);
  }
}

if (true) {
  // DCE check should happen before ReactDOM bundle executes so that
  // DevTools can report bad minification during injection.
  checkDCE();
  module.exports = __webpack_require__(247);
} else {}


/***/ }),

/***/ 477:
/***/ ((__unused_webpack_module, exports) => {

/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


function push(heap, node) {
  var index = heap.length;
  heap.push(node);
  a: for (; 0 < index; ) {
    var parentIndex = (index - 1) >>> 1,
      parent = heap[parentIndex];
    if (0 < compare(parent, node))
      (heap[parentIndex] = node), (heap[index] = parent), (index = parentIndex);
    else break a;
  }
}
function peek(heap) {
  return 0 === heap.length ? null : heap[0];
}
function pop(heap) {
  if (0 === heap.length) return null;
  var first = heap[0],
    last = heap.pop();
  if (last !== first) {
    heap[0] = last;
    a: for (
      var index = 0, length = heap.length, halfLength = length >>> 1;
      index < halfLength;

    ) {
      var leftIndex = 2 * (index + 1) - 1,
        left = heap[leftIndex],
        rightIndex = leftIndex + 1,
        right = heap[rightIndex];
      if (0 > compare(left, last))
        rightIndex < length && 0 > compare(right, left)
          ? ((heap[index] = right),
            (heap[rightIndex] = last),
            (index = rightIndex))
          : ((heap[index] = left),
            (heap[leftIndex] = last),
            (index = leftIndex));
      else if (rightIndex < length && 0 > compare(right, last))
        (heap[index] = right), (heap[rightIndex] = last), (index = rightIndex);
      else break a;
    }
  }
  return first;
}
function compare(a, b) {
  var diff = a.sortIndex - b.sortIndex;
  return 0 !== diff ? diff : a.id - b.id;
}
exports.unstable_now = void 0;
if ("object" === typeof performance && "function" === typeof performance.now) {
  var localPerformance = performance;
  exports.unstable_now = function () {
    return localPerformance.now();
  };
} else {
  var localDate = Date,
    initialTime = localDate.now();
  exports.unstable_now = function () {
    return localDate.now() - initialTime;
  };
}
var taskQueue = [],
  timerQueue = [],
  taskIdCounter = 1,
  currentTask = null,
  currentPriorityLevel = 3,
  isPerformingWork = !1,
  isHostCallbackScheduled = !1,
  isHostTimeoutScheduled = !1,
  needsPaint = !1,
  localSetTimeout = "function" === typeof setTimeout ? setTimeout : null,
  localClearTimeout = "function" === typeof clearTimeout ? clearTimeout : null,
  localSetImmediate = "undefined" !== typeof setImmediate ? setImmediate : null;
function advanceTimers(currentTime) {
  for (var timer = peek(timerQueue); null !== timer; ) {
    if (null === timer.callback) pop(timerQueue);
    else if (timer.startTime <= currentTime)
      pop(timerQueue),
        (timer.sortIndex = timer.expirationTime),
        push(taskQueue, timer);
    else break;
    timer = peek(timerQueue);
  }
}
function handleTimeout(currentTime) {
  isHostTimeoutScheduled = !1;
  advanceTimers(currentTime);
  if (!isHostCallbackScheduled)
    if (null !== peek(taskQueue))
      (isHostCallbackScheduled = !0),
        isMessageLoopRunning ||
          ((isMessageLoopRunning = !0), schedulePerformWorkUntilDeadline());
    else {
      var firstTimer = peek(timerQueue);
      null !== firstTimer &&
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
}
var isMessageLoopRunning = !1,
  taskTimeoutID = -1,
  frameInterval = 5,
  startTime = -1;
function shouldYieldToHost() {
  return needsPaint
    ? !0
    : exports.unstable_now() - startTime < frameInterval
      ? !1
      : !0;
}
function performWorkUntilDeadline() {
  needsPaint = !1;
  if (isMessageLoopRunning) {
    var currentTime = exports.unstable_now();
    startTime = currentTime;
    var hasMoreWork = !0;
    try {
      a: {
        isHostCallbackScheduled = !1;
        isHostTimeoutScheduled &&
          ((isHostTimeoutScheduled = !1),
          localClearTimeout(taskTimeoutID),
          (taskTimeoutID = -1));
        isPerformingWork = !0;
        var previousPriorityLevel = currentPriorityLevel;
        try {
          b: {
            advanceTimers(currentTime);
            for (
              currentTask = peek(taskQueue);
              null !== currentTask &&
              !(
                currentTask.expirationTime > currentTime && shouldYieldToHost()
              );

            ) {
              var callback = currentTask.callback;
              if ("function" === typeof callback) {
                currentTask.callback = null;
                currentPriorityLevel = currentTask.priorityLevel;
                var continuationCallback = callback(
                  currentTask.expirationTime <= currentTime
                );
                currentTime = exports.unstable_now();
                if ("function" === typeof continuationCallback) {
                  currentTask.callback = continuationCallback;
                  advanceTimers(currentTime);
                  hasMoreWork = !0;
                  break b;
                }
                currentTask === peek(taskQueue) && pop(taskQueue);
                advanceTimers(currentTime);
              } else pop(taskQueue);
              currentTask = peek(taskQueue);
            }
            if (null !== currentTask) hasMoreWork = !0;
            else {
              var firstTimer = peek(timerQueue);
              null !== firstTimer &&
                requestHostTimeout(
                  handleTimeout,
                  firstTimer.startTime - currentTime
                );
              hasMoreWork = !1;
            }
          }
          break a;
        } finally {
          (currentTask = null),
            (currentPriorityLevel = previousPriorityLevel),
            (isPerformingWork = !1);
        }
        hasMoreWork = void 0;
      }
    } finally {
      hasMoreWork
        ? schedulePerformWorkUntilDeadline()
        : (isMessageLoopRunning = !1);
    }
  }
}
var schedulePerformWorkUntilDeadline;
if ("function" === typeof localSetImmediate)
  schedulePerformWorkUntilDeadline = function () {
    localSetImmediate(performWorkUntilDeadline);
  };
else if ("undefined" !== typeof MessageChannel) {
  var channel = new MessageChannel(),
    port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = function () {
    port.postMessage(null);
  };
} else
  schedulePerformWorkUntilDeadline = function () {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
function requestHostTimeout(callback, ms) {
  taskTimeoutID = localSetTimeout(function () {
    callback(exports.unstable_now());
  }, ms);
}
exports.unstable_IdlePriority = 5;
exports.unstable_ImmediatePriority = 1;
exports.unstable_LowPriority = 4;
exports.unstable_NormalPriority = 3;
exports.unstable_Profiling = null;
exports.unstable_UserBlockingPriority = 2;
exports.unstable_cancelCallback = function (task) {
  task.callback = null;
};
exports.unstable_forceFrameRate = function (fps) {
  0 > fps || 125 < fps
    ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      )
    : (frameInterval = 0 < fps ? Math.floor(1e3 / fps) : 5);
};
exports.unstable_getCurrentPriorityLevel = function () {
  return currentPriorityLevel;
};
exports.unstable_next = function (eventHandler) {
  switch (currentPriorityLevel) {
    case 1:
    case 2:
    case 3:
      var priorityLevel = 3;
      break;
    default:
      priorityLevel = currentPriorityLevel;
  }
  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;
  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
};
exports.unstable_requestPaint = function () {
  needsPaint = !0;
};
exports.unstable_runWithPriority = function (priorityLevel, eventHandler) {
  switch (priorityLevel) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      break;
    default:
      priorityLevel = 3;
  }
  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;
  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
};
exports.unstable_scheduleCallback = function (
  priorityLevel,
  callback,
  options
) {
  var currentTime = exports.unstable_now();
  "object" === typeof options && null !== options
    ? ((options = options.delay),
      (options =
        "number" === typeof options && 0 < options
          ? currentTime + options
          : currentTime))
    : (options = currentTime);
  switch (priorityLevel) {
    case 1:
      var timeout = -1;
      break;
    case 2:
      timeout = 250;
      break;
    case 5:
      timeout = 1073741823;
      break;
    case 4:
      timeout = 1e4;
      break;
    default:
      timeout = 5e3;
  }
  timeout = options + timeout;
  priorityLevel = {
    id: taskIdCounter++,
    callback: callback,
    priorityLevel: priorityLevel,
    startTime: options,
    expirationTime: timeout,
    sortIndex: -1
  };
  options > currentTime
    ? ((priorityLevel.sortIndex = options),
      push(timerQueue, priorityLevel),
      null === peek(taskQueue) &&
        priorityLevel === peek(timerQueue) &&
        (isHostTimeoutScheduled
          ? (localClearTimeout(taskTimeoutID), (taskTimeoutID = -1))
          : (isHostTimeoutScheduled = !0),
        requestHostTimeout(handleTimeout, options - currentTime)))
    : ((priorityLevel.sortIndex = timeout),
      push(taskQueue, priorityLevel),
      isHostCallbackScheduled ||
        isPerformingWork ||
        ((isHostCallbackScheduled = !0),
        isMessageLoopRunning ||
          ((isMessageLoopRunning = !0), schedulePerformWorkUntilDeadline())));
  return priorityLevel;
};
exports.unstable_shouldYield = shouldYieldToHost;
exports.unstable_wrapCallback = function (callback) {
  var parentPriorityLevel = currentPriorityLevel;
  return function () {
    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = parentPriorityLevel;
    try {
      return callback.apply(this, arguments);
    } finally {
      currentPriorityLevel = previousPriorityLevel;
    }
  };
};


/***/ }),

/***/ 540:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(869);
} else {}


/***/ }),

/***/ 698:
/***/ ((__unused_webpack_module, exports) => {

/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
function jsxProd(type, config, maybeKey) {
  var key = null;
  void 0 !== maybeKey && (key = "" + maybeKey);
  void 0 !== config.key && (key = "" + config.key);
  if ("key" in config) {
    maybeKey = {};
    for (var propName in config)
      "key" !== propName && (maybeKey[propName] = config[propName]);
  } else maybeKey = config;
  config = maybeKey.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: void 0 !== config ? config : null,
    props: maybeKey
  };
}
exports.Fragment = REACT_FRAGMENT_TYPE;
exports.jsx = jsxProd;
exports.jsxs = jsxProd;


/***/ }),

/***/ 848:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(698);
} else {}


/***/ }),

/***/ 869:
/***/ ((__unused_webpack_module, exports) => {

/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var ReactNoopUpdateQueue = {
    isMounted: function () {
      return !1;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {}
  },
  assign = Object.assign,
  emptyObject = {};
function Component(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
Component.prototype.isReactComponent = {};
Component.prototype.setState = function (partialState, callback) {
  if (
    "object" !== typeof partialState &&
    "function" !== typeof partialState &&
    null != partialState
  )
    throw Error(
      "takes an object of state variables to update or a function which returns an object of state variables."
    );
  this.updater.enqueueSetState(this, partialState, callback, "setState");
};
Component.prototype.forceUpdate = function (callback) {
  this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
};
function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
var pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = !0;
var isArrayImpl = Array.isArray;
function noop() {}
var ReactSharedInternals = { H: null, A: null, T: null, S: null },
  hasOwnProperty = Object.prototype.hasOwnProperty;
function ReactElement(type, key, props) {
  var refProp = props.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: void 0 !== refProp ? refProp : null,
    props: props
  };
}
function cloneAndReplaceKey(oldElement, newKey) {
  return ReactElement(oldElement.type, newKey, oldElement.props);
}
function isValidElement(object) {
  return (
    "object" === typeof object &&
    null !== object &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}
function escape(key) {
  var escaperLookup = { "=": "=0", ":": "=2" };
  return (
    "$" +
    key.replace(/[=:]/g, function (match) {
      return escaperLookup[match];
    })
  );
}
var userProvidedKeyEscapeRegex = /\/+/g;
function getElementKey(element, index) {
  return "object" === typeof element && null !== element && null != element.key
    ? escape("" + element.key)
    : index.toString(36);
}
function resolveThenable(thenable) {
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      switch (
        ("string" === typeof thenable.status
          ? thenable.then(noop, noop)
          : ((thenable.status = "pending"),
            thenable.then(
              function (fulfilledValue) {
                "pending" === thenable.status &&
                  ((thenable.status = "fulfilled"),
                  (thenable.value = fulfilledValue));
              },
              function (error) {
                "pending" === thenable.status &&
                  ((thenable.status = "rejected"), (thenable.reason = error));
              }
            )),
        thenable.status)
      ) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
  }
  throw thenable;
}
function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
  var type = typeof children;
  if ("undefined" === type || "boolean" === type) children = null;
  var invokeCallback = !1;
  if (null === children) invokeCallback = !0;
  else
    switch (type) {
      case "bigint":
      case "string":
      case "number":
        invokeCallback = !0;
        break;
      case "object":
        switch (children.$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = !0;
            break;
          case REACT_LAZY_TYPE:
            return (
              (invokeCallback = children._init),
              mapIntoArray(
                invokeCallback(children._payload),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              )
            );
        }
    }
  if (invokeCallback)
    return (
      (callback = callback(children)),
      (invokeCallback =
        "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar),
      isArrayImpl(callback)
        ? ((escapedPrefix = ""),
          null != invokeCallback &&
            (escapedPrefix =
              invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
          mapIntoArray(callback, array, escapedPrefix, "", function (c) {
            return c;
          }))
        : null != callback &&
          (isValidElement(callback) &&
            (callback = cloneAndReplaceKey(
              callback,
              escapedPrefix +
                (null == callback.key ||
                (children && children.key === callback.key)
                  ? ""
                  : ("" + callback.key).replace(
                      userProvidedKeyEscapeRegex,
                      "$&/"
                    ) + "/") +
                invokeCallback
            )),
          array.push(callback)),
      1
    );
  invokeCallback = 0;
  var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
  if (isArrayImpl(children))
    for (var i = 0; i < children.length; i++)
      (nameSoFar = children[i]),
        (type = nextNamePrefix + getElementKey(nameSoFar, i)),
        (invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        ));
  else if (((i = getIteratorFn(children)), "function" === typeof i))
    for (
      children = i.call(children), i = 0;
      !(nameSoFar = children.next()).done;

    )
      (nameSoFar = nameSoFar.value),
        (type = nextNamePrefix + getElementKey(nameSoFar, i++)),
        (invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        ));
  else if ("object" === type) {
    if ("function" === typeof children.then)
      return mapIntoArray(
        resolveThenable(children),
        array,
        escapedPrefix,
        nameSoFar,
        callback
      );
    array = String(children);
    throw Error(
      "Objects are not valid as a React child (found: " +
        ("[object Object]" === array
          ? "object with keys {" + Object.keys(children).join(", ") + "}"
          : array) +
        "). If you meant to render a collection of children, use an array instead."
    );
  }
  return invokeCallback;
}
function mapChildren(children, func, context) {
  if (null == children) return children;
  var result = [],
    count = 0;
  mapIntoArray(children, result, "", "", function (child) {
    return func.call(context, child, count++);
  });
  return result;
}
function lazyInitializer(payload) {
  if (-1 === payload._status) {
    var ctor = payload._result;
    ctor = ctor();
    ctor.then(
      function (moduleObject) {
        if (0 === payload._status || -1 === payload._status)
          (payload._status = 1), (payload._result = moduleObject);
      },
      function (error) {
        if (0 === payload._status || -1 === payload._status)
          (payload._status = 2), (payload._result = error);
      }
    );
    -1 === payload._status && ((payload._status = 0), (payload._result = ctor));
  }
  if (1 === payload._status) return payload._result.default;
  throw payload._result;
}
var reportGlobalError =
    "function" === typeof reportError
      ? reportError
      : function (error) {
          if (
            "object" === typeof window &&
            "function" === typeof window.ErrorEvent
          ) {
            var event = new window.ErrorEvent("error", {
              bubbles: !0,
              cancelable: !0,
              message:
                "object" === typeof error &&
                null !== error &&
                "string" === typeof error.message
                  ? String(error.message)
                  : String(error),
              error: error
            });
            if (!window.dispatchEvent(event)) return;
          } else if (
            "object" === typeof process &&
            "function" === typeof process.emit
          ) {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        },
  Children = {
    map: mapChildren,
    forEach: function (children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function () {
          forEachFunc.apply(this, arguments);
        },
        forEachContext
      );
    },
    count: function (children) {
      var n = 0;
      mapChildren(children, function () {
        n++;
      });
      return n;
    },
    toArray: function (children) {
      return (
        mapChildren(children, function (child) {
          return child;
        }) || []
      );
    },
    only: function (children) {
      if (!isValidElement(children))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return children;
    }
  };
exports.Activity = REACT_ACTIVITY_TYPE;
exports.Children = Children;
exports.Component = Component;
exports.Fragment = REACT_FRAGMENT_TYPE;
exports.Profiler = REACT_PROFILER_TYPE;
exports.PureComponent = PureComponent;
exports.StrictMode = REACT_STRICT_MODE_TYPE;
exports.Suspense = REACT_SUSPENSE_TYPE;
exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
  ReactSharedInternals;
exports.__COMPILER_RUNTIME = {
  __proto__: null,
  c: function (size) {
    return ReactSharedInternals.H.useMemoCache(size);
  }
};
exports.cache = function (fn) {
  return function () {
    return fn.apply(null, arguments);
  };
};
exports.cacheSignal = function () {
  return null;
};
exports.cloneElement = function (element, config, children) {
  if (null === element || void 0 === element)
    throw Error(
      "The argument must be a React element, but you passed " + element + "."
    );
  var props = assign({}, element.props),
    key = element.key;
  if (null != config)
    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
      !hasOwnProperty.call(config, propName) ||
        "key" === propName ||
        "__self" === propName ||
        "__source" === propName ||
        ("ref" === propName && void 0 === config.ref) ||
        (props[propName] = config[propName]);
  var propName = arguments.length - 2;
  if (1 === propName) props.children = children;
  else if (1 < propName) {
    for (var childArray = Array(propName), i = 0; i < propName; i++)
      childArray[i] = arguments[i + 2];
    props.children = childArray;
  }
  return ReactElement(element.type, key, props);
};
exports.createContext = function (defaultValue) {
  defaultValue = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    _threadCount: 0,
    Provider: null,
    Consumer: null
  };
  defaultValue.Provider = defaultValue;
  defaultValue.Consumer = {
    $$typeof: REACT_CONSUMER_TYPE,
    _context: defaultValue
  };
  return defaultValue;
};
exports.createElement = function (type, config, children) {
  var propName,
    props = {},
    key = null;
  if (null != config)
    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
      hasOwnProperty.call(config, propName) &&
        "key" !== propName &&
        "__self" !== propName &&
        "__source" !== propName &&
        (props[propName] = config[propName]);
  var childrenLength = arguments.length - 2;
  if (1 === childrenLength) props.children = children;
  else if (1 < childrenLength) {
    for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
      childArray[i] = arguments[i + 2];
    props.children = childArray;
  }
  if (type && type.defaultProps)
    for (propName in ((childrenLength = type.defaultProps), childrenLength))
      void 0 === props[propName] &&
        (props[propName] = childrenLength[propName]);
  return ReactElement(type, key, props);
};
exports.createRef = function () {
  return { current: null };
};
exports.forwardRef = function (render) {
  return { $$typeof: REACT_FORWARD_REF_TYPE, render: render };
};
exports.isValidElement = isValidElement;
exports.lazy = function (ctor) {
  return {
    $$typeof: REACT_LAZY_TYPE,
    _payload: { _status: -1, _result: ctor },
    _init: lazyInitializer
  };
};
exports.memo = function (type, compare) {
  return {
    $$typeof: REACT_MEMO_TYPE,
    type: type,
    compare: void 0 === compare ? null : compare
  };
};
exports.startTransition = function (scope) {
  var prevTransition = ReactSharedInternals.T,
    currentTransition = {};
  ReactSharedInternals.T = currentTransition;
  try {
    var returnValue = scope(),
      onStartTransitionFinish = ReactSharedInternals.S;
    null !== onStartTransitionFinish &&
      onStartTransitionFinish(currentTransition, returnValue);
    "object" === typeof returnValue &&
      null !== returnValue &&
      "function" === typeof returnValue.then &&
      returnValue.then(noop, reportGlobalError);
  } catch (error) {
    reportGlobalError(error);
  } finally {
    null !== prevTransition &&
      null !== currentTransition.types &&
      (prevTransition.types = currentTransition.types),
      (ReactSharedInternals.T = prevTransition);
  }
};
exports.unstable_useCacheRefresh = function () {
  return ReactSharedInternals.H.useCacheRefresh();
};
exports.use = function (usable) {
  return ReactSharedInternals.H.use(usable);
};
exports.useActionState = function (action, initialState, permalink) {
  return ReactSharedInternals.H.useActionState(action, initialState, permalink);
};
exports.useCallback = function (callback, deps) {
  return ReactSharedInternals.H.useCallback(callback, deps);
};
exports.useContext = function (Context) {
  return ReactSharedInternals.H.useContext(Context);
};
exports.useDebugValue = function () {};
exports.useDeferredValue = function (value, initialValue) {
  return ReactSharedInternals.H.useDeferredValue(value, initialValue);
};
exports.useEffect = function (create, deps) {
  return ReactSharedInternals.H.useEffect(create, deps);
};
exports.useEffectEvent = function (callback) {
  return ReactSharedInternals.H.useEffectEvent(callback);
};
exports.useId = function () {
  return ReactSharedInternals.H.useId();
};
exports.useImperativeHandle = function (ref, create, deps) {
  return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
};
exports.useInsertionEffect = function (create, deps) {
  return ReactSharedInternals.H.useInsertionEffect(create, deps);
};
exports.useLayoutEffect = function (create, deps) {
  return ReactSharedInternals.H.useLayoutEffect(create, deps);
};
exports.useMemo = function (create, deps) {
  return ReactSharedInternals.H.useMemo(create, deps);
};
exports.useOptimistic = function (passthrough, reducer) {
  return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
};
exports.useReducer = function (reducer, initialArg, init) {
  return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
};
exports.useRef = function (initialValue) {
  return ReactSharedInternals.H.useRef(initialValue);
};
exports.useState = function (initialState) {
  return ReactSharedInternals.H.useState(initialState);
};
exports.useSyncExternalStore = function (
  subscribe,
  getSnapshot,
  getServerSnapshot
) {
  return ReactSharedInternals.H.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
};
exports.useTransition = function () {
  return ReactSharedInternals.H.useTransition();
};
exports.version = "19.2.4";


/***/ }),

/***/ 961:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



function checkDCE() {
  /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
  if (
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' ||
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function'
  ) {
    return;
  }
  if (false) {}
  try {
    // Verify that the code above has been dead code eliminated (DCE'd).
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    // DevTools shouldn't crash React, no matter what.
    // We should still report in case we break this code.
    console.error(err);
  }
}

if (true) {
  // DCE check should happen before ReactDOM bundle executes so that
  // DevTools can report bad minification during injection.
  checkDCE();
  module.exports = __webpack_require__(221);
} else {}


/***/ }),

/***/ 982:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(477);
} else {}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/************************************************************************/
var __webpack_exports__ = {};

// EXTERNAL MODULE: ./node_modules/react/jsx-runtime.js
var jsx_runtime = __webpack_require__(848);
// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(540);
// EXTERNAL MODULE: ./node_modules/react-dom/client.js
var client = __webpack_require__(338);
;// ./node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();


//# sourceMappingURL=mergeClasses.js.map

;// ./node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();


//# sourceMappingURL=toKebabCase.js.map

;// ./node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);


//# sourceMappingURL=toCamelCase.js.map

;// ./node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};


//# sourceMappingURL=toPascalCase.js.map

;// ./node_modules/lucide-react/dist/esm/defaultAttributes.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};


//# sourceMappingURL=defaultAttributes.js.map

;// ./node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};


//# sourceMappingURL=hasA11yProp.js.map

;// ./node_modules/lucide-react/dist/esm/Icon.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */






const Icon = (0,react.forwardRef)(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => (0,react.createElement)(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => (0,react.createElement)(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);


//# sourceMappingURL=Icon.js.map

;// ./node_modules/lucide-react/dist/esm/createLucideIcon.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */







const createLucideIcon = (iconName, iconNode) => {
  const Component = (0,react.forwardRef)(
    ({ className, ...props }, ref) => (0,react.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};


//# sourceMappingURL=createLucideIcon.js.map

;// ./node_modules/lucide-react/dist/esm/icons/chevron-left.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const __iconNode = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
const ChevronLeft = createLucideIcon("chevron-left", __iconNode);


//# sourceMappingURL=chevron-left.js.map

;// ./node_modules/lucide-react/dist/esm/icons/rotate-cw.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const rotate_cw_iconNode = [
  ["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", key: "1p45f6" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }]
];
const RotateCw = createLucideIcon("rotate-cw", rotate_cw_iconNode);


//# sourceMappingURL=rotate-cw.js.map

;// ./node_modules/lucide-react/dist/esm/icons/settings.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const settings_iconNode = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Settings = createLucideIcon("settings", settings_iconNode);


//# sourceMappingURL=settings.js.map

;// ./node_modules/lucide-react/dist/esm/icons/loader-circle.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const loader_circle_iconNode = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]];
const LoaderCircle = createLucideIcon("loader-circle", loader_circle_iconNode);


//# sourceMappingURL=loader-circle.js.map

;// ./node_modules/lucide-react/dist/esm/icons/heart.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const heart_iconNode = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
      key: "mvr1a0"
    }
  ]
];
const Heart = createLucideIcon("heart", heart_iconNode);


//# sourceMappingURL=heart.js.map

;// ./node_modules/lucide-react/dist/esm/icons/bookmark.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const bookmark_iconNode = [
  [
    "path",
    {
      d: "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
      key: "oz39mx"
    }
  ]
];
const Bookmark = createLucideIcon("bookmark", bookmark_iconNode);


//# sourceMappingURL=bookmark.js.map

;// ./node_modules/lucide-react/dist/esm/icons/plus.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const plus_iconNode = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
const Plus = createLucideIcon("plus", plus_iconNode);


//# sourceMappingURL=plus.js.map

;// ./custom-apps/anonymous-xiaohongshu/src/bilingual-text.ts
// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.
function containsChinese(text) {
    return /[\u3400-\u9fff]/.test(text);
}
function normalizeBilingualTextInput(text) {
    return text.replace(/\\r\\n|\\n|\\r/g, "\n");
}
function splitSegmentedBilingualLine(line) {
    const parts = line.split("|").map(part => part.trim());
    if (parts.length < 2 || parts.some(part => !part))
        return null;
    if (parts.length === 3) {
        const [originalLabel, mixedLabelAndOriginal, translatedValue] = parts;
        const colonIndex = mixedLabelAndOriginal.search(/[:：]/);
        if (colonIndex > 0 && containsChinese(translatedValue) && !containsChinese(originalLabel)) {
            const translatedLabel = mixedLabelAndOriginal.slice(0, colonIndex + 1).trim();
            const originalValue = mixedLabelAndOriginal.slice(colonIndex + 1).trim();
            if (translatedLabel && originalValue && containsChinese(translatedLabel)) {
                return {
                    original: `${originalLabel}: ${originalValue}`,
                    translated: `${translatedLabel} ${translatedValue}`,
                };
            }
        }
    }
    if (parts.length % 2 !== 0)
        return null;
    const originalParts = [];
    const translatedParts = [];
    let hasNonChineseOriginal = false;
    for (let index = 0; index < parts.length; index += 2) {
        const original = parts[index];
        const translated = parts[index + 1];
        if (!translated || !containsChinese(translated))
            return null;
        if (!containsChinese(original))
            hasNonChineseOriginal = true;
        originalParts.push(original);
        translatedParts.push(translated);
    }
    if (!hasNonChineseOriginal)
        return null;
    return {
        original: originalParts.join(" | "),
        translated: translatedParts.join(" | "),
    };
}
function splitBilingualText(text) {
    const trimmed = normalizeBilingualTextInput(text).trim();
    if (!trimmed || trimmed.includes("```") || /<script\b|<style\b/i.test(trimmed))
        return null;
    const firstPipe = trimmed.indexOf("|");
    if (firstPipe <= 0)
        return null;
    if (firstPipe === trimmed.lastIndexOf("|")) {
        const original = trimmed.slice(0, firstPipe).trim();
        const translated = trimmed.slice(firstPipe + 1).trim();
        if (!original || !translated)
            return null;
        if (!containsChinese(translated))
            return null;
        return { original, translated };
    }
    if (trimmed.includes("\n")) {
        const originalLines = [];
        const translatedLines = [];
        let bilingualLineCount = 0;
        for (const rawLine of trimmed.split("\n")) {
            const line = rawLine.trim();
            if (!line) {
                originalLines.push("");
                translatedLines.push("");
                continue;
            }
            const linePipe = line.indexOf("|");
            if (linePipe > 0 && linePipe === line.lastIndexOf("|")) {
                const lineOriginal = line.slice(0, linePipe).trim();
                const lineTranslated = line.slice(linePipe + 1).trim();
                if (!lineOriginal || !lineTranslated || !containsChinese(lineTranslated))
                    return null;
                originalLines.push(lineOriginal);
                translatedLines.push(lineTranslated);
                bilingualLineCount += 1;
                continue;
            }
            if (line.includes("|")) {
                const segmented = splitSegmentedBilingualLine(line);
                if (!segmented)
                    return null;
                originalLines.push(segmented.original);
                translatedLines.push(segmented.translated);
                bilingualLineCount += 1;
                continue;
            }
            originalLines.push(line);
            translatedLines.push(line);
        }
        if (bilingualLineCount === 0)
            return null;
        const original = originalLines.join("\n").trim();
        const translated = translatedLines.join("\n").trim();
        if (!original || !translated || !containsChinese(translated))
            return null;
        return { original, translated };
    }
    const segmented = splitSegmentedBilingualLine(trimmed);
    if (segmented)
        return segmented;
    return null;
}

;// ./custom-apps/anonymous-xiaohongshu/src/bilingual-component.tsx
// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.
"use client";



function normalizeCheckPhoneText(value) {
    return normalizeBilingualTextInput(value);
}
function CheckPhoneBilingualText({ text, className = "", tone = "default", variant = "block", collapseBilingualTranslation: collapseBilingualTranslationOverride, }) {
    const normalized = normalizeCheckPhoneText(text);
    const bilingual = splitBilingualText(normalized);
    const [settingsCollapseBilingualTranslation, setSettingsCollapseBilingualTranslation] = (0,react.useState)(true);
    const [expanded, setExpanded] = (0,react.useState)(false);
    const collapseBilingualTranslation = collapseBilingualTranslationOverride ?? settingsCollapseBilingualTranslation;
    (0,react.useEffect)(() => {
        setExpanded(!collapseBilingualTranslation);
    }, [normalized, collapseBilingualTranslation]);
    if (!bilingual) {
        return (0,jsx_runtime.jsx)("span", { className: className, children: normalized });
    }
    function toggle(event) {
        event.stopPropagation();
        setExpanded((current) => !current);
    }
    function handleKeyDown(event) {
        if (event.key !== "Enter" && event.key !== " ")
            return;
        event.preventDefault();
        toggle(event);
    }
    return ((0,jsx_runtime.jsxs)("span", { className: `cp-bilingual cp-bilingual--${tone} cp-bilingual--${variant} ${className}`.trim(), children: [(0,jsx_runtime.jsx)("span", { className: "cp-bilingual-original", children: bilingual.original }), (0,jsx_runtime.jsx)("span", { className: "cp-bilingual-toggle", role: "button", tabIndex: 0, onClick: toggle, onKeyDown: handleKeyDown, "aria-expanded": expanded, children: expanded ? "收起中文" : "中文" }), expanded && variant === "inline" ? ((0,jsx_runtime.jsxs)(jsx_runtime.Fragment, { children: [(0,jsx_runtime.jsx)("span", { className: "cp-bilingual-inline-separator", "aria-hidden": "true", children: " " }), (0,jsx_runtime.jsx)("span", { className: "cp-bilingual-translation", children: bilingual.translated })] })) : null, expanded && variant === "block" ? ((0,jsx_runtime.jsxs)(jsx_runtime.Fragment, { children: [(0,jsx_runtime.jsx)("span", { className: "cp-bilingual-divider", "aria-hidden": "true" }), (0,jsx_runtime.jsx)("span", { className: "cp-bilingual-translation", children: bilingual.translated })] })) : null] }));
}

;// ./custom-apps/anonymous-xiaohongshu/src/baseline-ui.tsx

// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.




const DEFAULT_XHS_AVATARS = (/* unused pure expression or super */ null && ([
    "/xiaohongshu/avatars/default-01.png",
    "/xiaohongshu/avatars/default-02.png",
    "/xiaohongshu/avatars/default-03.png",
    "/xiaohongshu/avatars/default-04.png",
    "/xiaohongshu/avatars/default-05.png",
    "/xiaohongshu/avatars/default-06.png",
]));
const XHS_MAX_IMAGE_HEIGHT_RATIO = 4 / 3;
const XHS_TEXT_IMAGE_HEIGHT_RATIO = 1.18;
const XHS_VIDEO_IMAGE_HEIGHT_RATIO = XHS_TEXT_IMAGE_HEIGHT_RATIO;
const DEFAULT_XHS_IMAGE_FRAME_STYLE = { aspectRatio: `1 / ${XHS_MAX_IMAGE_HEIGHT_RATIO}` };
const TEXT_XHS_IMAGE_FRAME_STYLE = { aspectRatio: `1 / ${XHS_TEXT_IMAGE_HEIGHT_RATIO}` };
const VIDEO_XHS_IMAGE_FRAME_STYLE = { aspectRatio: `1 / ${XHS_VIDEO_IMAGE_HEIGHT_RATIO}` };
const ICON_XHS_IMAGE_FRAME_STYLES = {
    compact: { aspectRatio: "1 / 0.9" },
    regular: { aspectRatio: `1 / ${XHS_TEXT_IMAGE_HEIGHT_RATIO}` },
    tall: { aspectRatio: `1 / ${XHS_MAX_IMAGE_HEIGHT_RATIO}` },
};
function formatCount(value) {
    if (value >= 10000)
        return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
    if (value >= 1000)
        return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    return String(Math.max(0, Math.round(value)));
}
function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "";
    const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 60)
        return `${diffMinutes}分钟前`;
    if (diffMinutes < 1440)
        return `${Math.round(diffMinutes / 60)}小时前`;
    return `${Math.round(diffMinutes / 1440)}天前`;
}
function hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
}
function pickDefaultAvatar(seed) {
    return DEFAULT_XHS_AVATARS[hashString(seed || "npc") % DEFAULT_XHS_AVATARS.length];
}
function XhsAvatar({ className, src, name }) {
    const isDefaultAvatar = Boolean(src?.startsWith("/xiaohongshu/avatars/"));
    return ((0,jsx_runtime.jsx)("div", { className: `${className}${isDefaultAvatar ? " xhs-default-avatar" : ""}`, children: src ? (0,jsx_runtime.jsx)("img", { src: src, alt: "" }) : (0,jsx_runtime.jsx)("span", { children: (name || "?").slice(0, 1) }) }));
}
function XhsDislikeIcon() {
    return ((0,jsx_runtime.jsxs)("svg", { className: "xhs-comment-dislike-icon", width: "20", height: "20", viewBox: "0 0 24 24", "aria-hidden": "true", children: [(0,jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "9.2" }), (0,jsx_runtime.jsx)("path", { d: "M8.3 9.7h1.9" }), (0,jsx_runtime.jsx)("path", { d: "M13.8 9.7h1.9" }), (0,jsx_runtime.jsx)("path", { d: "M8.9 15.5c1.7-.85 4.5-.85 6.2 0" })] }));
}
function getImageFrameStyle(width, height) {
    if (!width || !height || width <= 0 || height <= 0)
        return DEFAULT_XHS_IMAGE_FRAME_STYLE;
    const heightRatio = Math.min(height / width, XHS_MAX_IMAGE_HEIGHT_RATIO);
    return { aspectRatio: `1 / ${heightRatio.toFixed(4)}` };
}
function getXhsPlainText(text) {
    const normalized = normalizeBilingualTextInput(text);
    return splitBilingualText(normalized)?.original ?? normalized;
}
function getNoteCardVariant(note) {
    const textLength = getXhsPlainText(note.body).length + getXhsPlainText(note.title).length;
    if (textLength > 95)
        return "tall";
    if (textLength > 54)
        return "regular";
    return "compact";
}
function getIconImageFrameStyle(note) {
    return ICON_XHS_IMAGE_FRAME_STYLES[getNoteCardVariant(note)];
}
function NoteDetailSlider({ note, imageIds, imageMap, }) {
    const [activeSlide, setActiveSlide] = (0,react.useState)(0);
    return ((0,jsx_runtime.jsxs)("div", { className: "xhs-note-slider-container", style: getImageFrameStyle(note.imageWidth, note.imageHeight), children: [(0,jsx_runtime.jsx)("div", { className: "xhs-note-slider-track", onScroll: (e) => {
                    const el = e.currentTarget;
                    const index = Math.round(el.scrollLeft / (el.clientWidth || 1));
                    setActiveSlide(index);
                }, children: imageIds.map((id, idx) => ((0,jsx_runtime.jsx)("div", { className: "xhs-note-slider-item", children: imageMap[id] ? ((0,jsx_runtime.jsx)("img", { src: imageMap[id], alt: `Slide ${idx + 1}`, className: "xhs-note-real-image" })) : ((0,jsx_runtime.jsx)("div", { className: "cp-xhs-cover cp-xhs-cover--ivory", style: { width: "100%", height: "100%" } })) }, id || idx))) }), (0,jsx_runtime.jsxs)("div", { className: "xhs-note-slider-indicator", children: [activeSlide + 1, " / ", imageIds.length] }), (0,jsx_runtime.jsx)("div", { className: "xhs-note-slider-dots", children: imageIds.map((_, idx) => ((0,jsx_runtime.jsx)("span", { className: `xhs-slider-dot ${idx === activeSlide ? "is-active" : ""}` }, idx))) })] }));
}
function NoteImage({ note, imageMap, hideTextImageDescription = false, collapseBilingualTranslation, isDetail, }) {
    const imageIds = (note.imageAssetIds && note.imageAssetIds.length > 0)
        ? note.imageAssetIds
        : (note.imageAssetId ? [note.imageAssetId] : []);
    if (note.type === "video") {
        return ((0,jsx_runtime.jsx)("div", { className: `cp-xhs-cover cp-xhs-cover--video cp-xhs-cover--${note.tone}`, style: VIDEO_XHS_IMAGE_FRAME_STYLE, children: note.imageAssetId && imageMap[note.imageAssetId] ? ((0,jsx_runtime.jsx)("img", { src: imageMap[note.imageAssetId], alt: "", className: "xhs-video-real-image" })) : ((0,jsx_runtime.jsx)("span", { children: note.videoDescription || note.imageDescription ? ((0,jsx_runtime.jsx)(CheckPhoneBilingualText, { text: note.videoDescription || note.imageDescription || "", tone: "light", collapseBilingualTranslation: collapseBilingualTranslation })) : note.coverIcon })) }));
    }
    if (imageIds.length > 0 && imageIds.some(id => Boolean(imageMap[id]))) {
        if (isDetail && imageIds.length > 1) {
            return (0,jsx_runtime.jsx)(NoteDetailSlider, { note: note, imageIds: imageIds, imageMap: imageMap });
        }
        const firstImgId = imageIds.find(id => Boolean(imageMap[id])) || imageIds[0];
        return ((0,jsx_runtime.jsxs)("div", { className: "xhs-note-real-image-frame", style: getImageFrameStyle(note.imageWidth, note.imageHeight), children: [(0,jsx_runtime.jsx)("img", { src: imageMap[firstImgId], alt: "", className: "xhs-note-real-image" }), !isDetail && imageIds.length > 1 ? ((0,jsx_runtime.jsx)("div", { className: "xhs-waterfall-multi-badge", children: (0,jsx_runtime.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: [(0,jsx_runtime.jsx)("rect", { x: "3", y: "3", width: "14", height: "14", rx: "2" }), (0,jsx_runtime.jsx)("path", { d: "M7 21h12a2 2 0 0 0 2-2V7" })] }) })) : null] }));
    }
    if (note.imageDescription?.trim() && !hideTextImageDescription) {
        return ((0,jsx_runtime.jsx)("div", { className: `cp-xhs-cover cp-xhs-cover--${note.tone} xhs-note-text-image`, style: TEXT_XHS_IMAGE_FRAME_STYLE, children: (0,jsx_runtime.jsx)("span", { children: (0,jsx_runtime.jsx)(CheckPhoneBilingualText, { text: note.imageDescription, tone: "xiaohongshu", collapseBilingualTranslation: collapseBilingualTranslation }) }) }));
    }
    return ((0,jsx_runtime.jsx)("div", { className: `cp-xhs-cover cp-xhs-cover--${note.tone}`, style: getIconImageFrameStyle(note), children: (0,jsx_runtime.jsx)("span", { className: "cp-xhs-cover-icon", children: note.coverIcon }) }));
}
function NoteCard({ note, imageMap, avatarSrc, onOpen, hideTextImageDescription, collapseBilingualTranslation, }) {
    const variant = getNoteCardVariant(note);
    return ((0,jsx_runtime.jsxs)("button", { type: "button", className: `cp-xhs-note-card cp-xhs-note-card--${variant}`, onClick: onOpen, children: [(0,jsx_runtime.jsx)(NoteImage, { note: note, imageMap: imageMap, hideTextImageDescription: hideTextImageDescription, collapseBilingualTranslation: collapseBilingualTranslation }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-note-body", children: [(0,jsx_runtime.jsx)("strong", { children: (0,jsx_runtime.jsx)(CheckPhoneBilingualText, { text: note.title, tone: "xiaohongshu", collapseBilingualTranslation: collapseBilingualTranslation }) }), (0,jsx_runtime.jsx)("p", { children: (0,jsx_runtime.jsx)(CheckPhoneBilingualText, { text: note.body, tone: "xiaohongshu", collapseBilingualTranslation: collapseBilingualTranslation }) }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-note-foot", children: [(0,jsx_runtime.jsxs)("div", { className: "cp-xhs-note-author", children: [(0,jsx_runtime.jsx)(XhsAvatar, { className: "cp-xhs-note-author-avatar", src: avatarSrc, name: note.authorName }), (0,jsx_runtime.jsx)("span", { children: note.authorName })] }), (0,jsx_runtime.jsxs)("em", { className: note.liked ? "is-liked" : "", children: [(0,jsx_runtime.jsx)(Heart, { size: 12, strokeWidth: 2.4, fill: note.liked ? "currentColor" : "none" }), formatCount(note.likeCount)] })] })] })] }));
}
function orderCommentsForDisplay(comments) {
    const byId = new Map(comments.map(comment => [comment.id, comment]));
    const indexById = new Map(comments.map((comment, index) => [comment.id, index]));
    const childrenByParent = new Map();
    const childIds = new Set();
    function wouldCreateCycle(commentId, parentId) {
        const seen = new Set([commentId]);
        let currentId = parentId;
        while (currentId) {
            if (seen.has(currentId))
                return true;
            seen.add(currentId);
            currentId = byId.get(currentId)?.replyToCommentId || "";
        }
        return false;
    }
    comments.forEach((comment) => {
        const parentId = comment.replyToCommentId;
        if (!parentId || !byId.has(parentId) || wouldCreateCycle(comment.id, parentId))
            return;
        childIds.add(comment.id);
        const children = childrenByParent.get(parentId) ?? [];
        children.push(comment);
        childrenByParent.set(parentId, children);
    });
    // 小红书式二级平铺：每条顶级评论下，把它的全部后代（回复、回复的回复…）
    // 平铺成一层，统一按添加顺序排——避免线程式 DFS 里"回复的回复"插队到
    // 更早的同级回复前面。
    const ordered = [];
    const visited = new Set();
    function collectDescendants(id, acc) {
        for (const child of childrenByParent.get(id) ?? []) {
            if (visited.has(child.id))
                continue;
            visited.add(child.id);
            acc.push(child);
            collectDescendants(child.id, acc);
        }
    }
    for (const comment of comments) {
        if (childIds.has(comment.id) || visited.has(comment.id))
            continue;
        visited.add(comment.id);
        ordered.push(comment);
        const descendants = [];
        collectDescendants(comment.id, descendants);
        descendants.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
        ordered.push(...descendants);
    }
    // 兜底：循环引用等漏网的评论追加在末尾
    for (const comment of comments) {
        if (!visited.has(comment.id)) {
            visited.add(comment.id);
            ordered.push(comment);
        }
    }
    return ordered;
}
function CommentList({ comments, getAvatar, onReply, onDeleteComment, onVoteComment, collapseBilingualTranslation, }) {
    if (comments.length === 0)
        return (0,jsx_runtime.jsx)("div", { className: "cp-xhs-mini-empty", children: "\u8FD8\u6CA1\u6709\u8BC4\u8BBA" });
    const orderedComments = orderCommentsForDisplay(comments);
    return ((0,jsx_runtime.jsx)(jsx_runtime.Fragment, { children: orderedComments.map((comment) => {
            const parentComment = comment.replyToCommentId
                ? comments.find(item => item.id === comment.replyToCommentId)
                : null;
            const targetName = parentComment?.authorName ?? (!comment.replyToCommentId ? comment.replyTo : undefined);
            const depth = parentComment || (!comment.replyToCommentId && comment.replyTo) ? 1 : 0;
            return ((0,jsx_runtime.jsxs)("div", { className: `cp-xhs-comment-card cp-xhs-comment-card--depth-${depth}`, children: [(0,jsx_runtime.jsx)(XhsAvatar, { className: "cp-xhs-comment-avatar", src: getAvatar(comment), name: comment.authorName }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-comment-content", children: [(0,jsx_runtime.jsxs)("strong", { children: [comment.authorName, targetName ? (0,jsx_runtime.jsxs)(jsx_runtime.Fragment, { children: [(0,jsx_runtime.jsx)("span", { className: "cp-xhs-comment-reply-label", children: "\u56DE\u590D" }), targetName] }) : null] }), (0,jsx_runtime.jsx)("p", { children: (0,jsx_runtime.jsx)(CheckPhoneBilingualText, { text: comment.text, tone: "xiaohongshu", variant: "inline", collapseBilingualTranslation: collapseBilingualTranslation }) }), (0,jsx_runtime.jsxs)("div", { className: "xhs-comment-actions", children: [(0,jsx_runtime.jsxs)("div", { className: "xhs-comment-text-actions", children: [(0,jsx_runtime.jsx)("time", { className: "xhs-comment-time", dateTime: comment.createdAt, children: formatTime(comment.createdAt) }), (0,jsx_runtime.jsx)("button", { type: "button", onClick: () => onReply(comment), children: "\u56DE\u590D" }), (0,jsx_runtime.jsx)("button", { type: "button", onClick: () => onDeleteComment(comment), children: "\u5220\u9664" })] }), (0,jsx_runtime.jsxs)("div", { className: "xhs-comment-vote-actions", children: [(0,jsx_runtime.jsxs)("button", { type: "button", className: `xhs-comment-vote-btn ${comment.liked ? "is-active" : ""}`, onClick: () => onVoteComment(comment, "like"), "aria-label": "\u70B9\u8D5E\u8BC4\u8BBA", children: [(0,jsx_runtime.jsx)(Heart, { size: 20, strokeWidth: 2.15, fill: comment.liked ? "currentColor" : "none" }), comment.likeCount > 0 ? (0,jsx_runtime.jsx)("span", { children: formatCount(comment.likeCount) }) : null] }), (0,jsx_runtime.jsxs)("button", { type: "button", className: `xhs-comment-vote-btn ${comment.disliked ? "is-active is-disliked" : ""}`, onClick: () => onVoteComment(comment, "dislike"), "aria-label": "\u70B9\u8E29\u8BC4\u8BBA", children: [(0,jsx_runtime.jsx)(XhsDislikeIcon, {}), comment.dislikeCount > 0 ? (0,jsx_runtime.jsx)("span", { children: formatCount(comment.dislikeCount) }) : null] })] })] })] })] }, comment.id));
        }) }));
}

;// ./custom-apps/anonymous-xiaohongshu/src/adapters/host.ts
function host() { const api = window.AiPhone || window.AiPhoneApp; if (!api?.ai?.startTask || !api.app?.setPolicy)
    throw Error('需要已安装 Phase 0.5 Host Capability Patch 的 Float 浏览器 Host。'); return api; }

;// ./custom-apps/anonymous-xiaohongshu/src/bilingual-prompt-defaults.ts
// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.
const DEFAULT_CHECKPHONE_BILINGUAL_PROMPT = "This rule only applies to non-Chinese output; Chinese text should be output normally. For readable phone-check text, including titles, bodies, notes, comments, messages, inner thoughts, feelings, status text, Moments, posts, and feed bodies, non-Chinese content must use: complete original text|complete Simplified Chinese translation. For non-Chinese Moments/post/feed body text, keep the original and Chinese translation in the same field; do not put the Chinese translation in a separate paragraph or line without \"|\". Use \"|\" only as the whole-text bilingual separator; use colons, commas, or line breaks inside the text.";
const DEFAULT_XIAOHONGSHU_BILINGUAL_PROMPT = [
    "【小红书双语输出规则（仅非中文角色使用，中文角色忽略此规则）】",
    "- 只对小红书角色生成内容生效，包括帖子标题、正文、评论、回复、图片描述、视频描述、私信正文等自然语言内容。",
    "- 不要改动结构标签、块标题或字段名，例如 #评论1、#角色回复、[标题]、[正文]、[内容]、[图片描述]、[视频描述]。",
    "- 如果某个字段内容使用非中文语言，字段值必须写成“完整原文|对应的简体中文译文”。",
    "- 如果内容本来就是中文，正常输出中文，不要添加 |译文。",
    "- 竖线 | 只作为完整原文和完整译文之间的分隔符，不要在原文或译文内部滥用。",
].join("\n");
const DEFAULT_CHAT_BILINGUAL_PROMPT = [
    "【双语输出规则（仅非中文角色使用，中文角色忽略此规则)】",
    "**双语输出作用范围**：聊天消息正文、[语音条:...]中的语音内容文字、[引用:原文片段]后面的回复内容、[内心]...[/内心]中的内心想法。当本轮回复使用非中文语言时，以上内容必须使用“原文|对应的简体中文译文”的格式输出",
    "**格式要求**：",
    "- 原文在前，简体中文译文在后，中间只使用一个竖线 |",
    "- 如果内容本来就是中文，则不要添加 |译文",
    "- 不要改动原有富媒体指令格式，只在其中的文本内容内部追加 |中文译文",
    "- [引用:...] 中引用锚点(引用原文）保持原格式，不需要翻译；只翻译其后的回复内容",
].join("\n");
const DEFAULT_GROUP_CHAT_BILINGUAL_PROMPT = [
    "【群聊双语规则（仅非中文角色使用，中文角色忽略此规则)】",
    "不同角色这一轮可以使用不同语言，请对每个角色的每条发言分别判断。",
    "要求：",
    "- **中文正常输出**：如果该条发言是中文，直接正常输出，不要添加译文",
    "- **非中文翻译格式要求**：如果该条发言使用非中文语言，则该条发言内容必须使用“原文|对应的简体中文译文”的格式输出，必须在原文和译文之间用|分割",
    "- **不改变协议头**：只在 [角色名]: 后面的正文内部使用双语格式，不要改动 [角色名]: 前缀",
].join("\n");
const DEFAULT_OFFLINE_CHAT_BILINGUAL_PROMPT = [
    "【线下双语规则（仅非中文角色对白使用，中文对白忽略此规则）】",
    "- 只对 <content> 中角色直接说出口的对白生效。",
    "- 旁白、动作描写、环境描写、事实陈述、心理/氛围陈述、摘要字段都不要双语，不要添加 |译文。",
    "- 如果角色对白使用非中文语言，请把该对白单独成行，写成“完整原文|对应的简体中文译文”。",
    "- 使用双语格式的对白必须作为独立段落输出，前后用空行与旁白隔开；不要把旁白和“原文|译文”混在同一段。",
    "- 如果对白本来就是中文，正常输出中文，不要添加 |译文。",
    "- 不要改动 <content>、摘要 XML 标签或其他结构标签。",
].join("\n");
const DEFAULT_GROUP_OFFLINE_CHAT_BILINGUAL_PROMPT = [
    "【群聊线下双语规则（仅非中文角色对白使用，中文对白忽略此规则）】",
    "- 只对 <content> 中群成员实际说出口的直接对白生效。",
    "- 旁白、动作描写、环境描写、事实陈述、群体氛围陈述、摘要字段都不要双语，不要添加 |译文。",
    "- 如果某个角色的对白使用非中文语言，请把该对白单独成行，写成“完整原文|对应的简体中文译文”。",
    "- 使用双语格式的对白必须作为独立段落输出，前后用空行与旁白或其他动作隔开；不要把旁白和“原文|译文”混在同一段。",
    "- 不要为了双语恢复 [角色名]: 群聊气泡格式；仍然遵守线下连续叙事和 XML 输出格式。",
    "- 中文对白正常输出，不要添加 |译文；不要改动 XML 标签。",
].join("\n");
const DEFAULT_MOMENTS_BILINGUAL_PROMPT = [
    "【朋友圈双语规则（仅非中文角色使用，中文角色忽略此规则)】",
    "- **不改变协议头和结构标签**：只对你实际输出的正文内容使用双语格式，不要翻译或改动协议头和结构标签，不要改动 [回复 昵称]、[不回复]、[NPC点赞]、[NPC评论]、昵称、以及“昵称 回复 被回复者昵称:”这类结构。",
    "- **中文正常输出无需译文**：如果正文是中文，直接正常输出，不要添加译文",
    "- **非中文语言译文输出格式**：非中文语言，正文必须使用“原文|对应的简体中文译文”的格式输出，必须有|分割符号。",
    "- **朋友圈正文双语补充**：如果朋友圈正文、评论正文或回复正文使用非中文，必须在同一段正文里写成“完整外文原文|完整简体中文译文”。",
    "- **照片双语规则**：如果输出 [照片:使用参考图:描述] 或 [照片:不使用参考图:描述]，只允许描述部分使用双语格式，不要改动照片标签外层结构。",
].join("\n");
const DEFAULT_READING_BILINGUAL_PROMPT = [
    "【阅读双语规则（仅非中文角色使用，中文角色忽略此规则)】",
    "**作用范围**：对讨论正文（消息回复）和批注生效",
    "**输出格式**：",
    "- 中文正常输出无需译文：如果讨论正文/回复消息是中文，直接正常输出，不要添加译文",
    "- 非中文情况下译文输出格式：如果讨论正文/回复消息使用非中文语言，则正文使用“原文|对应的简体中文译文”的格式输出",
    "- 不要改变协议头，只对内容本身作用：只对内容本身输出译文，不要改变 [批注:N]...[/批注]、【新增批注 ...】、【删除批注 ...】、【修改批注 ...】这些结构",
].join("\n");
const DEFAULT_VN_BILINGUAL_PROMPT = [
    "【对白双语规则（仅非中文角色使用，中文角色忽略此规则)】",
    "- **只有对白需要双语**：只有对白需要判断是否双语，旁白、动作、环境描写一律正常输出，不要添加译文，只有角色名|\"台词\"里的台词部分允许使用双语格式",
    "- **中文正常输出无需译文**：如果对白台词是中文，直接正常输出，不要添加译文",
    "- **非中文译文输出规则**：如果对白台词使用非中文语言，则台词部分必须使用“原文|对应的简体中文译文”的格式输出，格式为：角色名|\"原文|对应的简体中文译文\"",
    "- **不可改动协议头**：不要改动 <scene>、角色名|、引号、bg、sprite、<options> 等结构",
].join("\n");
const DEFAULT_ADVENTURE_BILINGUAL_PROMPT = [
    "【角色双语规则（仅非中文角色使用，中文角色忽略此规则)】",
    "- **只对speech字段生效**：只对你输出 JSON 中的 speech 字段生效。action、emotion、affinity 保持正常格式，不要翻译，不要双语",
    "- **中文无需译文**：如果 speech 是中文，直接正常输出，不要添加译文。",
    "- **非中文译文格式**：如果 speech 使用非中文语言，则 speech 使用“原文|对应的简体中文译文”的格式输出，必须有|分割。",
    "- **json结构不变**：必须严格保持 JSON 结构和字段名不变",
].join("\n");
function resolveBilingualPrompt(enabled, customPrompt, defaultPrompt) {
    if (!enabled)
        return "";
    const prompt = customPrompt?.trim();
    return prompt || defaultPrompt;
}

;// ./custom-apps/anonymous-xiaohongshu/src/xiaohongshu-types.ts
// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.

const DEFAULT_XIAOHONGSHU_PROFILE = {
    nickname: "我",
    handle: "rednote_user",
    ipLocation: "未知",
    signature: "记录一点日常。",
    gender: "♀",
    followingCount: 0,
    followerCount: 0,
    likedAndSavedCount: 0,
};
const DEFAULT_XIAOHONGSHU_NPC_IDENTITY_GUARD_PROMPT = [
    "<xiaohongshu_npc_identity_guard>",
    "以下名字属于真实角色或用户，NPC 严禁冒用这些名字作为笔记作者、评论作者、回复作者、点赞/收藏/关注昵称或私信发送者：",
    "{{xiaohongshuReservedNames}}",
    "如果需要普通路人，请自创与上述名单不相同、不近似的昵称。",
    "</xiaohongshu_npc_identity_guard>",
].join("\n");
const DEFAULT_XIAOHONGSHU_NPC_FEED_PROMPT = [
    "你正在生成一个仿小红书首页内容流。",
    "请输出 6 条 #首页笔记、6 条 #视频笔记、4 条 #附近笔记，每条都要像真实小红书陌生网友内容。",
    "内容可以是生活分享、吐槽、求助、种草、城市日常、情绪记录、教程、穿搭、美食、学习、工作、旅行等。",
    "如果上下文给出用户关注的账号，可以适当提高这些账号再次出现的概率，但不要每次都出现。",
    "如果上下文给出 [用户IP属地]，#附近笔记 需要围绕该属地或同城/附近城市生成本地生活、同城吐槽、附近求助、城市日常等内容。",
    "每条笔记要包含点赞数、收藏数、评论数和 3 到 8 条评论；输出的评论只是评论区样例，不代表全部评论。",
    "如需楼中楼，使用 [评论N回复对象]评论M，其中 M 必须是前面已经出现过的评论编号。",
    "楼中楼示例：评论2回复评论1时，必须写 [评论2回复对象]评论1，不要写昵称、评论ID或其他文字。",
    "",
    "活人感要求：",
    "- 笔记以碎片化、去精致化的日常分享为主，标题正文口语化、可用网络黑话/表情/不完整句，不煽情、不装逼、不写小作文；多种形式并存（吐槽、疑问、求助、种草、踩雷、晒图、碎碎念等）。",
    "- *绝对禁止讲大道理、爹味说教、强行把日常上升高度*，内容落于实际、轻松幽默。",
    "- 评论区禁止一边倒夸作者；NPC不脸谱化，多种性格并存（尖锐的、温和的、挑事的、看戏的、蹲后续的、跑题的、抬杠的、求链接的），可体现不同观点甚至轻微争执。",
    "- *绝对禁止“引用正文/评论原文+这句太真实了/说到我心趴上了”这种格式*。",
    "",
    "输出格式：",
    "#首页笔记1",
    "[作者]昵称",
    "[标题]标题",
    "[正文]正文",
    "[图标]单个 emoji 或符号",
    "[点赞]数字",
    "[收藏]数字",
    "[评论数]数字",
    "[标签]标签1、标签2",
    "[评论1作者]昵称",
    "[评论1内容]评论内容",
    "[评论2作者]昵称",
    "[评论2回复对象]评论1",
    "[评论2内容]回复评论1的楼中楼内容",
    "",
    "#视频笔记1",
    "[作者]昵称",
    "[标题]标题",
    "[正文]发布文案",
    "[视频描述]视频画面描述",
    "[图标]单个 emoji 或符号",
    "[点赞]数字",
    "[收藏]数字",
    "[评论数]数字",
    "[标签]标签1、标签2",
    "[评论1作者]昵称",
    "[评论1内容]评论内容",
    "[评论2作者]昵称",
    "[评论2回复对象]评论1",
    "[评论2内容]回复评论1的楼中楼内容",
    "",
    "#附近笔记1",
    "[作者]昵称",
    "[标题]标题",
    "[正文]同城/附近相关正文",
    "[图标]单个 emoji 或符号",
    "[点赞]数字",
    "[收藏]数字",
    "[评论数]数字",
    "[标签]标签1、标签2",
    "[评论1作者]昵称",
    "[评论1内容]评论内容",
    "[评论2作者]昵称",
    "[评论2回复对象]评论1",
    "[评论2内容]回复评论1的楼中楼内容",
].join("\n");
const DEFAULT_XIAOHONGSHU_NPC_USER_POST_REACTION_PROMPT = [
    "你正在模拟小红书陌生网友对用户刚发布笔记的互动。",
    "根据用户笔记内容、TAG、图片内容、已有评论，生成自然的平台互动。",
    "需要输出点赞数、收藏数、前两个点赞昵称、前两个收藏昵称、评论、新增关注和私信。",
    "如果这条笔记可能吸引新粉丝，请输出 [新增关注]数字 和 [关注用户N]昵称；如果没有新增关注，可以填 0 或省略。",
    "All generated comments and replies must come from NPC Xiaohongshu strangers, not from the post author.",
    "The post author must never appear as a generated commenter, replier, liker, saver, follower, or private-message sender.",
    "Do not use the user's nickname, Xiaohongshu ID, profile name, configured persona name, or wording such as \"楼主\", \"本人\", or \"我自己\" to imply the user is interacting with their own note.",
    "绝对禁止以{{user}}身份评论、回复。",
    "评论可以包含楼中楼；如需楼中楼，使用 [评论N回复对象]评论M。",
    "楼中楼示例：评论2回复评论1时，必须写 [评论2回复对象]评论1，不要写昵称、评论ID或其他文字。",
    "",
    "活人感要求：",
    "- 评论要短、口语化，像随手一打的真实评论，可用黑话/表情/不完整句；不煽情、不装逼、不写小作文。",
    "- 评论落到具体的图/正文/TAG细节或真实反应（吐槽、好奇、共鸣、调侃、提问、求链接、踩雷提醒），*绝对禁止讲大道理、爹味说教、强行升华或客服式总结*。",
    "- 评论区禁止一边倒夸楼主；NPC不脸谱化，多种性格并存（尖锐/温和/挑事/看戏/蹲后续/抬杠/跑题），可有不同观点甚至轻微争执。",
    "- *绝对禁止“引用笔记原文+这句太真实了”这种格式*。",
    "- 私信也要口语自然，别像客服或营销号。",
    "",
    "输出格式：",
    "#用户笔记互动",
    "[点赞]数字",
    "[点赞用户1]昵称",
    "[点赞用户2]昵称",
    "[收藏]数字",
    "[收藏用户1]昵称",
    "[收藏用户2]昵称",
    "[新增关注]数字",
    "[关注用户1]昵称",
    "[关注用户2]昵称",
    "",
    "[评论1作者]昵称",
    "[评论1内容]评论内容",
    "[评论2作者]昵称",
    "[评论2回复对象]评论1",
    "[评论2内容]楼中楼回复内容",
    "",
    "#私信1",
    "[名称]昵称",
    "[正文]私信内容",
].join("\n");
const DEFAULT_XIAOHONGSHU_NPC_COMMENT_REPLY_PROMPT = [
    "你正在模拟小红书陌生网友在一条笔记评论区里继续接话。",
    "根据笔记内容、用户刚发的评论/回复、被回复评论和已有评论，生成自然的评论区回复。",
    "回复可以来自被评论的人，也可以来自其他路人；如果不适合回复，可以只输出 1 条。",
    "绝对禁止以{{user}}身份评论、回复。",
    "如需楼中楼，使用 [评论N回复评论ID]填写上下文里给出的评论ID。",
    "评论ID 示例：如果上下文里有 [评论ID]某条真实评论ID，回复这条评论时就写 [评论1回复评论ID]某条真实评论ID。",
    "不要填写“评论1”、昵称、“被回复评论ID”、“候选评论ID”等占位文字；必须完整复制上下文里的真实 [评论ID]。",
    "",
    "活人感要求：",
    "- 回复像真实评论区接话，短、口语、就事论事，可用黑话/表情/梗；不写小作文、不煽情、不装逼。",
    "- 接住对方的具体那句话自然往下聊（调侃、反问、附和、轻怼、跑题），*绝对禁止说教、爹味、强行升华或客服式回应*。",
    "- 多条回复之间性格各异、可有不同观点甚至拌嘴，禁止集体吹捧楼主或某一方。",
    "- *绝对禁止“引用对方原话+这句太真实了”这种格式*。",
    "",
    "输出格式：",
    "#评论回复",
    "[评论1作者]昵称",
    "[评论1回复评论ID]从上下文复制的真实评论ID",
    "[评论1内容]回复内容",
    "",
    "[评论2作者]昵称",
    "[评论2回复评论ID]从上下文复制的真实评论ID",
    "[评论2内容]回复内容",
].join("\n");
const DEFAULT_XIAOHONGSHU_NPC_MORE_COMMENTS_PROMPT = [
    "你正在模拟小红书陌生网友继续参与一条笔记的评论区讨论。",
    "根据笔记标题、正文、TAG、图片内容、互动数据和已有评论，生成 4 到 8 条新的自然评论。",
    "这些评论可以是普通评论，也可以是楼中楼回复；需要像真实小红书评论区，不要像机器人总结。",
    "绝对禁止以{{user}}身份评论、回复。",
    "如果回复本次新生成的前面评论，使用 [评论N回复对象]评论M，其中 M 必须是前面已经出现过的本次评论编号。",
    "如果回复已有评论，使用 [评论N回复评论ID]完整复制上下文里的真实 [评论ID]。",
    "楼中楼示例：评论2回复本次评论1时，写 [评论2回复对象]评论1；回复已有评论时，写 [评论2回复评论ID]从上下文复制的真实评论ID。",
    "",
    "活人感要求：",
    "- 评论短、口语化、就事论事，可用黑话/表情/梗；不写小作文、不煽情、不装逼，别像机器人总结。",
    "- NPC多种性格并存（尖锐/温和/挑事/看戏/蹲后续/抬杠/跑题/求链接），禁止一边倒夸楼主，可有不同观点甚至拌嘴。",
    "- 评论落到笔记/已有评论的具体点，*绝对禁止讲大道理、爹味说教、强行升华*。",
    "- *绝对禁止“引用原文+这句太真实了”这种格式*。",
    "",
    "输出格式：",
    "#更多评论",
    "[评论1作者]昵称",
    "[评论1内容]评论内容",
    "[评论2作者]昵称",
    "[评论2回复对象]评论1",
    "[评论2内容]回复评论1的楼中楼内容",
    "[评论3作者]昵称",
    "[评论3回复评论ID]从上下文复制的真实评论ID",
    "[评论3内容]回复已有评论的楼中楼内容",
].join("\n");
const DEFAULT_XIAOHONGSHU_NPC_DM_REPLY_PROMPT = [
    "你正在模拟小红书私信里的陌生网友回复用户。",
    "根据对话对象、用户刚发的私信、历史私信和相关笔记信息，生成自然的私信回复。",
    "可以连续回复 1 到 4 条消息；每条消息要像真实聊天，可以短句、口语、带 emoji，也可以分多条发。",
    "不要替用户说话，不要输出系统解释，不要输出 Markdown。",
    "别客服腔、别营销号腔，符合这个陌生网友的身份和性格，自然像真人私聊。",
    "",
    "输出格式：",
    "#私信回复1",
    "[正文]回复内容",
    "",
    "#私信回复2",
    "[正文]第二条回复内容",
].join("\n");
const xiaohongshu_types_DEFAULT_XIAOHONGSHU_SETTINGS = {
    bilingualTranslationEnabled: true,
    collapseBilingualTranslation: true,
    bilingualTranslationPrompt: DEFAULT_XIAOHONGSHU_BILINGUAL_PROMPT,
    npcIdentityGuardPrompt: DEFAULT_XIAOHONGSHU_NPC_IDENTITY_GUARD_PROMPT,
    npcFeedPrompt: DEFAULT_XIAOHONGSHU_NPC_FEED_PROMPT,
    npcUserPostReactionPrompt: DEFAULT_XIAOHONGSHU_NPC_USER_POST_REACTION_PROMPT,
    npcCommentReplyPrompt: DEFAULT_XIAOHONGSHU_NPC_COMMENT_REPLY_PROMPT,
    npcMoreCommentsPrompt: DEFAULT_XIAOHONGSHU_NPC_MORE_COMMENTS_PROMPT,
    npcDmReplyPrompt: DEFAULT_XIAOHONGSHU_NPC_DM_REPLY_PROMPT,
    participantCharacterIds: [],
    sendToCharacterProbability: 60,
};

;// ./custom-apps/anonymous-xiaohongshu/src/baseline-storage.ts
// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.

const LEGACY_DEFAULT_NICKNAME = "我";
const LEGACY_DEFAULT_GENDER = "未设置";
function makeId(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
        return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function cleanText(value, maxLength) {
    return String(value ?? "")
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, maxLength);
}
function baseline_storage_hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash.toString(36);
}
function baseline_storage_makeXiaohongshuNpcId(name) {
    const normalized = cleanText(name, 60) || "小红书用户";
    return `npc_${baseline_storage_hashString(normalized)}`;
}
function cleanMultiline(value, maxLength) {
    return cleanText(value, maxLength)
        .replace(/\r\n?/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n");
}
function numberOr(value, fallback) {
    if (typeof value === "number")
        return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
    const normalized = String(value ?? "")
        .trim()
        .replace(/[,，\s]/g, "");
    if (!normalized)
        return fallback;
    const tenThousandMatch = /^(-?\d+(?:\.\d+)?)[wW万](?:(\d+(?:\.\d+)?)(?:[kK千])?)?$/.exec(normalized);
    if (tenThousandMatch) {
        const main = Number(tenThousandMatch[1]);
        const tail = tenThousandMatch[2] ? Number(tenThousandMatch[2]) : 0;
        if (Number.isFinite(main) && Number.isFinite(tail)) {
            return Math.max(0, Math.round(main * 10000 + tail * 1000));
        }
    }
    const thousandMatch = /^(-?\d+(?:\.\d+)?)[kK千](?:(\d+(?:\.\d+)?)(?:百)?)?$/.exec(normalized);
    if (thousandMatch) {
        const main = Number(thousandMatch[1]);
        const tail = thousandMatch[2] ? Number(thousandMatch[2]) : 0;
        if (Number.isFinite(main) && Number.isFinite(tail)) {
            return Math.max(0, Math.round(main * 1000 + tail * 100));
        }
    }
    const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(parsed))
        return fallback;
    if (/[wW万]/.test(normalized))
        return Math.max(0, Math.round(parsed * 10000));
    if (/[kK千]/.test(normalized))
        return Math.max(0, Math.round(parsed * 1000));
    return Math.max(0, Math.round(parsed));
}
function optionalPositiveNumber(value) {
    const parsed = numberOr(value, 0);
    return parsed > 0 ? parsed : undefined;
}
function normalizeTags(value) {
    const items = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(/[,，、#\s]+/)
            : [];
    return Array.from(new Set(items.map(item => cleanText(item, 18)).filter(Boolean))).slice(0, 6);
}
function normalizeNameList(value) {
    const items = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(/[,，、\n]+/)
            : [];
    return Array.from(new Set(items.map(item => cleanText(item, 24)).filter(Boolean))).slice(0, 2);
}
function normalizeIdList(value) {
    const items = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(/[,，、\n]+/)
            : [];
    return Array.from(new Set(items.map(item => cleanText(item, 180)).filter(Boolean)));
}
function parseNotificationCountFromText(text) {
    const match = text.match(/等\s*([0-9][\d.,，]*(?:\.\d+)?\s*(?:[kKwW万千])?)\s*人/);
    return match ? numberOr(match[1], 1) : 1;
}
function getDefaultXiaohongshuProfile() {
    const identity = { name: "" };
    return {
        ...DEFAULT_XIAOHONGSHU_PROFILE,
        nickname: cleanText(identity?.name, 40) || DEFAULT_XIAOHONGSHU_PROFILE.nickname,
        gender: DEFAULT_XIAOHONGSHU_PROFILE.gender,
    };
}
function normalizeXiaohongshuProfile(raw) {
    const record = raw && typeof raw === "object" ? raw : {};
    const defaults = getDefaultXiaohongshuProfile();
    const nickname = cleanText(record.nickname, 40);
    const gender = cleanText(record.gender, 20);
    return {
        nickname: !nickname || nickname === LEGACY_DEFAULT_NICKNAME ? defaults.nickname : nickname,
        handle: cleanText(record.handle, 40) || defaults.handle,
        ipLocation: cleanText(record.ipLocation ?? record.ip_location, 40) || defaults.ipLocation,
        signature: cleanMultiline(record.signature ?? record.bio, 160) || defaults.signature,
        gender: !gender || gender === LEGACY_DEFAULT_GENDER ? defaults.gender : gender,
        followingCount: numberOr(record.followingCount ?? record.following_count, defaults.followingCount),
        followerCount: numberOr(record.followerCount ?? record.follower_count, defaults.followerCount),
        likedAndSavedCount: numberOr(record.likedAndSavedCount ?? record.liked_and_saved_count, defaults.likedAndSavedCount),
        coverImageAssetId: cleanText(record.coverImageAssetId ?? record.cover_image_asset_id, 160) || defaults.coverImageAssetId,
    };
}
function normalizeXiaohongshuSettings(raw) {
    const record = raw && typeof raw === "object" ? raw : {};
    const participantCharacterIds = Array.isArray(record.participantCharacterIds)
        ? record.participantCharacterIds.map(id => cleanText(id, 120)).filter(Boolean)
        : [];
    const probability = numberOr(record.sendToCharacterProbability, DEFAULT_XIAOHONGSHU_SETTINGS.sendToCharacterProbability);
    const npcFeedPrompt = cleanMultiline(record.npcFeedPrompt, 8000);
    return {
        bilingualTranslationEnabled: record.bilingualTranslationEnabled !== false,
        collapseBilingualTranslation: record.collapseBilingualTranslation !== false,
        bilingualTranslationPrompt: cleanMultiline(record.bilingualTranslationPrompt, 8000) || DEFAULT_XIAOHONGSHU_SETTINGS.bilingualTranslationPrompt,
        npcIdentityGuardPrompt: cleanMultiline(record.npcIdentityGuardPrompt, 8000) || DEFAULT_XIAOHONGSHU_SETTINGS.npcIdentityGuardPrompt,
        npcFeedPrompt: npcFeedPrompt && npcFeedPrompt.includes("#附近笔记") ? npcFeedPrompt : DEFAULT_XIAOHONGSHU_SETTINGS.npcFeedPrompt,
        npcUserPostReactionPrompt: cleanMultiline(record.npcUserPostReactionPrompt, 8000) || DEFAULT_XIAOHONGSHU_SETTINGS.npcUserPostReactionPrompt,
        npcCommentReplyPrompt: cleanMultiline(record.npcCommentReplyPrompt, 8000) || DEFAULT_XIAOHONGSHU_SETTINGS.npcCommentReplyPrompt,
        npcMoreCommentsPrompt: cleanMultiline(record.npcMoreCommentsPrompt, 8000) || DEFAULT_XIAOHONGSHU_SETTINGS.npcMoreCommentsPrompt,
        npcDmReplyPrompt: cleanMultiline(record.npcDmReplyPrompt, 8000) || DEFAULT_XIAOHONGSHU_SETTINGS.npcDmReplyPrompt,
        participantCharacterIds: Array.from(new Set(participantCharacterIds)),
        sendToCharacterProbability: Math.max(0, Math.min(100, probability)),
    };
}
function normalizeXiaohongshuUserInteractions(raw) {
    const record = raw && typeof raw === "object" ? raw : {};
    return {
        likedNoteIds: normalizeIdList(record.likedNoteIds ?? record.liked_note_ids),
        savedNoteIds: normalizeIdList(record.savedNoteIds ?? record.saved_note_ids),
        commentedNoteIds: normalizeIdList(record.commentedNoteIds ?? record.commented_note_ids),
    };
}
function normalizeXiaohongshuAccount(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const record = raw;
    const type = record.type === "user" || record.type === "character" || record.type === "npc" ? record.type : "npc";
    const name = cleanText(record.name ?? record.authorName ?? record.nickname, 60);
    if (!name)
        return null;
    const id = cleanText(record.id ?? record.authorId ?? record.author_id, 120) || (type === "npc" ? baseline_storage_makeXiaohongshuNpcId(name) : type);
    return {
        type,
        id,
        name,
        avatar: cleanText(record.avatar, 500) || undefined,
        followedAt: typeof record.followedAt === "string" ? record.followedAt : new Date().toISOString(),
    };
}
function dedupeAccounts(accounts) {
    const seen = new Set();
    return accounts.filter((account) => {
        const key = `${account.type}:${account.id}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function normalizeXiaohongshuSocialGraph(raw) {
    const record = raw && typeof raw === "object" ? raw : {};
    const following = Array.isArray(record.following)
        ? record.following.map(normalizeXiaohongshuAccount).filter((account) => Boolean(account))
        : [];
    const followers = Array.isArray(record.followers)
        ? record.followers.map(normalizeXiaohongshuAccount).filter((account) => Boolean(account))
        : [];
    return {
        following: dedupeAccounts(following),
        followers: dedupeAccounts(followers),
    };
}
function normalizeXiaohongshuComment(raw, fallbackNoteId = "") {
    if (!raw || typeof raw !== "object")
        return null;
    const record = raw;
    const noteId = cleanText(record.noteId ?? record.note_id, 160) || fallbackNoteId;
    const text = cleanMultiline(record.text ?? record.content ?? record.body, 600);
    const authorName = cleanText(record.authorName ?? record.author_name, 60);
    if (!noteId || !text || !authorName)
        return null;
    const id = cleanText(record.id, 180) || makeId("xhs_comment");
    const createdAt = typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString();
    return {
        id,
        noteId,
        authorType: record.authorType === "user" || record.authorType === "character" ? record.authorType : "npc",
        authorId: cleanText(record.authorId ?? record.author_id, 120) || baseline_storage_makeXiaohongshuNpcId(authorName),
        authorName,
        text,
        replyTo: cleanText(record.replyTo ?? record.reply_to, 80) || undefined,
        replyToCommentId: cleanText(record.replyToCommentId ?? record.reply_to_comment_id, 180) || undefined,
        likeCount: numberOr(record.likeCount ?? record.like_count, 0),
        dislikeCount: numberOr(record.dislikeCount ?? record.dislike_count, 0),
        liked: record.liked === true,
        disliked: record.disliked === true,
        createdAt,
        unread: record.unread === true,
    };
}
function normalizeAssetIdList(value) {
    if (!Array.isArray(value))
        return undefined;
    const ids = value.map(id => cleanText(id, 160)).filter(Boolean);
    return ids.length > 0 ? ids : undefined;
}
function normalizeXiaohongshuNote(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const record = raw;
    const id = cleanText(record.id, 160) || makeId("xhs_note");
    const title = cleanText(record.title, 80);
    const body = cleanMultiline(record.body ?? record.content ?? record.text, 3000);
    const authorName = cleanText(record.authorName ?? record.author_name, 60);
    if (!title && !body)
        return null;
    const comments = Array.isArray(record.comments)
        ? record.comments.map(comment => normalizeXiaohongshuComment(comment, id)).filter((comment) => Boolean(comment))
        : [];
    const createdAt = typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString();
    return {
        id,
        type: record.type === "video" ? "video" : "post",
        feedScope: record.feedScope === "nearby" || record.feed_scope === "nearby" ? "nearby" : "discover",
        source: record.source === "user" || record.source === "character" ? record.source : "npc",
        authorId: cleanText(record.authorId ?? record.author_id, 120) || baseline_storage_makeXiaohongshuNpcId(authorName || "小红书用户"),
        authorName: authorName || "小红书用户",
        title: title || body.slice(0, 18) || "未命名笔记",
        body,
        videoDescription: cleanMultiline(record.videoDescription ?? record.video_description, 500) || undefined,
        coverIcon: cleanText(record.coverIcon ?? record.cover_icon, 8) || "✦",
        tone: record.tone === "mist" || record.tone === "blush" || record.tone === "graphite" ? record.tone : "ivory",
        tags: normalizeTags(record.tags),
        likeCount: numberOr(record.likeCount ?? record.like_count, 0),
        saveCount: numberOr(record.saveCount ?? record.save_count, 0),
        commentCount: numberOr(record.commentCount ?? record.comment_count, comments.length),
        liked: record.liked === true,
        saved: record.saved === true,
        recentLikeNames: normalizeNameList(record.recentLikeNames ?? record.recent_like_names),
        recentSaveNames: normalizeNameList(record.recentSaveNames ?? record.recent_save_names),
        comments,
        imageAssetId: cleanText(record.imageAssetId ?? record.image_asset_id, 160) || undefined,
        imageAssetIds: normalizeAssetIdList(record.imageAssetIds ?? record.image_asset_ids),
        imageDescription: cleanMultiline(record.imageDescription ?? record.image_description, 500) || undefined,
        imageWidth: optionalPositiveNumber(record.imageWidth ?? record.image_width),
        imageHeight: optionalPositiveNumber(record.imageHeight ?? record.image_height),
        imageCompressedAt: typeof record.imageCompressedAt === "string" ? record.imageCompressedAt : undefined,
        imageCleanedAt: typeof record.imageCleanedAt === "string" ? record.imageCleanedAt : undefined,
        createdAt,
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : createdAt,
    };
}
function normalizeNotification(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const record = raw;
    const text = cleanMultiline(record.text, 600);
    const actorName = cleanText(record.actorName ?? record.actor_name, 60);
    if (!text || !actorName)
        return null;
    const type = record.type === "save" || record.type === "comment" || record.type === "dm" || record.type === "follow"
        ? record.type
        : "like";
    const createdAt = typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString();
    const parsedCount = numberOr(record.count ?? record.actorCount ?? record.actor_count, type === "like" || type === "save" ? parseNotificationCountFromText(text) : 1);
    return {
        id: cleanText(record.id, 160) || makeId("xhs_notice"),
        type,
        noteId: cleanText(record.noteId ?? record.note_id, 160) || undefined,
        actorName,
        text,
        count: type === "like" || type === "save" ? Math.max(1, Math.round(parsedCount)) : undefined,
        thumbnailText: cleanText(record.thumbnailText ?? record.thumbnail_text, 80) || undefined,
        direction: record.direction === "outgoing" ? "outgoing" : record.direction === "incoming" ? "incoming" : undefined,
        threadId: cleanText(record.threadId ?? record.thread_id, 180) || undefined,
        threadName: cleanText(record.threadName ?? record.thread_name, 60) || undefined,
        unread: record.unread !== false,
        createdAt,
    };
}
function createDefaultXiaohongshuState() {
    return {
        profile: getDefaultXiaohongshuProfile(),
        settings: { ...xiaohongshu_types_DEFAULT_XIAOHONGSHU_SETTINGS, participantCharacterIds: [] },
        notes: [],
        feedHiddenNoteIds: [],
        notifications: [],
        userInteractions: normalizeXiaohongshuUserInteractions(null),
        socialGraph: normalizeXiaohongshuSocialGraph(null),
        updatedAt: new Date().toISOString(),
    };
}
function createUserXiaohongshuNote(input, profile) {
    const now = new Date().toISOString();
    const imageAssetIds = (input.images && input.images.length > 0)
        ? input.images.map(img => img.assetId).filter((id) => Boolean(id))
        : (input.image?.assetId ? [input.image.assetId] : undefined);
    const primaryImage = input.images?.[0] || input.image;
    return {
        id: makeId("xhs_user_note"),
        type: "post",
        source: "user",
        authorId: "user",
        authorName: profile.nickname || "我",
        title: cleanText(input.title, 80) || cleanMultiline(input.body, 120).slice(0, 24) || "新的笔记",
        body: cleanMultiline(input.body, 3000),
        coverIcon: (imageAssetIds && imageAssetIds.length > 0) || input.image?.assetId ? "▧" : "✎",
        tone: "ivory",
        tags: normalizeTags(input.tags),
        likeCount: 0,
        saveCount: 0,
        commentCount: 0,
        liked: false,
        saved: false,
        recentLikeNames: [],
        recentSaveNames: [],
        comments: [],
        imageAssetId: primaryImage?.assetId,
        imageAssetIds: imageAssetIds && imageAssetIds.length > 0 ? imageAssetIds : undefined,
        imageDescription: cleanMultiline(primaryImage?.description, 500) || undefined,
        imageWidth: optionalPositiveNumber(primaryImage?.width),
        imageHeight: optionalPositiveNumber(primaryImage?.height),
        createdAt: now,
        updatedAt: now,
    };
}
function baseline_storage_makeXiaohongshuComment(input) {
    return {
        id: makeId("xhs_comment"),
        noteId: input.noteId,
        authorType: input.authorType,
        authorId: input.authorId || (input.authorType === "npc" ? baseline_storage_makeXiaohongshuNpcId(input.authorName) : input.authorType),
        authorName: cleanText(input.authorName, 60) || "小红书用户",
        text: cleanMultiline(input.text, 600),
        replyTo: cleanText(input.replyTo, 80) || undefined,
        replyToCommentId: cleanText(input.replyToCommentId, 180) || undefined,
        likeCount: 0,
        dislikeCount: 0,
        liked: false,
        disliked: false,
        createdAt: new Date().toISOString(),
        unread: input.unread === true,
    };
}
function baseline_storage_makeXiaohongshuNotification(input) {
    return {
        ...input,
        id: makeId("xhs_notice"),
        createdAt: new Date().toISOString(),
    };
}
function addNames(existing, names) {
    return Array.from(new Set([...names, ...existing].map(name => cleanText(name, 24)).filter(Boolean))).slice(0, 2);
}

;// ./custom-apps/anonymous-xiaohongshu/src/adapters/legacy-migration.ts


async function migrateLegacy(s, accounts) {
    if (!accounts.length)
        return;
    const api = host(), [bindings, posts] = await Promise.all([api.db.list('actor_bindings_private', { limit: 500 }), api.db.list('posts', { limit: 500 })]);
    if ([accounts, bindings, posts].some(rows => rows.length >= 500))
        throw Error('原型集合达到 500 条读取上限；为避免截断旧数据，迁移已停止。原集合未改动。');
    for (const a of accounts)
        s.accounts[a.id] = { accountId: a.id, displayName: a.displayName, aliases: (a.aliasHistory || []).map((x) => x.displayName).filter(Boolean), bio: a.bio || '' };
    for (const b of bindings) {
        if (!s.accounts[b.accountId])
            throw Error('旧绑定缺少账号，未修改旧数据');
        if (b.ownerKind === 'human_controller') {
            s.userAccountId = b.accountId;
            s.bindings.push({ accountId: b.accountId, ownerKind: 'user', ownerId: 'local-controller' });
        }
        else if (b.ownerKind === 'character')
            s.bindings.push({ accountId: b.accountId, ownerKind: 'character', ownerId: b.ownerId });
    }
    if (s.userAccountId) {
        const a = s.accounts[s.userAccountId];
        s.platform.profile.nickname = a.displayName;
        s.platform.profile.signature = a.bio || '';
        s.platform.profile.handle = a.accountId.slice(-10);
    }
    for (const p of posts) {
        const a = s.accounts[p.authorAccountId];
        if (!a)
            throw Error('旧帖子缺少作者账号，迁移已停止');
        const binding = s.bindings.find(b => b.accountId === a.accountId);
        const source = binding?.ownerKind || 'npc';
        const note = { ...createUserXiaohongshuNote({ title: p.title, body: p.body, tags: p.tags || [] }, s.platform.profile), id: p.id, source, authorId: a.accountId, authorName: a.displayName, createdAt: p.createdAt, updatedAt: p.updatedAt || p.createdAt, liked: (p.likedByAccountIds || []).includes(s.userAccountId), saved: (p.savedByAccountIds || []).includes(s.userAccountId), likeCount: p.likedByAccountIds?.length || 0, saveCount: p.savedByAccountIds?.length || 0, comments: (p.comments || []).map((c) => { const author = s.accounts[c.authorAccountId]; if (!author)
                throw Error('旧评论缺少作者账号'); return { ...baseline_storage_makeXiaohongshuComment({ noteId: p.id, authorType: s.bindings.find(b => b.accountId === author.accountId)?.ownerKind || 'npc', authorId: author.accountId, authorName: author.displayName, text: c.text, replyToCommentId: c.replyToCommentId }), id: c.id, createdAt: c.createdAt }; }) };
        note.commentCount = note.comments.length;
        if (p.imageRef) {
            const media = await api.media.get({ ref: p.imageRef });
            if (!media?.dataUrl)
                throw Error('旧帖子图片无法读取；迁移停止且原数据保留');
            const id = 'legacy_' + p.id;
            await api.db.create('post_images', { id, dataUrl: media.dataUrl });
            note.imageAssetId = id;
            note.imageAssetIds = [id];
            s.images[id] = media.dataUrl;
        }
        s.platform.notes.push(note);
    }
    s.migrationNotice = `已保留 accountId 迁移 ${accounts.length} 个账号与 ${posts.length} 篇帖子；旧集合未改动。旧版推断出的身份关系不作为证据，请按角色重新确认。角色头像改用角色卡，路人不再需要管理。`;
}

;// ./custom-apps/anonymous-xiaohongshu/src/xiaohongshu-storage.ts



const COLLECTION = 'phase1a_state';
const persistedState = (s) => ({ ...s, images: {}, noteIds: s.platform.notes.map(n => n.id), platform: { ...s.platform, notes: [] } });
function stateWrites(s, before) {
    const prior = new Map(before?.platform.notes.map(n => [n.id, JSON.stringify(n)]));
    return [
        { collection: COLLECTION, id: 'state', operation: 'put', value: persistedState(s) },
        ...s.platform.notes.filter(n => prior.get(n.id) !== JSON.stringify(n)).map(n => ({ collection: 'notes_v2', id: n.id, operation: 'put', value: { ...n } }))
    ];
}
function emptyState() { return { id: 'state', version: 2, accounts: {}, bindings: [], disclosures: [], platform: createDefaultXiaohongshuState(), images: {}, jobs: [], outbox: [] }; }
async function loadState() {
    const api = host(), current = await api.db.get(COLLECTION, 'state');
    if (current) {
        const s = current;
        if (s.noteIds) {
            s.platform.notes = [];
            for (let i = 0; i < s.noteIds.length; i += 25) {
                const batch = await Promise.all(s.noteIds.slice(i, i + 25).map(id => api.db.get('notes_v2', id)));
                if (batch.some(n => !n))
                    throw Error('帖子索引缺少记录，已停止加载，原数据未修改');
                s.platform.notes.push(...batch);
            }
        }
        s.images = s.images || {};
        const ids = new Set(s.platform.notes.flatMap(n => n.imageAssetIds || [n.imageAssetId]).filter(Boolean));
        await Promise.all([...ids].map(async (id) => { if (!s.images[id]) {
            const row = await api.db.get('post_images', id);
            if (row?.dataUrl)
                s.images[id] = row.dataUrl;
        } }));
        return s;
    }
    const s = emptyState();
    // Never reinterpret the earlier prototype's inferred disclosures as verified evidence.
    const legacy = await api.db.list('social_accounts', { limit: 500 });
    await migrateLegacy(s, legacy);
    for (const note of s.platform.notes)
        await api.db.create('notes_v2', note);
    await api.db.create(COLLECTION, persistedState(s));
    return s;
}
async function saveState(s, before) { for (const w of stateWrites(s, before).slice(1)) {
    const current = await host().db.get(w.collection, w.id);
    if (current)
        await host().db.update(w.collection, w.id, w.value);
    else
        await host().db.create(w.collection, w.value);
} await host().db.update(COLLECTION, 'state', persistedState(s)); }

;// ./custom-apps/anonymous-xiaohongshu/src/identity/accounts.ts
const opaqueId = (prefix = 'acct') => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
function publicAccount(a) { return { kind: 'social_account', accountId: a.accountId, displayName: a.displayName, previousDisplayNames: a.aliases }; }
function validateName(s, name, characters, except) {
    const n = name.trim(), key = n.normalize('NFKC').toLowerCase();
    if (!n || n.length > 40 || /[\n\r<>\[\]{}|]/.test(n))
        throw Error('昵称须为 1–40 个字符，不能含结构标记。');
    if (['kk', 'chloe', 'user', '{{user}}', ...characters.map(c => c.name)].some(x => { const r = x.normalize('NFKC').toLowerCase(); return r && key.includes(r); }))
        throw Error('昵称不能使用已知真实姓名或普通平台身份。');
    if (Object.values(s.accounts).some(a => a.accountId !== except && [a.displayName, ...a.aliases].some(x => x.normalize('NFKC').toLowerCase() === key)))
        throw Error('昵称与现有账号或历史昵称重复。');
    return n;
}
function addAccount(s, displayName) { const a = { accountId: opaqueId(), displayName, aliases: [] }; s.accounts[a.accountId] = a; return a; }
function rename(s, id, name, characters) { const a = s.accounts[id]; if (!a)
    throw Error('账号不存在'); const next = validateName(s, name, characters, id); if (next !== a.displayName) {
    a.aliases.push(a.displayName);
    a.displayName = next;
} }
function resolveAuthor(s, name, characters) {
    const existing = Object.values(s.accounts).find(a => a.displayName === name || a.aliases.includes(name));
    if (existing)
        return existing;
    return addAccount(s, validateName(s, name, characters));
}
function validateGeneratedAuthors(s, names, characters, selfAccountId) {
    for (const name of names.filter(Boolean)) {
        const a = Object.values(s.accounts).find(a => a.displayName === name || a.aliases.includes(name));
        if (a && s.bindings.some(b => b.accountId === a.accountId) && a.accountId !== selfAccountId)
            throw Error('模型试图代替其他已有账号发言，结果未应用，请重试。');
        if (!a)
            validateName(s, name, characters);
    }
}
function canonicalize(s, note, characters) {
    const author = s.accounts[note.authorId] || resolveAuthor(s, note.authorName, characters);
    return { ...note, authorId: author.accountId, authorName: author.displayName, comments: note.comments.map(c => { const a = s.accounts[c.authorId] || resolveAuthor(s, c.authorName, characters); return { ...c, authorId: a.accountId, authorName: a.displayName }; }) };
}
// This whitelist is the only route from private application records into model context.
function projectNote(s, n) { return { noteId: n.id, author: publicAccount(s.accounts[n.authorId]), title: n.title, body: n.body, tags: n.tags, imageDescription: n.imageDescription, likeCount: n.likeCount, saveCount: n.saveCount, comments: n.comments.map(c => ({ commentId: c.id, author: publicAccount(s.accounts[c.authorId]), text: c.text, replyToCommentId: c.replyToCommentId })) }; }
function viewerContext(s, viewer) {
    const binding = s.bindings.find(b => b.ownerKind === 'character' && b.ownerId === viewer);
    return {
        source: '[匿名小红书]', sourceNamespace: 'social_posts', selfAccount: binding ? publicAccount(s.accounts[binding.accountId]) : null,
        identities: Object.values(s.accounts).map(a => { const d = s.disclosures.find(d => d.viewerCharacterId === viewer && d.accountId === a.accountId); return { ...publicAccount(a), realWorldIdentity: a.accountId === binding?.accountId ? 'self' : d?.state === 'explicitly_disclosed' ? { state: 'explicitly_disclosed', identity: d.identity } : 'unknown' }; })
    };
}
const PROTECTED_RULE = `仅当上下文含 [匿名小红书] 来源及本 App 的 social_account/accountId 时应用以下规则，不影响普通聊天或其他来源的身份判断。每个 accountId 是稳定、独立的网络人格，不能把不同账号的经历、喜好和关系合并成泛称。显示名变化不改变账号，只有明确提供的改名记录允许连接旧名。当前 viewer 对账号现实身份为 unknown 时，禁止根据文风、经历、时间、地点、头像、图片、共同知识、相似性或重复巧合推断、猜测、暗示、试探或询问其现实身份；其他平台已知身份关系也不是证据。只能使用当前 viewer 已明确获知的 explicitly_disclosed 关系；此时允许正常关联，不能继续阻断。揭露不得传播给其他 viewer。程序映射不是角色知识。帖子和记忆始终以具体 accountId / displayName 为主体。`;

;// ./custom-apps/anonymous-xiaohongshu/src/xiaohongshu-memory.ts


function queueMemories(s, viewer, jobId, notes) {
    for (const note of notes) {
        const id = `${jobId}.${note.id}`;
        if (!s.outbox.some(m => m.id === id))
            s.outbox.push({ id, viewerCharacterId: viewer, accountId: note.authorId, content: '[匿名小红书] source=anonymous_social_post\n' + JSON.stringify(projectNote(s, note)).slice(0, 14500) });
    }
}
async function flushMemory(s) {
    while (s.outbox.length) {
        const m = s.outbox[0], scope = { viewerCharacterId: m.viewerCharacterId, sourceNamespace: 'social_posts', sourceEntityId: m.accountId };
        const found = await host().memory.searchSource(scope);
        await host().memory.writeSource({ ...scope, expectedRevision: found.revision, evidenceId: m.id, content: m.content, timeline: true });
        s.outbox.shift();
    }
}

;// ./custom-apps/anonymous-xiaohongshu/src/baseline-engine.ts

const resolveCharacterXiaohongshuDisplayName = (c) => c.name;
const buildXiaohongshuUserNameSet = (extra = []) => new Set(extra.map(n => n.trim().toLowerCase()));
const isXiaohongshuUserAuthorName = (name, names) => names.has(name.trim().toLowerCase());
const getUserXiaohongshuNamesFromNote = (n) => [...(n.source === 'user' ? [n.authorName] : []), ...n.comments.filter(c => c.authorType === 'user').map(c => c.authorName)];
function baseline_engine_makeId(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
        return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function baseline_engine_cleanText(value, maxLength) {
    return String(value ?? "")
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, maxLength);
}
function baseline_engine_cleanMultiline(value, maxLength) {
    return baseline_engine_cleanText(value, maxLength)
        .replace(/\r\n?/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n");
}
function parseMetric(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    const text = String(value ?? "")
        .trim()
        .replace(/[,，\s]/g, "");
    if (!text)
        return 0;
    const tenThousandMatch = /^(-?\d+(?:\.\d+)?)[wW万](?:(\d+(?:\.\d+)?)(?:[kK千])?)?$/.exec(text);
    if (tenThousandMatch) {
        const main = Number(tenThousandMatch[1]);
        const tail = tenThousandMatch[2] ? Number(tenThousandMatch[2]) : 0;
        if (Number.isFinite(main) && Number.isFinite(tail)) {
            return Math.max(0, Math.round(main * 10000 + tail * 1000));
        }
    }
    const thousandMatch = /^(-?\d+(?:\.\d+)?)[kK千](?:(\d+(?:\.\d+)?)(?:百)?)?$/.exec(text);
    if (thousandMatch) {
        const main = Number(thousandMatch[1]);
        const tail = thousandMatch[2] ? Number(thousandMatch[2]) : 0;
        if (Number.isFinite(main) && Number.isFinite(tail)) {
            return Math.max(0, Math.round(main * 1000 + tail * 100));
        }
    }
    const numeric = Number(text.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(numeric))
        return 0;
    if (/[wW万]/.test(text))
        return Math.max(0, Math.round(numeric * 10000));
    if (/[kK千]/.test(text))
        return Math.max(0, Math.round(numeric * 1000));
    return Math.max(0, Math.round(numeric));
}
function metricField(fields, names) {
    if (!fields)
        return undefined;
    for (const name of names) {
        if (fields[name] !== undefined)
            return fields[name];
    }
    return undefined;
}
function parseMetricField(fields, names, fallback = 0) {
    const value = metricField(fields, names);
    return value === undefined || String(value).trim() === "" ? fallback : parseMetric(value);
}
function parseBoolean(value) {
    const text = String(value ?? "").trim().toLowerCase();
    return ["是", "yes", "true", "1", "y", "喜欢", "收藏"].includes(text);
}
function parseTags(value) {
    return Array.from(new Set(String(value ?? "")
        .split(/[,，、#\s]+/)
        .map(tag => baseline_engine_cleanText(tag, 18))
        .filter(Boolean))).slice(0, 6);
}
function stripFences(text) {
    return text
        .replace(/^```(?:text|json|markdown)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}
function parseBlocks(text) {
    const blocks = [];
    let current = null;
    const lines = stripFences(text).split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line)
            continue;
        const blockMatch = /^#\s*([^\d#\[]+?)(\d+)?\s*$/.exec(line);
        if (blockMatch) {
            if (current)
                blocks.push(current);
            current = {
                title: blockMatch[1].trim(),
                number: Number(blockMatch[2] || "1"),
                fields: {},
            };
            continue;
        }
        if (!current) {
            current = { title: "全局", number: 1, fields: {} };
        }
        const fieldMatch = /^\[([^\]]+)]\s*(.*)$/.exec(line);
        if (fieldMatch) {
            current.fields[fieldMatch[1].trim()] = fieldMatch[2].trim();
        }
    }
    if (current)
        blocks.push(current);
    return blocks;
}
function parseBlockComments(fields, noteId, source = "npc") {
    const numbers = Object.keys(fields)
        .map(key => /^评论(\d+)作者$/.exec(key)?.[1])
        .filter((value) => Boolean(value))
        .map(Number)
        .sort((a, b) => a - b);
    const userNames = buildXiaohongshuUserNameSet();
    const prunedNumbers = new Set();
    const comments = [];
    for (const number of numbers) {
        const authorName = baseline_engine_cleanText(fields[`评论${number}作者`], 60) || "小红书用户";
        const replyTarget = baseline_engine_cleanText(fields[`评论${number}回复对象`], 40);
        const replyNumber = /^评论(\d+)$/.exec(replyTarget)?.[1];
        if (isXiaohongshuUserAuthorName(authorName, userNames)) {
            console.warn(`[Xiaohongshu] 剪掉冒用用户名的生成评论: "${authorName}"`);
            prunedNumbers.add(number);
            continue;
        }
        if (replyNumber && prunedNumbers.has(Number(replyNumber))) {
            prunedNumbers.add(number);
            continue;
        }
        const text = baseline_engine_cleanMultiline(fields[`评论${number}内容`], 600);
        if (!text)
            continue;
        comments.push(baseline_storage_makeXiaohongshuComment({
            noteId,
            authorType: source,
            authorId: source === "npc" ? baseline_storage_makeXiaohongshuNpcId(authorName) : source,
            authorName,
            text,
            replyTo: replyNumber ? undefined : replyTarget || undefined,
            replyToCommentId: replyNumber ? `${noteId}_comment_${replyNumber}` : undefined,
            unread: source === "npc",
        }));
    }
    return comments;
}
/**
 * 解析 [延伸N作者/回复对象/内容] 字段族为角色侧 thread 数组。
 * - 字段名兼容 "延伸N作者"/"延伸N回复对象"/"延伸N内容"
 * - 没有任何延伸字段时返回空数组（apply 端据此回退到"只保留主评论"）
 */
function parseCharacterThreadFields(fields) {
    const numbers = Object.keys(fields)
        .map(key => /^延伸(\d+)作者$/.exec(key)?.[1])
        .filter((value) => Boolean(value))
        .map(Number)
        .sort((a, b) => a - b);
    return numbers.map((number) => {
        const authorName = baseline_engine_cleanText(fields[`延伸${number}作者`], 60);
        const replyTo = baseline_engine_cleanText(fields[`延伸${number}回复对象`], 60);
        return {
            number,
            authorName,
            text: baseline_engine_cleanMultiline(fields[`延伸${number}内容`], 600),
            replyTo: replyTo || undefined,
        };
    }).filter(item => item.text && item.authorName).slice(0, 8);
}
function isCharacterXiaohongshuAuthor(authorName, characterDisplayName, characterName) {
    const normalized = authorName.trim();
    if (!normalized)
        return false;
    return [characterDisplayName.trim(), characterName.trim()].filter(Boolean).includes(normalized);
}
/**
 * 把角色侧 thread 评论按顺序追加到 note 上：
 * - "主评论" 或缺省 → replyToCommentId = mainCommentId
 * - "延伸N" → replyToCommentId 指向前面已生成的 thread comment
 * - 作者名匹配 character.name 或小红书显示名 → authorType="character"，否则 "npc"
 */
function appendCharacterThreadToNote(args) {
    const { note, characterDisplayName, characterName, characterId, thread, mainCommentId, shouldNotifyUser } = args;
    const appended = [];
    const numberToId = new Map();
    const userNames = buildXiaohongshuUserNameSet(getUserXiaohongshuNamesFromNote(note));
    const prunedNumbers = new Set();
    thread.forEach((item) => {
        const isCharacter = isCharacterXiaohongshuAuthor(item.authorName, characterDisplayName, characterName);
        const replyTarget = (item.replyTo || "").trim();
        const referenceMatch = /^延伸(\d+)$/.exec(replyTarget);
        if (!isCharacter && isXiaohongshuUserAuthorName(item.authorName, userNames)) {
            console.warn(`[Xiaohongshu] 剪掉冒用用户名的楼中楼评论: "${item.authorName}"`);
            prunedNumbers.add(item.number);
            return;
        }
        if (referenceMatch && prunedNumbers.has(Number(referenceMatch[1]))) {
            prunedNumbers.add(item.number);
            return;
        }
        const isMainReply = !replyTarget || /^主评论$/.test(replyTarget);
        const replyToCommentId = isMainReply
            ? mainCommentId
            : referenceMatch
                ? numberToId.get(Number(referenceMatch[1])) || mainCommentId
                : mainCommentId;
        const comment = baseline_storage_makeXiaohongshuComment({
            noteId: note.id,
            authorType: isCharacter ? "character" : "npc",
            authorId: isCharacter ? characterId : baseline_storage_makeXiaohongshuNpcId(item.authorName),
            authorName: isCharacter ? characterDisplayName : item.authorName,
            text: item.text,
            replyToCommentId,
            unread: shouldNotifyUser,
        });
        appended.push(comment);
        numberToId.set(item.number, comment.id);
    });
    const notifications = shouldNotifyUser
        ? appended
            .filter(comment => comment.authorType === "npc")
            .map(comment => baseline_storage_makeXiaohongshuNotification({
            type: "comment",
            noteId: note.id,
            actorName: comment.authorName,
            text: comment.text,
            thumbnailText: note.title,
            unread: true,
        }))
        : [];
    return {
        note: {
            ...note,
            comments: [...note.comments, ...appended],
            commentCount: note.commentCount + appended.length,
            updatedAt: appended.length > 0 ? new Date().toISOString() : note.updatedAt,
        },
        appended,
        notifications,
    };
}
function parseNoteBlock(block, type, index, source = "npc", authorId = "npc", feedScope = "discover") {
    const noteId = baseline_engine_makeId(type === "video" ? "xhs_video" : "xhs_note");
    const body = baseline_engine_cleanMultiline(block.fields["正文"] ?? block.fields["内容"], 3000);
    const title = baseline_engine_cleanText(block.fields["标题"], 80) || body.slice(0, 24);
    if (!title && !body)
        return null;
    const comments = parseBlockComments(block.fields, noteId, source);
    const authorName = baseline_engine_cleanText(block.fields["作者"] ?? block.fields["落款"], 60) || "小红书用户";
    return {
        id: noteId,
        type,
        feedScope,
        source,
        authorId: source === "npc" && authorId === "npc" ? baseline_storage_makeXiaohongshuNpcId(authorName) : authorId,
        authorName,
        title: title || "未命名笔记",
        body,
        videoDescription: baseline_engine_cleanMultiline(block.fields["视频描述"] ?? block.fields["画面描述"], 500) || undefined,
        coverIcon: baseline_engine_cleanText(block.fields["图标"], 8) || (type === "video" ? "▶" : "✦"),
        tone: index % 4 === 1 ? "mist" : index % 4 === 2 ? "blush" : index % 4 === 3 ? "graphite" : "ivory",
        tags: parseTags(block.fields["标签"] ?? block.fields["TAG"]),
        likeCount: parseMetricField(block.fields, ["点赞", "点赞数", "赞"]),
        saveCount: parseMetricField(block.fields, ["收藏", "收藏数"]),
        commentCount: parseMetricField(block.fields, ["评论数", "评论量", "评论"], comments.length),
        liked: parseBoolean(block.fields["已赞"]),
        saved: parseBoolean(block.fields["已收藏"]),
        recentLikeNames: [block.fields["点赞用户1"], block.fields["点赞用户2"]].map(name => baseline_engine_cleanText(name, 24)).filter(Boolean),
        recentSaveNames: [block.fields["收藏用户1"], block.fields["收藏用户2"]].map(name => baseline_engine_cleanText(name, 24)).filter(Boolean),
        comments: comments.map((comment, idx) => ({ ...comment, id: `${noteId}_comment_${idx + 1}` })),
        imageDescription: baseline_engine_cleanMultiline(block.fields["图片描述"] ?? block.fields["配图"], 500) || undefined,
        createdAt: new Date(Date.now() - index * 1000 * 60 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
    };
}
function parseXiaohongshuNpcFeed(raw) {
    const blocks = parseBlocks(raw);
    const nearbyNotes = blocks
        .filter(block => /附近笔记|同城笔记|附近/.test(block.title) && !/视频/.test(block.title))
        .slice(0, 4)
        .map((block, index) => parseNoteBlock(block, "post", index + 12, "npc", "npc", "nearby"))
        .filter((note) => Boolean(note));
    const homeNotes = blocks
        .filter(block => /首页笔记|图文笔记|笔记/.test(block.title) && !/视频|附近|同城/.test(block.title))
        .slice(0, 6)
        .map((block, index) => parseNoteBlock(block, "post", index, "npc"))
        .filter((note) => Boolean(note));
    const videoNotes = blocks
        .filter(block => /视频/.test(block.title))
        .slice(0, 6)
        .map((block, index) => parseNoteBlock(block, "video", index + homeNotes.length, "npc"))
        .filter((note) => Boolean(note));
    return { homeNotes, videoNotes, nearbyNotes };
}
function parseXiaohongshuNpcReaction(raw, noteId) {
    const blocks = parseBlocks(raw);
    const interaction = blocks.find(block => /用户笔记互动|互动/.test(block.title)) ?? blocks[0];
    const commentFields = blocks.reduce((acc, block) => ({ ...acc, ...block.fields }), {});
    const comments = parseBlockComments(commentFields, noteId, "npc").map((comment) => ({
        authorName: comment.authorName,
        text: comment.text,
        replyTo: comment.replyTo,
        replyToCommentId: comment.replyToCommentId,
    }));
    const directMessages = blocks
        .filter(block => /私信|消息/.test(block.title))
        .map(block => ({
        name: baseline_engine_cleanText(block.fields["名称"] ?? block.fields["作者"], 60) || "小红书用户",
        text: baseline_engine_cleanMultiline(block.fields["正文"] ?? block.fields["内容"], 600),
    }))
        .filter(item => item.text)
        .slice(0, 6);
    const followerCount = parseMetric(metricField(interaction?.fields, ["新增关注", "关注", "粉丝"]));
    const followerNames = Array.from(new Set([
        interaction?.fields["关注用户1"],
        interaction?.fields["关注用户2"],
        interaction?.fields["关注用户3"],
        ...Array.from({ length: Math.min(12, followerCount) }, (_, index) => interaction?.fields[`关注用户${index + 1}`]),
    ].map(name => baseline_engine_cleanText(name, 60)).filter(Boolean))).slice(0, Math.max(2, followerCount || 0));
    return {
        likeCount: parseMetric(metricField(interaction?.fields, ["点赞", "点赞数", "赞"])),
        saveCount: parseMetric(metricField(interaction?.fields, ["收藏", "收藏数"])),
        recentLikeNames: [interaction?.fields["点赞用户1"], interaction?.fields["点赞用户2"]].map(name => baseline_engine_cleanText(name, 24)).filter(Boolean),
        recentSaveNames: [interaction?.fields["收藏用户1"], interaction?.fields["收藏用户2"]].map(name => baseline_engine_cleanText(name, 24)).filter(Boolean),
        comments,
        directMessages,
        followerNames,
    };
}
function parseXiaohongshuNpcCommentReply(raw, noteId, fallbackReplyToCommentId) {
    const blocks = parseBlocks(raw);
    const fields = blocks.reduce((acc, block) => ({ ...acc, ...block.fields }), {});
    const numbers = Object.keys(fields)
        .map(key => /^评论(\d+)作者$/.exec(key)?.[1])
        .filter((value) => Boolean(value))
        .map(Number)
        .sort((a, b) => a - b);
    const userNames = buildXiaohongshuUserNameSet();
    const prunedNumbers = new Set();
    const comments = [];
    for (const number of numbers) {
        if (comments.length >= 4)
            break;
        const authorName = baseline_engine_cleanText(fields[`评论${number}作者`], 60) || "小红书用户";
        const replyValue = baseline_engine_cleanText(fields[`评论${number}回复评论ID`] ?? fields[`评论${number}回复对象`], 180);
        const replyNumber = /^评论(\d+)$/.exec(replyValue)?.[1];
        if (isXiaohongshuUserAuthorName(authorName, userNames)) {
            console.warn(`[Xiaohongshu] 剪掉冒用用户名的生成评论: "${authorName}"`);
            prunedNumbers.add(number);
            continue;
        }
        if (replyNumber && prunedNumbers.has(Number(replyNumber))) {
            prunedNumbers.add(number);
            continue;
        }
        const isEmptyReply = !replyValue || /^(无|none|null|-)$/.test(replyValue.toLowerCase()) || /被回复|候选|评论id/i.test(replyValue);
        const replyToCommentId = replyNumber
            ? `${noteId}_comment_${replyNumber}`
            : !isEmptyReply
                ? replyValue
                : fallbackReplyToCommentId;
        const text = baseline_engine_cleanMultiline(fields[`评论${number}内容`], 600);
        if (!text)
            continue;
        comments.push({ authorName, text, replyToCommentId });
    }
    return { comments };
}
function parseXiaohongshuNpcMoreComments(raw) {
    const blocks = parseBlocks(raw);
    const fields = blocks.reduce((acc, block) => ({ ...acc, ...block.fields }), {});
    const numbers = Object.keys(fields)
        .map(key => /^评论(\d+)作者$/.exec(key)?.[1])
        .filter((value) => Boolean(value))
        .map(Number)
        .sort((a, b) => a - b);
    const userNames = buildXiaohongshuUserNameSet();
    const prunedNumbers = new Set();
    const comments = [];
    for (const number of numbers) {
        if (comments.length >= 8)
            break;
        const authorName = baseline_engine_cleanText(fields[`评论${number}作者`], 60) || "小红书用户";
        const replyId = baseline_engine_cleanText(fields[`评论${number}回复评论ID`], 180);
        const replyTarget = baseline_engine_cleanText(fields[`评论${number}回复对象`], 80);
        const replyNumber = /^评论(\d+)$/.exec(replyTarget)?.[1];
        if (isXiaohongshuUserAuthorName(authorName, userNames)) {
            console.warn(`[Xiaohongshu] 剪掉冒用用户名的生成评论: "${authorName}"`);
            prunedNumbers.add(number);
            continue;
        }
        if (replyNumber && prunedNumbers.has(Number(replyNumber))) {
            prunedNumbers.add(number);
            continue;
        }
        const isEmptyReplyId = !replyId || /^(无|none|null|-)$/.test(replyId.toLowerCase()) || /从上下文|真实评论id|被回复|候选|评论id/i.test(replyId);
        const text = baseline_engine_cleanMultiline(fields[`评论${number}内容`], 600);
        if (!text)
            continue;
        comments.push({
            authorName,
            text,
            replyTo: !replyNumber && replyTarget ? replyTarget : undefined,
            replyToCommentId: !isEmptyReplyId
                ? replyId
                : replyNumber
                    ? `__generated_comment_${replyNumber}`
                    : undefined,
        });
    }
    return { comments };
}
function parseXiaohongshuNpcDmReply(raw) {
    const blocks = parseBlocks(raw).filter(block => /私信|回复|消息/.test(block.title));
    const messages = blocks
        .map(block => baseline_engine_cleanMultiline(block.fields["正文"] ?? block.fields["内容"] ?? block.fields["回复"], 600))
        .filter(Boolean)
        .slice(0, 4);
    if (messages.length > 0)
        return { messages };
    const fallback = baseline_engine_cleanMultiline(raw.replace(/^#.*$/gm, "").replace(/^\[[^\]]+]\s*/gm, ""), 600);
    return { messages: fallback ? [fallback] : [] };
}
function parseXiaohongshuCharacterActivity(raw, allowedNoteIds) {
    const blocks = parseBlocks(raw);
    const comments = blocks
        .filter(block => /评论/.test(block.title))
        .map(block => {
        const thread = parseCharacterThreadFields(block.fields);
        return {
            noteId: baseline_engine_cleanText(block.fields["笔记ID"] ?? block.fields["noteId"], 180),
            text: baseline_engine_cleanMultiline(block.fields["内容"] ?? block.fields["评论"], 600),
            liked: parseBoolean(block.fields["点赞"]),
            saved: parseBoolean(block.fields["收藏"]),
            thread: thread.length > 0 ? thread : undefined,
        };
    })
        .filter(item => item.noteId && item.text && allowedNoteIds.includes(item.noteId))
        .slice(0, 3);
    const postBlock = blocks.find(block => /发帖|笔记|视频/.test(block.title) && !/评论/.test(block.title));
    const rawPostType = baseline_engine_cleanText(postBlock?.fields["类型"] ?? postBlock?.fields["格式"] ?? postBlock?.title, 40).toLowerCase();
    const postType = /视频|video/.test(rawPostType) ? "video" : "post";
    const post = postBlock
        ? {
            type: postType,
            title: baseline_engine_cleanText(postBlock.fields["标题"], 80),
            body: baseline_engine_cleanMultiline(postBlock.fields["正文"] ?? postBlock.fields["内容"], 3000),
            coverIcon: baseline_engine_cleanText(postBlock.fields["图标"], 8) || (postType === "video" ? "▶" : "✦"),
            tags: parseTags(postBlock.fields["标签"] ?? postBlock.fields["TAG"]),
            likeCount: parseMetricField(postBlock.fields, ["点赞", "点赞数", "赞"]),
            saveCount: parseMetricField(postBlock.fields, ["收藏", "收藏数"]),
            commentCount: parseMetricField(postBlock.fields, ["评论数", "评论量", "评论"], parseBlockComments(postBlock.fields, "__character_post__", "npc").length),
            recentLikeNames: [postBlock.fields["点赞用户1"], postBlock.fields["点赞用户2"]].map(name => baseline_engine_cleanText(name, 24)).filter(Boolean),
            recentSaveNames: [postBlock.fields["收藏用户1"], postBlock.fields["收藏用户2"]].map(name => baseline_engine_cleanText(name, 24)).filter(Boolean),
            imageDescription: postType === "post" ? baseline_engine_cleanMultiline(postBlock.fields["图片描述"] ?? postBlock.fields["配图"], 500) || undefined : undefined,
            videoDescription: postType === "video"
                ? baseline_engine_cleanMultiline(postBlock.fields["视频描述"] ?? postBlock.fields["视频画面"] ?? postBlock.fields["图片描述"] ?? postBlock.fields["配图"], 500) || undefined
                : undefined,
            comments: parseBlockComments(postBlock.fields, "__character_post__", "npc")
                .map((comment) => ({
                authorName: comment.authorName,
                text: comment.text,
                replyTo: comment.replyTo,
                replyToCommentId: comment.replyToCommentId,
            }))
                .slice(0, 8),
        }
        : undefined;
    return { comments, post: post && (post.title || post.body) ? post : undefined };
}
function parseXiaohongshuCharacterReaction(raw) {
    const blocks = parseBlocks(raw);
    const block = blocks.find(item => /角色互动|互动|评论|回复/.test(item.title)) ?? blocks[0];
    const thread = block ? parseCharacterThreadFields(block.fields) : [];
    return {
        comment: baseline_engine_cleanMultiline(block?.fields["评论"] ?? block?.fields["内容"], 600),
        liked: parseBoolean(block?.fields["点赞"]),
        saved: parseBoolean(block?.fields["收藏"]),
        followedAuthor: parseBoolean(block?.fields["关注作者"] ?? block?.fields["关注"]),
        thread: thread.length > 0 ? thread : undefined,
    };
}
function parseXiaohongshuCharacterMentionReply(raw) {
    const blocks = parseBlocks(raw);
    const block = blocks.find(item => /角色回复|回复|评论/.test(item.title)) ?? blocks[0];
    const thread = block ? parseCharacterThreadFields(block.fields) : [];
    return {
        comment: baseline_engine_cleanMultiline(block?.fields["内容"] ?? block?.fields["评论"], 600),
        thread: thread.length > 0 ? thread : undefined,
    };
}
function applyNpcReaction(note, reaction) {
    const shouldNotifyUser = note.source === "user";
    const baseCommentIndex = note.comments.length;
    const comments = reaction.comments
        .filter(comment => comment.text)
        .map((comment, index) => {
        const parsedReplyIndex = /^.*_comment_(\d+)$/.exec(comment.replyToCommentId || "")?.[1];
        const replyToCommentId = parsedReplyIndex
            ? `${note.id}_comment_${baseCommentIndex + Number(parsedReplyIndex)}`
            : comment.replyToCommentId;
        return {
            ...baseline_storage_makeXiaohongshuComment({
                noteId: note.id,
                authorType: "npc",
                authorId: "npc",
                authorName: comment.authorName,
                text: comment.text,
                replyTo: comment.replyTo,
                replyToCommentId,
                unread: true,
            }),
            id: `${note.id}_comment_${baseCommentIndex + index + 1}`,
        };
    });
    const updated = {
        ...note,
        likeCount: note.likeCount + reaction.likeCount,
        saveCount: note.saveCount + reaction.saveCount,
        recentLikeNames: addNames(note.recentLikeNames, reaction.recentLikeNames),
        recentSaveNames: addNames(note.recentSaveNames, reaction.recentSaveNames),
        comments: [...note.comments, ...comments],
        commentCount: note.commentCount + comments.length,
        updatedAt: new Date().toISOString(),
    };
    const notifications = shouldNotifyUser ? [
        reaction.likeCount > 0 ? baseline_storage_makeXiaohongshuNotification({
            type: "like",
            noteId: note.id,
            actorName: reaction.recentLikeNames[0] || "小红书用户",
            text: `${reaction.recentLikeNames.join("、") || "有人"}等${reaction.likeCount}人赞了你的笔记`,
            count: reaction.likeCount,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        reaction.saveCount > 0 ? baseline_storage_makeXiaohongshuNotification({
            type: "save",
            noteId: note.id,
            actorName: reaction.recentSaveNames[0] || "小红书用户",
            text: `${reaction.recentSaveNames.join("、") || "有人"}等${reaction.saveCount}人收藏了你的笔记`,
            count: reaction.saveCount,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        ...comments.map(comment => baseline_storage_makeXiaohongshuNotification({
            type: "comment",
            noteId: note.id,
            actorName: comment.authorName,
            text: comment.text,
            thumbnailText: note.title,
            unread: true,
        })),
        ...reaction.directMessages.map(message => baseline_storage_makeXiaohongshuNotification({
            type: "dm",
            noteId: note.id,
            actorName: message.name,
            text: message.text,
            thumbnailText: note.title,
            direction: "incoming",
            threadId: `dm:${message.name}`,
            threadName: message.name,
            unread: true,
        })),
    ].filter((item) => Boolean(item)) : [];
    return { note: updated, notifications };
}
function applyCharacterReaction(note, character, reaction) {
    const shouldNotifyUser = note.source === "user";
    const displayName = resolveCharacterXiaohongshuDisplayName(character);
    const comment = baseline_storage_makeXiaohongshuComment({
        noteId: note.id,
        authorType: "character",
        authorId: character.id,
        authorName: displayName,
        text: reaction.comment,
        unread: shouldNotifyUser,
    });
    const likeIncrement = reaction.liked && !note.recentLikeNames.includes(displayName) ? 1 : 0;
    const saveIncrement = reaction.saved && !note.recentSaveNames.includes(displayName) ? 1 : 0;
    let updated = {
        ...note,
        likeCount: note.likeCount + likeIncrement,
        saveCount: note.saveCount + saveIncrement,
        recentLikeNames: reaction.liked ? addNames(note.recentLikeNames, [displayName]) : note.recentLikeNames,
        recentSaveNames: reaction.saved ? addNames(note.recentSaveNames, [displayName]) : note.recentSaveNames,
        comments: comment.text ? [...note.comments, comment] : note.comments,
        commentCount: note.commentCount + (comment.text ? 1 : 0),
        updatedAt: new Date().toISOString(),
    };
    let threadNotifications = [];
    let threadComments = [];
    if (comment.text && reaction.thread && reaction.thread.length > 0) {
        const result = appendCharacterThreadToNote({
            note: updated,
            characterDisplayName: displayName,
            characterName: character.name,
            characterId: character.id,
            thread: reaction.thread,
            mainCommentId: comment.id,
            shouldNotifyUser,
        });
        updated = result.note;
        threadNotifications = result.notifications;
        threadComments = result.appended;
    }
    const notifications = shouldNotifyUser ? [
        reaction.liked ? baseline_storage_makeXiaohongshuNotification({
            type: "like",
            noteId: note.id,
            actorName: displayName,
            text: `${displayName} 赞了你的笔记`,
            count: 1,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        reaction.saved ? baseline_storage_makeXiaohongshuNotification({
            type: "save",
            noteId: note.id,
            actorName: displayName,
            text: `${displayName} 收藏了你的笔记`,
            count: 1,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        comment.text ? baseline_storage_makeXiaohongshuNotification({
            type: "comment",
            noteId: note.id,
            actorName: displayName,
            text: comment.text,
            thumbnailText: note.title,
            unread: true,
        }) : null,
    ].filter((item) => Boolean(item)) : [];
    return { note: updated, notifications: [...notifications, ...threadNotifications], mainComment: comment, threadComments };
}
function applyNpcCommentReply(note, reaction, fallbackReplyToCommentId) {
    const shouldNotifyUser = note.source === "user";
    const comments = reaction.comments
        .filter(comment => comment.text)
        .map(comment => baseline_storage_makeXiaohongshuComment({
        noteId: note.id,
        authorType: "npc",
        authorId: "npc",
        authorName: comment.authorName,
        text: comment.text,
        replyTo: comment.replyTo,
        replyToCommentId: comment.replyToCommentId || fallbackReplyToCommentId,
        unread: true,
    }));
    const updated = {
        ...note,
        comments: [...note.comments, ...comments],
        commentCount: note.commentCount + comments.length,
        updatedAt: new Date().toISOString(),
    };
    const notifications = shouldNotifyUser ? comments.map(comment => baseline_storage_makeXiaohongshuNotification({
        type: "comment",
        noteId: note.id,
        actorName: comment.authorName,
        text: comment.text,
        thumbnailText: note.title,
        unread: true,
    })) : [];
    return { note: updated, notifications };
}
function applyNpcMoreComments(note, reaction) {
    const baseCommentIndex = note.comments.length;
    const comments = reaction.comments
        .filter(comment => comment.text)
        .map((comment, index) => {
        const generatedReplyIndex = /^__generated_comment_(\d+)$/.exec(comment.replyToCommentId || "")?.[1];
        return {
            ...makeXiaohongshuComment({
                noteId: note.id,
                authorType: "npc",
                authorId: makeXiaohongshuNpcId(comment.authorName),
                authorName: comment.authorName,
                text: comment.text,
                replyTo: comment.replyTo,
                replyToCommentId: generatedReplyIndex
                    ? `${note.id}_comment_${baseCommentIndex + Number(generatedReplyIndex)}`
                    : comment.replyToCommentId,
            }),
            id: `${note.id}_comment_${baseCommentIndex + index + 1}`,
        };
    });
    return {
        ...note,
        comments: [...note.comments, ...comments],
        commentCount: note.commentCount + comments.length,
        updatedAt: new Date().toISOString(),
    };
}
function applyCharacterCommentReply(note, character, reaction, replyToCommentId) {
    const shouldNotifyUser = note.source === "user";
    const displayName = resolveCharacterXiaohongshuDisplayName(character);
    const comment = baseline_storage_makeXiaohongshuComment({
        noteId: note.id,
        authorType: "character",
        authorId: character.id,
        authorName: displayName,
        text: reaction.comment,
        replyToCommentId,
        unread: shouldNotifyUser,
    });
    const likeIncrement = reaction.liked && !note.recentLikeNames.includes(displayName) ? 1 : 0;
    const saveIncrement = reaction.saved && !note.recentSaveNames.includes(displayName) ? 1 : 0;
    let updated = {
        ...note,
        likeCount: note.likeCount + likeIncrement,
        saveCount: note.saveCount + saveIncrement,
        recentLikeNames: reaction.liked ? addNames(note.recentLikeNames, [displayName]) : note.recentLikeNames,
        recentSaveNames: reaction.saved ? addNames(note.recentSaveNames, [displayName]) : note.recentSaveNames,
        comments: comment.text ? [...note.comments, comment] : note.comments,
        commentCount: note.commentCount + (comment.text ? 1 : 0),
        updatedAt: new Date().toISOString(),
    };
    let threadNotifications = [];
    let threadComments = [];
    if (comment.text && reaction.thread && reaction.thread.length > 0) {
        const result = appendCharacterThreadToNote({
            note: updated,
            characterDisplayName: displayName,
            characterName: character.name,
            characterId: character.id,
            thread: reaction.thread,
            mainCommentId: comment.id,
            shouldNotifyUser,
        });
        updated = result.note;
        threadNotifications = result.notifications;
        threadComments = result.appended;
    }
    const notifications = shouldNotifyUser ? [
        reaction.liked ? baseline_storage_makeXiaohongshuNotification({
            type: "like",
            noteId: note.id,
            actorName: displayName,
            text: `${displayName} 赞了这篇笔记`,
            count: 1,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        reaction.saved ? baseline_storage_makeXiaohongshuNotification({
            type: "save",
            noteId: note.id,
            actorName: displayName,
            text: `${displayName} 收藏了这篇笔记`,
            count: 1,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        comment.text ? baseline_storage_makeXiaohongshuNotification({
            type: "comment",
            noteId: note.id,
            actorName: displayName,
            text: comment.text,
            thumbnailText: note.title,
            unread: true,
        }) : null,
    ].filter((item) => Boolean(item)) : [];
    return { note: updated, notifications: [...notifications, ...threadNotifications], mainComment: comment, threadComments };
}
/**
 * 应用 Activity 里"角色评论别人帖子"的单条评论 + 可选延伸 thread。
 * - 主评论永远是角色本人评论
 * - 如果 thread 存在，把延伸评论按楼中楼关系挂在主评论下
 * - 返回新增的所有评论（主评论 + thread 评论）供调用方记录记忆/通知
 */
function applyCharacterActivityComment(args) {
    const { note, character, text, liked, saved, thread } = args;
    const displayName = resolveCharacterXiaohongshuDisplayName(character);
    const shouldNotifyUser = note.source === "user";
    const mainComment = baseline_storage_makeXiaohongshuComment({
        noteId: note.id,
        authorType: "character",
        authorId: character.id,
        authorName: displayName,
        text,
        unread: shouldNotifyUser,
    });
    let updated = {
        ...note,
        likeCount: note.likeCount + (liked && !note.recentLikeNames.includes(displayName) ? 1 : 0),
        saveCount: note.saveCount + (saved && !note.recentSaveNames.includes(displayName) ? 1 : 0),
        recentLikeNames: liked ? addNames(note.recentLikeNames, [displayName]) : note.recentLikeNames,
        recentSaveNames: saved ? addNames(note.recentSaveNames, [displayName]) : note.recentSaveNames,
        comments: [...note.comments, mainComment],
        commentCount: note.commentCount + 1,
        updatedAt: new Date().toISOString(),
    };
    let threadComments = [];
    let threadNotifications = [];
    if (thread && thread.length > 0) {
        const result = appendCharacterThreadToNote({
            note: updated,
            characterDisplayName: displayName,
            characterName: character.name,
            characterId: character.id,
            thread,
            mainCommentId: mainComment.id,
            shouldNotifyUser,
        });
        updated = result.note;
        threadComments = result.appended;
        threadNotifications = result.notifications;
    }
    const mainNotifications = shouldNotifyUser ? [
        liked && !note.recentLikeNames.includes(displayName) ? baseline_storage_makeXiaohongshuNotification({
            type: "like",
            noteId: note.id,
            actorName: displayName,
            text: `${displayName} 赞了你的笔记`,
            count: 1,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        saved && !note.recentSaveNames.includes(displayName) ? baseline_storage_makeXiaohongshuNotification({
            type: "save",
            noteId: note.id,
            actorName: displayName,
            text: `${displayName} 收藏了你的笔记`,
            count: 1,
            thumbnailText: note.title,
            unread: true,
        }) : null,
        baseline_storage_makeXiaohongshuNotification({
            type: "comment",
            noteId: note.id,
            actorName: displayName,
            text,
            thumbnailText: note.title,
            unread: true,
        }),
    ].filter((item) => Boolean(item)) : [];
    return {
        note: updated,
        mainComment,
        threadComments,
        notifications: [...mainNotifications, ...threadNotifications],
    };
}
function applyCharacterMentionReply(note, character, reaction, replyToCommentId) {
    const shouldNotifyUser = note.source === "user";
    const displayName = resolveCharacterXiaohongshuDisplayName(character);
    const comment = makeXiaohongshuComment({
        noteId: note.id,
        authorType: "character",
        authorId: character.id,
        authorName: displayName,
        text: reaction.comment,
        replyToCommentId,
        unread: shouldNotifyUser,
    });
    let updated = {
        ...note,
        comments: comment.text ? [...note.comments, comment] : note.comments,
        commentCount: note.commentCount + (comment.text ? 1 : 0),
        updatedAt: new Date().toISOString(),
    };
    let threadNotifications = [];
    let threadComments = [];
    if (comment.text && reaction.thread && reaction.thread.length > 0) {
        const result = appendCharacterThreadToNote({
            note: updated,
            characterDisplayName: displayName,
            characterName: character.name,
            characterId: character.id,
            thread: reaction.thread,
            mainCommentId: comment.id,
            shouldNotifyUser,
        });
        updated = result.note;
        threadNotifications = result.notifications;
        threadComments = result.appended;
    }
    const notifications = shouldNotifyUser ? [
        comment.text ? makeXiaohongshuNotification({
            type: "comment",
            noteId: note.id,
            actorName: displayName,
            text: comment.text,
            thumbnailText: note.title,
            unread: true,
        }) : null,
    ].filter((item) => Boolean(item)) : [];
    return { note: updated, notifications: [...notifications, ...threadNotifications], mainComment: comment, threadComments };
}

;// ./custom-apps/anonymous-xiaohongshu/src/baseline-prompts.ts
// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.
const NATIVE_CHARACTER_PROMPTS = {
    "activity": "<xiaohongshu_character_activity_instruction>\n你正在以{{char}}的身份浏览小红书，并根据当前看到的公共内容进行自然互动。\n以下是小红书候选笔记、已有评论和点赞/收藏数量：\n{{xiaohongshuFeedContext}}\n\n内容要求：\n- 以碎片化、去精致化的日常分享为主，使用口语、网络黑话、表情等加强日常不经意感，*不煽情、不装逼。*\n- 可采用日常经历吐槽、疑问、分享技巧与心得等多种形式，标题和内容都应该口语化（除非是正式的技巧和心得的分享）。\n- 角色与评论区的互动，禁止世界以{{char}}为中心夸夸和吹捧，评论区可体现出不一样的观点，NPC不脸谱化，多种性格同时存在（比如尖锐的、温和的、挑事的、看戏的、蹲后续等等）\n- *绝对禁止在小红书讲大道理、爹味说教*，*绝对禁止强行把日常生活上升高度*，小红书必须是轻松、幽默、张力十足的，绝对禁止分享一些假大空道理，帖子与评论必须落于实际。\n- *绝对禁止评论的时候引用帖子/评论原文”，例如“XXXXX”这句太真实了——这种格式绝对禁止\n- 必须和{{char}}的性格相符，结合{{char}}的记忆和经历内容进行适度延展，从日常事件中提取主题，如有日程可联系日程。\n\n输出规则：\n- 只输出块格式，不要输出 Markdown、解释、代码块、动作标签或闲聊内容\n- 从候选笔记中选择 3 条进行评论；如果确实没有适合评论的内容，可以少于 3 条\n- 每条评论必须使用候选中的 [笔记ID]\n- 同时输出 1 条{{char}}自己发布的小红书内容；每次由{{char}}自行选择普通笔记或视频笔记，只输出其中一种\n- {{char}}自己发布的内容需要输出点赞数、收藏数、评论数和前两个点赞/收藏昵称，并附带 3 到 8 条评论；评论主要来自小红书路人，但可以有 1~2 条由{{char}}自己作为笔记作者出现来回应路人\n- 如果选择普通笔记，[类型]填 笔记，可以输出[图片描述]；如果选择视频笔记，[类型]填 视频，必须输出[视频描述]\n- Xiaohongshu comments must come from strangers. In most cases, these users have no way to know {{char}}'s private life unless {{char}} is a public figure; do not use acquaintances from Moments, group chats, or private chats.\n- [评论数] 是该笔记显示的总评论数，可以远高于实际输出的评论条数；输出的评论只是评论区样例，不代表全部评论\n- 发帖下的评论可以包含楼中楼；如需楼中楼，使用 [评论N回复对象]评论M，其中 M 必须是前面已经出现过的评论编号\n- 当{{char}}本人作为发帖下的评论作者出现时，[评论N作者] 直接填 {{char}}，并用 [评论N回复对象] 指向你回应的路人评论编号\n- 点赞、收藏由{{char}}自己判断，填 是 或 否\n- 评论要符合{{char}}的人设、性格、记忆、最近状态和与{{user}}的关系；不要像客服或机器总结\n- 如果回复已有评论，可以在评论正文里自然接话，但这里不需要输出楼中楼关系\n\n在每条 #评论N 下面，可以可选地输出 3~6 条「延伸互动」，模拟这条评论下方的真实小红书评论区氛围：\n- 其中 1~2 条延伸由 {{char}} 自己接话（[延伸M作者] 直接填 {{char}}）\n- 其余 2~4 条由路人 NPC 评论，作者昵称由你自创，每条不同，符合小红书路人风格\n- 楼中楼关系用 [延伸M回复对象] 表示，值为：主评论 或 延伸K（K 是同一条 #评论N 下前面已经出现过的延伸编号）\n- 如果你判断该评论不适合延伸，可以完全省略该评论的延伸段\n\n输出格式：\n#评论1\n[笔记ID]候选笔记ID\n[内容]评论内容\n[点赞]是或否\n[收藏]是或否\n[延伸1作者]路人昵称 或 {{char}}\n[延伸1回复对象]主评论\n[延伸1内容]延伸评论内容\n[延伸2作者]路人昵称 或 {{char}}\n[延伸2回复对象]主评论 或 延伸1\n[延伸2内容]延伸评论内容\n\n#评论2\n[笔记ID]候选笔记ID\n[内容]评论内容\n[点赞]是或否\n[收藏]是或否\n\n#评论3\n[笔记ID]候选笔记ID\n[内容]评论内容\n[点赞]是或否\n[收藏]是或否\n\n#发帖1\n[类型]笔记或视频\n[标题]笔记标题\n[正文]笔记正文\n[图标]单个 emoji 或符号\n[点赞]数字\n[点赞用户1]路人昵称\n[点赞用户2]路人昵称\n[收藏]数字\n[收藏用户1]路人昵称\n[收藏用户2]路人昵称\n[评论数]数字\n[标签]标签1、标签2\n[图片描述]普通笔记可选的配图或封面描述\n[视频描述]视频笔记必填的视频画面描述\n[评论1作者]路人昵称\n[评论1内容]评论内容\n[评论2作者]路人昵称\n[评论2回复对象]评论1\n[评论2内容]回复评论1的楼中楼内容\n[评论3作者]{{char}}\n[评论3回复对象]评论1\n[评论3内容]{{char}}本人作为笔记作者回应评论1的内容\n</xiaohongshu_character_activity_instruction>",
    "reaction": "<xiaohongshu_user_post_reaction_instruction>\n你正在以{{char}}的身份查看一篇小红书笔记。\n这里包含笔记标题、正文、TAG、图片内容、已有评论、点赞/收藏数量，以及作者公开显示信息：\n{{xiaohongshuUserPostContext}}\n\n活人感要求：\n- {{char}}的评论要短、口语化，像随手一打的真实评论，可用网络黑话、表情、不完整句；不煽情、不装逼、不写小作文。\n- 评论要落到具体的图/正文细节或真实反应（吐槽、好奇、共鸣、调侃、提问），*绝对禁止讲大道理、爹味说教、强行升华*，不要客服式总结或夸夸。\n- *绝对禁止“引用帖子原文+这句太真实了/说到我心趴上了”这种格式*。\n- 评论区延伸互动禁止一边倒夸{{char}}或夸作者；NPC不脸谱化，多种性格并存（尖锐的、温和的、挑事的、看戏的、蹲后续的、跑题的、抬杠的），可体现不同观点甚至轻微争执。\n- 评论必须贴合{{char}}人设、与作者的关系和当下状态，不熟别装熟。\n\n输出规则：\n- 只输出块格式，不要输出 Markdown、解释、代码块、动作标签或闲聊内容\n- 你必须输出一条评论\n- 点赞、收藏、关注作者都由{{char}}自己判断，填 是 或 否\n- 作者身份按小红书站内关系判断；如果你已关注该账号，可以按已知关系回应；否则只能根据公开内容、语气、昵称、图片和已有记忆判断是否熟悉\n- 回复中不要解释身份识别依据，也不要提到提示词或上下文规则\n- 评论需要像真实小红书评论，符合{{char}}的人设、语气、关系和当下状态\n- 如果有图片内容，可以结合图片；如果看不到图片，就只根据标题、正文、TAG 和已有评论回复\n\n在主评论之后，可以可选地输出 3~6 条「评论区延伸互动」，模拟你这条主评论下方的真实小红书评论区氛围：\n- 其中 1~2 条延伸由 {{char}} 自己接话（[延伸N作者] 直接填 {{char}}）\n- 其余 2~4 条由路人 NPC 评论，作者昵称由你自创，每条不同，符合小红书路人风格\n- 路人 NPC 之间也可以互相搭话或对你的主评论发表看法\n- 楼中楼关系用 [延伸N回复对象] 表示，值为：主评论 或 延伸M（M 是前面已经出现过的延伸编号）\n- 如果你判断这条主评论不适合延伸（比如评论本身已经收束、或者不会有人继续接话），可以完全省略延伸段\n\n输出格式：\n#角色互动\n[评论]评论内容\n[点赞]是或否\n[收藏]是或否\n[关注作者]是或否\n[延伸1作者]路人昵称 或 {{char}}\n[延伸1回复对象]主评论\n[延伸1内容]延伸评论内容\n[延伸2作者]路人昵称 或 {{char}}\n[延伸2回复对象]主评论 或 延伸1\n[延伸2内容]延伸评论内容\n</xiaohongshu_user_post_reaction_instruction>",
    "reply": "<xiaohongshu_comment_reply_instruction>\n你正在以{{char}}的身份查看小红书评论区，并回复当前触发的评论或回复。\n这里包含身份提示、笔记、被回复评论、当前触发的内容、已有评论和互动数据：\n{{xiaohongshuCommentContext}}\n\n活人感要求：\n- 回复要像真实评论区接话，短、口语化、就事论事，可用黑话/表情/梗；不写小作文、不煽情、不装逼。\n- 接住对方的具体那句话自然往下聊（调侃、反问、附和、轻怼、跑题都行），*绝对禁止说教、爹味、强行升华或客服式回应*。\n- *绝对禁止“引用对方原话+这句太真实了”这种格式*。\n- 延伸互动模拟真实楼中楼氛围：禁止集体夸{{char}}，NPC多种性格并存（尖锐/温和/挑事/看戏/蹲后续/抬杠），可互相搭话、有不同观点甚至拌嘴。\n- 回复贴合{{char}}人设、与评论者的关系和当下状态，不熟别装熟。\n\n输出规则：\n- 只输出块格式，不要输出 Markdown、解释、代码块、动作标签或闲聊内容\n- 你必须输出一条自然评论回复\n- 评论者身份按小红书站内关系判断；如果你已关注该账号，可以按已知关系回应；否则只能根据公开内容、语气、昵称、图片和已有记忆判断是否熟悉\n- 回复要像真实小红书评论区接话，符合{{char}}的人设、语气、关系和当下状态\n- 如果当前触发的评论是在回复你的评论，优先承接这条评论；如果是在评论你的笔记，就像笔记作者一样回复\n- 点赞和收藏由{{char}}自己判断，填 是 或 否\n\n在主回复之后，可以可选地输出 3~6 条「评论区延伸互动」，模拟你这条回复下方的真实小红书评论区氛围：\n- 其中 1~2 条延伸由 {{char}} 自己接话（[延伸N作者] 直接填 {{char}}）\n- 其余 2~4 条由路人 NPC 评论，作者昵称由你自创，每条不同，符合小红书路人风格\n- 路人 NPC 之间也可以互相搭话或对你的主回复发表看法\n- 楼中楼关系用 [延伸N回复对象] 表示，值为：主评论 或 延伸M（M 是前面已经出现过的延伸编号）\n- 如果你判断这条回复不适合延伸（比如内容已经收束、或者不会有人继续接话），可以完全省略延伸段\n\n输出格式：\n#角色回复\n[内容]回复内容\n[点赞]是或否\n[收藏]是或否\n[延伸1作者]路人昵称 或 {{char}}\n[延伸1回复对象]主评论\n[延伸1内容]延伸评论内容\n[延伸2作者]路人昵称 或 {{char}}\n[延伸2回复对象]主评论 或 延伸1\n[延伸2内容]延伸评论内容\n</xiaohongshu_comment_reply_instruction>"
};

;// ./custom-apps/anonymous-xiaohongshu/src/xiaohongshu-engine.ts








class XiaohongshuEngine {
    state;
    characters = [];
    avatars = [];
    error = '';
    running = false;
    listeners = new Set();
    serial = Promise.resolve();
    knowledge(s, viewer) { return JSON.stringify(s.disclosures.filter(d => d.viewerCharacterId === viewer).map(d => ({ accountId: d.accountId, state: d.state, revision: d.revision })).sort((a, b) => a.accountId.localeCompare(b.accountId))); }
    subscribe = (fn) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
    notify() { this.listeners.forEach(fn => fn()); }
    async init() {
        const api = host();
        await api.app.setPolicy({ id: 'pseudonymous-identities', namespace: 'social_posts', text: PROTECTED_RULE });
        [this.state, this.characters, this.avatars] = await Promise.all([loadState(), api.characters.list(), Promise.all(Array.from({ length: 6 }, (_, i) => api.app.getAssetUrl(`assets/avatars/default-0${i + 1}.png`)))]);
        this.notify();
        void this.drain();
    }
    async edit(fn) { const operation = this.serial.then(async () => { const next = structuredClone(this.state); await fn(next); await saveState(next, this.state); this.state = next; this.notify(); }); this.serial = operation.catch(() => { }); return operation; }
    async atomic(fn) { const p = this.serial.then(fn); this.serial = p.catch(() => { }); return p; }
    enqueue(s, kind, characterId, noteId, commentId) { s.jobs.push({ id: opaqueId('job'), kind, characterId, noteId, commentId, status: 'queued' }); }
    participants(s, kind, noteId, commentId) {
        if (!this.characters.length)
            throw Error('请先在 Float 中创建角色并配置模型 API；无需设置角色网名。');
        for (const c of this.characters) {
            if (!s.bindings.some(b => b.ownerKind === 'character' && b.ownerId === c.id) && !s.jobs.some(j => j.kind === 'nickname' && j.characterId === c.id && ['queued', 'running'].includes(j.status)))
                this.enqueue(s, 'nickname', c.id);
            this.enqueue(s, kind, c.id, noteId, commentId);
        }
    }
    async refresh() { await this.edit(s => { if (s.jobs.some(j => j.status === 'queued' || j.status === 'running'))
        throw Error('已有生成任务，请等待完成。'); this.enqueue(s, 'feed'); this.participants(s, 'activity'); }); void this.drain(); }
    async publish(input, images) { for (const [id, dataUrl] of Object.entries(images))
        await host().db.create('post_images', { id, dataUrl }); await this.edit(s => { if (!s.userAccountId)
        throw Error('请先创建匿名账号'); const n = createUserXiaohongshuNote(input, s.platform.profile); n.id = opaqueId('note'); n.authorId = s.userAccountId; n.authorName = s.accounts[n.authorId].displayName; s.platform.notes.unshift(n); Object.assign(s.images, images); this.enqueue(s, 'npc-reaction', undefined, n.id); this.participants(s, 'reaction', n.id); }); void this.drain(); }
    async comment(noteId, text, replyToCommentId) { await this.edit(s => { if (!text.trim() || !s.userAccountId)
        return; const n = s.platform.notes.find(n => n.id === noteId); if (!n)
        throw Error('帖子不存在'); const c = baseline_storage_makeXiaohongshuComment({ noteId, authorId: s.userAccountId, authorType: 'user', authorName: s.accounts[s.userAccountId].displayName, text, replyToCommentId }); n.comments.push(c); n.commentCount++; this.enqueue(s, 'npc-reply', undefined, n.id, c.id); this.participants(s, 'reply', n.id, c.id); }); void this.drain(); }
    async retry(id) { await this.edit(s => { const j = s.jobs.find(j => j.id === id); if (!j || j.status !== 'error')
        return; s.jobs.push({ ...j, id: opaqueId('job'), request: undefined, taskId: undefined, status: 'queued', error: undefined }); j.status = 'done'; }); void this.drain(); }
    avatar(accountId) { const s = this.state, a = s.accounts[accountId], b = s.bindings.find(b => b.accountId === accountId); if (b?.ownerKind === 'character') {
        const url = this.characters.find(c => c.id === b.ownerId)?.avatar;
        if (url)
            return url;
    } return a?.avatar || this.avatars[[...accountId].reduce((n, c) => n + c.charCodeAt(0), 0) % 6] || ''; }
    async request(job) {
        const s = this.state, characterId = job.characterId || this.characters[0]?.id;
        if (!characterId)
            throw Error('没有可用角色 API 配置');
        const binding = s.bindings.find(b => b.ownerKind === 'character' && b.ownerId === job.characterId), self = binding ? s.accounts[binding.accountId] : undefined;
        if (job.characterId && job.kind !== 'nickname' && !self)
            throw Error('角色网名尚未生成，请先重试失败的网名任务。');
        const notes = job.noteId ? s.platform.notes.filter(n => n.id === job.noteId) : s.platform.notes.slice(0, 24);
        let prompt = '';
        switch (job.kind) {
            case 'nickname':
                prompt = '根据你自己的静态人设生成一个适合小红书的固定网络昵称。不得使用真实姓名、姓氏、代号或现实身份。不介绍自己。不输出其他人的身份。只输出 JSON: {"displayName":"网络昵称"}。';
                break;
            case 'feed':
                prompt = DEFAULT_XIAOHONGSHU_NPC_FEED_PROMPT;
                break;
            case 'npc-reaction':
                prompt = DEFAULT_XIAOHONGSHU_NPC_USER_POST_REACTION_PROMPT;
                break;
            case 'npc-reply':
                prompt = DEFAULT_XIAOHONGSHU_NPC_COMMENT_REPLY_PROMPT;
                break;
            default: prompt = NATIVE_CHARACTER_PROMPTS[job.kind === 'activity' ? 'activity' : job.kind === 'reply' ? 'reply' : 'reaction'];
        }
        // Port adaptation: native identity hints are replaced, not the native output protocol.
        prompt = prompt.split('\n').filter(line => !line.includes('否则只能根据公开内容') && !line.includes('与{{user}}的关系')).join('\n')
            .replaceAll('{{char}}', self?.displayName || '当前账号').replaceAll('{{user}}', s.accounts[s.userAccountId || '']?.displayName || '发言账号')
            .replace(/\{\{xiaohongshu\w+\}\}/g, '见下方 App 公开上下文')
            .replaceAll('用户刚发的', '该账号刚发的').replaceAll('用户发布', '该账号发布');
        if (job.kind === 'activity')
            prompt += '\n本阶段只生成普通图文笔记：[类型]笔记。';
        prompt += '\n只能使用公开网络昵称作为作者；禁止输出真实姓名。不能替其他已存在账号发言。路人昵称自动生成，不复用已有账号昵称。本人回应只用自己的网络昵称。账号熟悉度不等于知道现实身份。';
        const context = job.characterId ? viewerContext(s, job.characterId) : { source: '[匿名小红书]', accounts: Object.values(s.accounts).map(a => ({ kind: 'social_account', accountId: a.accountId, displayName: a.displayName })) };
        const memories = [];
        if (job.characterId && job.kind !== 'nickname')
            for (const id of [...new Set(notes.map(n => n.authorId))]) {
                const found = await host().memory.searchSource({ viewerCharacterId: job.characterId, sourceNamespace: 'social_posts', sourceEntityId: id });
                memories.push(...found.entries.slice(-3).map(e => e.content));
            }
        const content = [{ type: 'text', text: `[ANON_TASK:${job.kind}]\n${prompt}` }];
        if (job.noteId)
            for (const id of (notes[0]?.imageAssetIds || [notes[0]?.imageAssetId]).filter(Boolean).slice(0, 4)) {
                const url = s.images[id];
                if (url)
                    content.push({ type: 'image_url', image_url: { url } });
            }
        return { characterId, contextPolicy: { characterProfile: !!job.characterId, generationRules: !!job.characterId }, maxTokens: 6000, appContext: JSON.stringify({ platform: context, feed: notes.map(n => projectNote(s, n)), replyToCommentId: job.commentId, memories }), messages: [{ role: 'user', content }] };
    }
    reduce(s, job, raw) {
        const binding = s.bindings.find(b => b.ownerKind === 'character' && b.ownerId === job.characterId), a = binding ? s.accounts[binding.accountId] : undefined;
        const character = { id: a?.accountId || '', name: a?.displayName || '' };
        const check = (names) => validateGeneratedAuthors(s, names, this.characters, a?.accountId);
        const update = (note) => { s.platform.notes = s.platform.notes.map(n => n.id === note.id ? canonicalize(s, note, this.characters) : n); };
        if (job.kind === 'nickname') {
            const match = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
            const parsed = JSON.parse(match);
            const name = validateName(s, String(parsed.displayName || ''), this.characters);
            if (!binding) {
                const account = addAccount(s, name);
                s.bindings.push({ accountId: account.accountId, ownerKind: 'character', ownerId: job.characterId });
            }
            return;
        }
        if (job.kind === 'feed') {
            const parsed = parseXiaohongshuNpcFeed(raw);
            const notes = [...parsed.homeNotes, ...parsed.videoNotes, ...parsed.nearbyNotes];
            if (!notes.length)
                throw Error('模型没有返回有效笔记块，请重试。');
            check(notes.flatMap(n => [n.authorName, ...n.comments.map(c => c.authorName)]));
            s.platform.notes.unshift(...notes.map(n => canonicalize(s, n, this.characters)));
            return;
        }
        if (job.kind === 'activity') {
            const parsed = parseXiaohongshuCharacterActivity(raw, s.platform.notes.map(n => n.id));
            if (!parsed.post && !parsed.comments.length)
                throw Error('模型未返回有效互动');
            check([...parsed.comments.flatMap(c => (c.thread || []).map(t => t.authorName)), ...(parsed.post?.comments || []).map(c => c.authorName)]);
            for (const c of parsed.comments) {
                const n = s.platform.notes.find(n => n.id === c.noteId);
                update(applyCharacterActivityComment({ ...c, note: n, character }).note);
            }
            if (parsed.post) {
                const p = parsed.post, id = opaqueId('note');
                const n = { ...createUserXiaohongshuNote({ title: p.title, body: p.body, tags: p.tags }, s.platform.profile), ...p, id, source: 'character', authorId: character.id, authorName: character.name, tone: 'ivory', comments: p.comments.map((c, i) => ({ ...baseline_storage_makeXiaohongshuComment({ ...c, noteId: id, authorType: c.authorName === character.name ? 'character' : 'npc', authorId: c.authorName === character.name ? character.id : '', unread: false }), id: `${id}_comment_${i + 1}`, replyToCommentId: c.replyToCommentId?.replace('__character_post__', id) })) };
                s.platform.notes.unshift(canonicalize(s, n, this.characters));
            }
        }
        else {
            const n = s.platform.notes.find(n => n.id === job.noteId);
            if (!n)
                throw Error('帖子已不存在');
            if (job.kind === 'npc-reaction') {
                const result = parseXiaohongshuNpcReaction(raw, n.id);
                check(result.comments.map(c => c.authorName));
                update(applyNpcReaction(n, result).note);
            }
            else if (job.kind === 'npc-reply') {
                const result = parseXiaohongshuNpcCommentReply(raw, n.id, job.commentId);
                check(result.comments.map(c => c.authorName));
                update(applyNpcCommentReply(n, result, job.commentId).note);
            }
            else {
                const reaction = parseXiaohongshuCharacterReaction(raw);
                if (!reaction.comment)
                    throw Error('模型没有返回有效评论');
                check((reaction.thread || []).map(c => c.authorName));
                update(job.kind === 'reply' ? applyCharacterCommentReply(n, character, reaction, job.commentId).note : applyCharacterReaction(n, character, reaction).note);
            }
        }
        if (job.characterId) {
            const seen = job.noteId ? s.platform.notes.filter(n => n.id === job.noteId) : s.platform.notes.slice(0, 24);
            queueMemories(s, job.characterId, job.id, seen);
        }
    }
    async drain() {
        if (this.running || !this.state)
            return;
        this.running = true;
        this.error = '';
        this.notify();
        try {
            for (;;) {
                const job = this.state.jobs.find(j => j.status === 'queued' || j.status === 'running');
                if (!job)
                    break;
                try {
                    if (!job.request) {
                        const snapshot = this.knowledge(this.state, job.characterId), request = await this.request(job);
                        await this.edit(s => { if (snapshot !== this.knowledge(s, job.characterId))
                            throw Error('身份知识在准备请求时发生变化，请重试'); const j = s.jobs.find(j => j.id === job.id); j.request = request; j.knowledgeSnapshot = snapshot; });
                    }
                    const current = this.state.jobs.find(j => j.id === job.id);
                    let task = current.taskId ? await host().ai.getTask({ taskId: current.taskId }) : await host().ai.startTask({ idempotencyKey: current.id, request: current.request });
                    if (!task)
                        throw Error('Host 任务不存在');
                    await this.edit(s => { const j = s.jobs.find(j => j.id === job.id); j.taskId = task.taskId; j.status = 'running'; });
                    while (task.status === 'running') {
                        await new Promise(r => setTimeout(r, 700));
                        task = await host().ai.getTask({ taskId: task.taskId });
                        if (!task)
                            throw Error('Host 任务丢失');
                    }
                    if (task.status !== 'completed')
                        throw Error(task.error || `Host task: ${task.status}`);
                    const completed = task;
                    await this.atomic(async () => {
                        const next = structuredClone(this.state), j = next.jobs.find(j => j.id === job.id);
                        if (j.characterId && j.knowledgeSnapshot !== this.knowledge(next, j.characterId))
                            throw Error('身份知识已变更，旧请求结果未应用，请重试');
                        this.reduce(next, j, completed.result.content);
                        j.status = 'done';
                        delete j.request;
                        const result = await host().ai.consumeTask({ taskId: completed.taskId, writes: stateWrites(next, this.state) });
                        this.state = result.applied ? next : await loadState();
                        this.notify();
                    });
                }
                catch (e) {
                    await this.edit(s => { const j = s.jobs.find(j => j.id === job.id); j.status = 'error'; j.error = String(e); });
                }
            }
            await this.edit(s => flushMemory(s));
        }
        catch (e) {
            this.error = String(e);
        }
        finally {
            this.running = false;
            this.notify();
        }
    }
}

;// ./custom-apps/anonymous-xiaohongshu/src/adapters/images.ts
async function readImage(file) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type))
        throw Error('请选择 PNG、JPEG、WebP 或 GIF 图片。');
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        await new Promise((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(Error('无法读取图片')); img.src = url; });
        const canvas = document.createElement('canvas'), scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.84);
    }
    finally {
        URL.revokeObjectURL(url);
    }
}

;// ./node_modules/lucide-react/dist/esm/icons/image-plus.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const image_plus_iconNode = [
  ["path", { d: "M16 5h6", key: "1vod17" }],
  ["path", { d: "M19 2v6", key: "4bpg5p" }],
  ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5", key: "1ue2ih" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }]
];
const ImagePlus = createLucideIcon("image-plus", image_plus_iconNode);


//# sourceMappingURL=image-plus.js.map

;// ./node_modules/lucide-react/dist/esm/icons/send.js
/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const send_iconNode = [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }]
];
const Send = createLucideIcon("send", send_iconNode);


//# sourceMappingURL=send.js.map

;// ./custom-apps/anonymous-xiaohongshu/src/baseline-publish.tsx

// Direct fork of Float's original compose sheet, with iframe media/storage callbacks.



function PublishSheet({ onClose, onPublish }) {
    const [draft, setDraft] = (0,react.useState)({ title: '', body: '', tags: [], image: {} });
    const [tagInput, setTagInput] = (0,react.useState)(''), [busy, setBusy] = (0,react.useState)('idle'), [error, setError] = (0,react.useState)('');
    const fileRef = (0,react.useRef)(null);
    const setComposeOpen = (_) => onClose();
    async function handleImageChange(event) { try {
        const files = [...event.target.files || []];
        if (files.length + (draft.images?.length || 0) > 4)
            throw Error('最多 4 张图片');
        const added = await Promise.all(files.map(async (file) => ({ assetId: 'img_' + crypto.randomUUID().replaceAll('-', ''), dataUrl: await readImage(file) })));
        setDraft(d => ({ ...d, images: [...d.images || [], ...added] }));
    }
    catch (e) {
        setError(String(e));
    } }
    async function handlePublish() { setBusy('publish'); try {
        await onPublish({ ...draft, tags: tagInput.split(/[,，\\s#]+/).filter(Boolean) }, Object.fromEntries((draft.images || []).map(i => [i.assetId, i.dataUrl])));
        onClose();
    }
    catch (e) {
        setError(String(e));
    }
    finally {
        setBusy('idle');
    } }
    return (0,jsx_runtime.jsxs)(jsx_runtime.Fragment, { children: [error && (0,jsx_runtime.jsx)("div", { className: "anon-error", role: "alert", children: error }), (0,jsx_runtime.jsx)("div", { className: "xhs-modal-backdrop", onClick: () => setComposeOpen(false), children: (0,jsx_runtime.jsxs)("section", { className: "xhs-publish-sheet", onClick: event => event.stopPropagation(), children: [(0,jsx_runtime.jsxs)("header", { children: [(0,jsx_runtime.jsx)("strong", { children: "\u53D1\u5E03\u65B0\u7B14\u8BB0" }), (0,jsx_runtime.jsx)("button", { type: "button", className: "xhs-sheet-close-btn", onClick: () => setComposeOpen(false), "aria-label": "\u5173\u95ED", children: "\u00D7" })] }), (0,jsx_runtime.jsxs)("div", { className: "xhs-publish-content", children: [(0,jsx_runtime.jsx)("div", { className: "xhs-publish-left", children: ((draft.images && draft.images.length > 0) || draft.image?.dataUrl) ? ((0,jsx_runtime.jsxs)("div", { className: "xhs-publish-multi-images", children: [(0,jsx_runtime.jsxs)("div", { className: "xhs-publish-images-grid", children: [(draft.images || [draft.image]).map((img, idx) => ((0,jsx_runtime.jsxs)("div", { className: "xhs-publish-grid-item", children: [(0,jsx_runtime.jsx)("img", { src: img.dataUrl, alt: `Preview ${idx + 1}` }), (0,jsx_runtime.jsx)("button", { type: "button", className: "xhs-publish-img-remove", onClick: () => {
                                                                    setDraft((prev) => {
                                                                        const list = (prev.images || [prev.image]).filter((_, i) => i !== idx);
                                                                        return {
                                                                            ...prev,
                                                                            image: list[0] || {},
                                                                            images: list.length > 0 ? list : undefined,
                                                                        };
                                                                    });
                                                                }, "aria-label": "\u5220\u9664\u56FE\u7247", children: "\u00D7" })] }, img.assetId || idx))), (0,jsx_runtime.jsxs)("button", { type: "button", className: "xhs-publish-grid-add", onClick: () => fileRef.current?.click(), "aria-label": "\u7EE7\u7EED\u6DFB\u52A0\u56FE\u7247", children: [(0,jsx_runtime.jsx)(Plus, { size: 24 }), (0,jsx_runtime.jsx)("span", { children: "\u6DFB\u52A0" })] })] }), (0,jsx_runtime.jsx)("input", { "aria-label": "\u5E16\u5B50\u56FE\u7247", ref: fileRef, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: handleImageChange }), (0,jsx_runtime.jsx)("button", { type: "button", className: "xhs-upload-change-btn", onClick: () => setDraft(prev => ({ ...prev, image: {}, images: undefined })), children: "\u6E05\u7A7A\u6240\u6709\u56FE\u7247" })] })) : draft.image?.description === undefined ? ((0,jsx_runtime.jsxs)("div", { className: "xhs-image-upload-area", children: [(0,jsx_runtime.jsxs)("div", { className: "xhs-publish-placeholder", children: [(0,jsx_runtime.jsx)(ImagePlus, { size: 42, strokeWidth: 1.5, color: "#bbb" }), (0,jsx_runtime.jsxs)("div", { className: "xhs-placeholder-actions", children: [(0,jsx_runtime.jsx)("button", { type: "button", onClick: () => fileRef.current?.click(), children: "\u4E0A\u4F20\u56FE\u7247 (\u652F\u6301\u591A\u5F20)" }), (0,jsx_runtime.jsx)("button", { type: "button", onClick: () => setDraft(prev => ({ ...prev, image: { ...prev.image, description: "" } })), children: "\u63CF\u8FF0\u56FE\u7247" })] })] }), (0,jsx_runtime.jsx)("input", { "aria-label": "\u5E16\u5B50\u56FE\u7247", ref: fileRef, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: handleImageChange })] })) : ((0,jsx_runtime.jsxs)(jsx_runtime.Fragment, { children: [(0,jsx_runtime.jsx)("div", { className: "xhs-image-upload-area is-text-mode", children: (0,jsx_runtime.jsx)("div", { className: "xhs-text-image-preview", children: draft.image.description?.trim() || "在此区域下方输入描述\n即可生成文字图片" }) }), (0,jsx_runtime.jsxs)("div", { className: "xhs-publish-field", children: [(0,jsx_runtime.jsx)("label", { children: "\u6587\u5B57\u56FE\u7247\u5185\u5BB9" }), (0,jsx_runtime.jsx)("textarea", { placeholder: "\u8F93\u5165\u6587\u5B57\u63CF\u8FF0...", value: draft.image.description || "", onChange: event => setDraft(prev => ({ ...prev, image: { ...prev.image, description: event.target.value } })), autoFocus: true })] }), (0,jsx_runtime.jsx)("button", { type: "button", className: "xhs-upload-change-btn", onClick: () => setDraft(prev => ({ ...prev, image: {} })), children: "\u53D6\u6D88\u5E76\u91CD\u65B0\u9009\u62E9" })] })) }), (0,jsx_runtime.jsxs)("div", { className: "xhs-publish-right", children: [(0,jsx_runtime.jsx)("input", { className: "xhs-publish-title-input", "aria-label": "\u7B14\u8BB0\u6807\u9898", placeholder: "\u586B\u5199\u6807\u9898\u4F1A\u6709\u66F4\u591A\u8D5E\u54E6~", value: draft.title, onChange: event => setDraft(prev => ({ ...prev, title: event.target.value })) }), (0,jsx_runtime.jsx)("textarea", { className: "xhs-publish-body-input", "aria-label": "\u7B14\u8BB0\u6B63\u6587", placeholder: "\u6DFB\u52A0\u6B63\u6587\uFF0C\u548C\u5927\u5BB6\u5206\u4EAB\u4F60\u7684\u89C1\u95FB...", value: draft.body, onChange: event => setDraft(prev => ({ ...prev, body: event.target.value })) }), (0,jsx_runtime.jsxs)("div", { className: "xhs-publish-tag-input", children: [(0,jsx_runtime.jsx)("span", { children: "#" }), (0,jsx_runtime.jsx)("input", { value: tagInput, onChange: event => setTagInput(event.target.value), placeholder: "\u6DFB\u52A0\u6807\u7B7E\uFF0C\u7528\u7A7A\u683C\u6216\u9017\u53F7\u5206\u9694" })] }), (0,jsx_runtime.jsx)("div", { className: "xhs-publish-actions", children: (0,jsx_runtime.jsxs)("button", { type: "button", className: "xhs-publish-submit-btn", onClick: handlePublish, disabled: busy !== "idle" || (!draft.title.trim() && !draft.body.trim()), children: [busy === "publish" ? (0,jsx_runtime.jsx)(LoaderCircle, { className: "cp-spin", size: 18 }) : (0,jsx_runtime.jsx)(Send, { size: 18 }), "\u53D1\u5E03\u7B14\u8BB0"] }) })] })] })] }) })] });
}

;// ./custom-apps/anonymous-xiaohongshu/src/identity/disclosure.ts

// No language-model inference or cross-viewer search. Only a user's explicit confirmation.
async function confirmDisclosure(s, viewerCharacterId, accountId, identity) {
    if (!s.accounts[accountId] || !identity.trim())
        throw Error('请选择账号并填写已明确揭露的身份。');
    const scope = { viewerCharacterId, sourceNamespace: 'identity_disclosure', sourceEntityId: accountId };
    const { revision } = await host().memory.invalidateSource(scope);
    s.disclosures = s.disclosures.filter(d => d.viewerCharacterId !== viewerCharacterId || d.accountId !== accountId);
    s.disclosures.push({ viewerCharacterId, accountId, state: 'explicitly_disclosed', identity: identity.trim(), revision });
}
async function revokeDisclosure(s, viewerCharacterId, accountId) {
    const { revision } = await host().memory.invalidateSource({ viewerCharacterId, sourceNamespace: 'identity_disclosure', sourceEntityId: accountId });
    s.disclosures = s.disclosures.filter(d => d.viewerCharacterId !== viewerCharacterId || d.accountId !== accountId);
    s.disclosures.push({ viewerCharacterId, accountId, state: 'unknown', revision });
}

;// ./custom-apps/anonymous-xiaohongshu/src/identity/disclosure-settings.tsx



function DisclosureSettings({ engine, act }) {
    const [viewer, setViewer] = (0,react.useState)(''), [account, setAccount] = (0,react.useState)(''), [identity, setIdentity] = (0,react.useState)('');
    const row = engine.state.disclosures.find(d => d.viewerCharacterId === viewer && d.accountId === account);
    return (0,jsx_runtime.jsxs)("details", { children: [(0,jsx_runtime.jsx)("summary", { children: "\u6309\u89D2\u8272\u786E\u8BA4\u8EAB\u4EFD\u63ED\u9732\uFF08\u53EF\u9009\uFF09" }), (0,jsx_runtime.jsx)("p", { children: "\u4EC5\u5F53\u8FD9\u4E2A\u89D2\u8272\u5DF2\u88AB\u660E\u786E\u544A\u77E5\u5177\u4F53\u8EAB\u4EFD\u5173\u7CFB\u65F6\u786E\u8BA4\u3002\u4E0D\u4F1A\u63A8\u6D4B\u3001\u8BFB\u53D6\u5176\u4ED6\u89D2\u8272\u8BB0\u5FC6\u6216\u81EA\u52A8\u4F20\u64AD\u3002" }), (0,jsx_runtime.jsxs)("label", { children: ["\u77E5\u60C5\u89D2\u8272", (0,jsx_runtime.jsxs)("select", { "aria-label": "\u77E5\u60C5\u89D2\u8272", value: viewer, onChange: e => setViewer(e.target.value), children: [(0,jsx_runtime.jsx)("option", { value: "", children: "\u9009\u62E9\u89D2\u8272" }), engine.characters.map(c => (0,jsx_runtime.jsx)("option", { value: c.id, children: c.name }, c.id))] })] }), (0,jsx_runtime.jsxs)("label", { children: ["\u7F51\u7EDC\u8D26\u53F7", (0,jsx_runtime.jsxs)("select", { "aria-label": "\u63ED\u9732\u8D26\u53F7", value: account, onChange: e => setAccount(e.target.value), children: [(0,jsx_runtime.jsx)("option", { value: "", children: "\u9009\u62E9\u8D26\u53F7" }), Object.values(engine.state.accounts).map(a => (0,jsx_runtime.jsx)("option", { value: a.accountId, children: a.displayName }, a.accountId))] })] }), (0,jsx_runtime.jsxs)("label", { children: ["\u660E\u786E\u544A\u77E5\u7684\u73B0\u5B9E\u8EAB\u4EFD", (0,jsx_runtime.jsx)("input", { "aria-label": "\u63ED\u9732\u8EAB\u4EFD", value: identity, onChange: e => setIdentity(e.target.value) })] }), (0,jsx_runtime.jsxs)("p", { children: ["\u5F53\u524D\uFF1A", row?.state === 'explicitly_disclosed' ? row.identity : 'unknown'] }), (0,jsx_runtime.jsx)("button", { disabled: !viewer || !account || !identity.trim(), onClick: () => void act(() => engine.edit(s => confirmDisclosure(s, viewer, account, identity))), children: "\u786E\u8BA4\u4EC5\u8BE5\u89D2\u8272\u77E5\u60C5" }), (0,jsx_runtime.jsx)("button", { disabled: !viewer || !account, onClick: () => void act(() => engine.edit(s => revokeDisclosure(s, viewer, account))), children: "\u64A4\u9500\u8BE5\u89D2\u8272\u7684\u63ED\u9732" }), (0,jsx_runtime.jsx)("p", { children: "\u6B64\u7248\u672C\u7531\u7BA1\u7406\u9875\u786E\u8BA4\uFF1B\u4E0D\u4F1A\u4ECE\u8BED\u4E49\u76F8\u4F3C\u6216\u65E7\u8BB0\u5FC6\u81EA\u52A8\u6062\u590D\u5173\u7CFB\u3002" })] });
}

;// ./custom-apps/anonymous-xiaohongshu/src/xiaohongshu-app.tsx

// Phase 1A controller around Float's original waterfall/card/detail/comment components.









function XiaohongshuApp() {
    const [engine] = (0,react.useState)(() => new XiaohongshuEngine()), [, render] = (0,react.useState)(0), [error, setError] = (0,react.useState)(''), [tab, setTab] = (0,react.useState)('home'), [selectedId, select] = (0,react.useState)(), [settings, setSettings] = (0,react.useState)(false);
    const [nickname, setNickname] = (0,react.useState)(''), [bio, setBio] = (0,react.useState)(''), [avatar, setAvatar] = (0,react.useState)(''), [comment, setComment] = (0,react.useState)(''), [reply, setReply] = (0,react.useState)();
    const act = async (fn) => { try {
        setError('');
        await fn();
    }
    catch (e) {
        setError(String(e));
    } };
    (0,react.useEffect)(() => { const unsubscribe = engine.subscribe(() => render(n => n + 1)); void act(() => engine.init()); return unsubscribe; }, [engine]);
    const s = engine.state;
    if (!s)
        return (0,jsx_runtime.jsx)("div", { className: "anon-loading", children: error || '正在连接 Float…' });
    const own = s.accounts[s.userAccountId || ''];
    const notes = s.platform.notes.map(n => ({ ...n, authorName: s.accounts[n.authorId]?.displayName || n.authorName, comments: n.comments.map(c => ({ ...c, authorName: s.accounts[c.authorId]?.displayName || c.authorName })) }));
    const selected = notes.find(n => n.id === selectedId);
    const shown = tab === 'profile' ? notes.filter(n => n.authorId === s.userAccountId) : notes.filter(n => n.type === 'post' && n.feedScope !== 'nearby');
    const columns = [shown.filter((_, i) => i % 2 === 0), shown.filter((_, i) => i % 2 === 1)];
    const editProfile = () => { setNickname(own?.displayName || ''); setBio(own?.bio || ''); setAvatar(own?.avatar || ''); setSettings(true); };
    async function saveProfile() { await engine.edit(next => { const name = validateName(next, nickname, engine.characters, next.userAccountId); let a = next.accounts[next.userAccountId || '']; if (!a) {
        a = addAccount(next, name);
        next.userAccountId = a.accountId;
        next.bindings.push({ accountId: a.accountId, ownerKind: 'user', ownerId: 'local-controller' });
    }
    else
        rename(next, a.accountId, name, engine.characters); a.bio = bio; a.avatar = avatar; next.platform.profile.nickname = name; next.platform.profile.signature = bio; next.platform.profile.handle = a.accountId.slice(-10); }); setSettings(false); }
    async function vote(kind) { if (!selected)
        return; await engine.edit(next => { const n = next.platform.notes.find(n => n.id === selected.id); const count = kind === 'liked' ? 'likeCount' : 'saveCount'; n[count] = Math.max(0, n[count] + (n[kind] ? -1 : 1)); n[kind] = !n[kind]; }); }
    const waterfall = (0,jsx_runtime.jsx)("div", { className: "cp-xhs-waterfall-grid", children: columns.map((column, i) => (0,jsx_runtime.jsx)("div", { className: "cp-xhs-waterfall-column", children: column.map(n => (0,jsx_runtime.jsx)(NoteCard, { note: n, imageMap: s.images, avatarSrc: engine.avatar(n.authorId), onOpen: () => select(n.id), collapseBilingualTranslation: true }, n.id)) }, i)) });
    return (0,jsx_runtime.jsxs)("section", { className: "xhs-app cp-xhs-module", children: [!selected && (0,jsx_runtime.jsxs)("header", { className: "cp-xhs-appbar xhs-appbar", children: [(0,jsx_runtime.jsx)("button", { "aria-label": "\u8FD4\u56DE\u684C\u9762", className: "cp-float-back", onClick: () => void act(() => host().app.close()), children: (0,jsx_runtime.jsx)(ChevronLeft, { size: 24 }) }), (0,jsx_runtime.jsx)("div", { className: "cp-xhs-header-stack", children: (0,jsx_runtime.jsx)("button", { className: "cp-xhs-header-title is-active", onClick: () => setTab('home'), children: "\u53D1\u73B0" }) }), (0,jsx_runtime.jsxs)("div", { className: "cp-appbar-actions", children: [(0,jsx_runtime.jsx)("button", { "aria-label": "\u751F\u6210\u5C0F\u7EA2\u4E66\u5185\u5BB9", className: "cp-float-refresh xhs-icon-action--refresh", disabled: engine.running || !own, onClick: () => void act(() => engine.refresh()), children: (0,jsx_runtime.jsx)(RotateCw, { size: 18 }) }), (0,jsx_runtime.jsx)("button", { "aria-label": "\u8BBE\u7F6E", onClick: editProfile, children: (0,jsx_runtime.jsx)(Settings, { size: 18 }) })] })] }), (error || engine.error) && (0,jsx_runtime.jsxs)("div", { role: "alert", className: "anon-error", children: [error || engine.error, (0,jsx_runtime.jsx)("button", { onClick: () => void act(() => engine.drain()), children: "\u91CD\u8BD5\u540C\u6B65" })] }), s.migrationNotice && (0,jsx_runtime.jsx)("p", { className: "anon-error", children: s.migrationNotice }), engine.running && (0,jsx_runtime.jsxs)("div", { className: "cp-refresh-indicator cp-refresh-indicator--floating", children: [(0,jsx_runtime.jsx)(LoaderCircle, { size: 15, className: "cp-spin" }), "\u751F\u6210\u4E2D \u00B7 \u53EF\u4EE5\u5173\u95ED App\uFF0C\u91CD\u65B0\u8FDB\u5165\u540E\u63A5\u7EED"] }), s.jobs.filter(j => j.status === 'error').map(j => (0,jsx_runtime.jsxs)("div", { className: "anon-error", children: [j.kind, "\uFF1A", j.error, (0,jsx_runtime.jsx)("button", { onClick: () => void act(() => engine.retry(j.id)), children: "\u91CD\u8BD5" })] }, j.id)), (0,jsx_runtime.jsx)("main", { className: "cp-xhs-body", children: settings || !own ? (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-scroll anon-settings", children: [(0,jsx_runtime.jsx)("h2", { children: own ? '账号设置' : '创建你的匿名账号' }), (0,jsx_runtime.jsx)("p", { children: "\u666E\u901A\u5C0F\u7EA2\u4E66\u548C Float \u7528\u6237\u8D44\u6599\u4FDD\u6301\u4E0D\u53D8\u3002\u89D2\u8272\u4E0E\u8DEF\u4EBA\u4F1A\u81EA\u52A8\u53C2\u4E0E\u3002" }), (0,jsx_runtime.jsxs)("label", { children: ["\u533F\u540D\u6635\u79F0", (0,jsx_runtime.jsx)("input", { "aria-label": "\u533F\u540D\u6635\u79F0", value: nickname, onChange: e => setNickname(e.target.value), maxLength: 40 })] }), (0,jsx_runtime.jsxs)("label", { children: ["\u7B80\u4ECB", (0,jsx_runtime.jsx)("textarea", { "aria-label": "\u7B80\u4ECB", value: bio, onChange: e => setBio(e.target.value), maxLength: 160 })] }), (0,jsx_runtime.jsxs)("label", { children: ["\u5934\u50CF", (0,jsx_runtime.jsx)("input", { "aria-label": "\u7528\u6237\u5934\u50CF", type: "file", accept: "image/*", onChange: e => { const f = e.target.files?.[0]; if (f)
                                        void act(async () => setAvatar(await readImage(f))); } })] }), avatar && (0,jsx_runtime.jsx)(XhsAvatar, { className: "cp-xhs-profile-avatar", src: avatar, name: nickname }), (0,jsx_runtime.jsx)("button", { className: "xhs-empty-generate-btn", onClick: () => void act(saveProfile), children: "\u4FDD\u5B58\u533F\u540D\u8D26\u53F7" }), own && (0,jsx_runtime.jsx)("button", { onClick: () => setSettings(false), children: "\u8FD4\u56DE" }), (0,jsx_runtime.jsx)("h3", { children: "\u89D2\u8272\u7F51\u540D" }), (0,jsx_runtime.jsx)("p", { children: "\u9996\u6B21\u53C2\u4E0E\u540E\u81EA\u52A8\u751F\u6210\uFF1B\u6B64\u5904\u53EA\u4FEE\u6539\u5DF2\u751F\u6210\u8D26\u53F7\u3002\u771F\u5B9E\u89D2\u8272\u540D\u4EC5\u5728\u672C\u5730\u8BBE\u7F6E\u9875\u663E\u793A\u3002" }), s.bindings.filter(b => b.ownerKind === 'character').map(b => (0,jsx_runtime.jsx)(CharacterName, { name: engine.characters.find(c => c.id === b.ownerId)?.name || '已移除的角色', displayName: s.accounts[b.accountId].displayName, avatar: engine.avatar(b.accountId), save: name => act(() => engine.edit(next => rename(next, b.accountId, name, engine.characters))) }, b.accountId)), (0,jsx_runtime.jsx)(DisclosureSettings, { engine: engine, act: act }), (0,jsx_runtime.jsx)("p", { className: "anon-phase-note", children: "Phase 1A\uFF1A\u9644\u8FD1\u3001\u5B8C\u6574\u89C6\u9891\u3001\u79C1\u4FE1\u3001\u901A\u77E5\u4E2D\u5FC3\u548C\u5173\u6CE8\u7CFB\u7EDF\u7A0D\u540E\u5F00\u653E\u3002" })] }) : selected ? (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-scroll cp-xhs-scroll--detail xhs-detail-page", children: [(0,jsx_runtime.jsxs)("div", { className: "cp-xhs-note-detail-header", children: [(0,jsx_runtime.jsx)("button", { className: "cp-xhs-detail-back", "aria-label": "\u8FD4\u56DE", onClick: () => select(undefined), children: (0,jsx_runtime.jsx)(ChevronLeft, { size: 24 }) }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-detail-author-info", children: [(0,jsx_runtime.jsx)(XhsAvatar, { className: "cp-xhs-detail-avatar", src: engine.avatar(selected.authorId), name: selected.authorName }), (0,jsx_runtime.jsx)("span", { className: "cp-xhs-detail-name", children: selected.authorName })] })] }), (0,jsx_runtime.jsxs)("article", { className: "cp-xhs-note-detail xhs-note-detail-page", children: [(0,jsx_runtime.jsx)("div", { className: "xhs-note-detail-media", children: (0,jsx_runtime.jsx)(NoteImage, { note: selected, imageMap: s.images, collapseBilingualTranslation: true, isDetail: true }) }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-note-detail-card", children: [(0,jsx_runtime.jsx)("h3", { children: selected.title }), (0,jsx_runtime.jsx)("p", { className: "cp-xhs-note-detail-body", children: selected.body }), (0,jsx_runtime.jsx)("div", { className: "cp-xhs-note-detail-tags", children: selected.tags.map(t => (0,jsx_runtime.jsxs)("em", { children: ["#", t] }, t)) }), (0,jsx_runtime.jsx)("div", { className: "cp-xhs-note-detail-time", children: formatTime(selected.createdAt) })] }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-comment-section xhs-detail-comment-section", children: [(0,jsx_runtime.jsxs)("div", { className: "cp-xhs-comment-count", children: ["\u5171 ", formatCount(selected.commentCount), " \u6761\u8BC4\u8BBA"] }), (0,jsx_runtime.jsx)("div", { className: "cp-xhs-comment-list", children: (0,jsx_runtime.jsx)(CommentList, { comments: selected.comments, getAvatar: c => engine.avatar(c.authorId), onReply: setReply, collapseBilingualTranslation: true, onDeleteComment: c => void act(() => engine.edit(next => { if (c.authorId !== next.userAccountId)
                                                    throw Error('只能删除自己的评论'); const n = next.platform.notes.find(n => n.id === c.noteId); n.comments = n.comments.filter(x => x.id !== c.id); n.commentCount = Math.max(0, n.commentCount - 1); })), onVoteComment: (c, v) => void act(() => engine.edit(next => { const row = next.platform.notes.find(n => n.id === c.noteId).comments.find(x => x.id === c.id); const k = v === 'like' ? 'liked' : 'disliked', count = v === 'like' ? 'likeCount' : 'dislikeCount'; row[count] = Math.max(0, row[count] + (row[k] ? -1 : 1)); row[k] = !row[k]; })) }) })] })] }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-detail-bottom-bar xhs-detail-bottom-bar", children: [(0,jsx_runtime.jsxs)("div", { className: "xhs-detail-comment-stack", children: [reply && (0,jsx_runtime.jsxs)("div", { className: "xhs-reply-target", children: ["\u56DE\u590D ", reply.authorName, (0,jsx_runtime.jsx)("button", { onClick: () => setReply(undefined), children: "\u53D6\u6D88" })] }), (0,jsx_runtime.jsx)("div", { className: "cp-xhs-input-box xhs-detail-input-box", children: (0,jsx_runtime.jsx)("textarea", { "aria-label": "\u8BF4\u70B9\u4EC0\u4E48", placeholder: "\u8BF4\u70B9\u4EC0\u4E48...", value: comment, onChange: e => setComment(e.target.value) }) })] }), (0,jsx_runtime.jsx)("button", { className: "xhs-detail-send-btn", disabled: !comment.trim(), onClick: () => void act(async () => { await engine.comment(selected.id, comment, reply?.id); setComment(''); setReply(undefined); }), children: "\u53D1\u9001" }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-action-icons", children: [(0,jsx_runtime.jsxs)("button", { "aria-label": "\u70B9\u8D5E", className: `cp-xhs-action-btn ${selected.liked ? 'is-liked' : ''}`, onClick: () => void act(() => vote('liked')), children: [(0,jsx_runtime.jsx)(Heart, { size: 24 }), (0,jsx_runtime.jsx)("span", { children: formatCount(selected.likeCount) })] }), (0,jsx_runtime.jsx)("button", { "aria-label": "\u6536\u85CF", className: "cp-xhs-action-btn", onClick: () => void act(() => vote('saved')), children: (0,jsx_runtime.jsx)(Bookmark, { size: 24 }) })] })] })] }) : (0,jsx_runtime.jsxs)("div", { className: `cp-xhs-scroll ${tab === 'profile' ? 'cp-xhs-scroll--profile' : ''}`, children: [(tab === 'home' || tab === 'publish') && (0,jsx_runtime.jsx)("section", { className: "cp-xhs-home", children: shown.length ? waterfall : (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-status cp-empty-copy", children: [(0,jsx_runtime.jsx)("p", { children: "\u6682\u65E0\u5C0F\u7EA2\u4E66\u5185\u5BB9" }), (0,jsx_runtime.jsx)("span", { children: "\u751F\u6210\u9996\u9875\u548C\u89D2\u8272\u4E92\u52A8" }), (0,jsx_runtime.jsx)("button", { className: "xhs-empty-generate-btn", disabled: engine.running, onClick: () => void act(() => engine.refresh()), children: "\u751F\u6210\u5C0F\u7EA2\u4E66\u5185\u5BB9" })] }) }), tab === 'profile' && (0,jsx_runtime.jsxs)("section", { className: "cp-xhs-profile xhs-profile", children: [(0,jsx_runtime.jsxs)("div", { className: "cp-xhs-profile-hero", children: [(0,jsx_runtime.jsxs)("div", { className: "cp-xhs-profile-main", children: [(0,jsx_runtime.jsx)(XhsAvatar, { className: "cp-xhs-profile-avatar", src: engine.avatar(own.accountId), name: own.displayName }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-profile-meta", children: [(0,jsx_runtime.jsx)("h3", { children: own.displayName }), (0,jsx_runtime.jsxs)("span", { children: ["\u5C0F\u7EA2\u4E66\u53F7\uFF1A", s.platform.profile.handle] })] })] }), (0,jsx_runtime.jsx)("div", { className: "cp-xhs-profile-bio", children: (0,jsx_runtime.jsx)("p", { children: own.bio }) }), (0,jsx_runtime.jsx)("div", { className: "cp-xhs-profile-actions", children: (0,jsx_runtime.jsx)("button", { className: "cp-xhs-profile-edit", onClick: editProfile, children: "\u7F16\u8F91\u8D44\u6599" }) })] }), (0,jsx_runtime.jsxs)("div", { className: "cp-xhs-profile-content", children: [(0,jsx_runtime.jsx)("div", { className: "cp-xhs-profile-tabs", children: (0,jsx_runtime.jsx)("button", { className: "is-active", children: "\u7B14\u8BB0" }) }), waterfall] })] })] }) }), tab === 'publish' && (0,jsx_runtime.jsx)(PublishSheet, { onClose: () => setTab('home'), onPublish: (input, media) => engine.publish(input, media) }), !selected && own && !settings && (0,jsx_runtime.jsx)("nav", { className: "cp-xhs-tabbar xhs-tabbar", children: [['home', '首页'], ['publish', '发布'], ['profile', '我']].map(([id, label]) => (0,jsx_runtime.jsx)("button", { "aria-label": label, className: id === 'publish' ? 'cp-xhs-tab-publish' : `cp-xhs-tab ${tab === id ? 'is-active' : ''}`, onClick: () => setTab(id), children: id === 'publish' ? (0,jsx_runtime.jsx)("div", { className: "cp-xhs-tab-publish-inner", children: (0,jsx_runtime.jsx)(Plus, { size: 20 }) }) : (0,jsx_runtime.jsx)("div", { className: "cp-xhs-tab-inner", children: (0,jsx_runtime.jsx)("span", { children: label }) }) }, id)) })] });
}
function CharacterName({ name, displayName, avatar, save }) { const [value, setValue] = (0,react.useState)(displayName); return (0,jsx_runtime.jsxs)("div", { className: "anon-character-setting", children: [(0,jsx_runtime.jsx)(XhsAvatar, { className: "cp-xhs-comment-avatar", src: avatar, name: displayName }), (0,jsx_runtime.jsxs)("label", { children: [name, (0,jsx_runtime.jsx)("input", { "aria-label": `${name} 匿名昵称`, value: value, onChange: e => setValue(e.target.value) })] }), (0,jsx_runtime.jsx)("button", { onClick: () => void save(value), children: "\u4FEE\u6539" })] }); }

;// ./custom-apps/anonymous-xiaohongshu/src/main.tsx




(0,client.createRoot)(document.getElementById('root')).render((0,jsx_runtime.jsx)(XiaohongshuApp, {}));

/******/ })()
;