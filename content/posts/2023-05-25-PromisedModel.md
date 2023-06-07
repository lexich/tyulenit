---
title: Асинхронные операции в mobx
date: 2023-05-25T12:54:11+04:00
draft: false
tags: [mobx]
---

Продолжаем нашу серию заметок: "Готовим mobx в обход документации". В прошлый раз мы реализовали примитив `Subscriber`.  Он очень полезный, но не у каждого в проекте есть вебсокеты или подобные генераторы данных.
Что есть у каждого, так это REST API. Работа с асинхронными операциями в документации, хоть и описана, но с архитектурной стороны вызывает одни подозрения и много boilerplate кода. Есть пакет `mobx-utils`, который содержит метод `fromPromise`, но очень непредсказуемо, если обратиться к нему вне реактивного контекста и то можно получить тонну запросов на сервер.

Давайте вместе спроектируем работу с асихронным API в mobx `здорового человека`, тем более все необходимое у нас уже есть.
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


Обьявим interface `Data` для хранения ответа сервера, в нем будут храниться данные/ошибка и статус ответа. Будем использовать наш уже знакомый `Subscriber`. В качестве `getId` мы используем наш коллбек возращающий `Promise`. Все реактивные примитивы, которые будут использованы внутри `load` будут перезапускать его вызов. В `subscribe` мы создаем реактивный контейнер, который будем использовать для хранения ответа от асинхронной операции и одновременно будем использовать его в качестве результата `Subscriber`. В завершении опишем методы доступа  к данным и статусу операции `get data` и `get status` .
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
			// создаем реактивный контейнер для хранения ответа
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
