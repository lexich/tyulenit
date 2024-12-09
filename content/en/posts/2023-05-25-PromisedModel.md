---
 title: Asynchronous operations in mobx
date: 2023-05-25T12:54:11+04:00
draft: false
tags: [mobx]
---

We continue our series of notes: "Cooking mobx without documentation".
Last time we implemented the `Subscriber` primitive. It is very useful, but not everyone has WebSockets or similar data generators in their project.
What everyone has is a REST API. Although the work with asynchronous operations is described in the documentation, it raises some suspicions and a lot of boilerplate code from the architectural side. There is a `mobx-utils` package that contains the `fromPromise` method, but it is very unpredictable if you call it outside of the reactive context and you can get a ton of requests to the server.

Let's design the work with asynchronous API in mobx `healthy person` together, especially since we already have everything we need.
```ts
const id = observable.box(1);
const model = new PromiseModel(() => fetch(`/api/data/${id.get()}`).then(r => r.json()));

autorun(() => console.log('DATA:', model.status, model.value));
// DATA: pending undefined
// DATA: fulfilled {....}

runInAction(() => id.set(2));
// DATA: pending undefined
// DATA: fulfilled {....}
```


Let's declare the `Data` interface for storing the server response, it will store the data/error and the response status. We will use our already familiar `Subscriber`. As `getId` we use our callback returning `Promise`. All reactive primitives that will be used inside `load` will restart its call. In `subscribe` we create a reactive container that we will use to store the response from the asynchronous operation and at the same time we will use it as the result of `Subscriber`. Finally, we will describe the methods of accessing the data and the status of the operation `get data` and `get status`.
```ts
interface Data<T> {
	value: T | Error;
	status: 'fulfilled' | 'rejected';
}

class PromisedModel<T> {
	constructor(private load: () => Promise<T>) {
		makeObservable(this, {
			data: computed.struct,
			status: computed.struct,
		});
	}

	private subscription = new Subscriber<
		Promise<T>,
		IObservableValue<Data<T> | undefined>
	>({
		getId: () => this.load(),
		subscribe: (promise, push) => {
			// create a reactive container to store the response
			const $box = observable.box<undefined | Data<T>>(undefined, { deep: false });
			push($box);
			promise.then(
			  value => runInAction(() =>
				  $box.set({ value, status: 'fulfilled' }))
			.then(
			  err => runInAction(() =>
				  $box.set({ value: new Error(err),
							 status: 'rejected'})));
			return () => {};
		}
	})

	get data() { return this.subscription.data?.get()?.value; }
	get status() { return this.subscription.data?.get()?.status ?? 'pending'; }
}
```
