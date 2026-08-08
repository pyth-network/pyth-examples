import * as Context from "effect/Context";
import type * as Router from "../HttpRouter.js";
export declare const provideService: (<T extends Context.Tag<any, any>>(tag: T, service: Context.Tag.Service<T>) => <E, R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<E, Exclude<R, Context.Tag.Identifier<T>>>) & (<E, R, T extends Context.Tag<any, any>>(self: Router.HttpRouter<E, R>, tag: T, service: Context.Tag.Service<T>) => Router.HttpRouter<E, Exclude<R, Context.Tag.Identifier<T>>>);
//# sourceMappingURL=httpRouter.d.ts.map