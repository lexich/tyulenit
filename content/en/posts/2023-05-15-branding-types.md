---
title: Branded types in typescript
date: 2023-05-15T12:50:29+04:00
draft: false
tags: [typescript]
---

Today I want to talk about branded types in `typescript`. To begin with, let's imagine that we have a function for currency conversion.
```ts
const usdToEur = (usdAmount: number, rate = 0.92) => usdAmount * rate;
usdToEur(100); // === 92 eur
```

Let's improve it a little by introducing the types USD and EUR, so that not only the name of the function and the comments to it tell us about its purpose.

```ts
type USD = number;
type EUR = number;

const usdToEur = (usdAmount: USD, rate = 0.92): EUR => usdAmount * rate;
usdToEur(100); // === 92 eur
```

It has become much better, but in fact nothing has changed, because we can also pass any number and the newly introduced types do not protect us from error.
And here branded types come to our aid. The point is that we mix additional fields into the type description, which in fact (at runtime) do not exist, but at the same time typescript checks them.

```ts
type USD = number & { __type__: 'USD' };
type EUR = number & { __type__: 'EUR' };

const usdToEur = (usdAmount: USD, rate = 0.92): EUR => (usdAmount * rate) as EUR;

// usdToEur(100); // type error
usdToEur(100 as USD);
```

And to make it easier to use all this, there is a micro-library https://github.com/kourge/ts-brand

```ts
import {Brand, make} from 'ts-brand';
type USD = Brand<number, 'USD'>;
type EUR = Brand<number, 'EUR'>;

const makeEur = make<EUR>();
const usdToEur = (usdAmount: USD, rate = 0.92): EUR => makeEur(usdAmount * rate);
```
