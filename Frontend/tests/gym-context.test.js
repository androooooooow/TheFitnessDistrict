import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

test('live progress, goals and profile use the API even before account state is hydrated', async () => {
  const server = await createServer({
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false },
    cacheDir: '.qa/vite-test-cache',
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    ssr: { external: ['react', 'react-dom'] },
    define: { 'import.meta.env.VITE_ENABLE_PREVIEW': JSON.stringify('false') },
  });
  const originalFetch = globalThis.fetch;
  const requests = [];
  let rejectSession = false;
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, ...options });
      if (url.endsWith('/auth/csrf')) return Response.json({ csrfToken: 'test-csrf' });
      if (rejectSession)
        return Response.json({ message: 'Please sign in again.' }, { status: 401 });
      return Response.json({
        message: 'Saved.',
        user: { id: 'account', role: 'user', member: { id: 'member' } },
      });
    };
    const { GymProvider, useGym } = await server.ssrLoadModule('/src/context/GymContext.jsx');
    let context;
    function Capture() {
      context = useGym();
      return null;
    }
    renderToString(createElement(GymProvider, null, createElement(Capture)));
    assert.equal(context.authUser, null);
    assert.equal(context.previewEnabled, false);
    const input = {
      memberId: 'member',
      metric: 'Weight',
      value: '90',
      date: '2026-10-02',
      notes: 'Morning measurement',
      requestId: 'request',
    };
    assert.equal((await context.addProgress(input, 'member')).message, 'Saved.');
    const create = requests.find((request) => request.url.endsWith('/gym/progress'));
    assert.equal(create.method, 'POST');
    assert.equal(create.credentials, 'include');
    assert.equal(create.headers['X-CSRF-Token'], 'test-csrf');
    assert.equal(JSON.parse(create.body).value, 90);
    assert.equal(JSON.parse(create.body).notes, input.notes);

    await context.editProgress('entry', { ...input, version: 2 }, 'member');
    const edit = requests.find((request) => request.url.endsWith('/gym/progress/entry'));
    assert.equal(edit.method, 'PUT');
    assert.equal(JSON.parse(edit.body).version, 2);

    await context.saveGoal({ ...input, target: 80 });
    assert.ok(requests.some((request) => request.url.endsWith('/gym/goals')));
    assert.equal(await context.updateMember('member', { fullName: 'Test Member' }), true);
    assert.ok(requests.some((request) => request.url.endsWith('/me/profile')));

    rejectSession = true;
    for (const save of [
      () => context.addProgress(input, 'member'),
      () => context.editProgress('entry', { ...input, version: 2 }, 'member'),
      () => context.saveGoal({ ...input, target: 80 }),
      () => context.updateMember('member', { fullName: 'Test Member' }),
    ]) {
      await assert.rejects(save, (error) => error.status === 401 && /sign in/.test(error.message));
    }
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
