// https://github.com/tiagosiebler/bybit-api
import { RestClientV5 } from 'bybit-api'

export const bybitClient = new RestClientV5({
  key: process.env.BYBIT_API_KEY!,
  secret: process.env.BYBIT_API_SECRET!,
})

export function hasBybitCredentials(): boolean {
  return Boolean(process.env.BYBIT_API_KEY?.trim() && process.env.BYBIT_API_SECRET?.trim())
}