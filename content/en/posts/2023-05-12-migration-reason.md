---
title: Migration in React from Context API to Mobx Part 2
date: 2023-05-12T12:49:23+04:00
draft: false
tags: [architecture]
---

Continuing yesterday's topic about migration to `mobx`, the question reasonably arises, why migrate to anything at all, if there is `redux`, `context api`, `useReducer` and all sorts of similar solutions on which `React` development is now built.

```ts
export const AppContext = createContext({});

export const AppContextProvider: FC = ({ children }) => {
  const [user, setUser] = useState<IUser>(undefined);
  const [profile, setProfile] = useState<IProfile>(undefined);
  const setUserId = (id: string) => loadUser(id).then(setUser);

  useEffect(() => {
    if (user) {
      loadProfile(user).then(setProfile);
    } else {
      setProfile(undefined);
    }
  }, [user]);


  return (
	<AppContext.Provider values={{ user, profile, setUserId }}>
		{children}
	</AppContext.Provider>);
}

const Component: FC = () => {
  const { profile } = useContext(AppContext);
  return <div>{profile.content}</div>
}
```

Let's imagine a virtual example that is quite simple to find in many projects. What's wrong with it?
Let's do a thought experiment. We have a component that displays `profile`. How many times will our component re-render when we call `setUserId`. The first re-render will be on `setUser`, then `useEffect` will be called. I would never use it for state management. Next, `setProfile` and this is the second re-render. The same behavior will be in every component that uses this context.
And suboptimality is only half the trouble, but if, for example, we want a small test to check how it all works... I don't even want to think about it and move to the camp of those who don't write tests and only talk about them at interviews.

Let's rewrite everything on mobx and get one re-render. Because we only subscribe to `profile` changes.

```ts
class AppModel {
  user: IUser | undefined = undefined;
  profile: IProfile | undefined = undefined;

  constructor(
	  private loadUser: typeof loaduser,
	  private loadProfile: typeof loadProfile
  ) {
	  makeObservable(this, {
	    user: observable.ref,
	    profile: observable.ref,
	  });
  }


  async setUserId(id: string) {
	  const user = await this.loadUser(id);
	  runInAction(() => this.user = user);
	  const profile = await this.loadProfile(user);
	  runInAction(() => this.profile = profile);
  }
}

// and rewrite the component

const Component: FC = observer<{ model: AppModel }>(({ model }) => {
  return <div>{model.profile.content}</div>
})
```

And now let's move to the league of those who are confident in their code (at least business logic) and write a small test.

```ts
test('AppModel', () => {
  const user: IUser = { name: 'test' };

  const model = new AppModel(
	  () => Promise.resolve(user),
	  (user) => Promise.resolve<IProfile({ user, content: 'content'}),
  );

  model.setUserId('1');

  await when(() => model.user !== undefined);
  expect(model.user).toBe(user);
  expect(model.profile).not.toBeUndefined();

  await when(() => model.profile !== undefined);
  expect(model.profile).toEqual({ user, content: 'content' });
});
```
