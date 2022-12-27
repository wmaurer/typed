import { Fx } from '../Fx.js'
import { withEarlyExit } from '../_internal/earlyExit.js'

export function zipItems<B, A, C>(items: Iterable<B>, f: (b: B, a: A) => C) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, C> => new ZipItemsFx(fx, items, f)
}

class ZipItemsFx<R, E, A, B, C> extends Fx.Variance<R, E, C> implements Fx<R, E, C> {
  constructor(
    readonly fx: Fx<R, E, A>,
    readonly items: Iterable<B>,
    readonly f: (b: B, a: A) => C,
  ) {
    super()
  }

  run<R2>(sink: Fx.Sink<R2, E, C>) {
    return withEarlyExit((earlyExit) => {
      const iterator = this.items[Symbol.iterator]()
      let next = iterator.next()

      return this.fx.run({
        ...sink,
        event: (a) => {
          if (next.done) {
            return earlyExit
          }

          const b = next.value
          next = iterator.next()
          return sink.event(this.f(b, a))
        },
      })
    }, sink.end)
  }
}
