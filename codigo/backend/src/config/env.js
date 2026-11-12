function required(source, key) {
  const value = source[key]?.trim()
  if (!value) throw new Error('Falta la variable de entorno ' + key)
  return value
}

function checkedUrl(value, key, protocols) {
  let url
  try { url = new URL(value) } catch { throw new Error(key + ' no es una URL válida') }
  if (!protocols.includes(url.protocol)) throw new Error(key + ' tiene un protocolo no admitido')
  return url
}

export function loadEnvironment(source = process.env) {
  const databaseUrl = checkedUrl(required(source, 'DATABASE_URL'), 'DATABASE_URL', ['postgres:', 'postgresql:'])
  if ([...databaseUrl.searchParams.keys()].some((key) => key.startsWith('ssl'))) {
    throw new Error('Configura TLS fuera de DATABASE_URL mediante DATABASE_SSL_CA_FILE')
  }
  const supabaseUrl = checkedUrl(required(source, 'SUPABASE_URL'), 'SUPABASE_URL', ['https:', 'http:'])
  const localAuth = ['localhost', '127.0.0.1', '[::1]'].includes(supabaseUrl.hostname)
  if (supabaseUrl.protocol === 'http:' && !localAuth) throw new Error('SUPABASE_URL requiere HTTPS')
  const publishableKey = required(source, 'SUPABASE_PUBLISHABLE_KEY')
  const secretKey = source.SUPABASE_SECRET_KEY?.trim()
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY debe ser una clave publicable de Supabase')
  }
  if (secretKey && !secretKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY debe ser una clave privada de Supabase')
  }
  return {
    nodeEnv: source.NODE_ENV || 'development',
    port: Number(source.PORT || 4000),
    clientOrigin: source.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
    databaseUrl: databaseUrl.href,
    databaseSslCaFile: source.DATABASE_SSL_CA_FILE?.trim(),
    supabaseUrl: supabaseUrl.origin,
    publishableKey,
    secretKey,
  }
}
