import { deepStrictEqual } from 'assert'

import * as Chunk from '@effect/data/Chunk'
import * as Duration from '@effect/data/Duration'
import * as Option from '@effect/data/Option'
import * as Effect from '@effect/io/Effect'
import * as Fiber from '@effect/io/Fiber'
import { describe, it } from 'vitest'

import { Computed } from './Computed.js'
import { makeRef, RefSubject } from './RefSubject.js'
import { toChunk } from './toChunk.js'

describe('RefSubject', () => {
  describe('get', () => {
    it('lazily instantiates the value', async () => {
      const test = Effect.gen(function* ($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))
        const value = yield* $(ref)

        deepStrictEqual(value, 1)
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('modifyEffect', () => {
    it('allows modifying the value with an Effect', async () => {
      const test = Effect.gen(function* ($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        deepStrictEqual(yield* $(ref.modifyEffect((a) => Effect.succeed([null, a + 1]))), null)
        deepStrictEqual(yield* $(ref.get), 2)
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('modify', () => {
    it('allows modifying the value', async () => {
      const test = Effect.gen(function* ($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        deepStrictEqual(yield* $(ref.modify((a) => [null, a + 1])), null)
        deepStrictEqual(yield* $(ref.get), 2)
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('set', () => {
    it('allows setting the value', async () => {
      const test = Effect.gen(function* ($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        yield* $(ref.set(2))
        deepStrictEqual(yield* $(ref.get), 2)
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('delete', () => {
    it('allows deleting the value', async () => {
      const test = Effect.gen(function* ($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        // If the value has not be initialized, it will be return None
        deepStrictEqual(yield* $(ref.delete), Option.none())

        // Initialize the value
        deepStrictEqual(yield* $(ref.get), 1)

        // Delete the value, returning the previously set value
        deepStrictEqual(yield* $(ref.delete), Option.some(1))
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('map', () => {
    it('computes the value from another ref', async () => {
      const test = Effect.scoped(
        Effect.gen(function* ($) {
          const ref = yield* $(makeRef(Effect.succeed(1)))
          const computed = ref.map((a) => a + 1)

          deepStrictEqual(yield* $(computed), 2)
          deepStrictEqual(yield* $(ref.set(2)), 2)
          deepStrictEqual(yield* $(computed), 3)
        }),
      )

      await Effect.runPromise(test)
    })
  })

  describe('Computed', () => {
    describe('map', () => {
      it('computes the value from another Computed', async () => {
        const test = Effect.scoped(
          Effect.gen(function* ($) {
            const ref = yield* $(makeRef(Effect.succeed(1)))
            const addOne = ref.map((a) => a + 1)
            const multiplyTwo = addOne.map((a) => a * 2)

            // Initial
            deepStrictEqual(yield* $(addOne.get), 2)
            deepStrictEqual(yield* $(multiplyTwo.get), 4)

            // Update ref value
            deepStrictEqual(yield* $(ref.set(2)), 2)
            deepStrictEqual(yield* $(addOne.get), 3)
            deepStrictEqual(yield* $(multiplyTwo.get), 6)
          }),
        )

        await Effect.runPromise(test)
      })

      it('can be observed', async () => {
        const test = Effect.scoped(
          Effect.gen(function* ($) {
            const ref = yield* $(makeRef(Effect.succeed(1)))
            const addOne = ref.map((a) => a + 1)
            const multiplyTwo = addOne.map((a) => a * 2)
            const fiber = yield* $(Effect.fork(toChunk(multiplyTwo)))

            // Allow fiber and inner streams to begin
            yield* $(Effect.sleep(Duration.millis(0)))

            // Update ref value
            deepStrictEqual(yield* $(ref.set(2)), 2)
            deepStrictEqual(yield* $(ref.set(3)), 3)
            yield* $(ref.end())

            const results = yield* $(Fiber.join(fiber))

            deepStrictEqual(Chunk.toReadonlyArray(results), [4, 6, 8])
          }),
        )

        await Effect.runPromise(test)
      })

      it('does not recompute value when underlying ref has not changed', async () => {
        const test = Effect.scoped(
          Effect.gen(function* ($) {
            let calls = 0
            const ref = yield* $(makeRef(Effect.succeed(1)))
            const addOne = ref.map((x) => {
              calls++
              return x + 1
            })

            deepStrictEqual(yield* $(addOne), 2)
            deepStrictEqual(yield* $(addOne), 2)
            deepStrictEqual(yield* $(addOne), 2)
            deepStrictEqual(calls, 1)

            yield* $(ref.update((x) => x + 1))

            deepStrictEqual(yield* $(addOne), 3)
            deepStrictEqual(yield* $(addOne), 3)
            deepStrictEqual(yield* $(addOne), 3)
            deepStrictEqual(calls, 2)
          }),
        )

        await Effect.runPromise(test)
      })

      it('does not recompute value when underlying ref has not changed with multiple layers', async () => {
        const test = Effect.scoped(
          Effect.gen(function* ($) {
            let addOneCalls = 0
            let multiplyTwoCalls = 0
            const ref = yield* $(makeRef(Effect.succeed(1)))
            const addOne = ref.map((x) => {
              addOneCalls++
              return x + 1
            })
            const multiplyTwo = addOne.map((a) => {
              multiplyTwoCalls++
              return a * 2
            })

            deepStrictEqual(yield* $(multiplyTwo), 4)
            deepStrictEqual(yield* $(multiplyTwo), 4)
            deepStrictEqual(yield* $(multiplyTwo), 4)
            deepStrictEqual(addOneCalls, 1)
            deepStrictEqual(multiplyTwoCalls, 1)

            yield* $(ref.update((x) => x + 1))

            deepStrictEqual(yield* $(multiplyTwo), 6)
            deepStrictEqual(yield* $(multiplyTwo), 6)
            deepStrictEqual(yield* $(multiplyTwo), 6)
            deepStrictEqual(addOneCalls, 2)
            deepStrictEqual(multiplyTwoCalls, 2)
          }),
        )

        await Effect.runPromise(test)
      })

      it('allows being combined with other Computed', async () => {
        const test = Effect.scoped(
          Effect.gen(function* ($) {
            const ref = yield* $(makeRef(Effect.succeed(1)))
            const addOne = ref.map((a) => a + 1)
            const multiplyTwo = addOne.map((a) => a * 2)
            const combined = Computed.tuple(addOne, multiplyTwo)

            deepStrictEqual(yield* $(combined.get), [2, 4])

            yield* $(ref.set(2))

            deepStrictEqual(yield* $(combined.get), [3, 6])
          }),
        )

        await Effect.runPromise(test)
      })
    })
  })

  describe('Fx', () => {
    it('can be observed', async () => {
      const test = Effect.gen(function* ($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))
        const fiber = yield* $(Effect.fork(toChunk(ref)))

        yield* $(Effect.sleep(Duration.millis(0)))

        yield* $(ref.set(2))
        yield* $(ref.set(3))
        yield* $(ref.end())

        const results = yield* $(Fiber.join(fiber))

        deepStrictEqual(Chunk.toReadonlyArray(results), [1, 2, 3])
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('tuple', () => {
    it('bidirectionally maps a tuple of refs', async () => {
      const test = Effect.scoped(
        Effect.gen(function* ($) {
          const a = yield* $(makeRef(Effect.succeed(1)))
          const b = yield* $(makeRef(Effect.succeed(2)))
          const c = yield* $(makeRef(Effect.succeed(3)))
          const ref = RefSubject.tuple(a, b, c)

          deepStrictEqual(yield* $(ref.get), [1, 2, 3])

          yield* $(ref.set([2, 3, 4]))

          deepStrictEqual(yield* $(a.get), 2)
          deepStrictEqual(yield* $(b.get), 3)
          deepStrictEqual(yield* $(c.get), 4)

          deepStrictEqual(yield* $(ref.get), [2, 3, 4])
        }),
      )

      await Effect.runPromise(test)
    })

    it('can be observed', async () => {
      const test = Effect.gen(function* ($) {
        const a = yield* $(makeRef(Effect.succeed(1)))
        const b = yield* $(makeRef(Effect.succeed(2)))
        const c = yield* $(makeRef(Effect.succeed(3)))
        const ref = RefSubject.tuple(a, b, c)
        const fiber = yield* $(Effect.fork(toChunk(ref)))

        // Allow fiber and inner streams to begin
        yield* $(Effect.sleep(Duration.millis(0)))

        yield* $(a.set(2))
        yield* $(b.set(3))
        yield* $(c.set(4))
        yield* $(ref.end())

        const results = yield* $(Fiber.join(fiber))

        deepStrictEqual(Chunk.toReadonlyArray(results), [
          [1, 2, 3],
          [2, 2, 3],
          [2, 3, 3],
          [2, 3, 4],
        ])
      })

      await Effect.runPromise(Effect.scoped(test))
    })

    it('can be computed', async () => {
      const test = Effect.gen(function* ($) {
        const a = yield* $(makeRef(Effect.succeed(1)))
        const b = yield* $(makeRef(Effect.succeed(2)))
        const c = yield* $(makeRef(Effect.succeed(3)))
        const ref = RefSubject.tuple(a, b, c)
        const computed = ref.map(([a, b, c]) => [a + 1, b + 1, c + 1])
        const fiber = yield* $(Effect.fork(toChunk(computed)))

        // Allow fiber and inner streams to begin
        yield* $(Effect.sleep(Duration.millis(0)))

        yield* $(a.set(2))
        yield* $(b.set(3))
        yield* $(c.set(4))
        yield* $(ref.end())

        const results = yield* $(Fiber.join(fiber))

        deepStrictEqual(Chunk.toReadonlyArray(results), [
          [2, 3, 4],
          [3, 3, 4],
          [3, 4, 4],
          [3, 4, 5],
        ])
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('struct', () => {
    it('bidirectionally maps a struct of refs', async () => {
      const test = Effect.scoped(
        Effect.gen(function* ($) {
          const a = yield* $(makeRef(Effect.succeed(1)))
          const b = yield* $(makeRef(Effect.succeed(2)))
          const c = yield* $(makeRef(Effect.succeed(3)))
          const ref = RefSubject.struct({ a, b, c })

          deepStrictEqual(yield* $(ref.get), { a: 1, b: 2, c: 3 })

          yield* $(ref.set({ a: 2, b: 3, c: 4 }))

          deepStrictEqual(yield* $(a.get), 2)
          deepStrictEqual(yield* $(b.get), 3)
          deepStrictEqual(yield* $(c.get), 4)

          deepStrictEqual(yield* $(ref.get), { a: 2, b: 3, c: 4 })
        }),
      )

      await Effect.runPromise(test)
    })

    it('can be observed', async () => {
      const test = Effect.gen(function* ($) {
        const a = yield* $(makeRef(Effect.succeed(1)))
        const b = yield* $(makeRef(Effect.succeed(2)))
        const c = yield* $(makeRef(Effect.succeed(3)))
        const ref = RefSubject.struct({ a, b, c })
        const fiber = yield* $(Effect.fork(toChunk(ref)))

        // Allow fiber and inner streams to begin
        yield* $(Effect.sleep(Duration.millis(0)))

        yield* $(a.set(2))
        yield* $(b.set(3))
        yield* $(c.set(4))
        yield* $(ref.end())

        const results = yield* $(Fiber.join(fiber))

        deepStrictEqual(Chunk.toReadonlyArray(results), [
          { a: 1, b: 2, c: 3 },
          { a: 2, b: 2, c: 3 },
          {
            a: 2,
            b: 3,
            c: 3,
          },
          { a: 2, b: 3, c: 4 },
        ])
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })

  describe('all', () => {
    it('bidirectionally maps a tuple of refs', async () => {
      const test = Effect.scoped(
        Effect.gen(function* ($) {
          const a = yield* $(makeRef(Effect.succeed(1)))
          const b = yield* $(makeRef(Effect.succeed(2)))
          const c = yield* $(makeRef(Effect.succeed(3)))
          const ref = RefSubject.all([a, b, c])

          deepStrictEqual(yield* $(ref.get), [1, 2, 3])

          yield* $(ref.set([2, 3, 4]))

          deepStrictEqual(yield* $(a.get), 2)
          deepStrictEqual(yield* $(b.get), 3)
          deepStrictEqual(yield* $(c.get), 4)
        }),
      )

      await Effect.runPromise(test)
    })

    it('bidirectionally maps a struct of refs', async () => {
      const test = Effect.gen(function* ($) {
        const a = yield* $(makeRef(Effect.succeed(1)))
        const b = yield* $(makeRef(Effect.succeed(2)))
        const c = yield* $(makeRef(Effect.succeed(3)))
        const ref = RefSubject.all({ a, b, c })

        deepStrictEqual(yield* $(ref.get), { a: 1, b: 2, c: 3 })

        yield* $(ref.set({ a: 2, b: 3, c: 4 }))

        deepStrictEqual(yield* $(a.get), 2)
        deepStrictEqual(yield* $(b.get), 3)
        deepStrictEqual(yield* $(c.get), 4)
      })

      await Effect.runPromise(Effect.scoped(test))
    })
  })
})
