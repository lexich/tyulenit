---
title: The Subscriber Pattern in MobX
date: 2023-05-22T12:53:38+04:00
draft: false
tags: [mobx]
---

The last time I wrote about `createAtomSubscriber` and told you about its extreme usefulness. I propose to write a `Subscriber` primitive for reactive subscription/unsubscription/resubscription to data sources. Let's start with an example of using such a construction.

Imagine that we have a `receiveData` function that generates data after passing it a text `id` and a reactive variable `$id`. Using `Subscriber` we will create a reactive subscription. When `getId` returns a value other than `undefined` and `subscriber.data` is under observation, `receiveData` will be started and, using `push`, we will save the last received value.
When the value returned by `getId` changes (it is important that it is reactive), the subscription will be canceled. If the new value is not `undefined`, then a resubscription will occur.
When `subscriber.data` goes out of observation, an unsubscription always occurs, regardless of `getId`.

```ts
function receiveData(id: string, cb: (data: string) => void) {
  let counter = 0;
  const timeout = setInterval(() => cb(`${id}-${counter++}`), 1000);
  return () => clearInterval(timeout);
}

let $id = observable.box<string | undefined>(undefined);

const subscriber = new Subscriber({
  getId: () => $id.get(),
  subscribe: (id, push) => {
    const cancel = receiveData(id, (data) => push(data));
    return cancel;
  },
});

const cancel = autorun(() => console.log('XXX', subscriber.data));

runInAction(() => $id.set('DATA'));
// we start seeing messages like XXX DATA-{number}

cancel?.();
```

Let's pay attention to the main points of the `Subscriber` implementation. The `data` property returns the data that we store in the reactive variable `$data` and at the same time activates the atom. The latter, when activated, calls the internal `createSubscription` method, which, inside `autorun`, monitors the state of `getId` and, if there is a value, creates a new subscription, while always cleaning up the old one. I would also like to note the use of the `untracked` method from mobx, with which we wrap the passed `subscribe` to exclude any possible reactive effects during its implementation.

```ts
import {
  IAtom,
  autorun,
  observable,
  runInAction,
  makeObservable,
  computed,
  untracked,
} from 'mobx';

export interface ISubscriberProps<TArgs, T> {
  getId(): TArgs | undefined;
  subscribe(id: TArgs, fn: (d: T) => void): (() => void) | void;
}

export class Subscriber<TArgs, T> {
  private readonly $data = observable.box<T | undefined>(undefined, {
    deep: false,
  });

  private readonly atom: IAtom;
  constructor(private opts: ISubscriberProps<TArgs, T>) {
    this.atom = createAtomSubscriber(`atom`, () => {
      const cancel = this.createSubscription();
      return () => cancel();
    });
    makeObservable(this, { data: computed });
  }

  get data() {
    this.atom.reportObserved();
    return this.$data.get();
  }

  private createSubscription() {
    let cancelSubscribe: undefined | (() => void);
    const cancel = autorun(() => {
      cancelSubscribe?.();
      cancelSubscribe = undefined;

      const id = this.opts.getId();
      if (id === undefined) {
        return;
      }

      const cancelInner = untracked(() =>
        this.opts.subscribe(id, (data) =>
          runInAction(() => this.$data.set(data))
        )
      );

      cancelSubscribe = () => cancelInner?.();
    });
    return () => {
      cancelSubscribe?.();
      cancel();
    };
  }
}
```
