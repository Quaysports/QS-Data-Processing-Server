export function sortData<T>(arr:T[], key:keyof T) {
    arr.sort((a, b) => a[key] === b[key] ? 0 : a[key] < b[key] ? -1 : 1)
}