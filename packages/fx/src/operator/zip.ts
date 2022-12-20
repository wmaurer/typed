import * as Effect from '@effect/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Fx } from '../Fx.js'
import { withRefCounter } from '../_internal/RefCounter.js'

export function zipAll<Streams extends readonly Fx<any, any, any>[]>(
  ...streams: Streams
): Fx<
  Fx.ResourcesOf<Streams[number]>,
  Fx.ErrorsOf<Streams[number]>,
  {
    readonly [K in keyof Streams]: Fx.OutputOf<Streams[K]>
  }
> {
  return new ZipAllFx(streams)
}

export function zip<R2, E2, B>(second: Fx<R2, E2, B>) {
  return <R, E, A>(first: Fx<R, E, A>): Fx<R | R2, E | E2, readonly [A, B]> => zipAll(first, second)
}

export class ZipAllFx<Streams extends readonly Fx<any, any, any>[]>
  extends Fx.Variance<
    Fx.ResourcesOf<Streams[number]>,
    Fx.ErrorsOf<Streams[number]>,
    {
      readonly [K in keyof Streams]: Fx.OutputOf<Streams[K]>
    }
  >
  implements
    Fx<
      Fx.ResourcesOf<Streams[number]>,
      Fx.ErrorsOf<Streams[number]>,
      {
        readonly [K in keyof Streams]: Fx.OutputOf<Streams[K]>
      }
    >
{
  constructor(readonly streams: Streams) {
    super()
  }

  run<R2>(
    sink: Fx.Sink<
      R2,
      Fx.ErrorsOf<Streams[number]>,
      {
        readonly [K in keyof Streams]: Fx.OutputOf<Streams[K]>
      }
    >,
  ) {
    const l = this.streams.length

    return withRefCounter(
      l,
      (counter) => {
        const buffer = new Map<number, any>()
        const results = new Map<number, any>()

        const add = (i: number, a: any) => {
          if (results.has(i)) {
            buffer.set(i, a)
            return
          }

          results.set(i, a)
        }

        const drainBuffer = () => {
          results.clear()

          for (const [i, a] of buffer) {
            results.set(i, a)
          }

          buffer.clear()
        }

        const emitIfReady = Effect.gen(function* ($) {
          if (results.size !== l) {
            return
          }

          const output = Array.from({ length: l }, (_, i) => results.get(i)) as any

          drainBuffer()

          yield* $(sink.event(output))
        })

        return pipe(
          this.streams,
          Effect.forEachParWithIndex((s, i) =>
            s.run(
              Fx.Sink(
                (a) =>
                  pipe(
                    Effect.sync(() => add(i, a)),
                    Effect.zipRight(emitIfReady),
                  ),
                sink.error,
                counter.decrement,
              ),
            ),
          ),
        )
      },
      sink.end,
    )
  }
}
