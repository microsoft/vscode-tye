// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function arrayComparer<T>(x: T[], y: T[], sorter: (a: T, b: T) => number, comparer: (x: T, y: T) => boolean): boolean {
    if (x.length !== y.length) {
        return false;
    }

    x = x.slice().sort(sorter);
    y = y.slice().sort(sorter);

    for (let i = 0; i < x.length; i++) {
        if (!comparer(x[i], y[i])) {
            return false;
        }
    }

    return true;
}
