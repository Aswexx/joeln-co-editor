// 测试试算表
const url =
  'https://script.google.com/macros/s/AKfycbzbXgj2EJLp4c75KOoQ1FD3LQI1xmPpzWX50Jz8_7SRXMGPV4wCaEuyShzlVREwGaRp/exec'

// 正式试算表
// const url =
//   'https://script.google.com/macros/s/AKfycbyMsjfNVEQ_U26fDR8DKeRafhzXlAlLnOzxGXDqLS170Kw9TkoM5PYcw71kHQ_xByVSYw/exec'

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

const groups = {
  Andy: '早',
  Alston: '早',
  Daniel: '早',
  Leo: '早',
  Ryan: '中',
  Roy: '中',
  Abby: '中',
  Tom: '中',
  Tim: '夜',
  Vincent: '夜',
  Owen: '夜',
  Kimi: '夜'
}

function getGroup(currentHours: number) {
  switch (true) {
    case currentHours >= 0 && currentHours <= 6:
      return '夜'
    case currentHours >= 7 && currentHours <= 15:
      return '早'
    case currentHours >= 16 && currentHours <= 23:
      return '中'
  }
}

// google sheet 拉回来的时间都是 Z (Zulu - UTC+0)，故这边也用 UTC 时间来比对

export async function useGenProdTemp(): Promise<void> {
  const orders = await $fetch<SheetOrder[]>(`${url}?path=all-orders`)
  const current = new Date()
  // 考虑夜班情况，执行时若当下时间为 GMT+8 的 7 点前，currentDate 要减 1
  const utcHours = current.getUTCHours()
  const gmt8Hours = (utcHours + 8) % 24
  const currentGroup = getGroup(gmt8Hours)
  const currentYear = current.getUTCFullYear()
  const currentMonth = current.getUTCMonth() + 1
  const currentDate = currentGroup === '夜'
    ? current.getUTCDate() - 1
    : current.getUTCDate()

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

  console.log(currentOrders)

  await navigator.clipboard.writeText('aaa!!')
}
