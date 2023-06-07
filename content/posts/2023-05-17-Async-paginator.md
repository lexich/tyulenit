---
title: Асинхронная пагинация
date: 2023-05-17T12:51:37+04:00
draft: false
tags: [library]
---

Сегодня хочется немного рассказать про собственную наработку https://github.com/lexich/async-paginator

Это небольшая библиотека, которая позволяет обрабатывать коллекции данных, используя асинхронные итераторы. При этом доступна гибкая настройка количества одновременного запуска задач (можно запустить сразу все или разбить на группы).

```ts
import { paginatorUnordered, paginator } from 'async-paginator';

const sleep = (delay: number) => new Promise<void>((resolve) => setTimeout(resolve, delay));

// for ordering use `paginator` instead of paginatorUnordered
const paginate = paginatorUnordered([1, 2, 3, 4, 5, 6, 7, 8], async (num) => {
	if (num % 2 === 0) {
		await sleep(10); // timeout 10ms
	}
	return num * 10;
}, {
	offset: 1,
	chunks: 2,
	mode: 'chunks',
});
const result: number[] = [];

for await (const item of paginate) {
	if (!(item instanceof PaginationAsyncError)) {
		result.push(item.data);
	}
}
console.log("RESULT: ", result);
// RESULT: [30, 20, 50, 40, 70, 60, 80]
```
