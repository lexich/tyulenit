---
title: Миграция в React c Context API в Mobx часть 1
date: 2023-05-11T12:47:31+04:00
draft: false
tags: [architecture]
---

В жизни можно бесконечно делать 3 вещи, смотреть как горит огонь, как течет вода и как я пытаюсь агитировать переписать react приложение с Context API на что-то более функциональное, на чем можно построить нормальную архитектуру приложения. Последнее время я все чаще выбираю mobx, поэтому поговорим сегодня про него.

Так что же делать, если приложение уже написано, а с чего-то начать надо?

Предположим, у нас есть компонент, который обращается к глобальному стейту приложения.

```ts
import { FC, useContext, createContext } from 'react';

const AppContext = createContext({ counter: 0, onIncrement: () => {}});

const AppContextProvider: FC = ({ children }) => {
  const [counter, setCounter] = useState(0);
  return <AppContext.Provider value={{
	counter, onIncrement: () => setCounter(v => v + 1)
  }}>{children}</AppContext.Provider>
}

const Counter: FC<{}> = () => {
   const { counter, onIncrement } = useContext(AppContext);

   return <button onClick={onIncrement}>Click {counter}</div>
}
```

Опишем модель, которая будет заменять функциональность глобального стейта (необязательно всю, слона лучше есть по-частям).

```ts
import { FC, createContext } from 'react';
import { _isComputingDerivation, make, observable, action } from 'mobx';

export class AppModel {
  counter = 0;
  constructor() {
	  makeObservable(this, {
	    text: observable,
	    setText: action
	  })
  }
  onIncrement = () => { this.counter += 1; }
}

export const AppMobxContext = createContext(new AppModel());

export const AppMobxContextProvider: FC<{ model: AppModel }> = ({ model, children }) =>
	<AppMobxContext.Provider value={model}>
		{children}
	</AppMobxContext.Provider>

export const useAppModel = () => {

  if (process.env.NODE_ENV === 'development') {
    // если хук вызван вне обернутого компонента то сразу кидаем ошибку в режиме разработки
	  if (!_isComputingDerivation()) { // здесь мы пр
	    throw new Error('compoment should wrap with observer from "mobx-react-lite"');
	  }
  }

  return useContext(AppMobxContext);
}
```

Теперь мы можем переписать наш компонент, удаляя ненужное данные из глобального стейта.

```ts
import { observer } from 'mobx-react-lite';
const Component: FC<{}> = observer(() => {
   const { counter, onIncrement } = useAppModel();
   const {} = useContext(AppContext); // все что не было заменено, будет продолжать работать

   return <button onClick={onIncrement}>Click {counter}</div>
});
```

И последним шагом когда компонент полностью очиститься от влияния глобального контекста просто переносим передачу в модели в props компонента.

```ts
import { observer } from 'mobx-react-lite';
const Component: FC<{ model: AppModel }> = observer(({ counter, onIncrement }) => {
   return <button onClick={onIncrement}>Click {counter}</div>
});
