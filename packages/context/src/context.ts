import * as C from '@effect/data/Context'
import * as Debug from '@effect/data/Debug'
import { pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import * as Layer from '@effect/io/Layer'
import type * as Scope from '@effect/io/Scope'
import * as Fx from '@typed/fx'

/**
 * Provides extensions to the `Context` module's Tag implementation to
 * provide a more ergonomic API for working with Effect + Fx.
 */
export interface Tag<I, S = I> extends C.Tag<I, S> {
  /**
   * Apply a function to the service in the environment
   */
  readonly with: <A>(f: (s: S) => A) => Effect.Effect<I, never, A>
  /**
   * Perform an Effect with the service in the environment
   */
  readonly withEffect: <R, E, A>(f: (s: S) => Effect.Effect<R, E, A>) => Effect.Effect<R | I, E, A>
  /**
   * Run an Fx with the service in the environment
   */
  readonly withFx: <R, E, A>(f: (s: S) => Fx.Fx<R, E, A>) => Fx.Fx<R | I, E, A>

  /**
   * Provide the service to an Effect
   */
  readonly provide: (
    s: S,
  ) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, I>, E, A>

  /**
   * Provide the service to an Fx
   */
  readonly provideFx: (s: S) => <R, E, A>(fx: Fx.Fx<R, E, A>) => Fx.Fx<Exclude<R, I>, E, A>

  /**
   * Create a Layer using an Effect
   */
  readonly layer: <R, E>(effect: Effect.Effect<R, E, S>) => Layer.Layer<R, E, I>

  /**
   * Create a Layer using a Scoped Effect
   */
  readonly layerScoped: <R, E>(
    effect: Effect.Effect<R, E, S>,
  ) => Layer.Layer<Exclude<R, Scope.Scope>, E, I>

  /**
   * Create a Layer from the service
   */
  readonly layerOf: (s: S) => Layer.Layer<never, never, I>

  /**
   * Helper for building a Context
   */
  readonly build: (s: S) => ContextBuilder<I>
}

export function Tag<I, S = I>(key?: string): Tag<I, S> {
  const tag = C.Tag<I, S>(key)

  return Object.assign(tag, {
    with: <A>(f: (s: S) => A) => Effect.map(tag, f),
    withEffect: <R, E, A>(f: (s: S) => Effect.Effect<R, E, A>) => Effect.flatMap(tag, f),
    withFx: <R, E, A>(f: (s: S) => Fx.Fx<R, E, A>) => Fx.switchMap(Fx.fromEffect(tag), f),
    provide: (s: S) => Effect.provideService(tag, s),
    provideFx: (s: S) => Fx.provideService(tag, s),
    layer: <R, E>(effect: Effect.Effect<R, E, S>) => Effect.toLayer(effect, tag),
    layerScoped: <R, E>(effect: Effect.Effect<R | Scope.Scope, E, S>) =>
      Effect.toLayerScoped(effect, tag),
    layerOf: (s: S) => Layer.succeed(tag, s),
    build: (s: S) => ContextBuilder.fromTag(tag, s),
  } as const) satisfies Tag<I, S>
}

export interface ContextBuilder<I> {
  readonly context: C.Context<I>
  readonly add: <I2, S>(tag: C.Tag<I2, S>, s: S) => ContextBuilder<I | I2>
  readonly merge: <I2>(builder: ContextBuilder<I2>) => ContextBuilder<I | I2>
  readonly mergeContext: <I2>(context: C.Context<I2>) => ContextBuilder<I | I2>
  readonly pick: <S extends ReadonlyArray<C.ValidTagsById<I>>>(
    ...tags: S
  ) => ContextBuilder<C.Tag.Identifier<S[number]>>
}

export namespace ContextBuilder {
  export const empty: ContextBuilder<never> = fromContext(C.empty())

  export function fromContext<I>(context: C.Context<I>): ContextBuilder<I> {
    return {
      context,
      add: <I2, S>(tag: C.Tag<I2, S>, s: S) => fromContext(C.add(context, tag, s)),
      merge: <I2>(builder: ContextBuilder<I2>) => fromContext(C.merge(context, builder.context)),
      mergeContext: <I2>(ctx: C.Context<I2>) => fromContext(C.merge(context, ctx)),
      pick: (...tags) => fromContext(pipe(context, C.pick(...tags))),
    }
  }

  export function fromTag<I, S>(tag: C.Tag<I, S>, s: S): ContextBuilder<I> {
    return fromContext(C.make(tag, s))
  }
}

export const provideContextBuilder: {
  <R>(builder: ContextBuilder<R>): <E, A>(
    effect: Effect.Effect<R, E, A>,
  ) => Effect.Effect<never, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, builder: ContextBuilder<R>): Effect.Effect<never, E, A>
} = Debug.dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(
      effect: Effect.Effect<R, E, A>,
      builder: ContextBuilder<R>,
    ): Effect.Effect<never, E, A> =>
      Effect.provideContext(effect, builder.context).traced(trace),
)

export const provideContextBuilderFx: {
  <R>(builder: ContextBuilder<R>): <E, A>(fx: Fx.Fx<R, E, A>) => Fx.Fx<never, E, A>
  <R, E, A>(fx: Fx.Fx<R, E, A>, builder: ContextBuilder<R>): Fx.Fx<never, E, A>
} = Debug.dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(fx: Fx.Fx<R, E, A>, builder: ContextBuilder<R>): Fx.Fx<never, E, A> =>
      Fx.provideContext(fx, builder.context).addTrace(trace),
)

export function effectContextBuilder<R, E, I>(
  effect: Effect.Effect<R, E, ContextBuilder<I>>,
): Layer.Layer<R, E, I> {
  return Layer.effectContext(Effect.map(effect, (builder) => builder.context))
}

export function syncContextBuilder<I>(f: () => ContextBuilder<I>): Layer.Layer<never, never, I> {
  return Layer.syncContext(() => f().context)
}

export function scopedContextBuilder<R, E, I>(
  effect: Effect.Effect<R, E, ContextBuilder<I>>,
): Layer.Layer<Exclude<R, Scope.Scope>, E, I> {
  return Layer.scopedContext(Effect.map(effect, (builder) => builder.context))
}

export function succeedContextBuilder<I>(builder: ContextBuilder<I>): Layer.Layer<never, never, I> {
  return Layer.succeedContext(builder.context)
}

export {
  type TagTypeId,
  type TypeId,
  type ValidTagsById,
  type Context,
  isContext,
  isTag,
  empty,
  make,
  add,
  get,
  unsafeGet,
  getOption,
  merge,
  pick,
} from '@effect/data/Context'
