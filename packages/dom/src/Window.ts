/**
 * Low-level Effect wrappers for Window and its usage via Context.
 * @since 8.19.0
 */

import * as Effect from "@effect/io/Effect"
import type * as Scope from "@effect/io/Scope"
import * as C from "@typed/context"

import * as EventTarget from "./EventTarget"

/**
 * Context for the Window object
 * @since 8.19.0
 * @category models
 */
export interface Window extends globalThis.Window {}

/**
 * Context for the Window object
 * @since 8.19.0
 * @category context
 */
export const Window: C.Tagged<Window> = C.Tagged<Window>("@typed/dom/Window")

/**
 * Get the innerWidth from the Window
 * @since 8.19.0
 * @category getters
 */
export const getInnerWidth: Effect.Effect<Window, never, number> = Window.with((w) => w.innerWidth)

/**
 * Get the innerHeight from the Window
 * @since 8.19.0
 * @category getters
 */
export const getInnerHeight: Effect.Effect<Window, never, number> = Window.with(
  (w) => w.innerHeight
)

/**
 * Get the computed style of an Element
 * @since 8.19.0
 * @category getters
 */
export const getComputedStyle: (el: Element) => Effect.Effect<Window, never, CSSStyleDeclaration> = (
  el: Element
): Effect.Effect<Window, never, CSSStyleDeclaration> =>
  Window.withEffect((w) => Effect.sync(() => w.getComputedStyle(el)))

/**
 * Add an event listener to the Window
 * @since 8.19.0
 * @category events
 */
export const addWindowListener: <EventName extends string, R = never>(
  options: EventTarget.AddEventListenerOptions<Window, EventName, R>
) => Effect.Effect<Scope.Scope | Window | R, never, void> = <EventName extends string, R = never>(
  options: EventTarget.AddEventListenerOptions<Window, EventName, R>
): Effect.Effect<R | Window | Scope.Scope, never, void> =>
  Window.withEffect((d) => EventTarget.addEventListener(d, options))
