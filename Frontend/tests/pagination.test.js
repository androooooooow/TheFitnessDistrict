import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { PAGE_SIZE, pagination } from '../src/lib/pagination.js';
import { localDate, addDays } from '../src/lib/domain.js';

test('ten-record pages have no gaps and handle the final, empty, and shrinking pages', () => {
  assert.equal(PAGE_SIZE, 10);
  assert.deepEqual(pagination(21, 0), { page: 0, pages: 3, offset: 0, from: 1, to: 10 });
  assert.deepEqual(pagination(21, 1), { page: 1, pages: 3, offset: 10, from: 11, to: 20 });
  assert.deepEqual(pagination(21, 2), { page: 2, pages: 3, offset: 20, from: 21, to: 21 });
  assert.deepEqual(pagination(0, 2), { page: 0, pages: 1, offset: 0, from: 0, to: 0 });
  assert.equal(pagination(10, 2).page, 0);
  assert.equal(pagination(10).pages, 1);
});

test('member, membership, attendance, progress, and report tables render ten rows', async () => {
  const server = await createServer({
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false },
    cacheDir: '.qa/pagination-test-cache',
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    ssr: { external: ['react', 'react-dom', 'react-router-dom'] },
  });
  try {
    const { GymContext } = await server.ssrLoadModule('/src/context/gym-context.js');
    const members = Array.from({ length: 21 }, (_, i) => ({
      id: `m${i}`,
      name: `Member ${i + 1}`,
      email: `member${i}@example.test`,
      code: `TEST-${i}`,
      weight: 75,
      height: 175,
      history: [],
      access: null,
    }));
    const progress = members.map((_, i) => ({
      id: `p${i}`,
      memberId: 'm0',
      metric: 'Weight',
      value: 75,
      unit: 'kg',
      date: localDate(),
      author: 'm0',
      notes: `Measurement ${i}`,
    }));
    const visits = [
      ...members.map((member, i) => ({
        id: `v${i}`,
        memberId: member.id,
        in: `${localDate()}T08:00:00+08:00`,
        out: `${localDate()}T09:00:00+08:00`,
      })),
      ...members.map((member, i) => ({
        id: `old${i}`,
        memberId: member.id,
        in: `${addDays(localDate(), -i - 1)}T08:00:00+08:00`,
        out: `${addDays(localDate(), -i - 1)}T09:00:00+08:00`,
      })),
    ];
    const value = {
      state: { members, progress, visits, goals: [] },
      userId: 'm0',
      authUser: null,
      previewEnabled: true,
    };
    for (const [path, marker] of [
      ['/src/pages/admin/Members.jsx', /aria-label="View Member /g],
      ['/src/pages/admin/Memberships.jsx', /aria-label="View progress for Member /g],
      ['/src/pages/admin/Attendance.jsx', /<tbody>(.*?)<\/tbody>/s],
      ['/src/pages/Progress.jsx', /aria-label="Edit Weight entry/g],
      ['/src/pages/admin/Reports.jsx', /<tbody>(.*?)<\/tbody>/s],
    ]) {
      const { default: Page } = await server.ssrLoadModule(path);
      const html = renderToStaticMarkup(
        createElement(
          MemoryRouter,
          null,
          createElement(GymContext.Provider, { value }, createElement(Page)),
        ),
      );
      const count = marker.flags.includes('s')
        ? (html.match(marker)?.[1].match(/<tr>/g) || []).length
        : [...html.matchAll(marker)].length;
      assert.equal(count, 10, path);
      assert.match(html, /10 per page/);
      assert.match(html, /aria-label="Previous page" disabled/);
      assert.doesNotMatch(html, /aria-label="Next page" disabled/);
    }
  } finally {
    await server.close();
  }
});
