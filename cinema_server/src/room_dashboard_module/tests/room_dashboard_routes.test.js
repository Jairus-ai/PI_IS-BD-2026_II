import { describe, expect, jest, test } from '@jest/globals';

const requireSessionMiddleware = jest.fn();
const requireSession = jest.fn(() => requireSessionMiddleware);

const controller = {
  clearRoomStatus: jest.fn(),
  getRoomDashboard: jest.fn(),
  getRoomDashboardFilters: jest.fn(),
  setRoomStatus: jest.fn()
};

jest.unstable_mockModule('../../session/session.js', () => ({
  ROLES: { SUPERUSER: 'S', ADMINISTRATOR: 'A', EMPLOYEE: 'E' },
  requireSession
}));
jest.unstable_mockModule('../controllers/room_dashboard_controller.js', () => controller);

const { default: router } = await import('../routes/room_dashboard_routes.js');

const registeredRoutes = router.stack
  .filter((layer) => layer.route)
  .map((layer) => ({
    method: Object.keys(layer.route.methods)[0],
    path: layer.route.path,
    handler: layer.route.stack[0].handle
  }));

describe('room dashboard routes', () => {
  test('only superusers, administrators and employees can enter', () => {
    expect(requireSession).toHaveBeenCalledWith(['S', 'A', 'E']);
    expect(router.stack[0].handle).toBe(requireSessionMiddleware);
  });

  test.each([
    ['get', '/filters', 'getRoomDashboardFilters'],
    ['get', '/rooms/:roomId', 'getRoomDashboard'],
    ['put', '/rooms/:roomId/status', 'setRoomStatus'],
    ['delete', '/rooms/:roomId/status', 'clearRoomStatus']
  ])('%s %s is handled by %s', (method, path, handlerName) => {
    const route = registeredRoutes.find((r) => r.method === method && r.path === path);

    expect(route?.handler).toBe(controller[handlerName]);
  });

  test('registers no other routes', () => {
    expect(registeredRoutes).toHaveLength(4);
  });
});