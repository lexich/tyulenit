---
title: Working with atoms in mobx
date: 2023-05-18T12:52:56+04:00
draft: false
tags: [mobx]
---

The `mobx` library has a very interesting primitive atom, which is created via `createAtom`. With its help, you can create very interesting constructions and build almost the entire architecture of the application. What does the documentation tell us:

```
`createAtom`

{🚀} Usage: `createAtom(name, onBecomeObserved?, onBecomeUnobserved?)`

Creates your own observable data structure and hooks it up to MobX. Used internally by all observable data types. Atom exposes two `report` methods to notify MobX with when:

- `reportObserved()`: the atom has become observed, and should be considered part of the dependency tree of the current derivation.
- `reportChanged()`: the atom has changed, and all derivations depending on it should be invalidated.
```

Let's wrap it a little so that it will be more convenient to use it in the future.

```ts
import { IAtom, createAtom } from 'mobx';

export function createAtomSubscriber(
  name: string,
  subscribe: () => () => void
): IAtom {
  let cancel: undefined | (() => void);
  return createAtom(
    name,
    () => {
      cancel?.();
      cancel = subscribe();
    },
    () => {
      cancel?.();
      cancel = undefined;
    }
  );
}
```

Now we can wrap any subscriptions to any data sources in `createAtomSubscriber`. For example, let's imagine a component that is specially a little more complicated for greater clarity.

```ts
const Component: FC = () => {
  const [[prevData, currentData], setData] = useState(['', '']);

  const onMessage = useCallback(
    (e) => setData([currentData, e.data]),
    [currentData]
  );

  useEffect(() => {
    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, [onMessage]);

  return <>{/**/}</>;
};
```

Here we store the previous and current state that comes to us from postmessage. Since we use the previous state, the `onMessage` function is constantly being recreated and thereby triggers a re-subscription in `useEffect`. And the worst thing in this situation is that this code will work, but extremely suboptimal. Of course, this component can be rewritten and optimized using only react tools. But as we remember, this example is quite synthetic and in reality you can get into such a situation, in less obvious conditions.

Let's now rewrite the component to avoid such situations altogether and use `createAtomSubscriber`

```ts
class Model {
  constructor() {
    makeObservable(this, {
      data: observable.ref,
      onMessage: action,
    });
  }
  data: [string, string] = ['', ''];
  atom = createAtomSubscriber('message', () => {
    window.addEventListener('message', this.onMessage);
    return () => window.removeEventListener('message', this.onMessage);
  });

  onMessage = (e) => {
    this.data = [this.data[1], e.data];
  };
}

const Component = observer<{ model: Model }>(({ model }) => {
  model.atom.reportObserved();

  return <>{/**/}</>;
});
```

The subscription will occur when the atom starts to be observed using `observer` or on the first render, and the unsubscription when the component is unmounted. The main thing here is not to forget to call `atom.reportObserved()` and `mobx` will do the rest for us.
