import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';

import locationRoutes from '../routes/location_routes.js';
import { buildLocationFilters } from '../controllers/location_controller.js';

const BASE_PATH = '/locations';


const MOCK_LOCATIONS = [
    { ID_LOCATION: 1, LOCATION_NAME: 'CINE CENTRO', OPENING_HOUR: '07:00', CLOSING_HOUR: '21:00', CANTON_NAME: 'San José' },
    { ID_LOCATION: 2, LOCATION_NAME: 'CINE NORTE', OPENING_HOUR: '08:30', CLOSING_HOUR: '22:00', CANTON_NAME: 'Heredia' },
];

const MOCK_DETAIL = {
    LOCATION_NAME: 'CINE CENTRO',
    OPENING_HOUR: '07:00',
    CLOSING_HOUR: '21:00',
    CANTON_NAME: 'San José',
};

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
app.use(BASE_PATH, locationRoutes);
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('buildLocationFilters', () => {
    test('sin filtros solo excluye las sucursales eliminadas', () => {
        expect(buildLocationFilters()).toEqual({
            whereClause: 'WHERE l.IS_DELETED = 0',
            binds: {},
        });
    });

    test('con nombre agrega el LIKE y el bind con comodines', () => {
        const { whereClause, binds } = buildLocationFilters({ name: '  cine ' });

        expect(whereClause).toMatch(/LOWER\(l\.LOCATION_NAME\) LIKE LOWER\(:name\)/);
        expect(binds).toEqual({ name: '%cine%' });
    });

    test.each([
        ['vacío', ''],
        ['solo espacios', '   '],
        ['un arreglo', ['a', 'b']],
        ['undefined', undefined],
    ])('ignora un nombre %s', (_label, name) => {
        expect(buildLocationFilters({ name })).toEqual({
            whereClause: 'WHERE l.IS_DELETED = 0',
            binds: {},
        });
    });
});


describe(`GET ${BASE_PATH}/`, () => {
    test('200 OK returns the list', async () => {
        const rows = MOCK_LOCATIONS.map(({ ID_LOCATION, LOCATION_NAME }) => ({ ID_LOCATION, LOCATION_NAME }));
        const connection = useConnection([{ rows }]);

        const response = await request(app)
            .get(`${BASE_PATH}/`)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body.data).toEqual(rows);

        const [sql] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/IS_DELETED = 0/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the query fails, and the connection is closed', async () => {
        const connection = useConnection([new Error('ORA-00942: table or view does not exist')]);

        const response = await request(app).get(`${BASE_PATH}/`).expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});


describe(`GET ${BASE_PATH}/l/`, () => {
    test('200 OK with the default page and no filter', async () => {
        const connection = useConnection([{ rows: MOCK_LOCATIONS }]);

        const response = await request(app)
            .get(`${BASE_PATH}/l/`)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body.data).toEqual(MOCK_LOCATIONS);

        const [sql, binds, options] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/JOIN PI_DEVELOPERS\.CANTONS/);
        expect(sql).toMatch(/IS_DELETED = 0/);
        expect(sql).not.toMatch(/;\s*$/);
        expect(binds).toEqual({ offset: 0, limit: 10 });
        expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('200 OK applies the page and the name filter', async () => {
        const connection = useConnection([{ rows: [MOCK_LOCATIONS[0]] }]);

        await request(app).get(`${BASE_PATH}/l/?page=3&name=cine`).expect(200);

        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/LOWER\(l\.LOCATION_NAME\) LIKE LOWER\(:name\)/);
        expect(binds).toEqual({ name: '%cine%', offset: 20, limit: 10 });
    });

    test.each([
        ['page=abc'],
        ['page=0'],
        ['page=-5'],
    ])('falls back to the first page when the query is %s', async (query) => {
        const connection = useConnection([{ rows: [] }]);

        await request(app).get(`${BASE_PATH}/l/?${query}`).expect(200);

        expect(connection.execute.mock.calls[0][1]).toEqual({ offset: 0, limit: 10 });
    });

    test('200 OK with an empty list', async () => {
        useConnection([{ rows: [] }]);

        const response = await request(app).get(`${BASE_PATH}/l/`).expect(200);

        expect(response.body.data).toEqual([]);
    });

    test('500 when the query fails, and the connection is closed', async () => {
        const connection = useConnection([new Error('ORA-00942: table or view does not exist')]);

        const response = await request(app).get(`${BASE_PATH}/l/`).expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});


describe(`GET ${BASE_PATH}/count`, () => {
    test('200 OK returns the total', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 25 }] }]);

        const response = await request(app)
            .get(`${BASE_PATH}/count`)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ total: 25 });

        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/COUNT\(l\.ID_LOCATION\)/);
        expect(sql).toMatch(/IS_DELETED = 0/);
        expect(binds).toEqual({});
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('applies the same name filter as the list', async () => {
        const connection = useConnection([{ rows: [{ TOTAL: 3 }] }]);

        const response = await request(app).get(`${BASE_PATH}/count?name=cine`).expect(200);

        expect(response.body).toEqual({ total: 3 });
        expect(connection.execute.mock.calls[0][1]).toEqual({ name: '%cine%' });
    });

    test('returns 0 when there are no locations', async () => {
        useConnection([{ rows: [{ TOTAL: 0 }] }]);

        const response = await request(app).get(`${BASE_PATH}/count`).expect(200);

        expect(response.body).toEqual({ total: 0 });
    });

    test('500 when the query fails, and the connection is closed', async () => {
        const connection = useConnection([new Error('ORA-00942: table or view does not exist')]);

        const response = await request(app).get(`${BASE_PATH}/count`).expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});


