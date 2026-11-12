import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { loadEnvironment } from './env.js'

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

export const env = loadEnvironment()
