import * as Either from '@fp-ts/core/Either'
import { pipe } from '@fp-ts/core/Function'

import type { Decoder } from './decoder.js'

export const compose =
  <I2, O>(to: Decoder<I2, O>) =>
  <I>(from: Decoder<I, I2>): Decoder<I, O> =>
  (i, options) =>
    pipe(from(i, options), Either.flatMap(to))
