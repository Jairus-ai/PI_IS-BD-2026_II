import { describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import discountRoutes from '../routes/discount_routes.js';

const MOCK_DISCOUNTS = [
  { ID_DISCOUNTS: 1, DISCOUNT_NAME: 'BIRTHDAY', DISCOUNT_PORCENTAGE: 30 },
  { ID_DISCOUNTS: 2, DISCOUNT_NAME: 'D.DAY', DISCOUNT_PORCENTAGE: 50 },
];

const MOCK_SNACKS = [
  { ID_PRODUCT: 1, PRODUCT_NAME: 'PALOMITAS' },
  { ID_PRODUCT: 2, PRODUCT_NAME: 'REFRESCO' },
];

const MOCK_MOVIES = [
  { ID_PRODUCT: 1, PRODUCT_NAME: 'DUNE from San Carlos' },
  { ID_PRODUCT: 2, PRODUCT_NAME: 'ALIEN from Multicentro' },
];

const NEW_DISCOUNT = {
  DISCOUNT_NAME: 'NAVIDAD',
  DISCOUNT_PORCENTAGE: '15',
  DISCOUNT_START_DATE: '2026-12-01',
  DISCOUNT_FINISH_DATE: '2026-12-31',
  ID_FK_PRODUCT: 1,
};

const discountRows = () => [
    {
        ID_DISCOUNT: 1,
        DISCOUNT_NAME: 'BIRTHDAY',
        DISCOUNT_PORCENTAGE: 30,
        DISCOUNT_START_DATE: '2026-06-01',
        DISCOUNT_FINISH_DATE: '2026-06-30',
    },
    {
        ID_DISCOUNT: 2,
        DISCOUNT_NAME: 'D.DAY',
        DISCOUNT_PORCENTAGE: 50,
        DISCOUNT_START_DATE: '2026-01-01',
        DISCOUNT_FINISH_DATE: '2026-02-01',
    },
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
  return { execute, close: jest.fn().mockResolvedValue() };
}

function useConnection(responses) {
  const connection = createMockConnection(responses);
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

function freezeToday(year, monthIndex, day) {
    jest.useFakeTimers({
        now: new Date(year, monthIndex, day, 12, 0, 0),
        doNotFake: [
            'nextTick', 'setImmediate', 'clearImmediate',
            'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
            'queueMicrotask', 'hrtime', 'performance',
        ],
    });
}

const app = express();
app.use(express.json());
app.use('/management/discounts', discountRoutes);
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /management/discounts', () => {
    const url = '/management/discounts';

    afterEach(() => {
        jest.useRealTimers();
    });

    test('200 OK devuelve la lista sin las fechas y con el estado calculado', async () => {
        freezeToday(2026, 5, 15);
        useConnection([{ rows: discountRows() }]);

        const response = await request(app)
            .get(url)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body.data).toEqual([
            { ID_DISCOUNT: 1, DISCOUNT_NAME: 'BIRTHDAY', DISCOUNT_PORCENTAGE: 30, DISCOUNT_STATE: 'activo' },
            { ID_DISCOUNT: 2, DISCOUNT_NAME: 'D.DAY', DISCOUNT_PORCENTAGE: 50, DISCOUNT_STATE: 'finalizado' },
        ]);
        for (const row of response.body.data) {
            expect(row).not.toHaveProperty('DISCOUNT_START_DATE');
            expect(row).not.toHaveProperty('DISCOUNT_FINISH_DATE');
        }
    });

    test.each([
        ['próximo (empieza mañana)', '2026-06-16', '2026-06-30', 'próximo'],
        ['activo (en curso)', '2026-06-01', '2026-06-30', 'activo'],
        ['activo (empieza hoy)', '2026-06-15', '2026-06-20', 'activo'],
        ['activo (termina hoy)', '2026-06-01', '2026-06-15', 'activo'],
        ['finalizado (terminó ayer)', '2026-05-01', '2026-06-14', 'finalizado'],
    ])('el estado es %s', async (_label, start, finish, expected) => {
        freezeToday(2026, 5, 15);
        useConnection([{
            rows: [{
                ID_DISCOUNT: 1,
                DISCOUNT_NAME: 'X',
                DISCOUNT_PORCENTAGE: 10,
                DISCOUNT_START_DATE: start,
                DISCOUNT_FINISH_DATE: finish,
            }],
        }]);

        const response = await request(app).get(url).expect(200);

        expect(response.body.data[0].DISCOUNT_STATE).toBe(expected);
    });

    test('la consulta excluye los eliminados, ordena y pagina en el servidor', async () => {
        const connection = useConnection([{ rows: discountRows() }]);

        await request(app).get(url).expect(200);

        const [sql, binds, options] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/d\.IS_DELETED = 0/);
        expect(sql).toMatch(/ORDER BY d\.DISCOUNT_NAME, d\.ID_DISCOUNT/);
        expect(sql).toMatch(/OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY/);
        expect(sql).toMatch(/TO_CHAR\(d\.DISCOUNT_START_DATE/);
        expect(sql).not.toMatch(/;\s*$/);
        expect(sql).not.toMatch(/DISCOUNT_NAME,\s*s\s/);
        expect(binds).toEqual({ offset: 0, limit: 10 });
        expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });
    });

    test('aplica la página y el filtro por nombre', async () => {
        const connection = useConnection([{ rows: [] }]);

        await request(app).get(`${url}?page=3&name=cumple`).expect(200);

        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/LOWER\(d\.DISCOUNT_NAME\) LIKE LOWER\(:name\)/);
        expect(binds).toEqual({ name: '%cumple%', offset: 20, limit: 10 });
    });

    test.each([
        ['abc'],
        ['0'],
        ['-5'],
    ])('vuelve a la primera página cuando page=%s', async (page) => {
        const connection = useConnection([{ rows: [] }]);

        await request(app).get(`${url}?page=${page}`).expect(200);

        expect(connection.execute.mock.calls[0][1]).toEqual({ offset: 0, limit: 10 });
    });

    test.each([
        ['vacío', '?name='],
        ['solo espacios', '?name=%20%20'],
        ['repetido', '?name=a&name=b'],
    ])('ignora un filtro de nombre %s', async (_label, query) => {
        const connection = useConnection([{ rows: [] }]);

        await request(app).get(`${url}${query}`).expect(200);

        expect(connection.execute.mock.calls[0][1]).toEqual({ offset: 0, limit: 10 });
    });

    test('200 OK con una lista vacía', async () => {
        useConnection([{ rows: [] }]);

        const response = await request(app).get(url).expect(200);

        expect(response.body).toEqual({ data: [] });
    });

    test('500 cuando falla la consulta, y la conexión se cierra', async () => {
        const connection = useConnection([new Error('ORA-00904: invalid identifier')]);

        const response = await request(app).get(url).expect(500);

        expect(response.body.message).toMatch(/ORA-00904/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});


describe('GET /management/discounts/count', () => {
    const url = '/management/discounts/count';

    test('200 OK devuelve el total', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 25 }] }]);

        const response = await request(app)
            .get(url)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ total: 25 });

        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/COUNT\(d\.ID_DISCOUNT\)/);
        expect(sql).toMatch(/d\.IS_DELETED = 0/);
        expect(binds).toEqual({});
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('aplica el mismo filtro de nombre que la lista', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 3 }] }]);

        const response = await request(app).get(`${url}?name=cumple`).expect(200);

        expect(response.body).toEqual({ total: 3 });
        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/LOWER\(d\.DISCOUNT_NAME\) LIKE LOWER\(:name\)/);
        expect(binds).toEqual({ name: '%cumple%' });
    });

    test('no usa la página, porque el total no depende de ella', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 3 }] }]);

        await request(app).get(`${url}?page=4`).expect(200);

        expect(connection.execute.mock.calls[0][1]).toEqual({});
    });

    test('devuelve 0 cuando no hay descuentos', async () => {
        useConnection([{ rows: [{ TOTAL: 0 }] }]);

        const response = await request(app).get(url).expect(200);

        expect(response.body).toEqual({ total: 0 });
    });

    test('/count no lo captura la ruta /:id', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 1 }] }]);

        const response = await request(app).get(url).expect(200);

        expect(response.body).toEqual({ total: 1 });
        expect(connection.execute.mock.calls[0][0]).toMatch(/COUNT/);
    });

    test('500 cuando falla la consulta, y la conexión se cierra', async () => {
        const connection = useConnection([new Error('ORA-00942: table or view does not exist')]);

        const response = await request(app).get(url).expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});

