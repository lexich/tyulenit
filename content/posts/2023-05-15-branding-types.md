---
title: Брендированные типы в typescript
date: 2023-05-15T12:50:29+04:00
draft: false
tags: [typescript]
---

Cегодня хочется поговорить о брендированных типах в `typescript`. Для начала, представим, что у нас есть функция для конвертации валют.
```ts
const usdToEur = (usdAmount: number, rate = 0.92) => usdAmount * rate;
usdToEur(100); // === 92 eur
```

Давайте немного улучшим ее, введя типы USD и EUR, чтобы не только название функции и коментарии к ней подсказывали нам о ее предназначении.

```ts
type USD = number;
type EUR = number;

const usdToEur = (usdAmount: USD, rate = 0.92): EUR => usdAmount * rate;
usdToEur(100); // === 92 eur
```

Стало гораздо лучше, но фактически ничего не изменилось, тк мы можем также передавать любое число и нововведенные типы не защищают нас от ошибки.
И здесь нам на помощь приходят брендированные типы. Смысл в том, что мы подмешиваем в описание типа дополнительные поля, которые по факту (в рантайме) не существуют, но при этом typescript осуществляет по ним проверку.

```ts
type USD = number & { __type__: 'USD' };
type EUR = number & { __type__: 'EUR' };

const usdToEur = (usdAmount: USD, rate = 0.92): EUR => (usdAmount * rate) as EUR;

// usdToEur(100); // type error
usdToEur(100 as USD);
```

И чтобы легче все это было использовать есть микробиблиотека https://github.com/kourge/ts-brand

```ts
import {Brand, make} from 'ts-brand';
type USD = Brand<number, 'USD'>;
type EUR = Brand<number, 'EUR'>;

const makeEur = make<EUR>();
const usdToEur = (usdAmount: USD, rate = 0.92): EUR => makeEur(usdAmount * rate);
```
