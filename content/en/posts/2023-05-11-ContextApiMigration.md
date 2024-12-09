---
title: Migrating to React with Context API in Mobx Part 1
date: 2023-05-11T12:47:31+04:00
draft: false
tags: [architecture]
---

There are three things you can do endlessly in life: watch fire burn, watch water flow, and watch me try to persuade you to rewrite your React application with Context API to something more functional, on which you can build a normal application architecture. Lately, I've been choosing mobx more and more often, so let's talk about it today.

So what to do if the application is already written, but you need to start somewhere?

Suppose we have a component that accesses the global state of the application.

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

Let's describe a model that will replace the functionality of the global state (not necessarily all, it's better to eat an elephant in parts).

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
    // if the hook is called outside the wrapped component, throw an error immediately in development mode
	  if (!_isComputingDerivation()) { // here we are
	    throw new Error('compoment should wrap with observer from "mobx-react-lite"');
	  }
  }

  return useContext(AppMobxContext);
}
```

Now we can rewrite our component, removing unnecessary data from the global state.

```ts
import { observer } from 'mobx-react-lite';
const Component: FC<{}> = observer(() => {
   const { counter, onIncrement } = useAppModel();
   const {} = useContext(AppContext); // everything that has not been replaced will continue to work

   return <button onClick={onIncrement}>Click {counter}</div>
});
```

And the last step, when the component is completely cleared of the influence of the global context, we simply transfer the transfer to the model in the component props.

```ts
import { observer } from 'mobx-react-lite';
const Component: FC<{ model: AppModel }> = observer(({ counter, onIncrement }) => {
   return <button onClick={onIncrement}>Click {counter}</div>
});
```
