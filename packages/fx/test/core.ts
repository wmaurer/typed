import * as Either from "@effect/data/Either"
import * as Effect from "@effect/io/Effect"
import * as Core from "@typed/fx/internal/core2"

describe(__filename, () => {
  it("maps a success value", async () => {
    const test = Core.succeed(1).pipe(
      Core.map((x) => x + 1),
      Core.map((x) => x + 1),
      Core.toReadonlyArray
    )

    const array = await Effect.runPromise(test)

    expect(array).toEqual([3])
  })

  it("maps a multiple values", async () => {
    const test = Core.fromIterable([1, 2, 3]).pipe(
      Core.map((x) => x + 1),
      Core.toReadonlyArray
    )

    const array = await Effect.runPromise(test)

    expect(array).toEqual([2, 3, 4])
  })

  it("switchMap favors the latest inner Fx", async () => {
    const test = Core.fromIterable([1, 2, 3]).pipe(
      Core.switchMap((x) => Core.succeed(String(x + 1))),
      Core.toReadonlyArray
    )

    const array = await Effect.runPromise(test)

    expect(array).toEqual(["4"])
  })

  it("exhaustMap favors the first inner Fx", async () => {
    const test = Core.fromIterable([1, 2, 3]).pipe(
      Core.exhaustMap((x) => Core.succeed(String(x + 1))),
      Core.toReadonlyArray
    )

    const array = await Effect.runPromise(test)

    expect(array).toEqual(["2"])
  })

  it("exhaustMapLatest favors the first and last inner Fx", async () => {
    const test = Core.fromIterable([1, 2, 3]).pipe(
      Core.exhaustMapLatest((x) => Core.succeed(String(x + 1))),
      Core.toReadonlyArray
    )

    const array = await Effect.runPromise(test)

    expect(array).toEqual(["2", "4"])
  })

  describe("Effect Supertype", () => {
    it("lifts a success", async () => {
      const test = Effect.succeed(1).pipe(Core.toReadonlyArray)

      const array = await Effect.runPromise(test)

      expect(array).toEqual([1])
    })

    it("lifts a failure", async () => {
      const test = Effect.fail(1).pipe(Core.toReadonlyArray, Effect.either)
      const either = await Effect.runPromise(test)

      expect(either).toEqual(Either.left(1))
    })
  })
})
