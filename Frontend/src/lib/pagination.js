export const PAGE_SIZE = 10;

export function pagination(total, page = 0) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.max(0, Math.min(page, pages - 1));
  const offset = current * PAGE_SIZE;
  return {
    page: current,
    pages,
    offset,
    from: total ? offset + 1 : 0,
    to: Math.min(offset + PAGE_SIZE, total),
  };
}
