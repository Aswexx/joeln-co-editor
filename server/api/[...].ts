import { H3Event } from 'h3'
import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL as string
const renderRedis = new Redis(REDIS_URL)

const router = createRouter()

router.get('/socket.io', defineEventHandler((event: H3Event) => initSocket(event)))
router.get(
  '/redis-test',
  defineEventHandler(async (event) => {
    console.log('rrrr', process.env.REDIS_URL)
    
    // Internal Redis URL example:
    // "redis://red-xxxxxxxxxxxxxxxxxxxx:6379"
    // External Redis URL will be slightly different:
    // "rediss://red-xxxxxxxxxxxxxxxxxxxx:PASSWORD@HOST:6379"
    
    await renderRedis.set('test1', 'value1')
  })
)

router.get(
  '/redis-test-get',
  defineEventHandler(async (event) => {
    console.log('rrrr', process.env.REDIS_URL)

    const result = await renderRedis.get('test1')
    console.log(result)

    return result
  })
)


export default useBase('/api', router.handler)