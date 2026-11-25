import { expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
  default: () => ({ show: jest.fn() })
}));

jest.unstable_mockModule('../hooks/useMoviesInBillboards', () => ({
  useMovieInBillboardFormOptions: () => ({
    movies: [],
    locations: [],
    isLoadingOptions: false,
    optionsError: null
  }),
  useMovieInBillboard: () => ({
    movieInBillboard: null,
    movieInBillboardError: null
  }),
  useCreateMovieInBillboard: () => ({ isCreatingMovieInBillboard: false }),
  useUpdateMovieInBillboard: () => ({ isUpdatingMovieInBillboard: false })
}));

const { useMovieInBillboardForm } = await import('../hooks/useMovieInBillboardForm');

test('Shows the errors of an empty form', async () => {
  const { result } = renderHook(() => useMovieInBillboardForm({
    movieInBillboardId: null,
    open: true,
    onClose: jest.fn()
  }));

  await act(async () => {
    await result.current.handleSubmit({ preventDefault: jest.fn() });
  });

  expect(result.current.isCreate).toBe(true);
});
