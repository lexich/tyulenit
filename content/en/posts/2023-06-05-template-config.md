---
title: Creating parameterized strings
date: 2023-06-04T23:04:41+04:00
draft: false
tags: [typescript]
---

A task that is found in almost every project is the creation of parameterized strings. Most often, such constructions can be found in routers, but application can be found in many other places. It usually looks something like this:

```ts
const postURL = template('{host}/posts/{id}');
const url = postURL({ host: 'http://example.com', id: 1 });
// url === 'http://example.com/posts/id'
```

Implementing such an API is not a big deal. We split the string using a regular expression, substituting real values for variables.

```js
// create regexp for splitting
const buildSeparatorVarRx = (start: string, end: string) => new RegExp(`${start}([^${start + end}]+)${end}`);
// use brackets as a separator
const rx = buildSeparatorVarRx('\\{', '\\}');

export function template(tmpl: T) {
const array = tmpl.split(rx);
// TTemplateFunction - ???
const fn: TTemplateFunction = args => array.map((item, i) => (i % 2 ? (args as Record)[item] : item)).join('') as any;

return fn;
}
```

This implementation meets all our needs, but the question remains what is `TTemplateFunction`?
It constructs a function type from a literal string (string literal types) `T`, which is passed an object whose keys must match the variables from type `T`. The return value will be a literal string with substituted values from the arguments instead of the variables from `T`.

```ts
type TFn = TTemplateFunction<'{host}/posts/{id}'>;

// we want to get a similar result
type TFn = (obj: { host: THost; id: TId }) => `${THost}/posts/${TId}`;
```

Let's implement `TTemplateFunction`. To do this, we first need to split the string into tokens (strings and variables) and implement this through `TSplitter === ['one/', { var: 'two' }, '/three']`. Here, using `THead` we cut off the string before the variable, then extract the variable `TVar` itself between the delimiters `TSepStart` and `TSepEnd`. And at the end, we save the remaining string to `TTail`. Using this information, save `THead` and `TVar` to an array and continue recursively parsing `TTail`.

```ts
export type TSplitter<
  T extends string,
  TSepStart extends string = '{',
  TSepEnd extends string = '}'
> = T extends `${infer THead}${TSepStart}${infer TVar}${TSepEnd}${infer TTail}`
  ? [...(THead extends '' ? [] : [THead]), { var: TVar }, ...TSplitter]
  : T extends ''
  ? []
  : [T];
```

Now let's convert the resulting array from `TSplitter` to a string that will be used as return values. `TJoin<['one/', { var: 'two' }, '/three'], { two: 2 }> === one/2/three`. Here we recursively iterate over the array and for each element we extract either the value of a string or the value of a variable, which can be either a string or a number, and suppress all this into a common string.

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
      : ``}${TJoin}`
  : ``;
```

Using `TParamsChunks` we filter out variables from the `TSplitter` array.
`TParamsChunks<['one/', { var: 'two' }, '/three']> === ['two']`. Here we also recursively iterate through the array and filter out all strings.

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

For further conversion of the array of variables into an object, we use `TParamsObject`. `TParamsObject<['two']> === { two: string | number }`

```ts
export type TParamsObject<T extends string[]> = {
  [K in T[number]]: string | number;
};
```

And let's write a helper `TIsEmpty` for an empty array and for such a case we will use the `void` type so that in this case we do not pass arguments.

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

And now we combine everything into a single type `TTemplateFunction`. For simplicity, we introduced `TTemplateFunctionInner` to break everything into blocks.
`TSplitLocal` - split into tokens.
`TParamsChunksLocal` - create an array with variable names
`TParams` - create an object from an array.
And in the end, we compose everything into the final function type and rewrap it in `TTemplateFunction` to hide all unnecessary details.

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
