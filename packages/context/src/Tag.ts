import * as C from "@effect/data/Context"
import type { IdentifierFactory, IdentifierInput, IdentifierOf } from "./Identifier"
import { makeIdentifier } from "./Identifier"
import type { Tagged } from "./Interface"

/**
 * Provides extensions to the `Context` module's Tag implementation to
 * provide a more ergonomic API for working with Effect + Fx.
 */
export interface Tag<I, S = I> extends C.Tag<I, S> {}

export function Tag<const I extends IdentifierFactory<any>, S = I>(
  id?: I | string
): Tag<IdentifierOf<I>, S>
export function Tag<const I, S = I>(
  id?: I | string
): Tag<IdentifierOf<I>, S>
export function Tag<const I extends IdentifierInput<any>, S = I>(
  id?: I | string
): Tag<IdentifierOf<I>, S> {
  return C.Tag<IdentifierOf<I>, S>(makeIdentifier(id))
}

export namespace Tag {
  export type Identifier<T> = [T] extends [C.Tag<infer I, infer _>] ? I
    : [T] extends [Tagged<infer I, infer _>] ? I
    : never

  export type Service<T> = [T] extends [C.Tag<infer _, infer S>] ? S
    : [T] extends [Tagged<infer _, infer S>] ? S
    : never
}
