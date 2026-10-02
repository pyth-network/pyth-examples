import type { HttpClientResponse } from "@effect/platform"
import { FetchHttpClient, HttpClient, HttpClientError, HttpClientRequest } from "@effect/platform"
import { Effect, Schema } from "effect"

/**
 * Filter responses to only allow 2xx status codes, otherwise fail with ResponseError
 */
export const filterStatusOk = (
  self: HttpClientResponse.HttpClientResponse
): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.ResponseError> =>
  self.status >= 200 && self.status < 300
    ? Effect.succeed(self)
    : self.text.pipe(
        Effect.flatMap((text) =>
          Effect.fail(
            new HttpClientError.ResponseError({
              response: self,
              request: self.request,
              reason: "StatusCode",
              description: `non 2xx status code : ${text}`
            })
          )
        )
      )

/**
 * Performs a GET request and decodes the response using the provided schema
 */
export const get = <A, I, R>(url: string, schema: Schema.Schema<A, I, R>, headers?: Record<string, string>) =>
  HttpClient.get(url, headers ? { headers } : undefined).pipe(
    Effect.flatMap(filterStatusOk),
    Effect.flatMap((response) => response.json),
    Effect.flatMap(Schema.decodeUnknown(schema)),
    Effect.provide(FetchHttpClient.layer)
  )

/**
 * Performs a POST request with JSON body and decodes the response using the provided schema
 */
export const postJson = <A, I, R>(
  url: string,
  body: unknown,
  schema: Schema.Schema<A, I, R>,
  headers?: Record<string, string>
) =>
  Effect.gen(function* () {
    let request = HttpClientRequest.post(url)
    request = yield* HttpClientRequest.bodyJson(request, body)
    const finalHeaders = {
      "Content-Type": "application/json",
      ...(headers || {})
    }
    request = HttpClientRequest.setHeaders(request, finalHeaders)

    const response = yield* HttpClient.execute(request)
    const filteredResponse = yield* filterStatusOk(response)
    const json = yield* filteredResponse.json
    return yield* Schema.decodeUnknown(schema)(json)
  }).pipe(Effect.provide(FetchHttpClient.layer))

/**
 * Performs a POST request with Uint8Array body and decodes the response using the provided schema
 */
export const postUint8Array = <A, I>(
  url: string,
  body: Uint8Array,
  schema: Schema.Schema<A, I>,
  headers?: Record<string, string>
) =>
  Effect.gen(function* () {
    let request = HttpClientRequest.post(url)
    // Set body with content-type
    request = HttpClientRequest.bodyUint8Array(request, body, "application/cbor")
    // Set additional headers AFTER body (so they don't get overridden)
    if (headers) {
      request = HttpClientRequest.setHeaders(request, headers)
    }

    const response = yield* HttpClient.execute(request)
    const filteredResponse = yield* filterStatusOk(response)
    // Try JSON first, fall back to plain text for endpoints that return unquoted strings (e.g. Dolos /tx/submit)
    const decoded = yield* filteredResponse.json.pipe(Effect.orElse(() => filteredResponse.text))
    return yield* Schema.decodeUnknown(schema)(decoded)
  }).pipe(Effect.provide(FetchHttpClient.layer))
