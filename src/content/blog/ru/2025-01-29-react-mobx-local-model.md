---
title: react-mobx-local-model которая смогла решить проблему локальных моделей в react
date: 2025-01-29T12:01:26+04:00
draft: false
tags: [mobx, react]
heroImage: /blog/2025-01-29-react-mobx-local-model.jpg
---

После написания [заметки](/ru/blog/2025-01-17-usereactmodel) об использовании `useReactModel` я осознал, что достаточно сложно избежать двойного ререндера для синхронизации `props` от компонента и локальной модели. Реактивность `mobx` особенно не любит, когда данные меняются в процессе рендера, а при использовании `useEffect` мы получаем двойной вызов компонента.

Я пришел к выводу, что, к сожалению, избежать данной проблемы можно лишь вынеся код, связанный с синхронизацией `props`, в отдельный родительский компонент, а чтение уже производить ниже, используя механизмы `mobx`.

```ts
const SyncComponent = (props) => {
  const $value = useMemo(() => observable.box(), []);
  useEffect(() => {
    runInAction(() => {
      value.set(props);
    });
  }, [props]);

  return <UserComponent value={$value} />;
};

const UserComponent = observer(({ $value }) => {
  const props = $value.get();

  return <div>{props.value}</div>;
});
```

Учитывая, что `observer` использует `React.memo` под капотом, мы избежали повторных ререндеров для `UserComponent` и оставили это для очень легковесного `SyncComponent`.

Используя этот нехитрый прием и подход из предыдущей статьи, появилась библиотека [react-mobx-local-model](https://github.com/lexich/react-mobx-local-model).

С ее помощью можно написать подобный код, избавив себя по дороге от неприятного лишнего кода и получив достаточно оптимизированное решение, которое еще неплохо тестируется.

```ts
import { ReactModel, observerWithModel } from 'react-mobx-local-model';
import { computed } from 'mobx';

// Each local model should extend the `ReactModel` class to create a local model for the component
// with the type arguments that will be used in the component later. The constructor of this kind
// of model shouldn't use any parameters because it will be created automatically like `new TestReactModel()`.
class TestReactModel extends ReactModel<{ name: string }> {
  constructor() {
    super({
      name: computed, // Use the computed decorator to optimize prop access if needed
    });
  }
  get text() {
    // Access the props using the `get` method
    return `Hello ${this.get('name')}`;
  }
}

// The component type will be inferred automatically, e.g., `FC<{ model: TestReactModel, name: string }>`
const Component = observerWithModel(TestReactModel, ({ model, name }) => {
  return (
    <div>
      {name} {model.text}
    </div>
  );
});
```
