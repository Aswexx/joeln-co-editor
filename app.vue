<script setup lang="ts">
import { io, type Socket } from 'socket.io-client'
import { useGenProdTemp } from './utils/useGenProdTemp'
// import { debounce } from 'lodash'
import debounce from 'lodash'
// ws //////////////////////
const socket = ref<Socket>()
onMounted(async () => {
  const { data, error } = await useFetch<Order[] | null>('/api/newest-orders')
  if (data.value) {
    orders.value = data.value
  }
  socket.value = io({
    path: '/api/socket.io'
  })
  socket.value.on('recieveUpdate', (payload) => {
    if (typeof payload === 'string') {
      worker.value = payload
    } else {
      asyncOrders(payload)
    }
  })

  socket.value.on('currentUsers', (newUser) => {
    console.log(`new user ${newUser}`)
  })
})

const asyncProcess = ref(false)
function asyncOrders(payload: Order[]) {
  asyncProcess.value = true
  ordersToShow.value = payload
  orders.value = payload
  // 利用 key 更新強制重新渲染，確保接收端更新後可以更新到 OrderItem 的 ref
  sectionKey1.value += 1
  sectionKey2.value += 1
  sectionKey3.value += 1
  sectionKey4.value += 1
  setTimeout(() => {
    asyncProcess.value = false
  },1000)
}

const sectionKey1 = ref(0)
const sectionKey2 = ref(0)
const sectionKey3 = ref(0)
const sectionKey4 = ref(0)

onBeforeUnmount(() => {
  socket.value?.disconnect()
})

////////////
const orders = ref<Order[]>([{
  orderNo: 'CS-12345',
  title: 'xxxxxxxx',
  belongsTo: 'follows',
  done: false,
  marked: false
},{
  orderNo: 'CS-22233',
  title: 'yyyyyyyy',
  belongsTo: 'follows',
  done: false,
  marked: false
},{
  orderNo: 'CS-14488',
  title: 'brtrnrth',
  belongsTo: 'payments',
  done: false,
  marked: false
},{
  orderNo: 'CS-66666',
  title: 'hhhhkkkkjjjj',
  belongsTo: 'payments',
  done: false,
  marked: false
  }])

const ordersToShow = ref(orders.value)

async function updateTemplate(newData: Order[] | string) {
  socket.value?.emit('ordersUpdate', newData)
  if (typeof newData !== 'string') {
      await $fetch<string | null>('/api/set-redis-value', {
      method: 'POST',
      body: newData
    })
  }

  console.log('sent')
}

const debouncedUpdateData = debounce.debounce(updateTemplate, 3000)

watch(orders, async (newOrders: Order[], oldOrders) => {
  if (asyncProcess.value) return
  // 本地及時變更(ordersToShow更新)，
  // 但只抓最後更動3秒沒有新變動的才送出去
  ordersToShow.value = newOrders
  debouncedUpdateData(newOrders)
}, { deep: true })

const newOrder = ref('')
const newOrderSection = ref<'follows' | 'payments' | 'newNeeds' | 'bets'>('bets')
const modal = ref<HTMLDialogElement | null>(null)
const workerInputField = ref<HTMLInputElement | null> (null)

const editingWorker = ref(false)
const worker = ref('')

watch(worker, (newWorkers: string, oldWorkers) => {
  debouncedUpdateData(newWorkers)
})

const followOrders = computed(() => ordersToShow.value.filter(o => o.belongsTo === 'follows'))
const paymentOrders = computed(() => ordersToShow.value.filter(o => o.belongsTo === 'payments'))
const newNeedOrders = computed(() => ordersToShow.value.filter(o => o.belongsTo === 'newNeeds'))
const betOrders = computed(() => ordersToShow.value.filter(o => o.belongsTo === 'bets'))

function endEditing() {
  editingWorker.value = false
}

function handleUpdate(targetOrderNo: string, dropSection: string) {
  console.log('orderNo to handle', targetOrderNo, dropSection)
  let dropSectionName: 'follows' | 'payments' | 'newNeeds' | 'bets' = 'bets'
  switch (dropSection) {
    case '一.下一班跟进追踪':
      dropSectionName = 'follows'
      break;
    case '二.金流对接状态':
      dropSectionName = 'payments'
      break
    case '三.当班新建需求':
      dropSectionName = 'newNeeds'
      break
  }

  const targetOrder = orders.value.find(o => o.orderNo === targetOrderNo)
  targetOrder!.belongsTo = dropSectionName

  // 最后依单号小到大排序
  orders.value.sort((a, b) => a.orderNo.localeCompare(b.orderNo))
}

