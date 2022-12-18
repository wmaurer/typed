import * as Effect from '@effect/io/Effect'
import { flow } from '@fp-ts/data/Function'

import { Fx } from '../Fx.js'

import { fromEffect } from './fromEffect.js'

export const die: (defect: unknown) => Fx<never, never, never> = flow(Effect.die, fromEffect)
