import * as Effect from '@effect/io/Effect'
import * as Layer from '@effect/io/Layer'
import type * as Req from '@effect/io/Request'
import * as RR from '@effect/io/RequestResolver'

import { Context, Tag } from './context.js'
import { IdentifierFactory, IdentifierOf } from './identifier.js'
import { Request } from './request.js'

export interface RequestResolver<
  Id,
  Requests extends Readonly<Record<string, Request<any, any, any>>>,
> extends Tag<Id, RR.RequestResolver<Request.Req<Requests[keyof Requests]>>> {
  readonly requests: Compact<DerivedRequests<Id, Requests>>

  readonly fromFunction: (
    f: (req: Request.Req<Requests[keyof Requests]>) => Request.Success<Requests[keyof Requests]>,
  ) => Layer.Layer<never, never, Id | Request.Identifier<Requests[keyof Requests]>>

  readonly fromFunctionBatched: (
    f: (
      reqs: Array<Request.Req<Requests[keyof Requests]>>,
    ) => Array<Request.Success<Requests[keyof Requests]>>,
  ) => Layer.Layer<never, never, Id | Request.Identifier<Requests[keyof Requests]>>

  readonly fromFunctionEffect: <R>(
    f: (
      req: Request.Req<Requests[keyof Requests]>,
    ) => Effect.Effect<
      R,
      Request.Error<Requests[keyof Requests]>,
      Request.Success<Requests[keyof Requests]>
    >,
  ) => Layer.Layer<R, never, Id | Request.Identifier<Requests[keyof Requests]>>

  readonly make: <R>(
    f: (req: Array<Array<Request.Req<Requests[keyof Requests]>>>) => Effect.Effect<R, never, void>,
  ) => Layer.Layer<R, never, Id>

  readonly makeBatched: <R>(
    f: (req: Array<Request.Req<Requests[keyof Requests]>>) => Effect.Effect<R, never, void>,
  ) => Layer.Layer<R, never, Id | Request.Identifier<Requests[keyof Requests]>>

  readonly makeWithEntry: <R>(
    f: (
      req: Array<Array<Req.Entry<Request.Req<Requests[keyof Requests]>>>>,
    ) => Effect.Effect<R, never, void>,
  ) => Layer.Layer<R, never, Id | Request.Identifier<Requests[keyof Requests]>>
}

type DerivedRequests<Id, Reqs extends Readonly<Record<string, Request<any, any, any>>>> = {
  readonly [K in keyof Reqs]: (
    ...input: Request.InputArg<Reqs[K]>
  ) => Effect.Effect<Id, Request.Error<Reqs[K]>, Request.Success<Reqs[K]>>
}

type Compact<Input> = [{ [K in keyof Input]: Input[K] }] extends [infer R] ? R : never

export function RequestResolver<
  const Requests extends Readonly<Record<string, Request<any, any, any>>>,
>(requests: Requests) {
  function makeRequestResolver<const Id extends IdentifierFactory<any>>(
    id: Id,
  ): RequestResolver<IdentifierOf<Id>, Requests>
  function makeRequestResolver<const Id>(id: Id): RequestResolver<IdentifierOf<Id>, Requests>
  function makeRequestResolver<const Id>(id: Id): RequestResolver<IdentifierOf<Id>, Requests> {
    type _Req = Request.Req<Requests[keyof Requests]>
    type _Resolver = RequestResolver<IdentifierOf<Id>, Requests>

    const [first, ...rest] = Object.values(requests).map((r) =>
      r.implement((req: _Req) => tag.withEffect((resolver) => Effect.request(req, resolver))),
    )
    const requestLayer = Layer.mergeAll(first, ...rest) as Layer.Layer<
      IdentifierOf<Id>,
      never,
      Request.Identifier<Requests[keyof Requests]>
    >
    const provideMerge = <R>(resolverLayer: Layer.Layer<R, never, IdentifierOf<Id>>) =>
      Layer.provideMerge(resolverLayer, requestLayer)

    const tag = Tag<Id, RR.RequestResolver<_Req>>(id)
    const derivedRequests = Object.fromEntries(
      Object.entries(requests).map(
        ([k, v]) =>
          [k, (input: any) => Effect.provideSomeLayer(v.make(input), requestLayer)] as const,
      ),
    ) as _Resolver['requests']

    const fromFunction: _Resolver['fromFunction'] = (f) =>
      provideMerge(tag.layerOf(RR.fromFunction(f)))

    const fromFunctionBatched: _Resolver['fromFunctionBatched'] = (f) =>
      provideMerge(tag.layerOf(RR.fromFunctionBatched(f)))

    const layerWithContext = <R = never>(f: () => RR.RequestResolver<_Req, R>) =>
      provideMerge(tag.layer(Effect.contextWith((ctx: Context<R>) => RR.provideContext(f(), ctx))))

    const fromFunctionEffect: _Resolver['fromFunctionEffect'] = (f) =>
      layerWithContext(() => RR.fromFunctionEffect(f))

    const make: _Resolver['make'] = (f) => layerWithContext(() => RR.make(f))

    const makeBatched: _Resolver['makeBatched'] = (f) => layerWithContext(() => RR.makeBatched(f))

    const makeWithEntry: _Resolver['makeWithEntry'] = (f) =>
      layerWithContext(() => RR.makeWithEntry(f))

    const resolver: RequestResolver<IdentifierOf<Id>, Requests> = Object.assign(tag, {
      requests: derivedRequests,
      fromFunction,
      fromFunctionBatched,
      fromFunctionEffect,
      make,
      makeBatched,
      makeWithEntry,
    })

    return resolver
  }

  return makeRequestResolver
}

export namespace RequestResolver {
  export type Identifier<T> = [T] extends [RequestResolver<infer Id, any>] ? Id : never
  export type Requests<T> = [T] extends [RequestResolver<any, infer Requests>] ? Requests : never

  export type Identifiers<T> = Identifier<T> | Request.Identifier<Requests<T>>
}
