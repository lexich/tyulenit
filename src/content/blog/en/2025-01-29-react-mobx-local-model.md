---
title: react-mobx-local-model which was able to solve the problem of local models in react
date: 2025-01-29T12:01:26+04:00
draft: false
tags: [mobx, react]
heroImage: /blog/2025-01-29-react-mobx-local-model.jpg
---

After writing the [note](/en/blog/2025-01-17-usereactmodel) about using `useReactModel`, I realized that it is quite difficult to avoid double re-rendering to synchronize `props` from the component and the local model. The reactivity of `mobx` especially does not like it when the data changes during the rendering process, and when using `useEffect` we get a double call of the component.

I came to the conclusion that, unfortunately, this problem can only be avoided by moving the code related to `props` synchronization to a separate parent component, and reading it already below, using the `mobx` mechanisms.

```ts
const SyncComponent = (props) => {
  const $value = useMemo(() => observable.box(), []);
  useEffect(() => {
    runInAction(() => {
      value.set(props);
    });
  }, [props]);

  return <UserComponent value={$value} />;
};

const UserComponent = observer(({ $value }) => {
  const props = $value.get();

  return <div>{props.value}</div>;
});
```

Given that `observer` uses `React.memo` under the hood, we avoided re-rendering for `UserComponent` and left that for the very lightweight `SyncComponent`.

Using this simple trick and the approach from the previous article, the library [react-mobx-local-model](https://github.com/lexich/react-mobx-local-model) was born.

With its help, you can write similar code, getting rid of unpleasant unnecessary code along the way and getting a fairly optimized solution that is still well tested.

```ts
import { ReactModel, observerWithModel } from 'react-mobx-local-model';
import { computed } from 'mobx';

// Each local model should extend the `ReactModel` class to create a local model for the component
// with the type arguments that will be used in the component later. The constructor of this kind
// of model shouldn't use any parameters because it will be created automatically like `new TestReactModel()`.
class TestReactModel extends ReactModel<{ name: string }> {
  constructor() {
    super({
      name: computed, // Use the computed decorator to optimize prop access if needed
    });
  }
  get text() {
    // Access the props using the `get` method
    return `Hello ${this.get('name')}`;
  }
}

// The component type will be inferred automatically, e.g., `FC<{ model: TestReactModel, name: string }>`
const Component = observerWithModel(TestReactModel, ({ model, name }) => {
  return (
    <div>
      {name} {model.text}
    </div>
  );
});
```
