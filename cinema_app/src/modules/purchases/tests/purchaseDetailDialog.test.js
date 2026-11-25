import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { cleanup, render, screen, within } from '@testing-library/react';

const mockUsePurchaseDetail = jest.fn();

jest.unstable_mockModule('../hooks/usePurchases', () => ({
  usePurchaseDetail: mockUsePurchaseDetail
}));

const { default: PurchaseDetailDialog } = await import('../components/PurchaseDetailDialog');

const PURCHASE = {
  ID_RECEIPT: 15,
  TOTAL_AMOUNT: 13500,
  RECEIPT_DATE: '2026-11-24T19:35',
  MOVIE_TITLE: 'Inception',
  SCREENING_DATE: '2026-11-25T07:30',
  IS_REFUNDED: false,
  LOCATION_NAME: 'Alajuela City',
  SEATS: [
    { SEAT_ROW: 'C', SEAT_NUMBER: 6, FEE_TYPE: 'G', AMOUNT: 4500 },
    { SEAT_ROW: 'C', SEAT_NUMBER: 7, FEE_TYPE: 'N', AMOUNT: 3500 }
  ],
  SNACKS: [],
  DISCOUNTS: []
};

function mockDetail(purchase = PURCHASE) {
  mockUsePurchaseDetail.mockReturnValue({ purchase, isLoadingPurchase: false, purchaseError: null, refetchPurchase: jest.fn() });
}

const text = (element) => element.textContent.replaceAll(/[\u00a0\u202f]/g, ' ');

beforeEach(() => {
  jest.clearAllMocks();
  mockDetail();
});

afterEach(cleanup);

describe('PurchaseDetailDialog', () => {
  test('Shows the purchase details with a title that does not depend on the purchase number', () => {
    render(<PurchaseDetailDialog purchaseId={15} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /Detalle de la compra/ })).toBeInTheDocument();
    for (const value of ['Inception', 'Alajuela City', '25/11/2026 07:30', '24/11/2026 19:35']) {
      expect(within(dialog).getByText(value)).toBeInTheDocument();
    }
    expect(text(dialog)).toMatch(/13 500,00/);
  });

  test('Shows each seat once with its fee, without a separate seats field', () => {
    render(<PurchaseDetailDialog purchaseId={15} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Asientos y tarifas')).toBeInTheDocument();
    expect(within(dialog).queryByText('Asientos')).not.toBeInTheDocument();
    expect(text(dialog)).toMatch(/C6: General \(₡4 500,00\)/);
    expect(text(dialog)).toMatch(/C7: Niño \(₡3 500,00\)/);
  });

  test('Shows "No aplica" when there are no snacks or discounts, and the refund only when it applies', () => {
    const { unmount } = render(<PurchaseDetailDialog purchaseId={15} onClose={jest.fn()} />);

    expect(screen.getAllByText('No aplica')).toHaveLength(2);
    expect(screen.queryByText('Reembolsada')).not.toBeInTheDocument();
    unmount();

    mockDetail({ ...PURCHASE, IS_REFUNDED: true });
    render(<PurchaseDetailDialog purchaseId={15} onClose={jest.fn()} />);
    expect(screen.getByText('Reembolsada')).toBeInTheDocument();
  });
});
