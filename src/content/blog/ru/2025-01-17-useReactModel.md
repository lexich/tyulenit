---
title: Использование локальных mobx сторов в React или нам не нужен useState
date: 2025-01-17T12:01:26+04:00
draft: false
tags: [mobx, react]
heroImage: /blog/2025-01-17-useReactModel.jpg
---

Обычно при написании React компонентов с использованием `mobx` часто приходится делать выбор: взять `useState` для хранения небольших состояний или создать отдельную `mobx` модель.

Для чего-то простого, когда нужно хранить одно значение, `useState` может быть удобен. Если же нужно хранить несколько значений и/или делать сложные вычисления, то использование mobx модели не только удобнее, но и избавляет от погружения в работу жизненного цикла React и открывает дорогу к простому и понятному юнит-тесту.

Это может выглядеть, например, вот так.

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

Если `value` не меняется часто, то на этом можно остановиться. При постоянных изменениях модель будет пересоздаваться и все вычисления нужно будет выполнять заново. Чтобы оптимизировать подобное поведение, можно использовать `useEffect` и в нем уже обновлять значение модели и убрать зависимость из `useMemo`. В этом случае обновление значения модели откладывается из-за несинхронности подобного приема. Плюс каждый раз нужно писать много дополнительного кода.

Устав от подобных терзаний, было решено ввести новую сущность - `ReactModel`.

```ts
export abstract class ReactModel<TParams extends Record<string, unknown>> {
  readonly __type__ = null as unknown as TParams;
  get<TKey extends keyof TParams>(key: TKey): TParams[TKey] {
    throw new Error('need to be reimplemented with useModel');
  }
}
```

Идея в том, что любая локальная `react` модель должна наследоваться от этого класса и обращаться к `react props` через метод `get`.

Все самое интересное происходит в хуке `useReactModel`.

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
  }

  useEffect(() => {
    const $ref = ref.current;
    runInAction(() => {
      Object.entries(params).forEach(([k, v]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!cmp(k, v as any, $ref.get(k) as any)) {
          $ref.set(k, v);
        }
      });
    });
  }, [params]);

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

В этот хук нужно передать класс модели, а также `react props` из компонента. С помощью такого подхода мы создаем модель, жизненный цикл которой привязан к компоненту (модель создается один раз). И нам доступна реактивность за счет того, что мы для хранения параметров используем `mobx.observable.map`. К сожалению использование `useEffect` приводит к тому, что каждое изменение `react-props` будет инициировать повторный ререндер.

Метод `cmp` позволяет написать кастомную логику для сравнения измененных `react props`.

Финальный компонент у нас приобретет следующий вид:

```ts
import React from 'react';
import { computed, makeObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { ReactModel, useReactModel } from './useReactModel';

class TestModel extends ReactModel<{ value: number }> {
  constructor() {
    super();
    makeObservable(this, {
      double: computed,
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
