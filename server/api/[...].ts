import { H3Event } from 'h3'
import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL as string
const renderRedis = new Redis(REDIS_URL)

const router = createRouter()

router.get('/socket.io', defineEventHandler((event: H3Event) => initSocket(event)))

router.post(
  '/set-redis-value',
  defineEventHandler(async (event) => {
    const body = await readBody(event)
    await renderRedis.set('newestOrders', JSON.stringify(body))
  })
)

router.get(
  '/newest-orders',
  defineEventHandler(async (event) => {
    const result = await renderRedis.get('newestOrders')
    return JSON.parse(result as string)
  })
)

export default useBase('/api', router.handler)