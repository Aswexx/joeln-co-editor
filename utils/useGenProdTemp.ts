// 测试关单区
// const url =
//   'https://script.google.com/macros/s/AKfycbzbXgj2EJLp4c75KOoQ1FD3LQI1xmPpzWX50Jz8_7SRXMGPV4wCaEuyShzlVREwGaRp/exec'

// 正式关单区
const url =
  'https://script.google.com/macros/s/AKfycbyMsjfNVEQ_U26fDR8DKeRafhzXlAlLnOzxGXDqLS170Kw9TkoM5PYcw71kHQ_xByVSYw/exec'

// 測試班表
// const groupSheetUrl =
//   'https://script.google.com/macros/s/AKfycbzZDXGlAHgWcsrURIgGH8olcvoKVsJRD8rTAuS2OqncIUy1swWPw3H4I04AF6FBjqckPg/exec'

// 正式班表
const groupSheetUrl =
  'https://script.google.com/macros/s/AKfycbyffUaUddMP6St4CbnBFleBvY5cXkRWvO6iiijIrbyftVaITsyA5HXsU8wEB7_F7Lky/exec'

// 測試值班手冊
// const dailySheetUrl =
//   'https://script.google.com/macros/s/AKfycbzmC1qjyhY41EzI6zra9Dsbb29Aun8uK9DLDqTABMTQ2CK0uLQslCtRpTAdvqYxL6kp7g/exec'

// 正式值班手冊
const dailySheetUrl =
  'https://script.google.com/macros/s/AKfycbyLymyMLgn6FJilIPN3ipte0WhBS7yFGw4glsvsL5WjGwvLfdFPtriDrjrkZ1DjDIJzxw/exec'

type SheetOrder = {
  '类型': string,
  '日期': string,
  '单号': string,
  '标题': string,
  '处理人员':
  'Andy' | 'Alston' | 'Daniel' | 'Leo' |
  'Ryan' | 'Roy' | 'Abby' | 'Tom' |
  'Tim' | 'Vincent' | 'Owen' | 'Kimi'
}

type DailyAffair = {
  '日期': string,
  '班别': string
}

type Group = '早' | '中' | '晚'
type Groups = {
  [key: string]: Group
}

const groups: Groups = {
  Andy: '早',
  Alston: '早',
  Daniel: '早',
  Leo: '早',
  Ryan: '中',
  Roy: '中',
  Abby: '中',
  Tom: '中',
  Tim: '晚',
  Vincent: '晚',
  Owen: '晚',
  Kimi: '晚'
}

function getGroup(currentHours: number) {
  switch (true) {
    case currentHours >= 0 && currentHours <= 7:
      return '晚'
    case currentHours >= 8 && currentHours <= 15:
      return '早'
    case currentHours >= 16 && currentHours <= 23:
      return '中'
  }
}

function convertToTemp(currentInfo: {
  currentMonth: Number
  currentDate: Number
  currentGroup: '早' | '中' | '晚' | undefined
  currentOrders: SheetOrder[]
  currentNames: string[]
  nextNames: string[]
  dailyCount: Number
}) {
  const {
    currentMonth,
    currentDate,
    currentGroup,
    currentOrders,
    currentNames,
    nextNames,
    dailyCount
  } = currentInfo
  let ordersStr = ''
  currentOrders.forEach((o) => {
    ordersStr += `${o['单号']} ${o['标题']}` + '\n'
  })
  const baseStr = `${currentMonth}/${currentDate} ${currentGroup}班交接
  
交班人：${currentNames.join(' ')}
接班人：${nextNames.join(' ')}

一.日常交接    
1.值班手册(每日交接)新增 ${dailyCount} 条
-------------------------------------------
二.下一班跟进追踪    

-------------------------------------------    
三.Jira开单(需求单也要)    
共开单 ${currentOrders.length} 张，未处理 0 张
-------------------------------------------    
已处理
${ordersStr}
`

  return baseStr
}

async function getWorkerNames(
  currentDate: number,
  currentGroup: Group,
  currentYear: number,
  currentMonth: number
) {

  const { today, nextDay } = await $fetch<{
    today: string[]
    nextDay: string[]
  }>(groupSheetUrl, {
    params: { targetDay: currentDate, year: currentYear, month: currentMonth }
  })

  const currentNames = today.filter((t) => groups[t] === currentGroup)
  const getNextGroup = (currentGroup: Group) => {
    if (currentGroup === '早') return '中'
    if (currentGroup === '中') return '晚'
    if (currentGroup === '晚') return '早'
    return ''
  }
  const nextGroup = getNextGroup(currentGroup)
  let nextNames

  if (currentGroup === '晚') {
    nextNames = nextDay.filter((t) => groups[t] === nextGroup)
  } else {
    nextNames = today.filter((t) => groups[t] === nextGroup)
  }

  return {
    currentNames,
    nextNames
  }
}

async function getDailyCount(
  currentMonth: number,
  currentDate: number,
  currentGroup: Group
) {
  const data = await $fetch<DailyAffair[]>(dailySheetUrl)
  const resultCount = data.filter((d) => {
    const [datePart] = d['日期'].split('T')
    const [year, month, day] = datePart.split('-')
    return (
      Number(month) === currentMonth &&
      Number(day) === currentDate &&
      d['班别'].includes(currentGroup)
    )
  }).length

  return resultCount
}
// google sheet 拉回来的时间都是 Z (Zulu - UTC+0)，故这边也用 UTC 时间来比对

export async function useGenProdTemp(): Promise<{ tempStr: string }> {
  const current = new Date()
  // 考虑晚班情况，执行时若当下时间为 GMT+8 的 7 点前，currentDate 要减 1
  const utcHours = current.getUTCHours()
  const gmt8Hours = (utcHours + 8) % 24
  const currentGroup = getGroup(gmt8Hours) as Group
  const currentYear = current.getUTCFullYear()
  const currentMonth = current.getUTCMonth() + 1
  // 晚班的可能执行时间刚好UTC日期会比UTC+8 少一天，故不额外处理
  const currentDate = current.getUTCDate()
  
  const [orders, workerNames, dailyCount] = await Promise.all([
    $fetch<SheetOrder[]>(`${url}?path=all-orders`),
    getWorkerNames(currentDate, currentGroup, currentYear, currentMonth),
    getDailyCount(currentMonth, currentDate, currentGroup)
  ])
  const { currentNames, nextNames } = workerNames

  const currentOrders = orders.filter(o => {
    const author = o['处理人员']
    const [datePart] = o['日期'].split('T')
    const [year, month, day] = datePart.split('-')

    return (
      Number(year) === currentYear &&
      Number(month) === currentMonth &&
      Number(day) === currentDate &&
      groups[author] === currentGroup
    )
  })

  const tempStr = convertToTemp({
    currentMonth,
    currentDate,
    currentGroup,
    currentOrders,
    currentNames,
    nextNames,
    dailyCount
  })

  return { tempStr }
}
