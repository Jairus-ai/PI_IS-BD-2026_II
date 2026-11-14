import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import cantonRoutes from '../routes/canton_routes.js';
import provinceRoutes from '../routes/province_routes.js';
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

const PROVINCES = [
    { ID_PROVINCE: 1, PROVINCE_NAME: 'Alajuela' },
    { ID_PROVINCE: 2, PROVINCE_NAME: 'San José' },
];

const CANTONS = [
    { ID_CANTON: 9, CANTON_NAME: 'Paraíso' },
    { ID_CANTON: 10, CANTON_NAME: 'Turrialba' },
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
app.use('/management/cantons', cantonRoutes);
app.use('/management/provinces', provinceRoutes);
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
            "CLOSING_HOUR": "22:00",
            "ID_CANTON": 3,
            "LOCATION_NAME": "CINE SUR",
            "OPENING_HOUR": "08:30",
        });
        expect(options).toEqual({ autoCommit: true });

        expect(connection.close).toHaveBeenCalledTimes(1);
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

describe('GET /management/provinces', () => {
    test('200 OK returns the provinces', async () => {
        const connection = useConnection([{ rows: PROVINCES }]);

        const response = await request(app)
            .get('/management/provinces')
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ data: PROVINCES });

        const [sql, binds, options] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/FROM PI_DEVELOPERS\.PROVINCES/);
        expect(sql).toMatch(/ORDER BY PROVINCE_NAME/);
        expect(sql).not.toMatch(/;\s*$/);
        expect(binds).toEqual({});
        expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });

        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('200 OK with an empty list', async () => {
        useConnection([{ rows: [] }]);

        const response = await request(app).get('/management/provinces').expect(200);

        expect(response.body).toEqual({ data: [] });
    });

    test('the response does not depend on query params', async () => {
        const connection = useConnection([{ rows: PROVINCES }]);

        await request(app).get('/management/provinces?name=algo').expect(200);

        expect(connection.execute.mock.calls[0][1]).toEqual({});
    });

    test('500 when the query fails, and the connection is closed', async () => {
        const connection = useConnection([
            new Error('ORA-00942: table or view does not exist'),
        ]);

        const response = await request(app).get('/management/provinces').expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the connection cannot be opened, and nothing is closed', async () => {
        const getConnection = jest
            .spyOn(oracledb, 'getConnection')
            .mockRejectedValue(new Error('NJS-503: connection refused'));

        const response = await request(app).get('/management/provinces').expect(500);

        expect(response.body.message).toMatch(/NJS-503/);
        expect(getConnection).toHaveBeenCalledTimes(1);
    });
});

describe('GET /management/cantons', () => {
    test('200 OK returns the cantons of the province', async () => {
        const connection = useConnection([{ rows: CANTONS }]);

        const response = await request(app)
            .get('/management/cantons?provinceId=3')
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ data: CANTONS });

        const [sql, binds, options] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/FROM PI_DEVELOPERS\.CANTONS/);
        expect(sql).toMatch(/JOIN PI_DEVELOPERS\.PROVINCES/);
        expect(sql).toMatch(/WHERE p\.ID_PROVINCE = :p/);
        expect(sql).toMatch(/ORDER BY CANTON_NAME/);
        expect(sql).not.toMatch(/;\s*$/);
        expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });

        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('200 OK with an empty list when the province has no cantons', async () => {
        useConnection([{ rows: [] }]);

        const response = await request(app).get('/management/cantons?provinceId=99').expect(200);

        expect(response.body).toEqual({ data: [] });
    });

    test('500 when the query fails, and the connection is closed', async () => {
        const connection = useConnection([
            new Error('ORA-00942: table or view does not exist'),
        ]);

        const response = await request(app).get('/management/cantons?provinceId=3').expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the connection cannot be opened, and nothing is closed', async () => {
        jest.spyOn(oracledb, 'getConnection').mockRejectedValue(
            new Error('NJS-503: connection refused'),
        );

        const response = await request(app).get('/management/cantons?provinceId=3').expect(500);

        expect(response.body.message).toMatch(/NJS-503/);
    });

    test.each([
        ['falta el parámetro', '/management/cantons'],
        ['no es un número', '/management/cantons?provinceId=abc'],
        ['está vacío', '/management/cantons?provinceId='],
        ['es un decimal', '/management/cantons?provinceId=1.5'],
        ['viene repetido', '/management/cantons?provinceId=1&provinceId=2'],
    ])('400 when provinceId %s, without opening a connection', async (_label, url) => {
        const getConnection = jest
            .spyOn(oracledb, 'getConnection')
            .mockResolvedValue(createMockConnection());

        const response = await request(app).get(url).expect(400);

        expect(response.body).toHaveProperty('message');
        expect(getConnection).not.toHaveBeenCalled();
    });

    test('converts provinceId to a number before running the query', async () => {
        const connection = useConnection([{ rows: CANTONS }]);

        await request(app).get('/management/cantons?provinceId=3').expect(200);

        expect(connection.execute.mock.calls[0][1]).toEqual({ p: 3 });
    });
});