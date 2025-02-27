import * as Effect from '@effect/io/Effect'
import * as Layer from '@effect/io/Layer'
import * as DOM from '@typed/dom'
import * as Route from '@typed/route'
import * as Router from '@typed/router'

import { CreateTodo, CurrentFilterState, ReadTodoList, WriteTodoList } from './application.js'
import { TodoId, TodoList, FilterState } from './domain.js'

const todosKey = 'todos'
const storage = DOM.SchemaStorage(({ json }) => ({
  [todosKey]: json(TodoList),
}))
const todos = storage.key(todosKey)

export const TodosLive = Layer.mergeAll(
  ReadTodoList.implement(() =>
    todos.get().pipe(
      Effect.some,
      Effect.catchAll(() => Effect.succeed([])),
    ),
  ),
  WriteTodoList.implement((todoList) =>
    todos.set(todoList).pipe(Effect.catchAll(() => Effect.unit)),
  ),
  CreateTodo.implement((text) =>
    Effect.succeed({
      id: TodoId(crypto.randomUUID()),
      text,
      completed: false,
      timestamp: new Date(),
    }),
  ),
)

const homeRoute = Route.Route('/', { match: { end: true } }) // Configures path-to-regexp to only match exactly '/'
const activeRoute = Route.Route('/active')
const completedRoute = Route.Route('/completed')

const filterStatesToPath = {
  [FilterState.All]: homeRoute.path,
  [FilterState.Active]: activeRoute.path,
  [FilterState.Completed]: completedRoute.path,
}

export const filterStateToPath = (viewState: FilterState) => filterStatesToPath[viewState]

export const FilterStateLive = CurrentFilterState.fromFx(
  Router.matchTo(activeRoute, () => FilterState.Active)
    .matchTo(completedRoute, () => FilterState.Completed)
    .matchTo(homeRoute, () => FilterState.All)
    .redirect(homeRoute),
)

export const Live = Layer.mergeAll(TodosLive, FilterStateLive)
