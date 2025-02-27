import { pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as Cause from '@effect/io/Cause'
import * as Effect from '@effect/io/Effect'

import type { Computed } from './Computed.js'
import { RefTransform, RefTransformImpl, RefTransformInput } from './RefTransform.js'
import { compact } from './filterMap.js'
import { switchMapEffect } from './switchMap.js'

export const FilteredTypeId = Symbol.for('@typed/fx/Filtered')
export type FilteredTypeId = typeof FilteredTypeId

export interface Filtered<R, E, A>
  extends RefTransform<R, E, A, R, E | Cause.NoSuchElementException, A> {
  readonly [FilteredTypeId]: FilteredTypeId

  filterMapEffect<R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, Option.Option<B>>,
  ): Filtered<R | R2, E | E2, B>

  filterMap<R2, E2, B>(f: (a: A) => Option.Option<B>): Filtered<R | R2, E | E2, B>

  filter<R2, E2>(f: (a: A) => boolean): Filtered<R | R2, E | E2, A>

  filterEffect<R2, E2>(f: (a: A) => Effect.Effect<R2, E2, boolean>): Filtered<R | R2, E | E2, A>

  filterNot<R2, E2>(f: (a: A) => boolean): Filtered<R | R2, E | E2, A>

  filterNotEffect<R2, E2>(f: (a: A) => Effect.Effect<R2, E2, boolean>): Filtered<R | R2, E | E2, A>

  mapEffect<R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>): Filtered<R | R2, E | E2, B>

  map<B>(f: (a: A) => B): Filtered<R, E, B>

  /**
   * @internal
   */
  version(): number
}

export namespace Filtered {
  export type Context<T> = [T] extends [never]
    ? never
    : // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [T] extends [Filtered<infer R, infer _E, any>]
    ? R
    : never
  export type Error<T> = [T] extends [never]
    ? never
    : // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [T] extends [Filtered<infer _R, infer E, any>]
    ? E
    : never
  export type Success<T> = [T] extends [never]
    ? never
    : // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [T] extends [Filtered<infer _R, infer _E, infer A>]
    ? A
    : never

  export function tuple<
    Filtereds extends ReadonlyArray<Computed<any, any, any> | Filtered<any, any, any>>,
  >(
    ...Filtereds: Filtereds
  ): Filtered<
    Filtered.Context<Filtereds[number]>,
    Filtered.Error<Filtereds[number]>,
    { readonly [K in keyof Filtereds]: Filtered.Success<Filtereds[K]> }
  > {
    return new FilteredImpl(RefTransformInput.tuple(Filtereds) as any, Effect.succeedSome) as any
  }

  export function struct<
    Filtereds extends Readonly<Record<string, Computed<any, any, any> | Filtered<any, any, any>>>,
  >(
    Filtereds: Filtereds,
  ): Filtered<
    Filtered.Context<Filtereds[string]>,
    Filtered.Error<Filtereds[string]>,
    { readonly [K in keyof Filtereds]: Filtered.Success<Filtereds[K]> }
  > {
    return new FilteredImpl(
      RefTransformInput.tuple(
        Object.entries(Filtereds).map(([k, c]) => c.map((v) => [k, v] as const)),
      ) as any,
      (entries) => Effect.sync(() => Option.some(Object.fromEntries(entries as any))),
    ) as any
  }
}

export class FilteredImpl<R, E, A, R2, E2, R3, E3, C>
  extends RefTransformImpl<
    R,
    E,
    A,
    R2,
    E2,
    A,
    R | R2 | R3,
    E | E2 | E3,
    C,
    R | R2 | R3,
    E | E2 | E3 | Cause.NoSuchElementException,
    C
  >
  implements Filtered<R | R2 | R3, E | E2 | E3, C>
{
  readonly [FilteredTypeId]: FilteredTypeId = FilteredTypeId

  constructor(
    input: RefTransformInput<R, E, A, R2, E2, A>,
    f: (a: A) => Effect.Effect<R3, E3, Option.Option<C>>,
  ) {
    super(
      input,
      (fx) => compact(switchMapEffect(fx, f)),
      (eff) => Effect.flatten(Effect.flatMap(eff, f)),
    )
  }

  filterMapEffect<R4, E4, D>(
    f: (a: C) => Effect.Effect<R4, E4, Option.Option<D>>,
  ): Filtered<R | R2 | R3 | R4, E | E2 | E3 | E4, D> {
    return new FilteredImpl(this, f) as Filtered<R | R2 | R3 | R4, E | E2 | E3 | E4, D>
  }

  filterMap<D>(f: (a: C) => Option.Option<D>) {
    return this.filterMapEffect((a) => Effect.sync(() => f(a)))
  }

  filterEffect<R4, E4>(
    f: (a: C) => Effect.Effect<R4, E4, boolean>,
  ): Filtered<R | R2 | R3 | R4, E | E2 | E3 | E4, C> {
    return this.filterMapEffect((a) =>
      Effect.map(f(a), (b) => (b ? Option.some<C>(a) : Option.none<C>())),
    )
  }

  filter(f: (a: C) => boolean) {
    return this.filterEffect((a) => Effect.sync(() => f(a)))
  }

  filterNotEffect<R4, E4>(
    f: (a: C) => Effect.Effect<R4, E4, boolean>,
  ): Filtered<R | R2 | R3 | R4, E | E2 | E3 | E4, C> {
    return this.filterEffect((a) => Effect.map(f(a), (b) => !b))
  }

  filterNot(f: (a: C) => boolean) {
    return this.filterNotEffect((a) => Effect.sync(() => f(a)))
  }

  mapEffect<R4, E4, D>(
    f: (a: C) => Effect.Effect<R4, E4, D>,
  ): Filtered<R | R2 | R3 | R4, E | E2 | E3 | E4, D> {
    return this.filterMapEffect((a) => pipe(a, f, Effect.map(Option.some)))
  }

  map<D>(f: (a: C) => D) {
    return this.mapEffect((a) => Effect.sync(() => f(a)))
  }
}
