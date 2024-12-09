---
 title: Insertion of Sorted Data in JS
date: 2023-05-10T12:44:41+04:00
draft: false
tags: [algorithms]
---

When I was writing in `C++` about 10 years ago, I remember using the `std:set` structure to immediately insert data into an array in an orderly manner. In JavaScript, a similar `Set` has been added, but unfortunately, a comparator cannot be inserted into it. You will have to roll up your sleeves and write everything yourself.

```ts
export function pushSortable<T>(
  list: T[],
  item: T,
  comparator: (a: T, b: T) => -1 | 0 | 1
) {
  // find the position of the first element that is greater than the inserted one
  const index = list.findIndex(list, item, (a, b) => comparator(a, b) === -1);

  // if we do not find it, then add it to the end
  if (index < 0) {
    list.push(item);
    return;
  }

  // последовательно сдвигаем элементы на 1 позицию влево
  let tmp = item;
  for (let i = index, iLen = list.length; i <= iLen; i++) {
    tmp = list[i];
    list[i] = item;
    item = tmp;
  }
}
```

This could be the end of it. But analyzing the complexity of such a solution, it turns out that findIndex is `O(N)`, and shifting elements is `O(N)`. And if the shifting of elements cannot be accelerated, then the search can be replaced with a binary one and the complexity can be improved to `O(log N)`.

```ts
export function binarySearch<T, V>(
  list: T[],
  target: V,
  cmp: (num: T, target: V) => 0 | -1 | 1
): number {
  let start = 0,
    end = list.length - 1,
    i = -1;

  while (start <= end) {
    i = start + ~~((end - start) / 2);

    const cmpResult = cmp(list[i], target);

    if (cmpResult === 0) {
      return i;
    }
    if (cmpResult === -1) {
      start = i + 1;
    } else {
      end = i - 1;
    }
  }

  return -1;
}
```

The problem with this implementation is that it perfectly finds an element in an array only if it exists, and we are just going to add it and are looking for a suitable place for it. To do this, we will slightly expand the comparator.

```ts
export function binarySearch<T, V>(
  list: T[],
  target: V,
  cmp: (num: T, target: V, i: number, list: T[]) => 0 | -1 | 1
): number {
  // <- update
  let start = 0,
    end = list.length - 1,
    i = -1;

  while (start <= end) {
    i = start + ~~((end - start) / 2);

    const cmpResult = cmp(list[i], target, i, list); // <- update

    if (cmpResult === 0) {
      return i;
    }
    if (cmpResult === -1) {
      start = i + 1;
    } else {
      end = i - 1;
    }
  }

  return -1;
}
```

Now we can implement our faster `findIndex`. The idea is that when comparing, we check the previous element and if the desired element is found or is simultaneously greater than the previous and less than the next, then we get the desired index and `O(log N)`

```ts
function findIndexBinary<T>(
  list: T[],
  item: T,
  cmp: (a: T, b: T) => -1 | 0 | 1
) {
  return binarySearch(list, item, (a, t, index, lst) => {
    const right = cmp(a, t);

    if (index > 0) {
      const left = cmp(lst[index - 1], t);

      if (right !== left) {
        return 0;
      }
    } else if (right === 1) {
      // index === 0

      return 0;
    }

    return right;
  });
}
```

Final version

```ts
export function pushSortable<T>(
  list: T[],
  item: T,
  comparator: (a: T, b: T) => -1 | 0 | 1
) {
  const index = findIndexBinary(list, item, comparator);

  if (index < 0) {
    list.push(item);
    return;
  }

  let tmp = item;
  for (let i = index, iLen = list.length; i <= iLen; i++) {
    tmp = list[i];
    list[i] = item;
    item = tmp;
  }
}
```
