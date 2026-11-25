import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
  api: { get: mockGet, post: mockPost }
}));

const { addScreen, getScreenLocations, getScreens } = await import('../services/screenService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('screenService', () => {
  test('Gets the screens with the session cookie', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ ID_SCREEN: 1 }] } });

    await expect(getScreens()).resolves.toEqual([{ ID_SCREEN: 1 }]);
    expect(mockGet).toHaveBeenCalledWith('/management/screens', { withCredentials: true });
  });

  test('Gets the locations the user can manage', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ ID_LOCATION: 1 }] } });

    await expect(getScreenLocations()).resolves.toEqual([{ ID_LOCATION: 1 }]);
    expect(mockGet).toHaveBeenCalledWith('/management/screens/locations', { withCredentials: true });
  });

  test('Posts the new screen with the session cookie', async () => {
    const screenData = { locationId: 1, type: 'VIP', rows: 5, seatsPerRow: 8, maintenanceTime: 10, addsTime: 5 };
    mockPost.mockResolvedValue({ data: { data: { ID_SCREEN: 9 } } });

    await expect(addScreen(screenData)).resolves.toEqual({ ID_SCREEN: 9 });
    expect(mockPost).toHaveBeenCalledWith('/management/screens', screenData, { withCredentials: true });
  });
});
