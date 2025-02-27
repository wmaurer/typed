import * as Cause from '@effect/io/Cause'
import * as Effect from '@effect/io/Effect'
import { describe } from 'vitest'

import { fromEffect } from './fromEffect.js'
import { testCause, testCollectAll } from './test-utils.js'

describe(__filename, () => {
  describe(fromEffect.name, (): void => {
    const value = Math.random()

    testCollectAll('returns the output', fromEffect(Effect.succeed(value)), [value])

    testCause('fails with the given Cause', fromEffect(Effect.fail(value)), Cause.fail(value))
  })
})
