---
title: Using local mobx stores in React or we don't need useState
date: 2025-01-17T12:01:26+04:00
draft: false
tags: [mobx, react]
heroImage: /blog/2025-01-17-useReactModel.jpg
---

When writing React components using `mobx`, you often have to make a choice: use `useState` to store small states or create a separate `mobx` model.

For something simple, when you need to store one value, `useState` can be convenient. However, if you need to store multiple values and/or do complex calculations, using a mobx model is not only more convenient, but it also eliminates the need to delve into the React lifecycle and opens the way for simple and understandable unit testing.

It might look something like this.

```ts
import { observer } from 'mobx-react-lite';

class Model {
  constructor(public value: number) {
    makeObservable(this, {
      value: observable,
      double: computed,
    });
  }

  get double() {
    return this.value * 2;
  }
}

const Component = observer<{ value: number }>(({ value }) => {
  const model = useMemo(() => new Model(value), [value]);
  return <div>{model.double}</div>;
});
```

If `value` does not change often, then you can stop there. With constant changes, the model will be recreated and all calculations will have to be performed again. To optimize this behavior, you can use `useEffect` and update the model value in it and remove the dependency from `useMemo`. In this case, the update of the model value is delayed due to the asynchrony of this technique. Plus, you have to write a lot of extra code each time.

Tired of such torment, it was decided to introduce a new entity - `ReactModel`.

```ts
export abstract class ReactModel<TParams extends Record<string, unknown>> {
  readonly __type__ = null as unknown as TParams;
  get<TKey extends keyof TParams>(key: TKey): TParams[TKey] {
    throw new Error('need to be reimplemented with useModel');
  }
}
```

The idea is that any local `react` model should inherit from this class and access `react props` through the `get` method.

All the fun happens in the `useReactModel` hook.

```ts
import { useMemo, useRef } from 'react';
import { observable, runInAction, type ObservableMap, comparer } from 'mobx';
import type { ReactModel } from './ReactModel';

export function useReactModel<T extends ReactModel<Record<string, unknown>>>(
  TModel: { new (): T },
  params: T['__type__'],
  cmp: <TKey extends keyof T['__type__']>(
    key: TKey,
    a: T['__type__'][TKey],
    b: T['__type__'][TKey]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => boolean = cmpReactModelDefault as any
) {
  const ref = useRef<ObservableMap<string, unknown>>();

  if (!ref.current) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ref.current = observable.map(params as any, { deep: false });
  } else {
    const $ref = ref.current;
    runInAction(() => {
      Object.entries(params).forEach(([k, v]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!cmp(k, v as any, $ref.get(k) as any)) {
          $ref.set(k, v);
        }
      });
    });
  }

  const model = useMemo(() => {
    const inst = new TModel();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inst.get = ((k: string) => ref.current?.get(k as string)) as any;

    return inst;
  }, [TModel]);

  return model as T;
}

function cmpReactModelDefault(_: string, a: unknown, b: unknown) {
  return comparer.identity(a, b);
}
```

This hook needs to be passed a model class, as well as `react props` from the component. With this approach, we create a model whose life cycle is tied to the component (the model is created once). All `react props` are updated synchronously. And we have reactivity due to the fact that we use `mobx.observable.map` to store parameters.

The `cmp` method allows you to write custom logic to compare changed `react props`.

The final component will take the following form:

```ts
import React from 'react';
import { computed, makeObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { ReactModel, useReactModel } from './useReactModel';

class TestModel extends ReactModel<{ value: number }> {
  constructor() {
    super();
    makeObservable(this, {
      value: computed,
    });
  }

  get double() {
    return this.get('value') * 10;
  }
}

const Component = observer<{ value: number }>(({ value }) => {
  const model = useReactModel(TestModel, { value });

  return <button type="button">{model.double}</button>;
});
```
