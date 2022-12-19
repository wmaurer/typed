import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/io/Effect'
import { millis } from '@fp-ts/data/Duration'
import { pipe } from '@fp-ts/data/Function'
import { describe, it } from 'vitest'

import { at } from '../constructor/at.js'
import { fromArray } from '../constructor/fromArray.js'
import { collectAll } from '../run/collectAll.js'

import { flatMapConcurrently } from './flatMapConcurrently.js'
import { mergeAll } from './merge.js'

describe(import.meta.url, () => {
  describe(flatMapConcurrently.name, () => {
    it('merges inner streams with specified concurrency', async () => {
      const test = pipe(
        fromArray([1, 2, 3, 4]),
        flatMapConcurrently(2, (n) => mergeAll(at(millis(0), n), at(millis(10), n * n))),
        collectAll,
      )
      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [1, 2, 1, 4, 3, 4, 9, 16])
    })
  })
})
