import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUsePurchaseSummary = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockCancelReservation = jest.fn();
const mockNavigate = jest.fn();
const mockShow = jest.fn();
const mockCountdown = jest.fn();
let creatingPaymentIntent = false;

jest.unstable_mockModule('../hooks/usePayments', () => ({
  usePurchaseSummary: mockUsePurchaseSummary,
  useCreatePaymentIntent: () => ({
    createPaymentIntent: mockCreatePaymentIntent,
    isCreatingPaymentIntent: creatingPaymentIntent
  })
}));
jest.unstable_mockModule('../../selectSeats/services/seatsService', () => ({
  cancelReservation: mockCancelReservation
}));
jest.unstable_mockModule('../../../hooks/useReservationCountdown', () => ({
  default: mockCountdown
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
  default: () => ({ show: mockShow })
}));
jest.unstable_mockModule('react-router', () => ({
  useNavigate: () => mockNavigate
}));
jest.unstable_mockModule('../../../components/common/PageContainer', () => ({
  default: ({ title, actions, children }) => (
    <section>
      <h1>{title}</h1>
      {actions}
      {children}
    </section>
  )
}));

const { default: PaymentCheckout } = await import('../pages/PaymentCheckout');
const SUMMARY = {
  screeningId: 2,
  reservedUntil: '2026-11-24T18:10:00.000Z',
  movieTitle: 'Inception',
  locationName: 'Oxígeno',
  screenName: 'Sala 1',
  screenType: 'IMAX',
  movieFormat: 'IMAX 3D + Dolby Atmos',
  screeningDate: '2026-11-30T19:30',
  purchaseDate: '2026-11-24T18:05',
  ticketCount: 2,
  tickets: [
    { seatId: 21, seat: 'C5', feeType: 'G', price: 4500 },
    { seatId: 22, seat: 'C6', feeType: 'G', price: 4500 }
  ],
  snacks: [],
  discounts: [],
  subtotal: 9000,
  total: 9000
};

function axiosError(status, code) {
  return { isAxiosError: true, response: { status, data: { code, message: 'error' } } };
}

function mockSummary(overrides = {}) {
  mockUsePurchaseSummary.mockReturnValue({
    summary: SUMMARY,
    isLoadingSummary: false,
    summaryError: null,
    refetchSummary: jest.fn(),
    ...overrides
  });
}

const text = () => document.body.textContent.replaceAll(' ', ' ');

beforeEach(() => {
  jest.clearAllMocks();
  creatingPaymentIntent = false;
  mockSummary();
  mockCountdown.mockReturnValue({ isExpired: false, label: '4:32' });
  mockCancelReservation.mockResolvedValue({});
});

afterEach(cleanup);

