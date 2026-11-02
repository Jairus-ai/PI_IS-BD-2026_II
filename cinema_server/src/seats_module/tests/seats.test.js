import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';


const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

const { default: seatsRoutes } = await import('../routes/seats_routes.js');


const MOCK_SEATS = [
  { ROW_NUMBER: 'A', SEAT_NUMBER: 1, ID_SEAT: 10, SEAT_AVAILABLE: 1 },
  { ROW_NUMBER: 'A', SEAT_NUMBER: 2, ID_SEAT: 11, SEAT_AVAILABLE: 0 },
];


function createMockConnection(responses = []) {
  const execute = jest.fn();
  for (const response of responses) {
    if (response instanceof Error) {
      execute.mockRejectedValueOnce(response);
    } else {
      execute.mockResolvedValueOnce(response);
    }
  }
  return { execute };
}

function useConnection(responses) {
  const connection = createMockConnection(responses);
  mockGetConnection.mockResolvedValue(connection);
  return connection;
}


const app = express();
app.use(express.json());
app.use('/seats', seatsRoutes);
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

beforeEach(() => {
  mockGetConnection.mockReset();
  mockCloseDatabaseConnection.mockReset().mockResolvedValue();
});


describe('GET /seats/:screeningId', () => {
  test('200 OK returns the seats of the screening', async () => {
    const connection = useConnection([{ rows: MOCK_SEATS }]);

    const response = await request(app)
      .get('/seats/7')
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(MOCK_SEATS);
    expect(response.body.data).toHaveLength(2);

    const [sql, binds, options] = connection.execute.mock.calls[0];
    expect(sql).toMatch(/FROM PI_DEVELOPERS\.SEATS/);
    expect(sql).toMatch(/WHERE ID_SCREENING = :screeningId/);
    expect(binds).toEqual(['7']); 
    expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });

    expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(connection);
  });

  test('200 OK with an empty list when the screening has no seats', async () => {
    useConnection([{ rows: [] }]);

    const response = await request(app).get('/seats/999').expect(200);

    expect(response.body.data).toEqual([]);
  });

  test('500 when the query fails, and the connection is still closed', async () => {
    const connection = useConnection([
      new Error('ORA-00942: table or view does not exist'),
    ]);

    const response = await request(app).get('/seats/7').expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(connection);
  });

  test('500 when the connection cannot be opened, and nothing is closed', async () => {
    mockGetConnection.mockRejectedValue(new Error('NJS-503: connection refused'));

    const response = await request(app).get('/seats/7').expect(500);

    expect(response.body.message).toMatch(/NJS-503/);
    expect(mockCloseDatabaseConnection).not.toHaveBeenCalled();
  });
});

describe.each([
  ['unavailable', 0, 'Seat marked as unavailable'],
  ['available', 1, 'Seat marked as available'],
])('PUT /seats/:screeningId/:seatId/%s', (action, value, message) => {
  const put = () => request(app).put(`/seats/7/12/${action}`);

  test('200 OK updates the seat', async () => {
    const connection = useConnection([{ rowsAffected: 1 }]);

    const response = await put()
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toEqual({ message });

    const [sql, binds, options] = connection.execute.mock.calls[0];
    expect(sql).toMatch(/UPDATE PI_DEVELOPERS\.SEATS/);
    expect(sql).toMatch(new RegExp(String.raw`SEAT_AVAILABLE\s*=\s*${value}`));
    expect(sql).toMatch(/ID_SCREENING = :screeningId/);
    expect(sql).toMatch(/ID_SEAT = :seatId/);
    expect(binds).toEqual(['7', '12']);
    expect(options).toEqual({ autoCommit: true });

    expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(connection);
  });

  test('500 when the update fails, and the connection is still closed', async () => {
    const connection = useConnection([
      new Error('ORA-01031: insufficient privileges'),
    ]);

    const response = await put().expect(500);

    expect(response.body.message).toMatch(/ORA-01031/);
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(connection);
  });
});