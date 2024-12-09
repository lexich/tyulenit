---
title: Asynchronous pagination
date: 2023-05-17T12:51:37+04:00
draft: false
tags: [library]
---

Today I would like to tell you a little about my own development https://github.com/lexich/async-paginator

This is a small library that allows you to process data collections using asynchronous iterators. At the same time, flexible configuration of the number of tasks to be started simultaneously is available (you can start all at once or split into groups).

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