describe(`GET ${BASE_PATH}/:id`, () => {
    test('200 OK returns the location as an object, not an array', async () => {
        const connection = useConnection([{ rows: [MOCK_DETAIL] }]);

        const response = await request(app)
            .get(`${BASE_PATH}/5`)
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body.data).toEqual(MOCK_DETAIL);
        expect(Array.isArray(response.body.data)).toBe(false);

        const [sql, binds] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/IS_DELETED = 0/);
        expect(binds).toEqual({ id: 5 });
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('404 when the location does not exist', async () => {
        const connection = useConnection([{ rows: [] }]);

        const response = await request(app).get(`${BASE_PATH}/999`).expect(404);

        expect(response.body).toHaveProperty('message');
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the query fails, and the connection is closed', async () => {
        const connection = useConnection([new Error('ORA-00942: table or view does not exist')]);

        const response = await request(app).get(`${BASE_PATH}/5`).expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});

describe(`POST ${BASE_PATH}/`, () => {
    const NEW_LOCATION = {
        LOCATION_NAME: 'CINE SUR',
        OPENING_HOUR: '08:30',
        CLOSING_HOUR: '22:00',
        CANTON_NAME: 'Cartago',
    };

    const post = (body = NEW_LOCATION) => request(app).post(`${BASE_PATH}/`).send(body);

    test('201 OK looks up the canton and inserts the location', async () => {
        const connection = useConnection([
            { rows: [{ ID_CANTON: 3 }] },
            { rowsAffected: 1 },
        ]);

        const response = await post()
            .expect('Content-type', /json/)
            .expect(201);

        expect(response.body).toEqual({ message: 'success' });
        expect(connection.execute).toHaveBeenCalledTimes(2);

        const [cantonSql, cantonBinds] = connection.execute.mock.calls[0];
        expect(cantonSql).toMatch(/PI_DEVELOPERS\.CANTONS/);
        expect(cantonBinds).toEqual({ name: 'Cartago' });

        const [sql, binds, options] = connection.execute.mock.calls[1];
        expect(sql).toMatch(/INSERT INTO PI_DEVELOPERS\.LOCATIONS/);
        expect(sql).toMatch(/TO_DSINTERVAL/);
        expect(sql).not.toMatch(/;\s*$/);
        expect(binds).toEqual({
            name: 'CINE SUR',
            opening: '08:30',
            closing: '22:00',
            idCanton: 3,
        });
        expect(options).toEqual({ autoCommit: true });

        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('trims the name before inserting', async () => {
        const connection = useConnection([
            { rows: [{ ID_CANTON: 3 }] },
            { rowsAffected: 1 },
        ]);

        await post({ ...NEW_LOCATION, LOCATION_NAME: '  CINE SUR  ' }).expect(201);

        expect(connection.execute.mock.calls[1][1].name).toBe('CINE SUR');
    });

    test.each([
        ['without name', { LOCATION_NAME: undefined }],
        ['with an empty name', { LOCATION_NAME: '' }],
        ['without canton', { CANTON_NAME: undefined }],
    ])('400 when the body comes %s, without opening a connection', async (_label, override) => {
        const getConnection = jest
            .spyOn(oracledb, 'getConnection')
            .mockResolvedValue(createMockConnection());

        const response = await post({ ...NEW_LOCATION, ...override }).expect(400);

        expect(response.body).toHaveProperty('message');
        expect(getConnection).not.toHaveBeenCalled();
    });

    test.each([
        ['8:30'],
        ['25:00'],
        ['08:60'],
        ['abc'],
        [''],
        [7],
    ])('400 when the opening hour is %p, without opening a connection', async (hour) => {
        const getConnection = jest
            .spyOn(oracledb, 'getConnection')
            .mockResolvedValue(createMockConnection());

        await post({ ...NEW_LOCATION, OPENING_HOUR: hour }).expect(400);

        expect(getConnection).not.toHaveBeenCalled();
    });

    test('400 when the closing hour is missing, without opening a connection', async () => {
        const getConnection = jest
            .spyOn(oracledb, 'getConnection')
            .mockResolvedValue(createMockConnection());

        await post({ ...NEW_LOCATION, CLOSING_HOUR: undefined }).expect(400);

        expect(getConnection).not.toHaveBeenCalled();
    });

    test('500 when the canton lookup fails, and the connection is closed', async () => {
        const connection = useConnection([
            new Error('ORA-00942: table or view does not exist'),
        ]);

        const response = await post().expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.execute).toHaveBeenCalledTimes(1);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the insert fails, and the connection is closed', async () => {
        const connection = useConnection([
            { rows: [{ ID_CANTON: 3 }] },
            new Error('ORA-01031: insufficient privileges'),
        ]);

        const response = await post().expect(500);

        expect(response.body.message).toMatch(/ORA-01031/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the connection cannot be opened, and nothing is closed', async () => {
        jest.spyOn(oracledb, 'getConnection').mockRejectedValue(
            new Error('NJS-503: connection refused'),
        );

        const response = await post().expect(500);

        expect(response.body.message).toMatch(/NJS-503/);
    });
});