function handleEdit(newContent: { oldOrderNo: string, orderNo: string, title: string}) {
  const targetOrder = orders.value.find(o => o.orderNo === newContent.oldOrderNo)
  targetOrder!.orderNo = newContent.orderNo
  targetOrder!.title = newContent.title
}

function handleToggleDone(orderNo: string) {
  const targetOrder = orders.value.find(o => o.orderNo === orderNo)
  targetOrder!.done = !targetOrder!.done
}

function handleMark(orderNo: string) {
  const targetOrder = orders.value.find(o => o.orderNo === orderNo)
  targetOrder!.marked = !targetOrder!.marked
}

function handleNewOrderSection(newOrderTargetSection: string) {
  let dropSectionName: 'follows' | 'payments' | 'newNeeds' | 'bets' = 'bets'
  switch (newOrderTargetSection) {
    case '一.下一班跟进追踪':
      dropSectionName = 'follows'
      break;
    case '二.金流对接状态':
      dropSectionName = 'payments'
      break
    case '三.当班新建需求':
      dropSectionName = 'newNeeds'
      break
  }
  newOrderSection.value = dropSectionName
}

function addNewOrder() {
  newOrder.value = newOrder.value.replace(/\(http:\/\/jira.*?\)/g, '').trim()

  const regex = /^(CS-\d{5}|GMS-\d{4})\s*(.*)$/
  const match = newOrder.value.match(regex)

  if (!match) {
    alert('格式不符')
    return
  }

  const csPart = match[1]
  const restPart = match[2]

  // 避免添加相同单号
  if (orders.value.find(o => o.orderNo === csPart)) {
    newOrder.value = ''
    return alert('单号重复')
  }

  orders.value.push({
    orderNo: csPart,
    title: restPart,
    belongsTo: newOrderSection.value,
    done: false,
    marked: true
  })

  newOrder.value = ''
  modal.value?.close()
}

async function handleClipboardContent() {
  const sourceText = await navigator.clipboard.readText()
  if (!(sourceText.includes('下一班跟进追踪')
    && sourceText.includes('金流对接状态')
    && sourceText.includes('CS-')
    && sourceText.includes('【B')
    && sourceText.includes('http'))) {
      return alert('复制来源不正确')
  }
  const parsedOrders = parseOrders(sourceText)
  orders.value = parsedOrders
}

function parseOrders(input: string): Order[] {
  const sections = [
    { key: '一.下一班跟进追踪', belongsTo: 'follows' },
    { key: '二.金流对接状态', belongsTo: 'payments' },
    { key: '三.当班新建需求', belongsTo: 'newNeeds' },
    { key: '四.三方投注查询', belongsTo: 'bets' },
  ];

  const orders: Order[] = [];
  let currentSection: string | null = null;

  input.split('\n').forEach(line => {
    const section = sections.find(s => line.startsWith(s.key));
    if (section) {
      currentSection = section.belongsTo;
      return;
    }

    if (currentSection && (line.startsWith('CS-') || line.startsWith('GMS-'))) {
      const [orderNo, ...titleParts] = line.split(' ');
      let title = titleParts.join(' ').trim();

      // Remove the part between "(" and ")"
      const startIndex = title.indexOf('(');
      const endIndex = title.indexOf(')');
      if (startIndex !== -1 && endIndex !== -1) {
        title = title.slice(0, startIndex).trim() + title.slice(endIndex + 1).trim();
      }

      // 确保 title 是 "【" 开头
      if (!title.startsWith('【')) {
        title = titleParts.join(' ').trim(); // 恢复原来的 title
      }

      orders.push({
        orderNo,
        title,
        belongsTo: currentSection as 'follows' | 'payments' | 'newNeeds' | 'bets',
        done: false,
        marked: false,
      });
    }
  });

  return orders;
}

