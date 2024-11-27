---
title: Миграция в React c Context API в Mobx часть 2
date: 2023-05-12T12:49:23+04:00
draft: false
tags: [architecture]
---

В продолжение вчерашней темы, про миграцию на `mobx`  резонно возникает вопрос, а зачем вообще мигрировать на что-то, если есть `redux`, `context api`, `useReducer` и всякие подобные решения на которых строится сейчас `React` разработка.

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

Представим виртуальный пример, который достаточно просто встретить во многих проектах. Что в нем не так?
Проведем мысленный эксперимент. У нас есть компонент, который отображает `profile`. Сколько раз перерендерится наш компонент, когда мы вызовем  `setUserId`. Первый ре-рендер будет на `setUser`, потом у нас вызовется `useEffect`. Его бы я вообще примерно никогда не использовал для работы со стейтом. Далее  `setProfile` и это уже второй ререндер. Такое же поведение будет в каждом компоненте, использующим этот контекст.
И неоптимальность - это полбеды, но если, например, мы хотим небольшой тест, чтобы проверить, как это все работает... я даже думать об этом не хочу и перехожу в лагерь тех кто не пишет тесты и рассуждают о них только на собеседовании.

Давате перепишем все на mobx и получаем один ререндер. Потому что мы подписываемся только на изменение `profile`.

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

// и перепишем компонент

const Component: FC = observer<{ model: AppModel }>(({ model }) => {
  return <div>{model.profile.content}</div>
})
```

А теперь перейдем в лигу тех кто уверен в своем коде (хотя бы бизнес логики) и напишем маленький тест.

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
