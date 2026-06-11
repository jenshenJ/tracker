/** Монотонный генератор id: стартует с timestamp, чтобы не пересекаться со старыми записями. */
let counter = Date.now();
export const nextId = () => ++counter;