async function genTemplate() {
  if (!worker.value) {
    return alert('请填入交接人')
  }
  type BelongsTo = 'follows' | 'payments' | 'newNeeds' | 'bets';
  const unDoneOrders = orders.value.filter(o => o.done === false)

  const blocks: Record<BelongsTo, string> = {
    follows: '一.下一班跟进追踪',
    payments: '二.金流对接状态',
    newNeeds: '三.当班新建需求',
    bets: '四.三方投注查询'
  }

  const groupedData: Record<BelongsTo, string[]> = {
    follows: [],
    payments: [],
    newNeeds: [],
    bets: []
  }

  unDoneOrders.forEach(item => {
    groupedData[item.belongsTo].push(`[${item.orderNo}](http://jira.nefer.com.tw:8080/browse/${item.orderNo})${item.title}`);
  })

  let result = `交接人： ${worker.value}\n--------------------------------------------\n`
  const blockKeys = Object.keys(blocks) as BelongsTo[]

  blockKeys.forEach((key, index) => {
    const belongsTo = key
    result += `${blocks[belongsTo]}\n`
    if (groupedData[belongsTo].length > 0) {
      result += `${groupedData[belongsTo].join('\n')}\n`
    }
    if (index < blockKeys.length - 1) {
      result += '--------------------------------------------\n'
    }
  })
  await navigator.clipboard.writeText(result)
  sendToMarkdownBot()
}

function openMarkedOrders() {
  const jiraUrl = 'http://jira.nefer.com.tw:8080/browse/'
  const markedOrders = orders.value.filter(o => o.marked)
  markedOrders.forEach(mo => {
    window.open(`${jiraUrl}${mo.orderNo}`,'_blank')
  })
}

function sendToMarkdownBot() {
  const username = 'markdownbot'
  const url = `tg://resolve?domain=${username}`
  window.open(url, '_blank')
}

function startEditingWorker() {
  editingWorker.value = true

  nextTick(() => {
    workerInputField.value?.focus()
  })
}

const loadingData = ref(false)
const prodTemplateStr = ref('')
async function genProdTemp() {
  loadingData.value = true
  const { tempStr } = await useGenProdTemp()
  prodTemplateStr.value = tempStr
  loadingData.value = false
}

const copied = ref(false)
async function copyText(content: string) {
  try {
    await navigator.clipboard.writeText(content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    },3000)
  } catch (error) {
    console.error(error)
  }
}


</script>

