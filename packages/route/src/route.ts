import * as Option from '@effect/data/Option'
import * as Path from '@typed/path'
import * as ptr from 'path-to-regexp'

export interface Route<in out P extends string> {
  /**
   * The underlying path of the route
   */
  readonly path: P

  /**
   * The options used to create the route
   */
  readonly options?: RouteOptions

  /**
   * Create a path from a given set params
   */
  readonly make: MakeRoute<P>

  /**
   * Match a path against this route
   */
  readonly match: (path: string) => Option.Option<Path.ParamsOf<P>>

  /**
   * Concatenate this route with another route
   */
  readonly concat: <const P2 extends string>(
    route: Route<P2>,
    options?: RouteOptions,
  ) => Route<Path.PathJoin<readonly [P, P2]>>
}

export type MakeRoute<P extends string> = <const Params extends Path.ParamsOf<P>>(
  params: Params,
) => Path.Interpolate<P, Params>

export function Route<const P extends string>(path: P, options?: RouteOptions): Route<P> {
  const match = Route.makeMatch(path, options?.match)
  const self: Route<P> = {
    path,
    options,
    make: ptr.compile(path, options?.make) as Route<P>['make'],
    match,
    concat<P2 extends string>(
      route: Route<P2>,
      overrides?: RouteOptions,
    ): Route<Path.PathJoin<readonly [P, P2]>> {
      const opts = overrides ?? mergeRouteOptions(options, route.options)

      return Route(Path.pathJoin(path, route.path), opts)
    },
  }

  return self
}

function mergeRouteOptions(options1: RouteOptions | undefined, options2: RouteOptions | undefined) {
  if (options1 === undefined) {
    return options2
  } else if (options2 === undefined) {
    return options1
  } else {
    return {
      make: { ...options1.make, ...options2.make },
      match: { ...options1.match, ...options2.match },
    }
  }
}

export interface RouteOptions {
  readonly make?: ptr.ParseOptions & ptr.TokensToFunctionOptions
  readonly match?: ptr.ParseOptions & ptr.TokensToRegexpOptions & ptr.RegexpToFunctionOptions
}

export namespace Route {
  export function makeMatch<P extends string>(
    path: P,
    options?: RouteOptions['match'],
  ): Route<P>['match'] {
    const parse_ = ptr.match(path, { end: false, ...options })

    return (input: string) => {
      const match = parse_(input)

      return !match
        ? Option.none()
        : Option.some({ ...match.params } as unknown as Path.ParamsOf<P>)
    }
  }
}

export type PathOf<T extends Route<any>> = [T] extends [Route<infer P>] ? P : never

export type ParamsOf<T extends Route<any>> = [T] extends [Route<infer P>] ? Path.ParamsOf<P> : never
