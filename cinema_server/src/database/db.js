import oracledb from 'oracledb';

export async function initDB() {
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      configDir: process.env.ORACLE_WALLET_DIR,
      walletLocation: process.env.ORACLE_WALLET_DIR,
      walletPassword: process.env.ORACLE_WALLET_PASSWORD
    });
    // TODO(any): Delete this message once the code is properly integrated and tested.
    console.log("Successfully connected to the database");
  } catch (error) {
    console.error("Failed to connect to the database: ", error);
    console.log("Check if there are any problems with the wallet in .env");
  } finally {
    // Used to close the connection for testing.
    // TODO(any); set in another function to close the DB when shutting down the server.
    if (connection) {
      await connection.close();
    }
  }
}
