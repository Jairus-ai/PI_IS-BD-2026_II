import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { TextDecoder, TextEncoder } from 'node:util';
import { cleanup, render, screen } from '@testing-library/react';

globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

const mockUsePurchaseHistory = jest.fn();

jest.unstable_mockModule('../hooks/usePurchases', () => ({
  usePurchaseHistory: mockUsePurchaseHistory,
  usePurchaseDetail: () => ({ purchase: null, isLoadingPurchase: false, purchaseError: null, refetchPurchase: jest.fn() }),
  useRefundPurchase: () => ({ refundPurchase: jest.fn(), isRefundingPurchase: false })
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
  default: () => ({ show: jest.fn() })
}));
jest.unstable_mockModule('../../../components/common/PageContainer', () => ({
  default: ({ title, children }) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  )
}));

const { default: PurchaseHistory } = await import('../pages/PurchaseHistory');

const PURCHASES = [
  { ID_RECEIPT: 15, TOTAL_AMOUNT: 13500, RECEIPT_DATE: '2026-11-24T19:35', MOVIE_TITLE: 'Inception', SCREENING_DATE: '2026-11-25T07:30', IS_REFUNDED: false, IS_REFUND_ON_TIME: true }
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePurchaseHistory.mockReturnValue({
    purchases: PURCHASES,
    isLoadingPurchases: false,
    purchasesError: null,
    refetchPurchases: jest.fn()
  });
});

afterEach(cleanup);

describe('PurchaseHistory', () => {
  test('The first column shows the purchase date instead of the purchase number', () => {
    render(<PurchaseHistory />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers[0]).toBe('Fecha de compra');
    expect(headers).not.toContain('Número de compra');
    expect(screen.getByRole('gridcell', { name: '24/11/2026 19:35' })).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: '15' })).not.toBeInTheDocument();
  });
});
