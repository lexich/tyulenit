---
title: Создание параметризированных строк
date: 2023-06-04T23:04:41+04:00
draft: false
tags: [typescript]
---

Задача, которая встречается почти в каждом проекте - это создание параметризированных строк. Чаще всего подобные конструкции можно встретить роутерах, но применение можно найти во многих других местах. Обычно это выглядит примерно так:

```ts
const postURL = template('{host}/posts/{id}');
const url = postURL({ host: 'http://example.com', id: 1 });
// url === 'http://example.com/posts/id'
```

Реализовать подобное API не представляет большой сложности. Разбиваем строку с помощью регулярного выражения, подставляя реальные значения вместо переменных.

```js
// создаем regexp для разбиения
const buildSeparatorVarRx = (start: string, end: string) => new RegExp(`${start}([^${start + end}]+)${end}`);
// в качестве разделителя используем скобки
const rx = buildSeparatorVarRx('\\{', '\\}');

export function template<T extends string>(tmpl: T) {
  const array = tmpl.split(rx);
  // TTemplateFunction - ???
  const fn: TTemplateFunction<T> = args => array.map((item, i) => (i % 2 ? (args as Record<string, string | number>)[item] : item)).join('') as any;

  return fn;
}
```

Данная реализация отвечает на все наши запросы, но остается под вопросом что такое `TTemplateFunction`?
Он конструирует из литеральной строки (string literal types) `T` тип-функцию, которой на вход передается объект, ключи которого должны соответствовать переменным из типа `T`. Возвращаемое значение будет литеральной строкой с подставленными значениями из аргументов вместо переменных из `T`.

```ts
type TFn = TTemplateFunction<'{host}/posts/{id}'>;

// мы хотим получить подобный результат
type TFn = <THost extends string | number, TId extends string | number>(obj: {
  host: THost;
  id: TId;
}) => `${THost}/posts/${TId}`;
```

Давайте реализуем `TTemplateFunction`. Для этого нам сначала понадобится разбить строку на токены (строки и переменные) и реализуем это через `TSplitter<one/{two}/three> === ['one/', { var: 'two' }, '/three']`. Здесь c помощью `THead` мы отрезаем строку до переменной, далее извлекаем саму переменную `TVar` между разделителями `TSepStart` и `TSepEnd`. И в конце сохраняем оставшуюся строку в `TTail`. Используя эту информацию сохраняем `THead` и `TVar` в массив и продолжаем рекурсивно парсить `TTail`.

```ts
export type TSplitter<
  T extends string,
  TSepStart extends string = '{',
  TSepEnd extends string = '}'
> = T extends `${infer THead}${TSepStart}${infer TVar}${TSepEnd}${infer TTail}`
  ? [
      ...(THead extends '' ? [] : [THead]),
      { var: TVar },
      ...TSplitter<TTail, TSepStart, TSepEnd>
    ]
  : T extends ''
  ? []
  : [T];
```

Теперь преобразуем полученный массив из `TSplitter` в строку которую будут использовать в качестве возвращаемых значений. `TJoin<['one/', { var: 'two' }, '/three'], { two: 2 }> === one/2/three`. Здесь мы рекурсивно обходим массив и для каждого элемента вытаскиваем, либо значение строки, либо значение переменной, которая может быть либо строкой, либо числом и подавляем все это в общую строку.

```ts
export type TJoin<
  T extends unknown[],
  TParams extends {
    [K: string]: string | number;
  }
> = T extends [infer THead, ...infer TTail]
  ? `${THead extends string
      ? THead
      : THead extends { var: infer TVar }
      ? TVar extends string
        ? TParams[TVar]
        : ``
      : ``}${TJoin<TTail, TParams>}`
  : ``;
```

С помощью `TParamsChunks` отфильтруем переменные из массива `TSplitter`.
`TParamsChunks<['one/', { var: 'two' }, '/three']> === ['two']`. Здесь также рекурсивно обходим массив и отфильтровываем все строки.

```ts
export type TParamsChunks<T extends unknown[]> = T extends [
  infer THead,
  ...infer TTail
]
  ? [
      ...(THead extends { var: infer TVar } ? [TVar] : []),
      ...TParamsChunks<TTail>
    ]
  : [];
```

Для дальнейшего преобразования массива переменных в объект используем `TParamsObject`. `TParamsObject<['two']> === { two: string | number }`

```ts
export type TParamsObject<T extends string[]> = {
  [K in T[number]]: string | number;
};
```

И напишем хелпер `TIsEmpty` для пустого массива и для подобного случая будем использовать тип `void`, чтобы при таком условии не передавать аргументы.

```ts
export type TIsEmpty<T extends unknown[], TResult, TEmpty> = T extends [
  infer A,
  ...infer B
]
  ? TResult
  : TEmpty;

// TIsEmpty<[one], 1, void> === 1
// TIsEmpty<[], 1, void> === void;
```

И теперь объединим все в единый тип `TTemplateFunction`. Для простоты мы ввели `TTemplateFunctionInner`, чтобы разбить все на блоки.
`TSplitLocal` - разбиваем на токены.
`TParamsChunksLocal` - создаем массив с именами переменных
`TParams` - создаем объект из массива.
И в итоге композируем все в финальный тип-функцию и перезаворачиваем в `TTemplateFunction` чтобы скрыть все ненужные подробности.

```ts
type TTemplateFunctionInner<
  V extends string,
  TSepStart extends string = '{',
  TSepEnd extends string = '}',
  TSplitLocal extends unknown[] = TSplitter<V, TSepStart, TSepEnd>,
  TParamsChunksLocal extends string[] = TParamsChunks<TSplitLocal>,
  TParams extends {
    [K: string]: string | number;
  } = TParamsObject<TParamsChunksLocal>
> = <TArgs extends TParams>(
  args: TIsEmpty<TParamsChunksLocal, TArgs, void>
) => TJoin<TSplitLocal, TArgs>;

/**
 * type for template function
 */
export type TTemplateFunction<
  T extends string,
  TSepStart extends string = '{',
  TSepEnd extends string = '}'
> = TTemplateFunctionInner<T, TSepStart, TSepEnd>;
```
