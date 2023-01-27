import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/io/Effect'
import { pipe } from '@fp-ts/core/Function'
import * as Duration from '@fp-ts/data/Duration'
import { describe, it } from 'vitest'

import { fromArray } from '../constructor/fromArray.js'
import { collectAll } from '../run/collectAll.js'

import { throttle } from './throttle.js'

describe(import.meta.url, () => {
  describe(throttle.name, () => {
    it('filters noisy streams, favoring the initial', async () => {
      const test = pipe(fromArray([1, 2, 3]), throttle(Duration.millis(10)), collectAll)
      const events = await Effect.runPromise(test)

      deepStrictEqual(events, [1])
    })
  })
})
