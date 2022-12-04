import * as Either from '@fp-ts/data/Either'
import { pipe } from '@fp-ts/data/Function'
import { CauseError } from '@typed/cause'
import { getTime } from '@typed/clock'
import { Exit } from '@typed/exit'

import {
  DefaultServices,
  DefaultServicesContext,
  getDefaultService,
} from '../DefaultServices/DefaultServices.js'
import * as Effect from '../Effect/Effect.js'
import { getRuntimeOptions, map } from '../Effect/operators.js'
import { Live, None } from '../FiberId/FiberId.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { FiberRuntime, RuntimeOptions } from '../FiberRuntime/FiberRuntime.js'
import { FiberScope, GlobalFiberScope } from '../FiberScope/FiberScope.js'
import { IdGenerator } from '../IdGenerator/IdGenerator.js'
import { RuntimeFlags } from '../RuntimeFlags/RuntimeFlags.js'
import { Scheduler } from '../Scheduler/Scheduler.js'

export interface Runtime<R> {
  readonly forkFiber: <E, A>(
    effect: Effect.Effect<R, E, A>,
    options?: Partial<RuntimeOptions<R>>,
  ) => FiberRuntime<R, E, A>

  readonly runWith: <E, A>(
    effect: Effect.Effect<R, E, A>,
    f: (exit: Exit<E, A>) => void,
    options?: Partial<RuntimeOptions<R>>,
  ) => void

  readonly runPromiseExit: <E, A>(
    effect: Effect.Effect<R, E, A>,
    options?: Partial<RuntimeOptions<R>>,
  ) => Promise<Exit<E, A>>

  readonly runPromise: <E, A>(
    effect: Effect.Effect<R, E, A>,
    options?: Partial<RuntimeOptions<R>>,
  ) => Promise<A>
}

export function Runtime<R>(options: RuntimeOptions<R>): Runtime<R> {
  const scheduler = getDefaultService(options.context, options.fiberRefs, Scheduler)
  const makeNextId = getDefaultService(options.context, options.fiberRefs, IdGenerator)
  const makeNextFiberId = () => Live(makeNextId(), getTime(scheduler))
  const makeOptions = (overrides?: Partial<RuntimeOptions<R>>): RuntimeOptions<R> => ({
    ...options,
    ...overrides,
    context: pipe(overrides?.context ?? options.context),
    fiberRefs: overrides?.fiberRefs ?? options.fiberRefs.fork(),
  })

  const forkFiber: Runtime<R>['forkFiber'] = (effect, overrides) => {
    const id = makeNextFiberId()
    const scope = FiberScope(id)
    const opts = makeOptions(overrides)
    const child = new FiberRuntime(effect, {
      id,
      scope,
      context: opts.context,
      fiberRefs: opts.fiberRefs,
      flags: opts.flags,
    })

    opts.scope.addChild(child)

    return child
  }

  const runWith: Runtime<R>['runWith'] = (effect, f, overrides) => {
    const r = forkFiber(effect, overrides)
    r.addObserver(f)
    r.start()
    return r
  }

  const runPromiseExit: Runtime<R>['runPromiseExit'] = (effect, overrides) =>
    new Promise((resolve) => runWith(effect, resolve, overrides))

  const runPromise: Runtime<R>['runPromise'] = (effect, overrides) =>
    new Promise((resolve, reject) =>
      runWith(
        effect,
        Either.match((cause) => reject(new CauseError(cause)), resolve),
        overrides,
      ),
    )

  return {
    forkFiber,
    runWith,
    runPromiseExit,
    runPromise,
  }
}

export const DefaultFiberScope = FiberScope(None)
export const DefaultFiberRefs = FiberRefs()
export const DefaultRuntimeFlags = RuntimeFlags()

export const DefaultRuntime: Runtime<DefaultServices> = Runtime({
  id: None,
  context: DefaultServicesContext,
  scope: DefaultFiberScope,
  fiberRefs: DefaultFiberRefs,
  flags: DefaultRuntimeFlags,
})

export const {
  forkFiber: forkMainFiberUnstarted,
  runWith: runMainWith,
  runPromise: runMain,
  runPromiseExit: runMainExit,
} = DefaultRuntime

const getRuntimeOptions_ = getRuntimeOptions<any>()

export const runtime = <R>(): Effect.Effect<R, never, Runtime<R>> =>
  pipe(getRuntimeOptions_, map(Runtime))

export const runtimeDaemon = <R>(): Effect.Effect<R, never, Runtime<R>> =>
  pipe(
    getRuntimeOptions_,
    map((opts) =>
      Runtime({
        ...opts,
        scope: getDefaultService(opts.context, opts.fiberRefs, GlobalFiberScope),
      }),
    ),
  )