<template>
  <div class="h-[100vh] p-4">
    <Html>
      <Head>
        <Title>Co-Editor</Title>
      </Head>
    </Html>
    <div class="w-full max-w-[900px] mb-4 mx-auto flex items-center justify-between">
      <div class="space-x-2">
        <button 
          class="btn btn-success"
          @click="handleClipboardContent"
        >复制上一班貼上</button>
  
        <button 
          class="btn btn-success"
          @click="genTemplate"
        >复制模版并开启MarkdownBot</button>

        <button 
          class="btn btn-success"
          @click="openMarkedOrders"
        >开启标注单</button>
        <!-- TODO: 待完成功能 -->
        <button 
          class="btn btn-success"
          @click="genProdTemp"
          onclick="my_modal_3.showModal()"
        >生成生产群发送内容</button>
      </div>
      <div class="flex relative group">
        <Icon 
          class="text-red-400 cursor-pointer text-3xl"
          name="ic:baseline-help-outline"
        />
        <div class="absolute bottom-0 right-0 transform translate-y-full 
          hidden group-hover:block z-10 w-96 max-h-96 overflow-y-auto 
          bg-white border border-gray-300 p-4 rounded-lg shadow-lg"
          >
          1. 在TG复制上一班内容点后，击 "复制上一班贴上" 键即可带入。
          <br>
          <br>
          2. "复制模版并开启MarkdownBot"键会排除已结单内容，
          连结 MarkdownBot 后可直接在对话框 Ctrl+V 贴上，
          让 Bot 生成最终要发的内容。
          <br>
          <br>
          3. "开启标注单" 可批量开启标注的 JIRA 单 (需要先登入过JIRA)。
          <br>
          <br>
          4. "生成生产群发送内容" 会抓取值班手册、关单区、班表资料，执行前先确保当班关单区已经填完。
          <br>
          <br>
          5. 各区块右上的 "+" 键可新增 JIRA 单。
          <br>
          <br>
          6. 双击JIRA单可编辑。
          <br>
          <br>
          7. JIRA单可以在不同区块间拖弋。
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto
        h-[85dvh] overflow-x-hidden overflow-y-auto"
      >
      <div v-if="!editingWorker" class="flex items-center space-x-2">
        <h1 class="text-red-300">交接人：{{ worker }}</h1>
        <Icon 
          class="text-red-400 cursor-pointer"
          name="material-symbols:edit-square-outline-sharp"
          @click="startEditingWorker"
        />
      </div>
      <div v-else>
        <span>交接人：</span>
        <div class="form-control">
          <input
            class="input input-alt"
            ref="workerInputField" 
            v-model.lazy="worker" 
            @blur="endEditing" 
            @keyup.enter="endEditing"
          >
          <span class="input-border input-border-alt"></span>
        </div>
      </div>
      <Section :key="sectionKey1" :section-title="'一.下一班跟进追踪'" @update="handleUpdate" @add-new-order="handleNewOrderSection">
        <OrderItem
          v-for="follow in followOrders" :key="follow.orderNo"
          @edit="handleEdit"
          @toggle-done="handleToggleDone"
          @mark="handleMark"
          :order="follow"
        />
      </Section>

      <Section :key="sectionKey2" :section-title="'二.金流对接状态'" @update="handleUpdate" @add-new-order="handleNewOrderSection">
        <OrderItem 
          v-for="payment in paymentOrders" :key="payment.orderNo"
          @edit="handleEdit" 
          @toggle-done="handleToggleDone"
          @mark="handleMark"
          :order="payment"
        />
      </Section>

      <Section :key="sectionKey3" :section-title="'三.当班新建需求'" @update="handleUpdate" @add-new-order="handleNewOrderSection">
        <OrderItem 
          v-for="newNeed in newNeedOrders" :key="newNeed.orderNo"
          @edit="handleEdit" 
          @toggle-done="handleToggleDone" 
          @mark="handleMark" 
          :order="newNeed"
        />
      </Section>

      <Section :key="sectionKey4" :section-title="'四.三方投注查询'" @update="handleUpdate" @add-new-order="handleNewOrderSection">
        <OrderItem 
          v-for="bet in betOrders" :key="bet.orderNo"
          @edit="handleEdit" 
          @toggle-done="handleToggleDone" 
          @mark="handleMark" 
          :order="bet"
        />
      </Section>
      
    </div>

  <!-- add new order modal -->
  <dialog id="my_modal_2" class="modal" ref="modal">
    <div class="modal-box flex flex-col">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg">新增JIRA单</h3>
      <p class="py-2">可复制TG整条、从单内复制单号与标题、或全手动输入</p>
      <p class="py-2">确保以下输入中有包含 "CS-xxxxx" 以及JIRA单标题内容即可</p>
      <div class="form-control">
        <input
          ref="inputField" 
          class="input input-alt" 
          v-model="newOrder"
          @keyup.enter="addNewOrder"
        >
        <span class="input-border input-border-alt"></span>
      </div>
      <button class="btn btn-active btn-neutral mt-4 ml-auto"
        @click="addNewOrder"
      >新增
      </button>
    </div>
  </dialog>

  <!-- prod template modal -->
  <dialog id="my_modal_3" class="modal">
    <div v-if="loadingData">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
    <div v-else class="modal-box flex flex-col">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg mb-2">生产发送内容</h3>
      <textarea 
        class="textarea textarea-primary h-[600px]" 
        v-model="prodTemplateStr"
      >
      </textarea>
      <div class="ml-auto space-x-2">
        <span v-if="copied">已复制 !</span>
        <button class="btn btn-active btn-neutral mt-4 ml-auto"
          @click="copyText(prodTemplateStr)"
        >复制
        </button>
      </div>
    </div>
  </dialog>


  </div>
</template>

<style>
.input {
  color: #494B46;
  font-size: 0.9rem;
  background-color: transparent;
  width: 100%;
  box-sizing: border-box;
  padding-inline: 0.5em;
  padding-block: 0.7em;
  border: none;
  border-bottom: var(--border-height) solid var(--border-before-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.input-border {
  position: absolute;
  background: var(--border-after-color);
  width: 0%;
  height: 2px;
  bottom: 0;
  left: 0;
  transition: width 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045);
}

.input:focus {
  outline: none;
}

.input:focus + .input-border {
  width: 100%;
}

.form-control {
  position: relative;
  --width-of-input: 300px;
}

.input-alt {
  font-size: 1.2rem;
  padding-inline: 1em;
  padding-block: 0.8em;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.input-border-alt {
  height: 3px;
  background: linear-gradient(90deg, #FF6464 0%, #FFBF59 50%, #47C9FF 100%);
  transition: width 0.4s cubic-bezier(0.42, 0, 0.58, 1.00);
}

.input-alt:focus + .input-border-alt {
  width: 100%;
}
</style>