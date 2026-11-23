import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import snackRoutes from '../routes/snack_routes.js';
import { buildSnackFilters } from '../controllers/snack_controller.js';

const BASE_PATH = '/management/snacks';

const SNACKS = [
    { ID_SNACK: 1, SNACK_NAME: 'PALOMITAS', PRICE: 2500 },
    { ID_SNACK: 2, SNACK_NAME: 'REFRESCO', PRICE: 1500 },
];

const SNACK_DETAIL = { SNACK_NAME: 'PALOMITAS', SNACK_DESCRIPTION: 'Palomitas con mantequilla', PRICE: 2500 };

function createMockConnection(responses = []) {
    const execute = jest.fn();
    for (const response of responses) {
        if (response instanceof Error) {
            execute.mockRejectedValueOnce(response);
        } else {
            execute.mockResolvedValueOnce(response);
        }
    }

    const close = jest.fn().mockResolvedValue();
    return { execute, close, release: close };
}

function useConnection(responses) {
    const connection = createMockConnection(responses);
    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
    return connection;
}


const app = express();
app.use(express.json());
app.use(BASE_PATH, snackRoutes);
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('buildSnackFilters', () => {
    test('sin filtros solo excluye los snacks eliminados', () => {
        expect(buildSnackFilters()).toEqual({
            whereClause: 'WHERE s.IS_DELETED = 0',
            binds: {},
        });
    });

    test('con nombre agrega el LIKE y el bind con comodines', () => {
        const { whereClause, binds } = buildSnackFilters({ name: '  palo ' });

        expect(whereClause).toMatch(/LOWER\(s\.SNACK_NAME\) LIKE LOWER\(:name\)/);
        expect(binds).toEqual({ name: '%palo%' });
    });

    test('combina las condiciones con AND', () => {
        const { whereClause } = buildSnackFilters({ name: 'palo' });

        expect(whereClause).toBe(
            'WHERE s.IS_DELETED = 0 AND LOWER(s.SNACK_NAME) LIKE LOWER(:name)',
        );
    });

    test.each([
        ['vacío', ''],
        ['solo espacios', '   '],
        ['un arreglo', ['a', 'b']],
        ['un número', 5],
        ['undefined', undefined],
        ['null', null],
    ])('ignora un nombre %s', (_label, name) => {
        expect(buildSnackFilters({ name })).toEqual({
            whereClause: 'WHERE s.IS_DELETED = 0',
            binds: {},
        });
    });
});

describe(`GET ${BASE_PATH}/`, () => {
    const url = `${BASE_PATH}/`;

    test('200 OK devuelve la lista', async () => {
        const connection = useConnection([{ rows: SNACKS }]);

        const response = await request(app)
            .get(url)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ data: SNACKS });

        const [sql, binds, options] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/FROM PI_DEVELOPERS\.SNACKS s/);
        expect(sql).toMatch(/s\.IS_DELETED = 0/);
        expect(sql).toMatch(/ORDER BY s\.ID_SNACK/);
        expect(sql).toMatch(/OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY/);
        expect(sql).not.toMatch(/;\s*$/);
        expect(binds).toEqual({ offset: 0, limit: 10 });
        expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('aplica la página y el filtro por nombre', async () => {
        const connection = useConnection([{ rows: [SNACKS[0]] }]);

        await request(app).get(`${url}?page=3&name=palo`).expect(200);

        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/LOWER\(s\.SNACK_NAME\) LIKE LOWER\(:name\)/);
        expect(binds).toEqual({ name: '%palo%', offset: 20, limit: 10 });
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

    test('500 cuando falla la consulta, y la conexión se cierra', async () => {
        const connection = useConnection([new Error('ORA-00942: table or view does not exist')]);

        const response = await request(app).get(url).expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 cuando no se puede abrir la conexión', async () => {
        jest.spyOn(oracledb, 'getConnection').mockRejectedValue(new Error('NJS-503: connection refused'));

        const response = await request(app).get(url).expect(500);

        expect(response.body.message).toMatch(/NJS-503/);
    });
});

describe(`GET ${BASE_PATH}/count`, () => {
    const url = `${BASE_PATH}/count`;

    test('200 OK devuelve el total', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 12 }] }]);

        const response = await request(app)
            .get(url)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ total: 12 });

        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/COUNT\(s\.ID_SNACK\)/);
        expect(sql).toMatch(/s\.IS_DELETED = 0/);
        expect(binds).toEqual({});
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('aplica el mismo filtro de nombre que la lista', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 3 }] }]);

        const response = await request(app).get(`${url}?name=palo`).expect(200);

        expect(response.body).toEqual({ total: 3 });
        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/LOWER\(s\.SNACK_NAME\) LIKE LOWER\(:name\)/);
        expect(binds).toEqual({ name: '%palo%' });
    });

    test('no usa la página, porque el total no depende de ella', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 3 }] }]);

        await request(app).get(`${url}?page=4`).expect(200);

        expect(connection.execute.mock.calls[0][1]).toEqual({});
    });

    test('devuelve 0 cuando no hay snacks', async () => {
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


describe(`GET ${BASE_PATH}/:id`, () => {
    const get = (id = 5) => request(app).get(`${BASE_PATH}/${id}`);

    test('200 OK devuelve el snack como objeto, no como arreglo', async () => {
        const connection = useConnection([{ rows: [SNACK_DETAIL] }]);

        const response = await get()
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ data: SNACK_DETAIL });
        expect(Array.isArray(response.body.data)).toBe(false);

        const [sql, binds, options] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/IS_DELETED = 0/);
        expect(sql).toMatch(/ID_SNACK = :id/);
        expect(binds).toEqual({ id: 5 });
        expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('404 cuando el snack no existe o está eliminado', async () => {
        const connection = useConnection([{ rows: [] }]);

        const response = await get(999).expect(404);

        expect(response.body).toEqual({ message: 'Snack no encontrado' });
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 cuando falla la consulta, y la conexión se cierra', async () => {
        const connection = useConnection([new Error('ORA-00942: table or view does not exist')]);

        const response = await get().expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

});

describe('POST ${BASE_PATH}', () => {
    test('201 cuando se crea correctamente', async () => {
        const connection = useConnection([
            {
                rows: [{ LAST_ID: 5 }],
            },
            {},
        ]);

        const response = await request(app)
            .post('/management/snacks')
            .send({
                SNACK_NAME: 'Nachos',
                SNACK_DESCRIPTION: 'Con queso',
                PRICE: 1500,
            });

        expect(response.status).toBe(201);

        expect(response.body).toEqual({
            message: 'success',
        });

        expect(connection.execute).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('INSERT INTO PI_DEVELOPERS.SNACKS'),
            {
                ID_SNACK: 6,
                SNACK_NAME: 'Nachos',
                SNACK_DESCRIPTION: 'Con queso',
                PRICE: 1500,
            },
            {
                autoCommit: true,
            }
        );
    });

    test('409 cuando el nombre ya existe', async () => {
        const duplicateError = Object.assign(
            new Error('ORA-00001: unique constraint violated'),
            { errorNum: 1 }
        );

        useConnection([
            {
                rows: [{ LAST_ID: 5 }],
            },
            duplicateError,
        ]);

        const response = await request(app)
            .post('/management/snacks')
            .send({
                SNACK_NAME: 'Nachos',
                SNACK_DESCRIPTION: 'Con queso',
                PRICE: 1500,
            });

        expect(response.status).toBe(409);

        expect(response.body).toEqual({
            message: 'Ya existe un snack con ese nombre.',
        });
    });
});