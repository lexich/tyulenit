---
title: Паттерн подписчик в mobx
date: 2023-05-22T12:53:38+04:00
draft: false
tags: [mobx]
---

В прошлый раз я писал про `createAtomSubscriber` и рассказывал про его чрезвычайную полезность. Предлагаю написать  примитив `Subscriber` для реактивной подписки/отписки/переподписки на источники данных. Начнем с примера использования подобной конструкции.

Представим, что у нас есть функция `receiveData`, которая генерирует данные, после передачи ей текстового `id`  и  реактивная переменную `$id`. С помощью  `Subscriber` создадим реактивную подписку. Когда `getId` будет возвращать значение отличное от `undefined` и `subscriber.data` будет под наблюдением - у нас запустится `receiveData` и, с помощью `push`, мы будет сохранять последнее полученное значение.
Когда значение, возвращаемое  `getId`, изменится (важно чтобы оно было реактивным), произойдет отписка. Если новое значение будет не `undefined`, то произойдет переподписка.
Когда `subscriber.data` выходит из под наблюдения всегда происходит отписка, вне зависимости от `getId`.

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
	}
});

const cancel = autorun(() => console.log('XXX', subscriber.data));

runInAction(() => $id.set('DATA'));
// мы начинаем видеть сообщения типа XXX DATA-{число}

cancel?.();
```

Обратим внимание на основные моменты реализации `Subscriber`. Свойство `data` возвращает нам данные, которые у нас сохраняются в реактивную переменную `$data` и одновременно активизирует атом. Последний при активации вызывает внутренний метод `createSubscription`, который внутри `autorun` следит за изменением состояния `getId` и при наличии значения создает новую подписку, при этом всегда подчищая старую. Также хочется отметить использования метода `untracked`  из mobx, которым мы оборачиваем передаваемый `subscribe`, чтобы исключить любые возможные реактивные воздействия при его реализации.

```ts
import { IAtom, autorun, observable, runInAction, makeObservable, computed, untracked } from 'mobx';

export interface ISubscriberProps<TArgs, T> {
	getId(): TArgs | undefined;
	subscribe(id: TArgs, fn: (d: T) => void): (() => void) | void;
}

export class Subscriber<TArgs, T> {
	private readonly $data = observable.box<T | undefined>(undefined, { deep: false });

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
			if (id === undefined) { return; }

			const cancelInner = untracked(
				() => this.opts.subscribe(id, data =>
					runInAction(() => this.$data.set(data))));

			cancelSubscribe = () => cancelInner?.();
		});
		return () => {
			cancelSubscribe?.();
			cancel();
		};
	}
}
```
