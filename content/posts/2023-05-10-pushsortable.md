---
title: Вставка отсортированных данных в JS
date: 2023-05-10T12:44:41+04:00
draft: false
tags: [algoritms]
---

Когда я лет 10 назад писал на `C++`, то помню, как использовал структуру `std:set` чтобы сразу упорядоченно вставлять данные в массив. В JavaScript похожий `Set` завезли, но к сожалению компаратор в него не вставить. Придется засучить рукава и писать все самому.

```ts
export function pushSortable<T>(
  list: T[],
  item: T,
  comparator: (a: T, b: T) => -1 | 0 | 1
) {
  // находим позицию первого элемента который больше вставляемого
  const index = list.findIndex(list, item, (a, b) => comparator(a, b) === -1);

  // если не находим то добавляем в конец
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

На этом можно было бы остановиться. Но анализируя на сложность подобного решения, выясняется что findIndex - это `O(N)`, а сдвиг элементов `O(N)`. И если сдвиг элементов ускорить не получиться, то поиск можно заменить на бинарный и улучшить сложность до `O(log N)`.

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

Проблема данной реализации - она прекрасно находит элемент в массиве, только если он существует, а мы его только собираемся добавить и ищем подходящее место для этого. Для этого мы немного расширим компаратор.

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

Теперь мы можем реализовать свой более быстрый `findIndex`. Идея в том, что при сравнении мы проверяем предыдущий элемент и если искомый элемент найден или же одновременно больше предыдущего и меньше следующего, то мы получаем искомый индекс и `O(log N)`

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

Финальная версия

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
