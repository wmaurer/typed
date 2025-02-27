import { Placeholder } from './Placeholder.js'
import { Renderable } from './Renderable.js'

// Really only useful when you're building your own tag functions
// e.g. div<P extends AnyPlaceholders, C extends AnyChildren>(props: P, children: C): Renderable<TagResources<P, C>, TagErrors<P, C>>

export type AnyPlaceholders = Readonly<Record<string, Placeholder.AnyOf>>

export type AnyChildren = ReadonlyArray<Renderable<any, any>>

export type TagResources<
  P extends AnyPlaceholders,
  C extends AnyChildren,
> = Placeholder.Context<P[string] | C[number]>

export type TagErrors<P extends AnyPlaceholders, C extends AnyChildren> = Placeholder.Error<
  P[string] | C[number]
>
