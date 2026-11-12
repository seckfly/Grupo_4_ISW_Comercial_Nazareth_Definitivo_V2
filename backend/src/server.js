async function start() {
  let pool
  try {
    const { env } = await import('./config/runtime.js')
    const database = await import('./config/db.js')
    pool = database.pool
    const { app } = await import('./app.js')
    await database.verifyDatabaseConnection()
    app.listen(env.port, () => console.log('API Nazareth en el puerto ' + env.port + ' · PostgreSQL conectado'))
  } catch (error) {
    console.error('No se pudo iniciar la API:', error.code || error.message)
    await pool?.end()
    process.exitCode = 1
  }
}

start()
