import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Headphones,
  Leaf,
  LockKeyhole,
  Moon,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import WillowScene from './components/WillowScene'
import BranchRitual from './components/BranchRitual'
import { createWishRecord, type WishRecord } from './lib/wishes'
import { WillowAudio } from './lib/audio'
import './App.css'

type Stage = 'hero' | 'opening' | 'ritual' | 'oracle' | 'answer'

const STORAGE_KEY = 'one-wish-willow:memories:v1'

function WillowMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="21.5" stroke="currentColor" strokeOpacity=".42" />
      <path d="M24 37V12M24 17C17 13 13 17 11 24M24 20C31 15 36 19 37 26M24 24C18 21 15 26 15 32M24 27C30 23 33 28 32 34" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M11 24C13 21 16 21 17 23C15 26 13 27 11 24ZM37 26C35 22 32 22 31 24C33 28 35 29 37 26ZM15 32C17 28 20 29 20 31C18 34 16 35 15 32ZM32 34C31 30 28 30 27 32C28 35 30 37 32 34Z" fill="currentColor" fillOpacity=".7" />
      <path d="M19 38H29" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

function loadArchive(): WishRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as WishRecord[]
  } catch {
    return []
  }
}

export default function App() {
  const [stage, setStage] = useState<Stage>('hero')
  const [wish, setWish] = useState('')
  const [result, setResult] = useState<WishRecord | null>(null)
  const [archive, setArchive] = useState<WishRecord[]>(loadArchive)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [sound, setSound] = useState(true)
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState('')
  const [warning, setWarning] = useState('')
  const [flash, setFlash] = useState(false)
  const [wishLocked, setWishLocked] = useState(false)
  const audioRef = useRef<WillowAudio | null>(null)
  const timersRef = useRef<number[]>([])
  const toastTimerRef = useRef(0)

  const getAudio = () => {
    if (!audioRef.current) audioRef.current = new WillowAudio()
    return audioRef.current
  }

  const notify = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2600)
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archive))
  }, [archive])

  useEffect(() => () => {
    timersRef.current.forEach(window.clearTimeout)
    window.clearTimeout(toastTimerRef.current)
    audioRef.current?.dispose()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setRulesOpen(false)
      setArchiveOpen(false)
      if (stage === 'answer') returnToGrove()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage])

  const enterGrove = () => {
    if (sound) void getAudio().setEnabled(true)
    setWarning('')
    setWishLocked(false)
    setStage('opening')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timersRef.current.push(window.setTimeout(() => setStage('ritual'), reducedMotion ? 250 : 2750))
  }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    void getAudio().setEnabled(next)
    notify(next ? '声音已开启' : '声音已关闭')
  }

  const snapBranch = () => {
    setWishLocked(true)
    setFlash(true)
    getAudio().snap()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const breakHold = reducedMotion ? 0 : 850
    const delay = reducedMotion ? 500 : 3120
    timersRef.current.push(window.setTimeout(() => setStage('oracle'), breakHold))
    timersRef.current.push(window.setTimeout(() => setFlash(false), 900))
    timersRef.current.push(window.setTimeout(() => {
      const record = createWishRecord(wish)
      setResult(record)
      setArchive((items) => [record, ...items].slice(0, 12))
      setStage('answer')
      getAudio().chime()
    }, delay))
  }

  const returnToGrove = () => {
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
    setFlash(false)
    setStage('hero')
    setResult(null)
    setWish('')
    setWishLocked(false)
    setWarning('')
  }

  const openMemory = (record: WishRecord) => {
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
    setFlash(false)
    setResult(record)
    setArchiveOpen(false)
    setStage('answer')
  }

  return (
    <div className={`app stage-${stage} ${ready ? 'is-ready' : ''}`}>
      <WillowScene stage={stage} onReady={() => setReady(true)} />
      <div className="scene-fallback" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />
      <div className={`wish-flash ${flash ? 'is-on' : ''}`} aria-hidden="true" />
      {flash && (
        <div className="leaf-burst" aria-hidden="true">
          {Array.from({ length: 26 }, (_, index) => (
            <i key={index} style={{
              '--x': `${((index * 47) % 80) - 40}vw`,
              '--y': `${20 + ((index * 29) % 55)}vh`,
              '--r': `${(index * 137) % 540}deg`,
              '--d': `${0.8 + ((index * 17) % 100) / 90}s`,
            } as React.CSSProperties} />
          ))}
        </div>
      )}

      <header className="topbar">
        <button className="brand" onClick={returnToGrove} aria-label="返回一愿柳首页">
          <WillowMark className="brand__mark" />
          <span className="brand__words">
            <strong>ONE WISH WILLOW</strong>
            <small>一 愿 柳 · SINCE 1986</small>
          </span>
        </button>
        <nav className="topbar__nav" aria-label="网站工具">
          <button aria-label="许愿须知" className="nav-button nav-button--rules" onClick={() => setRulesOpen(true)}>
            <CircleHelp size={15} />
            <span>许愿须知</span>
          </button>
          <button aria-label="树洞" className="nav-button" onClick={() => setArchiveOpen(true)}>
            <Archive size={15} />
            <span>树洞</span>
            <b>{archive.length.toString().padStart(2, '0')}</b>
          </button>
          <button className="round-button" onClick={toggleSound} aria-label={sound ? '关闭声音' : '开启声音'} aria-pressed={sound}>
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title" inert={stage !== 'hero'}>
          <div className="hero__copy">
            <div className="eyebrow"><span />A CURIOSITY FROM THE OTHER SIDE</div>
            <h1 id="hero-title">
              <span className="hero__chinese">一愿柳</span>
              <span className="hero__english">ONE WISH WILLOW</span>
            </h1>
            <div className="hero__poem">
              <p>折下一枝，得偿一愿。</p>
              <p>盒子里只有一根柳枝。想好再折。</p>
            </div>
            <div className="hero__actions">
              <button className="primary-cta" onClick={enterGrove}>
                <span>打开柳盒</span>
                <ArrowRight size={18} />
              </button>
              <span className="one-rule"><i /> 一生，仅限一愿</span>
            </div>
            <div className="hero__fineprint">
              <LockKeyhole size={12} />
              <span>愿望会实现。代价另算。</span>
            </div>
          </div>

          <aside className="specimen-note" aria-label="柳枝标本信息">
            <span className="specimen-note__index">NO. 001</span>
            <div className="specimen-note__line" />
            <div>
              <strong>THE ORIGINAL WILLOW</strong>
              <span>旧式纸盒 · 内藏一枝</span>
            </div>
          </aside>
        </section>

        {(stage === 'ritual' || stage === 'oracle') && (
          <section className="offering" aria-labelledby="offering-title" inert={stage === 'oracle'}>
            <div className="offering__card">
              <div className="card-corners" aria-hidden="true"><i /><i /><i /><i /></div>
              <div className="offering__header">
                <span>01 / 写下愿望</span>
                <button onClick={returnToGrove} aria-label="退出许愿仪式"><X size={16} /></button>
              </div>
              <h2 id="offering-title">你想要什么？</h2>
              <p className="offering__lede">写下愿望，再按住柳枝。<br />折断以后，就不能改了。</p>

              <div className="wish-field">
                <label htmlFor="wish">你的愿望</label>
                <span>{wish.length} / 160</span>
                <textarea
                  id="wish"
                  value={wish}
                  maxLength={160}
                  disabled={wishLocked}
                  autoFocus={window.matchMedia('(pointer: fine)').matches}
                  placeholder="我希望……"
                  onChange={(event) => { setWish(event.target.value); setWarning('') }}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && wish.trim().length >= 4) {
                      event.preventDefault()
                      notify('写好了，就按住柳枝约两秒')
                    }
                  }}
                />
              </div>
              <div className="wish-suggestions" aria-label="愿望示例">
                {['希望喜欢的人也喜欢我', '希望有花不完的钱', '希望能考上理想的学校'].map((text) => (
                  <button key={text} disabled={wishLocked} onClick={() => { setWish(text); setWarning('') }}>＋ {text}</button>
                ))}
              </div>
              <div className={`wish-warning ${warning ? 'is-visible' : ''}`} role="alert">{warning}</div>
              <div className="offering__footer">
                <span><LockKeyhole size={11} /> 愿望仅保存在此设备</span>
                <button onClick={() => setRulesOpen(true)}>许愿须知 <ChevronRight size={11} /></button>
              </div>
            </div>
            <BranchRitual
              canBreak={wish.trim().length >= 4}
              onReject={() => setWarning('请先写下愿望，至少四个字。')}
              onSnap={snapBranch}
            />
          </section>
        )}

        <section className={`oracle ${stage === 'oracle' ? 'is-visible' : ''}`} aria-live="polite" aria-hidden={stage !== 'oracle'}>
          <div className="oracle__sigil">
            <WillowMark />
            <i /><i /><i />
          </div>
          <p>枝条断了</p>
          <h2>等一等。</h2>
          <div className="oracle__dots"><i /><i /><i /></div>
        </section>

        {result && (
          <section className={`answer ${stage === 'answer' ? 'is-visible' : ''} ${result.gentle ? 'is-gentle' : ''}`} aria-labelledby="answer-title">
            <button className="answer__close" onClick={returnToGrove} aria-label="关闭柳树回应"><X size={19} /></button>
            <div className="answer__scroll">
              <article className="answer__inner">
                <header className="answer__header">
                  <WillowMark className="answer__mark" />
                  <div className="eyebrow"><span />THE WILLOW HAS ANSWERED<span /></div>
                  <h2 id="answer-title">{result.gentle ? '先照顾好自己。' : '愿望实现了。'}</h2>
                  <blockquote>“{result.wish}”</blockquote>
                  <div className="answer__receipt">
                    <span>WISH NO. {result.id.slice(0, 8).toUpperCase()}</span>
                    <i />
                    <span>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(result.createdAt))}</span>
                  </div>
                </header>

                <section className="granted-story">
                  <div className="section-label"><span>{result.gentle ? 'A MOMENT OF CARE' : 'I · 愿望兑现'}</span></div>
                  <p>{result.granted}</p>
                </section>

                <section className="consequences">
                  <div className="section-label"><span>{result.gentle ? 'II · 此刻的你' : 'II · 后来'}</span></div>
                  <h2>{result.gentle ? '找个人陪着你。' : '但事情没有就此结束。'}</h2>
                  <div className="consequence-list">
                    {result.consequences.map((item, index) => (
                      <div className="consequence" key={item.title}>
                        <span className="consequence__number">{(index + 1).toString().padStart(2, '0')}</span>
                        <div>
                          <h3>{item.title}</h3>
                          <p>{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="price">
                  <div className="section-label"><span>{result.gentle ? 'III · 没有代价' : 'III · 柳树收取的代价'}</span></div>
                  <p>{result.price}</p>
                  {!result.gentle && <div className="price__stamp"><Check size={13} /> PAID IN FULL · 不可撤销</div>}
                </section>

                <footer className="answer__footer">
                  <p>{result.gentle ? '你不必独自承受这一刻。' : '盒子空了。你还记得许愿前的日子吗？'}</p>
                  <div>
                    <button className="secondary-cta" onClick={returnToGrove}><ArrowLeft size={15} /> 回到首页</button>
                    {!result.gentle && (
                      <button className="primary-cta primary-cta--small" onClick={() => { returnToGrove(); enterGrove(); }}>
                        <RotateCcw size={14} /> 重新体验
                      </button>
                    )}
                  </div>
                  <small>本网站为虚构互动体验 · 所有记录仅保存在你的浏览器中</small>
                </footer>
              </article>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>BE CAREFUL WHAT YOU WISH FOR.</span>
        <div><Headphones size={12} /> 建议佩戴耳机 </div>
      </footer>

      <div className={`drawer-scrim ${archiveOpen ? 'is-open' : ''}`} onClick={() => setArchiveOpen(false)} />
      <aside className={`archive-drawer ${archiveOpen ? 'is-open' : ''}`} aria-hidden={!archiveOpen} aria-label="树洞愿望档案">
        <div className="drawer__header">
          <div><span>THE HOLLOW</span><h2>树洞档案</h2></div>
          <button className="round-button" onClick={() => setArchiveOpen(false)} aria-label="关闭树洞"><X size={17} /></button>
        </div>
        <p className="drawer__lede">这里留着你最近的十二个愿望。<br />仅保存在当前浏览器里。</p>
        <div className="archive-list">
          {archive.length === 0 ? (
            <div className="archive-empty"><Leaf size={28} /><p>还没有许过愿。</p></div>
          ) : archive.map((record) => (
            <button className="archive-item" key={record.id} onClick={() => openMemory(record)}>
              <span>{record.gentle ? '给自己一点时间' : record.domain.toUpperCase()}</span>
              <p>“{record.wish}”</p>
              <small>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(record.createdAt))}<ArrowRight size={13} /></small>
            </button>
          ))}
        </div>
        <div className="drawer__footer"><Moon size={13} /> ONE WISH. ONE ECHO. NO RETURN.</div>
      </aside>

      {rulesOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRulesOpen(false) }}>
          <section className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button className="rules-modal__close" onClick={() => setRulesOpen(false)} aria-label="关闭许愿须知"><X size={18} /></button>
            <BookOpen size={24} />
            <span className="rules-modal__eyebrow">READ BEFORE BREAKING</span>
            <h2 id="rules-title">许愿之前</h2>
            <p className="rules-modal__intro">盒背上写着四条规矩。</p>
            <ol>
              <li><b>01</b><div><strong>一生，仅限一愿。</strong><p>故事里，每个人只有一次机会。你可以重新体验，看看别的结局。</p></div></li>
              <li><b>02</b><div><strong>写好以后，再折枝。</strong><p>输入愿望，按住柳枝约两秒。中途松手可以取消。</p></div></li>
              <li><b>03</b><div><strong>四项禁忌。</strong><p>不可要求复活、永生、操纵时间，或许下“获得更多愿望”的愿望。</p></div></li>
              <li><b>04</b><div><strong>愿望可能有别的意思。</strong><p>“永远”“所有”“只有你”——这些字，最好再想一遍。</p></div></li>
            </ol>
            <div className="rules-modal__warning"><Leaf size={16} /> 这是一个虚构故事，结局由预设文本组成。</div>
            <button className="primary-cta primary-cta--small" onClick={() => setRulesOpen(false)}>我已读完 <ArrowRight size={15} /></button>
          </section>
        </div>
      )}

      <div className={`toast ${toast ? 'is-visible' : ''}`} role="status">{toast}</div>
      {!ready && <div className="scene-loading"><WillowMark /><span>正在打开一愿柳</span></div>}
    </div>
  )
}
