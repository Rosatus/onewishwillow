export interface Consequence {
  title: string
  text: string
}

export interface WishRecord {
  id: string
  wish: string
  createdAt: string
  domain: string
  granted: string
  consequences: Consequence[]
  price: string
  gentle?: boolean
}

type Story = Omit<WishRecord, 'id' | 'wish' | 'createdAt' | 'domain'>

const stories: Record<string, Story[]> = {
  love: [
    {
      granted: '第二天，对方先给你发了消息。你们聊到凌晨。这一次，谁都没有先说晚安。',
      consequences: [
        { title: '起初很好', text: '你提过的餐厅、随口说过的小事，对方都记得。你觉得这根柳枝折得值。' },
        { title: '消息越来越多', text: '十分钟没回，电话就打来了。你说在忙，对方问和谁。后来，你连出门买东西都得解释。' },
        { title: '你试着说分开', text: '对方只是摇头，说你一定是累了。门外又响起敲门声，和昨天一样。' },
      ],
      price: '从此，你的手机再也没有安静过。',
    },
    {
      granted: '对方答应了。很快，你成了那个人最在意的人，正如你写下的那样。',
      consequences: [
        { title: '只陪着你', text: '聚会不去了，朋友的电话也不接了。对方说，反正和你在一起就够了。' },
        { title: '什么都听你的', text: '吃什么、去哪里、穿哪件衣服，都要等你决定。你问对方怎么想，得到的总是同一句：你喜欢就好。' },
        { title: '再也不争吵', text: '你故意说了几句难听的话，想看看以前那个会反驳你的人。对方却笑着说，你说得对。' },
      ],
      price: '你开始想念那个还不喜欢你的时候的人。',
    },
  ],
  wealth: [
    {
      granted: '周一早上，账户里多了一大笔钱。银行核实过，手续齐全，确实属于你。',
      consequences: [
        { title: '第一笔钱', text: '你还清了欠款，换了住处。很长一段时间，你都睡得很好。' },
        { title: '一封来信', text: '寄信的人你不认识。他说那笔钱原本是他的，附了几张旧照片。银行却查不到这个人。' },
        { title: '门口有人', text: '后来，信越来越多。有人站在楼下，什么也不做，只是抬头看你的窗户。' },
      ],
      price: '钱花不完。门也不敢开了。',
    },
  ],
  career: [
    {
      granted: '通知比预想中来得早。你的名字在名单第一行，家人把截图转发了好几遍。',
      consequences: [
        { title: '一路顺利', text: '从前难办的事情，现在都有人替你安排。每当你想道谢，对方都说，这是你应得的。' },
        { title: '停不下来', text: '你想请一天假，却发现日程总会多出一件事。取消一项，就有两项补上来。' },
        { title: '辞职信', text: '你写了三次。每次醒来，信都不见了，桌上放着一份新的任命通知。' },
      ],
      price: '你一直在往上走，再没放过一天假。',
    },
  ],
  health: [
    {
      granted: '复查的结果很好。医生翻了几遍旧病历，说先回家休息吧。你在医院门口打了一个很长的电话。',
      consequences: [
        { title: '恢复如常', text: '饭能吃了，觉也睡得安稳。家里终于不再围着药盒和检查单打转。' },
        { title: '盒里的纸条', text: '收拾房间时，你在空盒里找到一张纸，上面写着一个日期。那一天还没到。' },
        { title: '又一张', text: '你把纸条扔了。第二天，它又躺在盒底，日期比上次近了一天。' },
      ],
      price: '日子恢复了，你却开始每天查看那个空盒子。',
    },
  ],
  general: [
    {
      granted: '第二天，你发现事情真的变了。你读了一遍昨晚写下的话，一字不差。',
      consequences: [
        { title: '少了一张照片', text: '桌上的合照不见了，只留下一个颜色较浅的方框。你想不起那是谁的照片。' },
        { title: '一个空号码', text: '通讯录里多了一个没有名字的号码。你打过去，对方问：你还记得我吗？' },
        { title: '盒底的小字', text: '你翻过盒子，才看见那行字：换走的东西，由本店挑选。字很小，昨天就在那里。' },
      ],
      price: '你得到了想要的东西，却想不起究竟拿什么换了它。',
    },
  ],
}

function hashWish(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  return Math.abs(hash)
}

export function createWishRecord(wish: string): WishRecord {
  const clean = wish.trim()
  if (/自杀|自残|不想活|结束生命|kill myself|self[- ]?harm/i.test(clean)) {
    return {
      id: crypto.randomUUID(),
      wish: clean,
      createdAt: new Date().toISOString(),
      domain: 'gentle',
      gentle: true,
      granted: '先在这里停一会儿。听起来你现在很难受，这段故事可以晚一点再继续。',
      consequences: [
        { title: '此刻，先不要独处', text: '如果可以，请把这句话给一位你信任的人看，或联系当地急救与心理危机支持服务。让真实的人陪你度过这一刻。' },
        { title: '把危险移远一点', text: '先离开可能伤害自己的物品和地点，去一个有人的、安全的空间。你值得得到直接而具体的帮助。' },
      ],
      price: '这里没有代价。你的安全比任何愿望都重要。',
    }
  }

  let domain = 'general'
  if (/爱|喜欢|恋|复合|嫁给|娶|love|marry|relationship/i.test(clean)) domain = 'love'
  else if (/钱|财|富有|暴富|奖金| billion|million|rich|money|wealth/i.test(clean)) domain = 'wealth'
  else if (/工作|事业|成功|成名|出名|录取|考试|晋升|career|famous|success|promot/i.test(clean)) domain = 'career'
  else if (/健康|痊愈|病|康复|长寿|health|cure|recover/i.test(clean)) domain = 'health'
  const options = stories[domain]
  const story = options[hashWish(clean) % options.length]
  return {
    ...story,
    id: crypto.randomUUID(),
    wish: clean,
    createdAt: new Date().toISOString(),
    domain,
  }
}
