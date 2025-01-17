---
title: Работа с atom в mobx
date: 2023-05-18T12:52:56+04:00
draft: false
tags: [mobx]
heroImage: /blog/2023-05-18-createAtom.jpg
---

В библиотеке `mobx`  есть очень интересный примитив атом, который создается через `createAtom`. С его помощью можно создавать очень интересные конструкции и вообще построить чуть ли не всю архитектуру приложения. Что нам говорит документация:

```
`createAtom`

{🚀} Usage: `createAtom(name, onBecomeObserved?, onBecomeUnobserved?)`

Creates your own observable data structure and hooks it up to MobX. Used internally by all observable data types. Atom exposes two `report` methods to notify MobX with when:

-   `reportObserved()`: the atom has become observed, and should be considered part of the dependency tree of the current derivation.
-   `reportChanged()`: the atom has changed, and all derivations depending on it should be invalidated.
```

А давайте немного перезавернем его, чтобы в дальнейшем удобнее было им пользоваться.

```ts
import { IAtom, createAtom } from 'mobx';

export function createAtomSubscriber(name: string, subscribe: () => () => void): IAtom {
	let cancel: undefined | (() => void);
	return createAtom(name, () => {
		cancel?.();
		cancel = subscribe();
	},
	() => {
		cancel?.();
		cancel = undefined;
	});
}
```

Теперь мы можем заворачивать в `createAtomSubscriber` любые подписки на любые источники данных. Например, у представим компонент, специально немного усложненный, для большей наглядности.

```ts
const Component: FC = () => {
	const [[prevData, currentData], setData] = useState(['', '']);

	const onMessage = useCallback((e) => setData([currentData, e.data]), [currentData]);

	useEffect(() => {
		window.addEventListener('message', onMessage);

		return () => window.removeEventListener('message', onMessage);
	}, [onMessage])

	return <>{/**/}</>
}
```

Здесь мы храним предыдущее и текущее состояние, которое приходит к нам из postmessage. Поскольку мы используем предыдущей состояние функция `onMessage`  постоянно пересоздается и тем самым тригеррит переподписку в `useEffect`.  И самое плохое в этой ситуации, что данный код будет работать, но крайне неоптимально. Конечно, этот компонент можно переписать и оптимизировать только средствами react. Но как мы помним, этот пример достаточно синтетический и в реальности можно попасть в такую ситуацию, в менее очевидных условиях.

Давайте теперь перепишем компонент, чтобы вообще избегать подобных ситуаций и воспользуемся `createAtomSubscriber`

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
    }
}

const Component = observer<{model: Model}>(({ model }) => {
	model.atom.reportObserved();

	return <>{/**/}</>;
});
```

Подписка произойдет, когда атом начнет наблюдаться с помощью `observer` или на первого рендера, а отписка когда компонент отмонтируется. Тут главное не забыть вызвать `atom.reportObserved()` а все остальное за нас сделает `mobx`.
