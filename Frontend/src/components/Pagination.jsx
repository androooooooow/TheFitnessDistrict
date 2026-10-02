import { Button } from './UI';
import { PAGE_SIZE, pagination } from '../lib/pagination';

export default function Pagination({
  total,
  page,
  onPageChange,
  label = 'records',
  disabled = false,
}) {
  const info = pagination(total, page);
  return (
    <nav
      aria-label={`${label} pagination`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-xs text-muted"
    >
      <span>
        {info.from}–{info.to} of {total} {label} · {PAGE_SIZE} per page
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Page {info.page + 1} of {info.pages}
        </span>
        <Button
          variant="secondary"
          aria-label="Previous page"
          disabled={disabled || info.page === 0}
          onClick={() => onPageChange(info.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          aria-label="Next page"
          disabled={disabled || info.page >= info.pages - 1}
          onClick={() => onPageChange(info.page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