describe('GET /management/discounts/DP/:type', () => {
  const getProducts = (type) =>
    request(app).get(`/management/discounts/DP/${encodeURIComponent(type)}`);

  test.each([
    ['SNACK', MOCK_SNACKS, /PI_DEVELOPERS\.SNACKS/],
    ['PELICULA', MOCK_MOVIES, /PI_DEVELOPERS\.MOVIES_IN_BILLBOARD/],
  ])('type %s 200 OK', async (type, rows, tablePattern) => {
    const connection = useConnection([{ rows }]);

    const response = await getProducts(type)
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(rows);
    expect(response.body.data).toHaveLength(2);

    const [sql] = connection.execute.mock.calls[0];
    expect(sql).toMatch(tablePattern);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test.each([['SNACK'], ['PELICULA']])(
    'type %s 500 when the query fails',
    async (type) => {
      const connection = useConnection([
        new Error('ORA-00942: table or view does not exist'),
      ]);

      const response = await getProducts(type).expect(500);

      expect(response.body.message).toMatch(/ORA-00942/);
      expect(connection.close).toHaveBeenCalledTimes(1);
    }
  );

  test('400 when the type is not valid', async () => {
    const connection = useConnection([]);

    const response = await getProducts('INVALIDO').expect(400);

    expect(response.body).toHaveProperty('message');
    expect(connection.execute).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

describe('POST /management/discounts/:type', () => {
  const post = (type) =>
    request(app)
      .post(`/management/discounts/${encodeURIComponent(type)}`)
      .send(NEW_DISCOUNT);

  test.each([
    ['SNACK', 'ID_SNACKS', 'ID_MOVIE_IN_BILLBOARD'],
    ['PELICULA', 'ID_MOVIE_IN_BILLBOARD', 'ID_SNACKS'],
  ])('type %s 200 OK and inserts into %s', async (type, column, otherColumn) => {
    const connection = useConnection([
      { rows: [{ LAST_ID: 121 }] },
      { rowsAffected: 1 },
    ]);

    const response = await post(type)
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(connection.execute).toHaveBeenCalledTimes(2);

    const [sql, binds, options] = connection.execute.mock.calls[1];
    expect(sql).toMatch(/INSERT INTO PI_DEVELOPERS\.DISCOUNTS/);
    expect(sql).toContain(column);
    expect(sql).not.toContain(otherColumn);
    expect(binds).toEqual({
      ID: 122,
      NAME: 'NAVIDAD',
      PORCENTAGE: 15,
      START_DATE: '2026-12-01',
      FINISH_DATE: '2026-12-31',
      PRODUCT: 1,
    });
    expect(options).toEqual({ autoCommit: true });
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('starts at id 1 when the table is empty', async () => {
    const connection = useConnection([
      { rows: [{ LAST_ID: null }] },
      { rowsAffected: 1 },
    ]);

    await post('SNACK').expect(200);

    const [, binds] = connection.execute.mock.calls[1];
    expect(binds.ID).toBe(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('500 when the insert fails', async () => {
    const connection = useConnection([
      { rows: [{ LAST_ID: 121 }] },
      new Error('ORA-00001: unique constraint violated'),
    ]);

    const response = await post('SNACK').expect(500);

    expect(response.body.message).toMatch(/ORA-00001/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('400 when the type is not valid and nothing is inserted', async () => {
    const connection = useConnection([{ rows: [{ LAST_ID: 121 }] }]);

    const response = await post('INVALIDO').expect(400);

    expect(response.body).toHaveProperty('message');

    const executedSql = connection.execute.mock.calls.map(([sql]) => sql);
    expect(executedSql.some((sql) => /INSERT/i.test(sql))).toBe(false);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /management/discounts/:id', () => {
  test('204 when the discount is deleted logically', async () => {
    const connection = useConnection([{ rowsAffected: 1 }]);

    await request(app).put('/management/discounts/4').expect(204);

    const [sql, binds, options] = connection.execute.mock.calls[0];
    expect(sql).toMatch(/UPDATE PI_DEVELOPERS\.DISCOUNTS/);
    expect(sql).toMatch(/IS_DELETED\s*=\s*1/);
    expect(sql).not.toMatch(/DELETE FROM/i);
    expect(binds).toEqual({ id: 4 });
    expect(options).toEqual({ autoCommit: true });
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('404 when the discount does not exist', async () => {
    const connection = useConnection([{ rowsAffected: 0 }]);

    await request(app).put('/management/discounts/999').expect(404);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('500 when the update fails', async () => {
    const connection = useConnection([new Error('ORA-01031: insufficient privileges')]);

    await request(app).put('/management/discounts/4').expect(500);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});