import oracledb from 'oracledb';

export async function initializeDatabasePool() {
  try {
    await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      configDir: process.env.ORACLE_WALLET_DIR,
      walletLocation: process.env.ORACLE_WALLET_DIR,
      walletPassword: process.env.ORACLE_WALLET_PASSWORD,
      poolAlias: 'connections',
      poolMin: 1,
      poolMax: 5
    });
    console.log("Database connection pool initialized");
  } catch (error) {
    console.error("Failed to initialize the database pool: ", error);
    console.log("Check if there are any problems with the directory of the wallet in .env");
    throw error;
  }
}

export async function getConnection () {
  return await oracledb.getConnection('connections')
}

export async function closeDatabaseConnection(connection) {
  if (connection) {
    try {
      await connection.close();
    } catch (error) {
      console.error("Failed to release connection back to the pool: ", error);
    }
  }
}

export async function closeDatabasePool() {
  try {
    await oracledb.getPool('connections').close(5);
    console.log("Database connection pool closed");
  } catch (error) {
    console.error("Failed to close database pool: ", error);
  }
}
