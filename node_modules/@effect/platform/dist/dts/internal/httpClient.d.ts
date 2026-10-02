import * as Effect from "effect/Effect";
import type * as Client from "../HttpClient.js";
import * as Error from "../HttpClientError.js";
import type * as ClientRequest from "../HttpClientRequest.js";
import type * as ClientResponse from "../HttpClientResponse.js";
export declare const 
/** @internal */
del: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>, 
/** @internal */
execute: (request: ClientRequest.HttpClientRequest) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>, 
/** @internal */
get: (url: string | URL, options?: ClientRequest.Options.NoBody | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>, 
/** @internal */
head: (url: string | URL, options?: ClientRequest.Options.NoBody | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>, 
/** @internal */
options: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>, 
/** @internal */
patch: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>, 
/** @internal */
post: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>, 
/** @internal */
put: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Client.HttpClient>;
//# sourceMappingURL=httpClient.d.ts.map