describe('PaymentCheckout: resumen', () => {
  test('Shows the purchase details', () => {
    render(<PaymentCheckout />);

    expect(screen.getByRole('heading', { name: 'Resumen de compra' })).toBeInTheDocument();
    for (const value of ['Inception', 'Oxígeno', 'Sala 1 - IMAX', '30/11/2026 19:30 - IMAX 3D + Dolby Atmos', 'C5, C6', '24/11/2026 18:05']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('Shows the fee and price of each ticket, subtotal and total', () => {
    render(<PaymentCheckout />);

    expect(screen.getByText('C5 - General')).toBeInTheDocument();
    expect(screen.getByText('C6 - General')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(text()).toMatch(/9\s?000,00/);
  });

  test('Hides the snack and discount lines when there are none', () => {
    render(<PaymentCheckout />);

    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    expect(text()).not.toMatch(/-₡/);
  });

  test('Shows snacks and discounts when the purchase has them', () => {
    mockSummary({
      summary: {
        ...SUMMARY,
        snacks: [{ snackId: 1, name: 'Combo palomitas', quantity: 1, amount: 4500 }],
        discounts: [{ discountId: 3, name: 'Martes de estreno', amount: 900 }]
      }
    });
    render(<PaymentCheckout />);

    expect(screen.getByText('1 × Combo palomitas')).toBeInTheDocument();
    expect(screen.getByText('Martes de estreno')).toBeInTheDocument();
  });

  test('Shows the remaining reservation time like the seat page', () => {
    render(<PaymentCheckout />);

    expect(screen.getByRole('timer')).toHaveTextContent('Tus asientos están reservados por 4:32');
    expect(mockCountdown).toHaveBeenCalledWith(SUMMARY.reservedUntil);
  });

  test('Shows a loading indicator', () => {
    mockSummary({ summary: null, isLoadingSummary: true });
    render(<PaymentCheckout />);

    expect(screen.getByLabelText('Cargando resumen de la compra')).toBeInTheDocument();
  });

  test('Shows the load error with a retry button', () => {
    const refetchSummary = jest.fn();
    mockSummary({ summary: null, summaryError: new Error('Network Error'), refetchSummary });
    render(<PaymentCheckout />);

    expect(screen.getByText('No se pudo cargar el resumen de la compra')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetchSummary).toHaveBeenCalledTimes(1);
  });

  test('The load error includes the reason sent by the server', () => {
    const error = axiosError(409, 'FEE_NOT_FOUND');
    error.response.data.message = 'No hay una tarifa vigente para el formato de la proyección';
    mockSummary({ summary: null, summaryError: error });
    render(<PaymentCheckout />);

    expect(screen.getByText('No se pudo cargar el resumen de la compra. Motivo: No hay una tarifa vigente para el formato de la proyección')).toBeInTheDocument();
  });
});

describe('PaymentCheckout: acciones', () => {
  test('Volver goes back to the seat selection of the screening', () => {
    render(<PaymentCheckout />);

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(mockNavigate).toHaveBeenCalledWith('/seats/2');
    expect(mockCancelReservation).not.toHaveBeenCalled();
  });

  test('Proceder al pago creates the payment once even with a double click', async () => {
    let resolvePayment;
    mockCreatePaymentIntent.mockReturnValue(new Promise((resolve) => { resolvePayment = resolve; }));
    render(<PaymentCheckout />);

    const button = screen.getByRole('button', { name: 'Proceder al pago' });
    fireEvent.click(button);
    fireEvent.click(button);
    resolvePayment({ url: '#stripe-checkout' });

    await waitFor(() => expect(window.location.hash).toBe('#stripe-checkout'));
    expect(mockCreatePaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockCreatePaymentIntent).toHaveBeenCalledWith();
  });

  test('A payment error shows a message and keeps the summary', async () => {
    mockCreatePaymentIntent.mockRejectedValue(axiosError(500));
    render(<PaymentCheckout />);

    fireEvent.click(screen.getByRole('button', { name: 'Proceder al pago' }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(expect.stringMatching(/^No se pudo iniciar el pago/), { severity: 'error', autoHideDuration: 5000 })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('When the countdown ends it releases the seats and returns to the seat selection', async () => {
    mockCountdown.mockReturnValue({ isExpired: true, label: '0:00' });
    render(<PaymentCheckout />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/seats/2', { replace: true }));
    expect(mockCancelReservation).toHaveBeenCalledWith(2);
    expect(mockShow).toHaveBeenCalledWith('El tiempo para completar la compra expiró', expect.objectContaining({ severity: 'warning' }));
  });

  test('An expired reservation when paying also returns to the seat selection', async () => {
    mockCreatePaymentIntent.mockRejectedValue(axiosError(410, 'RESERVATION_EXPIRED'));
    render(<PaymentCheckout />);

    fireEvent.click(screen.getByRole('button', { name: 'Proceder al pago' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/seats/2', { replace: true }));
    expect(mockCancelReservation).toHaveBeenCalledWith(2);
  });

  test('Without a reservation it shows the expired message and goes home', async () => {
    mockSummary({ summary: null, summaryError: axiosError(410, 'RESERVATION_EXPIRED') });
    render(<PaymentCheckout />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
    expect(mockShow).toHaveBeenCalledWith('El tiempo para completar la compra expiró', expect.anything());
  });
});
