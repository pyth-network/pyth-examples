import * as Effect from "effect/Effect";
import * as FiberRef from "effect/FiberRef";
import { dual } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import * as Option from "effect/Option";
/** @internal */
export const currentPreResponseHandlers = /*#__PURE__*/globalValue(/*#__PURE__*/Symbol.for("@effect/platform/HttpApp/preResponseHandlers"), () => FiberRef.unsafeMake(Option.none()));
/** @internal */
export const appendPreResponseHandler = handler => FiberRef.update(currentPreResponseHandlers, Option.match({
  onNone: () => Option.some(handler),
  onSome: prev => Option.some((request, response) => Effect.flatMap(prev(request, response), response => handler(request, response)))
}));
/** @internal */
export const withPreResponseHandler = /*#__PURE__*/dual(2, (self, handler) => Effect.locallyWith(self, currentPreResponseHandlers, Option.match({
  onNone: () => Option.some(handler),
  onSome: prev => Option.some((request, response) => Effect.flatMap(prev(request, response), response => handler(request, response)))
})));
//# sourceMappingURL=httpApp.js.map