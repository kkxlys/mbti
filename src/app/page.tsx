"use client";

import Image from "next/image";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LineChart,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  MoonStar,
  Radar,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import questionBank from "../../data/question-bank-gaokao-absurd-48.json";

type Step = "home" | "intro" | "quiz" | "checkout" | "generating" | "report";
type Dimension = "EI" | "SN" | "TF" | "JP";
type Letter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
type Gender = "male" | "female";
type PaymentMode = "jsapi" | "native";
type PayState = "idle" | "creating" | "waiting" | "error" | "not_configured";

type Question = {
  id: string;
  dimension: Dimension;
  prompt: string;
  options: {
    id: string;
    text: string;
    scores: Partial<Record<Letter, number>>;
  }[];
  tags: string[];
};

type ScoreForm = {
  gender: Gender | "";
  total: string;
};

type QuestionBank = {
  questionSets: Record<Gender, Question[]>;
};

type ScoreMap = Record<Letter, number>;

type JsapiBridgeParams = {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: "RSA";
  paySign: string;
};

type NativePaymentResponse = {
  orderId: string;
  amountCents: number;
  mode: "native";
  codeUrl: string;
};

type JsapiPaymentResponse = {
  orderId: string;
  amountCents: number;
  mode: "jsapi";
  jsapiParams: JsapiBridgeParams;
};

type PaymentErrorResponse = {
  error: string;
  message: string;
  missing?: string[];
};

type WechatOpenidState = {
  openid: string;
  hasSession: boolean;
};

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (
        method: "getBrandWCPayRequest",
        params: JsapiBridgeParams,
        callback: (response: { err_msg?: string }) => void
      ) => void;
    };
    __WECHAT_OPENID__?: string;
  }
}

const questionSets = (questionBank as QuestionBank).questionSets;
const STORAGE_KEY = "fun-persona-demo";
const STORAGE_VERSION = 4;

const initialForm: ScoreForm = {
  gender: "",
  total: ""
};

const personaData: Record<
  string,
  {
    title: string;
    quote: string;
    vibe: string;
  }
> = {
  ENFP: {
    title: "探索型创意规划者",
    quote: "你适合在多种可能中寻找热情，再把想法落到行动上。",
    vibe: "开放探索 / 创意表达"
  },
  ENFJ: {
    title: "共情型组织者",
    quote: "你擅长理解他人，也能把共同目标推进成清晰计划。",
    vibe: "共情协调 / 团队推进"
  },
  ENTJ: {
    title: "目标型规划者",
    quote: "你更习惯先看目标，再拆步骤、排优先级、推动结果。",
    vibe: "目标驱动 / 战略规划"
  },
  ENTP: {
    title: "创新型问题解决者",
    quote: "你喜欢从不同角度看问题，也愿意尝试新的解法。",
    vibe: "创新试探 / 逻辑表达"
  },
  ESFP: {
    title: "体验型行动者",
    quote: "你适合在真实场景中获得反馈，越体验越清楚方向。",
    vibe: "现场感知 / 活力表达"
  },
  ESFJ: {
    title: "支持型协调者",
    quote: "你重视稳定关系，也能把规则和照顾感结合起来。",
    vibe: "关系协调 / 稳定支持"
  },
  ESTJ: {
    title: "执行型管理者",
    quote: "你擅长把目标变成步骤，并持续推进到可见结果。",
    vibe: "规则执行 / 高效推进"
  },
  ESTP: {
    title: "实战型探索者",
    quote: "你更相信现场信息，能在变化中快速判断和调整。",
    vibe: "即时判断 / 实战解决"
  },
  INFP: {
    title: "价值型探索者",
    quote: "你需要的不只是标准答案，也需要看见选择背后的意义。",
    vibe: "价值感知 / 内在叙事"
  },
  INFJ: {
    title: "洞察型规划者",
    quote: "你会从细节里看见长期趋势，也重视选择对人的影响。",
    vibe: "长期洞察 / 深度共情"
  },
  INTJ: {
    title: "长线型策略者",
    quote: "你不轻易追热门，更关心一条路线能否长期成立。",
    vibe: "长线布局 / 反套路规划"
  },
  INTP: {
    title: "分析型研究者",
    quote: "越复杂的问题越能激发你的好奇心，你习惯先拆清逻辑。",
    vibe: "逻辑探索 / 概念拆解"
  },
  ISFP: {
    title: "审美型实践者",
    quote: "你对喜欢和不喜欢很敏锐，适合从作品和体验里找方向。",
    vibe: "审美直觉 / 温和创作"
  },
  ISFJ: {
    title: "稳健型支持者",
    quote: "你会认真确认哪条路更稳定，也更愿意长期投入。",
    vibe: "细致守护 / 稳定成长"
  },
  ISTJ: {
    title: "细节型执行者",
    quote: "你能把复杂选择拆成证据、规则和可执行清单。",
    vibe: "事实雷达 / 秩序管理"
  },
  ISTP: {
    title: "技术型解决者",
    quote: "你不爱空谈，更擅长在真实问题里找到可行解法。",
    vibe: "动手验证 / 冷静排障"
  }
};

const typeTitles = Object.fromEntries(
  Object.entries(personaData).map(([type, item]) => [type, item.title])
) as Record<string, string>;

const personaOrder = [
  "ENFP",
  "ENFJ",
  "ENTJ",
  "ENTP",
  "ESFP",
  "ESFJ",
  "ESTJ",
  "ESTP",
  "INFP",
  "INFJ",
  "INTJ",
  "INTP",
  "ISFP",
  "ISFJ",
  "ISTJ",
  "ISTP"
];

const genderOptions: { value: Gender; label: string; hint: string }[] = [
  { value: "male", label: "男生", hint: "对应题库" },
  { value: "female", label: "女生", hint: "对应题库" }
];

const genderLabels: Record<Gender, string> = {
  male: "男",
  female: "女"
};

function personaImage(type: string, gender: Gender) {
  const folder = gender === "male" ? "personas-male" : "personas-female";
  return `/images/${folder}/${type.toLowerCase()}.png`;
}

const directionIdeas = [
  {
    name: "产品与用户研究",
    fit: 92,
    tags: ["需求分析", "沟通", "体验"],
    why: "适合把人的需求拆成问题和方案，兼顾表达、判断与推进。",
    risk: "需要补足数据分析和长期项目经验。"
  },
  {
    name: "数字媒体与内容策划",
    fit: 89,
    tags: ["表达", "创意", "传播"],
    why: "适合把想法转化为内容、活动或视觉表达，重视受众反馈。",
    risk: "需要提前确认课程是否偏创作、运营或技术制作。"
  },
  {
    name: "心理学与教育支持",
    fit: 88,
    tags: ["理解", "陪伴", "成长"],
    why: "适合关注人的状态、动机与成长路径，重视长期影响。",
    risk: "需要了解深造要求、就业路径和证书门槛。"
  },
  {
    name: "数据分析与商业决策",
    fit: 86,
    tags: ["逻辑", "建模", "决策"],
    why: "适合用数据和结构化方法处理复杂问题，形成可执行判断。",
    risk: "需要确认自己是否愿意长期学习数学、统计和工具软件。"
  },
  {
    name: "公共管理与社会服务",
    fit: 84,
    tags: ["组织", "规则", "协调"],
    why: "适合在制度、资源和人群需求之间做协调，追求稳定价值。",
    risk: "需要关注目标院校的实践资源和未来岗位方向。"
  },
  {
    name: "计算机应用与产品技术",
    fit: 82,
    tags: ["技术", "实践", "问题解决"],
    why: "适合把需求转化为工具或系统，在实践中不断优化方案。",
    risk: "需要评估编程兴趣、数学基础和持续自学能力。"
  },
  {
    name: "设计与视觉传播",
    fit: 80,
    tags: ["审美", "表达", "作品集"],
    why: "适合把观察和感受转化为视觉方案，用作品表达判断。",
    risk: "需要提前了解美术基础、作品集要求和专业分流。"
  },
  {
    name: "外语传播与跨文化交流",
    fit: 79,
    tags: ["语言", "沟通", "国际视野"],
    why: "适合在语言、文化和信息传递之间建立连接，拓展表达边界。",
    risk: "需要结合小语种热度、地区资源和复合专业能力判断。"
  },
  {
    name: "财经管理与运营",
    fit: 77,
    tags: ["规则", "执行", "资源配置"],
    why: "适合处理预算、流程和运营效率，把目标落到具体指标上。",
    risk: "需要关注学校层次、实习机会和行业证书规划。"
  },
  {
    name: "生命健康与服务管理",
    fit: 75,
    tags: ["责任", "服务", "稳定"],
    why: "适合关注个体状态和长期服务质量，强调耐心与规范意识。",
    risk: "需要提前确认培养年限、实习强度和职业准入要求。"
  }
];

function emptyScores(): ScoreMap {
  return { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
}

function calculateScores(answers: Record<string, string>, questions: Question[]): ScoreMap {
  const scores = emptyScores();
  questions.forEach((question) => {
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (!option) return;
    Object.entries(option.scores).forEach(([letter, value]) => {
      scores[letter as Letter] += value ?? 0;
    });
  });
  return scores;
}

function resultType(scores: ScoreMap) {
  return `${scores.E >= scores.I ? "E" : "I"}${scores.S >= scores.N ? "S" : "N"}${
    scores.T >= scores.F ? "T" : "F"
  }${scores.J >= scores.P ? "J" : "P"}`;
}

function dimensionPercent(scores: ScoreMap, left: Letter, right: Letter) {
  const total = scores[left] + scores[right];
  if (total === 0) return { winner: left, percent: 0.5 };
  const winner = scores[left] >= scores[right] ? left : right;
  return {
    winner,
    percent: Math.round((scores[winner] / total) * 100)
  };
}

function numberValue(value: string) {
  return Number(value.replace(/[^\d.]/g, "")) || 0;
}

function safeGender(value: unknown): Gender | "" {
  return value === "male" || value === "female" ? value : "";
}

function isWechatBrowser() {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function resolvePaymentMode(): PaymentMode {
  return isMobileBrowser() ? "jsapi" : "native";
}

function getStoredWechatOpenid() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const queryOpenid = params.get("openid")?.trim();
  if (queryOpenid) {
    window.sessionStorage.setItem("wechat_openid", queryOpenid);
    return queryOpenid;
  }

  const injectedOpenid = window.__WECHAT_OPENID__?.trim();
  if (injectedOpenid) return injectedOpenid;

  return window.sessionStorage.getItem("wechat_openid")?.trim() ?? "";
}

async function resolveWechatOpenid(): Promise<WechatOpenidState> {
  const storedOpenid = getStoredWechatOpenid();
  if (storedOpenid) return { openid: storedOpenid, hasSession: true };

  try {
    const response = await fetch("/api/wechat/oauth/session", {
      cache: "no-store"
    });
    const payload = (await response.json()) as { hasOpenid?: boolean };
    return {
      openid: "",
      hasSession: Boolean(payload.hasOpenid)
    };
  } catch {
    return { openid: "", hasSession: false };
  }
}

function startWechatOauth() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("wechat_oauth_after", "checkout");
  window.sessionStorage.setItem("wechat_oauth_resume_pay", "1");
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/api/wechat/oauth/start?returnTo=${encodeURIComponent(returnTo)}`);
}

function wechatOauthErrorMessage(code: string) {
  const messages: Record<string, string> = {
    not_configured: "微信支付授权还未配置完成，请稍后再试。",
    state_invalid: "微信授权校验失败，请重新发起支付。",
    state_failed: "微信授权初始化失败，请重新发起支付。",
    code_missing: "微信授权未完成，请重新发起支付。",
    OPENID_MISSING: "微信授权未返回身份信息，请重新发起支付。"
  };
  return messages[code] ?? "微信授权失败，请重新发起支付。";
}

function invokeWechatPay(params: JsapiBridgeParams) {
  return new Promise<void>((resolve, reject) => {
    const run = () => {
      window.WeixinJSBridge?.invoke("getBrandWCPayRequest", params, (response) => {
        const message = response.err_msg ?? "";
        if (message.includes(":ok")) {
          resolve();
          return;
        }
        if (message.includes(":cancel")) {
          reject(new Error("已取消支付"));
          return;
        }
        reject(new Error("微信支付未完成，请稍后重试"));
      });
    };

    if (window.WeixinJSBridge) {
      run();
      return;
    }

    document.addEventListener("WeixinJSBridgeReady", run, { once: true });
    window.setTimeout(() => reject(new Error("微信支付组件未就绪，请在微信内重新打开")), 8000);
  });
}

function AppHeader({ step, onHome }: { step: Step; onHome: () => void }) {
  return (
    <header className="site-header">
      <button className="brand-button" onClick={onHome} aria-label="返回首页">
        <span className="brand-mark">
          <MoonStar size={18} />
        </span>
        <span>
          <strong>星轨志愿局</strong>
          <small>高考志愿人格报告</small>
        </span>
      </button>
      <nav aria-label="主导航">
        <span className={step === "quiz" ? "nav-pill active" : "nav-pill"}>测评</span>
        <span className={step === "checkout" ? "nav-pill active" : "nav-pill"}>解锁</span>
        <span className={step === "report" ? "nav-pill active" : "nav-pill"}>报告</span>
      </nav>
    </header>
  );
}

function ScoreInput({
  form,
  setForm,
  onStart
}: {
  form: ScoreForm;
  setForm: (value: ScoreForm) => void;
  onStart: () => void;
}) {
  const canStart = numberValue(form.total) > 0 && form.gender !== "";

  return (
    <section className="score-panel" aria-labelledby="score-title">
      <div className="mystic-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="score-copy">
        <div className="section-kicker">
          <MoonStar size={16} />
          高考后专属 · 约5分钟
        </div>
        <h1 id="score-title" className="hero-title">测一测你的志愿人格倾向</h1>
        <p className="lead">
          输入高考总分，完成情境题，生成性格与专业方向报告。
        </p>
        <div className="value-strip" aria-label="报告亮点">
          <span>人格画像</span>
          <span>专业方向</span>
          <span>行动建议</span>
        </div>
        <div className="offer-card" aria-label="完整报告权益">
          <div>
            <span>完整报告</span>
            <strong>人格解读 · 专业方向 · 志愿提醒</strong>
          </div>
          <em>¥9.90</em>
        </div>
      </div>
      <div className="score-form-stack">
        <div className="score-grid">
          <label className="field total-field">
            <span>高考总分</span>
            <input
              aria-describedby="total-score-help"
              aria-label="高考总分"
              inputMode="numeric"
              min="0"
              placeholder="例如 568"
              type="number"
              value={form.total}
              onChange={(event) => setForm({ ...form, total: event.target.value })}
            />
            <small id="total-score-help">按本省成绩填写，报告参考用。</small>
          </label>
        </div>
        <div className="gender-picker" role="radiogroup" aria-label="选择性别">
          <span>选择性别</span>
          <div>
            {genderOptions.map((option) => (
              <button
                aria-checked={form.gender === option.value}
                className={form.gender === option.value ? "gender-option active" : "gender-option"}
                key={option.value}
                onClick={() => setForm({ ...form, gender: option.value })}
                role="radio"
                type="button"
              >
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={canStart ? "home-actions ready" : "home-actions"}>
        <button className="primary-button" disabled={!canStart} onClick={onStart}>
          开始测评
          <ArrowRight size={18} />
        </button>
        <span className="safe-note">
          <ShieldCheck size={16} />
          支付前可查看结果预览，仅作志愿参考
        </span>
        <div className="mobile-report-preview" aria-label="完整报告预览">
          <span>完整报告包含</span>
          <strong>48题画像 · 16型倾向 · 专业方向建议</strong>
        </div>
      </div>
    </section>
  );
}

function AttributePanel({ form }: { form: ScoreForm }) {
  const total = numberValue(form.total);
  const totalPercent = total ? Math.min(100, Math.round((total / 750) * 100)) : 0;

  return (
    <aside className="attribute-panel">
      <div className="hero-visual">
        <Image
          src="/images/hero-campus.png"
          alt="高考志愿测评插画"
          width={900}
          height={700}
          priority
        />
        <div className="hero-visual-badge">
          <span>测评准备就绪</span>
          <strong>48 题生成志愿人格报告</strong>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-card-header">
          <span>高考总分</span>
          <strong>{form.total || "--"} 分</strong>
        </div>
        <div className="total-score-meter" aria-label="高考总分参考比例">
          <div className="bar-track">
            <i style={{ width: `${totalPercent}%` }} />
          </div>
          <div>
            <span>按常见 750 分制估算</span>
            <strong>{totalPercent || "--"}%</strong>
          </div>
        </div>
        <div className="score-facts">
          <span>
            <strong>1</strong>
            个分数
          </span>
          <span>
            <strong>{form.gender ? genderLabels[form.gender] : "--"}</strong>
            性别
          </span>
          <span>
            <strong>48</strong>
            道情境题
          </span>
        </div>
        <div className="premium-preview">
          <span>完整报告包含</span>
          <strong>人格画像 · 专业方向 · 志愿行动建议</strong>
        </div>
      </div>
    </aside>
  );
}

function IntroStep({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return (
    <main className="intro-layout page-enter">
      <section className="intro-card">
        <div className="section-kicker">
          <MoonStar size={16} />
          测评说明 · 约5-7分钟
        </div>
        <h1>开始 48 道情境题</h1>
        <p>
          请按第一反应选择。题目用于识别偏好，不作为正式心理测评结论。
        </p>
        <div className="intro-stats">
          <span>
            <strong>48</strong>
            题
          </span>
          <span>
            <strong>5-7</strong>
            分钟
          </span>
          <span>
            <strong>4</strong>
            项倾向
          </span>
        </div>
        <div className="home-actions">
          <button className="ghost-button" onClick={onBack}>
            <ArrowLeft size={18} />
            返回修改信息
          </button>
          <button className="primary-button" onClick={onStart}>
            开始测评
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
      <Image
        className="intro-illustration"
        src="/images/quiz-mascot.png"
        alt="AI向导与答题终端插画"
        width={700}
        height={700}
      />
    </main>
  );
}

function QuizStep({
  questions,
  answers,
  currentIndex,
  setCurrentIndex,
  onAnswer,
  onFinish
}: {
  questions: Question[];
  answers: Record<string, string>;
  currentIndex: number;
  setCurrentIndex: (value: number) => void;
  onAnswer: (questionId: string, optionId: string) => void;
  onFinish: () => void;
}) {
  const question = questions[currentIndex];
  const answeredCount = questions.filter((item) => Boolean(answers[item.id])).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const canFinish = answeredCount === questions.length;
  const currentAnswered = Boolean(answers[question.id]);
  const firstMissingIndex = questions.findIndex((item) => !answers[item.id]);
  const missingCount = questions.length - answeredCount;

  return (
    <main className="quiz-shell page-enter">
      <section className="quiz-card">
        <div className="quiz-topline">
          <span>第 {currentIndex + 1} / {questions.length} 题</span>
          <span>{progress}% 完成</span>
        </div>
        <div className="progress-track" aria-label="答题进度">
          <i style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="quiz-tag"><Star size={14} /> 情境题 · 按第一反应选择</p>
        <h1>{question.prompt}</h1>
        <div className="option-list">
          {question.options.map((option) => {
            const selected = answers[question.id] === option.id;
            return (
              <button
                key={option.id}
                className={selected ? "option-button selected" : "option-button"}
                onClick={() => onAnswer(question.id, option.id)}
              >
                <span>{option.id}</span>
                <strong>{option.text}</strong>
                {selected ? <CheckCircle2 size={18} /> : null}
              </button>
            );
          })}
        </div>
        <div className="quiz-footer">
          <button
            className="ghost-button"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft size={18} />
            上一题
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              className="primary-button"
              disabled={!currentAnswered}
              onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            >
              下一题
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className="primary-button"
              onClick={() => {
                if (canFinish) {
                  onFinish();
                  return;
                }
                setCurrentIndex(Math.max(0, firstMissingIndex));
              }}
            >
              {canFinish ? "查看报告预览" : `还有 ${missingCount} 题未答`}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </section>
      <aside className="quiz-side">
        <Image src="/images/quiz-mascot.png" alt="AI向导插画" width={520} height={520} />
        <div className="signal-card">
          <span>测评进度</span>
          <strong>{answeredCount >= 8 ? "人格倾向正在成型" : "已开始记录选择偏好"}</strong>
          <p>{answeredCount >= 32 ? "完成后可查看报告预览。" : "保持第一反应即可，不需要反复推敲。"}</p>
        </div>
      </aside>
    </main>
  );
}

function CheckoutStep({
  form,
  scores,
  onBack,
  onPaid
}: {
  form: ScoreForm;
  scores: ScoreMap;
  onBack: () => void;
  onPaid: () => void;
}) {
  const type = resultType(scores);
  const [payMode, setPayMode] = useState<PaymentMode>("native");
  const [payState, setPayState] = useState<PayState>("idle");
  const [payMessage, setPayMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [nativeQr, setNativeQr] = useState("");

  useEffect(() => {
    setPayMode(resolvePaymentMode());
  }, []);

  useEffect(() => {
    const oauthError = window.sessionStorage.getItem("wechat_oauth_error");
    if (oauthError) {
      window.sessionStorage.removeItem("wechat_oauth_error");
      window.sessionStorage.removeItem("wechat_oauth_resume_pay");
      setPayState("error");
      setPayMessage(wechatOauthErrorMessage(oauthError));
      return;
    }

    if (window.sessionStorage.getItem("wechat_oauth_resume_pay") !== "1") return;
    window.sessionStorage.removeItem("wechat_oauth_resume_pay");
    const timer = window.setTimeout(() => {
      void handlePay();
    }, 350);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (payState !== "waiting" || !orderId) return;

    let stopped = false;
    async function checkStatus() {
      try {
        const response = await fetch(`/api/pay/wechat/status?orderId=${encodeURIComponent(orderId)}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as { status?: string; message?: string };
        if (stopped) return;
        if (payload.status === "paid") {
          setPayMessage("支付已确认，正在生成报告");
          window.setTimeout(onPaid, 300);
        }
      } catch {
        if (!stopped) setPayMessage("正在确认支付结果");
      }
    }

    checkStatus();
    const timer = window.setInterval(checkStatus, 2500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [orderId, onPaid, payState]);

  async function handlePay() {
    const mode = resolvePaymentMode();
    setPayMode(mode);
    setPayMessage("");
    setNativeQr("");

    if (mode === "jsapi" && !isWechatBrowser()) {
      setPayState("error");
      setPayMessage("请在手机微信内打开页面完成支付。");
      return;
    }

    const openidState = mode === "jsapi" ? await resolveWechatOpenid() : { openid: "", hasSession: false };
    if (mode === "jsapi" && !openidState.openid && !openidState.hasSession) {
      setPayState("creating");
      setPayMessage("正在获取微信支付授权...");
      startWechatOauth();
      return;
    }

    try {
      setPayState("creating");
      const response = await fetch("/api/pay/wechat/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode,
          openid: openidState.openid || undefined,
          resultType: type,
          score: numberValue(form.total),
          gender: form.gender || undefined
        })
      });
      const payload = (await response.json()) as NativePaymentResponse | JsapiPaymentResponse | PaymentErrorResponse;

      if (!response.ok) {
        const errorPayload = payload as PaymentErrorResponse;
        setPayState(errorPayload.error === "WECHAT_PAY_NOT_CONFIGURED" ? "not_configured" : "error");
        if (errorPayload.missing?.length) {
          console.warn("微信支付配置未完成", errorPayload.missing);
        }
        setPayMessage(
          errorPayload.error === "WECHAT_PAY_NOT_CONFIGURED" ? "支付通道配置中，暂时无法发起支付。" : errorPayload.message
        );
        return;
      }

      const successPayload = payload as NativePaymentResponse | JsapiPaymentResponse;
      if (successPayload.mode === "native") {
        const qrDataUrl = await QRCode.toDataURL(successPayload.codeUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 220,
          color: {
            dark: "#171021",
            light: "#ffffff"
          }
        });
        setOrderId(successPayload.orderId);
        setNativeQr(qrDataUrl);
        setPayState("waiting");
        setPayMessage("请使用微信扫码支付，完成后自动生成报告。");
        return;
      }

      setOrderId(successPayload.orderId);
      await invokeWechatPay(successPayload.jsapiParams);
      setPayState("waiting");
      setPayMessage("支付完成后正在确认订单状态。");
    } catch (error) {
      setPayState("error");
      setPayMessage(error instanceof Error ? error.message : "微信支付创建失败，请稍后重试。");
    }
  }

  const payModeLabel = payMode === "jsapi" ? "微信内支付" : "微信扫码支付";
  const buttonLabel = payState === "creating" ? "正在创建订单" : "立即微信支付";

  return (
    <main className="checkout-layout page-enter">
      <section className="checkout-preview">
        <div className="section-kicker">
          <LockKeyhole size={16} />
          人格档案已锁定
        </div>
        <h1>解锁完整志愿人格报告</h1>
        <p className="lead">
          你已完成 48 道情境题。支付后生成完整报告，包含人格画像、专业方向、风险提醒和行动建议。
        </p>
        <div className="blur-report">
          <Image src="/images/checkout-unlock.png" alt="报告解锁插画" width={760} height={560} />
          <div className="locked-chip">
            <LockKeyhole size={16} />
            关键人格结论待解锁
          </div>
        </div>
      </section>
      <aside className="payment-panel">
        <div className="mini-result">
          <span>已识别人格倾向</span>
          <strong>{type} · {typeTitles[type]}</strong>
          <p>完整报告会说明你的决策偏好与适合优先关注的专业方向。</p>
        </div>
        <div className="pay-box">
          <div>
            <span>完整报告解锁价</span>
            <strong>¥ 9.90</strong>
          </div>
          <p>一次解锁，支付后立即生成完整报告。</p>
        </div>
        <div className="pay-method active" aria-label="当前支付方式">
          <Wallet size={18} />
          {payModeLabel}
        </div>
        {nativeQr ? (
          <div className="native-qr-box" aria-label="微信支付二维码">
            <img className="native-qr" src={nativeQr} alt="微信扫码支付二维码" />
            <span>微信扫码支付</span>
          </div>
        ) : null}
        {payMessage ? (
          <p className={`payment-alert ${payState}`}>
            {payMessage}
          </p>
        ) : null}
        <button className="primary-button full" disabled={payState === "creating"} onClick={handlePay}>
          {buttonLabel}
          {payState === "creating" ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
        </button>
        <button className="ghost-button full" onClick={onBack}>
          返回修改答案
        </button>
      </aside>
    </main>
  );
}

function GeneratingStep({ progress }: { progress: number }) {
  const stages = ["正在整理测评结果", "正在生成性格画像", "正在匹配专业方向", "正在生成志愿行动建议"];
  const activeStage = Math.min(stages.length - 1, Math.floor(progress / 28));

  return (
    <main className="generating-layout page-enter">
      <section className="generating-card">
        <LoaderCircle className="spin" size={36} />
        <h1>完整报告生成中</h1>
        <p>请稍候，完整报告正在生成。</p>
        <div className="progress-track large">
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="stage-list">
          {stages.map((stage, index) => (
            <span key={stage} className={index <= activeStage ? "done" : ""}>
              <CheckCircle2 size={16} />
              {stage}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

function DimensionBars({ scores }: { scores: ScoreMap }) {
  const rows: [Dimension, Letter, Letter, string][] = [
    ["EI", "E", "I", "能量来源"],
    ["SN", "S", "N", "信息处理"],
    ["TF", "T", "F", "决策方式"],
    ["JP", "J", "P", "行动节奏"]
  ];

  return (
    <div className="dimension-bars">
      {rows.map(([key, left, right, label]) => {
        const total = scores[left] + scores[right] || 1;
        const leftPercent = Math.round((scores[left] / total) * 100);
        return (
          <div className="dimension-row" key={key}>
            <div>
              <span>{label}</span>
              <strong>{left} {leftPercent}% / {right} {100 - leftPercent}%</strong>
            </div>
            <div className="split-bar">
              <i style={{ width: `${leftPercent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RadarChart({ scores }: { scores: ScoreMap }) {
  const dims = [
    dimensionPercent(scores, "E", "I"),
    dimensionPercent(scores, "S", "N"),
    dimensionPercent(scores, "T", "F"),
    dimensionPercent(scores, "J", "P")
  ];
  const points = dims
    .map((dim, index) => {
      const angle = (-90 + index * 90) * (Math.PI / 180);
      const radius = 24 + (dim.percent / 100) * 70;
      return `${110 + Math.cos(angle) * radius},${110 + Math.sin(angle) * radius}`;
    })
    .join(" ");

  return (
    <svg className="radar-chart" viewBox="0 0 220 220" role="img" aria-label="人格四维度雷达图">
      <polygon points="110,30 190,110 110,190 30,110" className="radar-grid" />
      <polygon points="110,60 160,110 110,160 60,110" className="radar-grid soft" />
      <line x1="110" y1="25" x2="110" y2="195" />
      <line x1="25" y1="110" x2="195" y2="110" />
      <polygon points={points} className="radar-fill" />
      <text x="110" y="18">E/I</text>
      <text x="198" y="114">S/N</text>
      <text x="106" y="212">T/F</text>
      <text x="4" y="114">J/P</text>
    </svg>
  );
}

function ReportStep({ form, scores, onRestart }: { form: ScoreForm; scores: ScoreMap; onRestart: () => void }) {
  const type = resultType(scores);
  const persona = personaData[type];
  const title = persona.title;
  const selectedGender = form.gender || "male";
  const image = personaImage(type, selectedGender);
  const sortedDirectionIdeas = [...directionIdeas].sort((a, b) => b.fit - a.fit);

  return (
    <main className="report-layout page-enter">
      <section className="report-hero">
        <Image src="/images/report-header.png" alt="志愿人格报告插画" width={1100} height={680} />
        <div className="report-hero-content">
          <div className="section-kicker">
            <Radar size={16} />
            完整志愿人格报告
          </div>
          <h1>{type} {title}</h1>
          <p>
            根据你的情境题选择，报告从性格倾向、决策方式和专业方向三个层面给出参考。
          </p>
          <div className="persona-quote">
            <Sparkles size={16} />
            {persona.quote}
          </div>
          <div className="report-actions">
            <button className="primary-button">
              <Share2 size={18} />
              生成分享海报
            </button>
            <button className="ghost-button" onClick={onRestart}>重新测试</button>
          </div>
        </div>
        <aside className="result-character-card" aria-label={`${type} ${title} 角色卡`}>
          <Image src={image} alt={`${type} ${title} ${genderLabels[selectedGender]}版二次元角色卡`} width={760} height={1100} />
          <div className="character-card-caption">
            <span>{type}</span>
            <strong>{title}</strong>
            <em>{persona.vibe} · {genderLabels[selectedGender]}版</em>
          </div>
        </aside>
      </section>

      <section className="report-grid">
        <article className="report-card identity-card">
          <div className="card-title">
            <LineChart size={18} />
            人格维度
          </div>
          <RadarChart scores={scores} />
          <DimensionBars scores={scores} />
        </article>

        <article className="report-card">
          <div className="card-title">
            <BookOpen size={18} />
            高考总分
          </div>
          <div className="score-summary">
            <strong>{form.total || "--"} 分</strong>
            <span>你填写的分数</span>
          </div>
          <p>
            分数用于辅助理解志愿范围，具体填报仍需结合省份、位次和招生计划。
          </p>
        </article>
      </section>

      <section className="persona-gallery-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              <Sparkles size={16} />
              16型人格倾向
            </div>
            <h2>每一种结果对应不同的选择偏好</h2>
          </div>
          <span className="subtle-badge">当前结果：{type} {title} · {genderLabels[selectedGender]}</span>
        </div>
        <div className="persona-gallery">
          {personaOrder.map((personaType) => {
            const item = personaData[personaType];
            const itemImage = personaImage(personaType, selectedGender);
            const active = personaType === type;
            return (
              <article className={active ? "persona-card active" : "persona-card"} key={personaType}>
                <Image src={itemImage} alt={`${personaType} ${item.title} ${genderLabels[selectedGender]}版角色卡`} width={360} height={520} />
                <div>
                  <span>{personaType}</span>
                  <strong>{item.title}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="major-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              <Sparkles size={16} />
              专业方向参考
            </div>
            <h2>优先关注这些方向</h2>
          </div>
          <span className="subtle-badge">仅供参考，最终以招生计划和个人意愿为准</span>
        </div>
        <div className="major-list">
          {sortedDirectionIdeas.map((idea, index) => (
            <article className="major-card" key={idea.name}>
              <div className="major-rank">{String(index + 1).padStart(2, "0")}</div>
              <div className="major-main">
                <div className="major-title-row">
                  <h3>{idea.name}</h3>
                  <span>匹配度 {idea.fit}%</span>
                </div>
                <p>{idea.why}</p>
                <div className="tag-row">
                  {idea.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="risk-box">
                <strong>注意点</strong>
                <span>{idea.risk}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="action-section">
        <article>
          <div className="card-title">
            <MapPinned size={18} />
            志愿行动清单
          </div>
          <ol>
            <li>先核对本省一分一段表，确认分数对应位次。</li>
            <li>把专业方向分成优先、备选和谨慎三类。</li>
            <li>对比近三年录取位次，不只看最低分。</li>
            <li>结合课程内容、就业路径和个人兴趣再做最终判断。</li>
          </ol>
        </article>
        <article className="share-card">
          <Image src="/images/share-poster-bg.png" alt="分享海报背景预览" width={520} height={760} />
          <div>
            <strong>{title}</strong>
            <span>分享页只展示人格类型，完整专业方向保留在报告内。</span>
          </div>
        </article>
      </section>
    </main>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [form, setForm] = useState<ScoreForm>(initialForm);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);

  const currentQuestions = useMemo(
    () => (form.gender ? questionSets[form.gender] : questionSets.male),
    [form.gender]
  );
  const scores = useMemo(() => calculateScores(answers, currentQuestions), [answers, currentQuestions]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        version?: number;
        form?: Partial<ScoreForm>;
        answers?: Record<string, string>;
        currentIndex?: number;
      };
      if (parsed.version !== STORAGE_VERSION) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (parsed.form) {
        setForm({
          gender: safeGender(parsed.form.gender),
          total: parsed.form.total ?? initialForm.total
        });
      }
      if (parsed.answers) setAnswers(parsed.answers);
      if (typeof parsed.currentIndex === "number") setCurrentIndex(parsed.currentIndex);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get("wechat_oauth");
    if (!oauthResult) return;

    if (window.sessionStorage.getItem("wechat_oauth_after") === "checkout") {
      window.sessionStorage.removeItem("wechat_oauth_after");
      setStep("checkout");
    }

    const oauthError = params.get("wechat_oauth_error");
    if (oauthError) {
      window.sessionStorage.setItem("wechat_oauth_error", oauthError);
    }

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("wechat_oauth");
    cleanUrl.searchParams.delete("wechat_oauth_error");
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        form,
        answers,
        currentIndex
      })
    );
  }, [form, answers, currentIndex]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (step !== "generating") return;
    setGenerationProgress(0);
    const timer = window.setInterval(() => {
      setGenerationProgress((value) => {
        const next = Math.min(100, value + 8);
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setStep("report"), 450);
        }
        return next;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [step]);

  function handleAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    if (currentIndex < currentQuestions.length - 1) {
      window.setTimeout(() => setCurrentIndex((index) => Math.min(currentQuestions.length - 1, index + 1)), 160);
    }
  }

  function updateForm(nextForm: ScoreForm) {
    if (nextForm.gender !== form.gender) {
      setAnswers({});
      setCurrentIndex(0);
    }
    setForm(nextForm);
  }

  function restart() {
    setStep("home");
    setAnswers({});
    setCurrentIndex(0);
    setGenerationProgress(0);
  }

  return (
    <div className={`app-shell app-shell-${step}`}>
      <AppHeader step={step} onHome={() => setStep("home")} />

      {step === "home" ? (
        <main className="home-layout page-enter">
          <ScoreInput form={form} setForm={updateForm} onStart={() => setStep("intro")} />
          <AttributePanel form={form} />
        </main>
      ) : null}

      {step === "intro" ? (
        <IntroStep onBack={() => setStep("home")} onStart={() => setStep("quiz")} />
      ) : null}

      {step === "quiz" ? (
        <QuizStep
          questions={currentQuestions}
          answers={answers}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          onAnswer={handleAnswer}
          onFinish={() => setStep("checkout")}
        />
      ) : null}

      {step === "checkout" ? (
        <CheckoutStep form={form} scores={scores} onBack={() => setStep("quiz")} onPaid={() => setStep("generating")} />
      ) : null}

      {step === "generating" ? <GeneratingStep progress={generationProgress} /> : null}

      {step === "report" ? <ReportStep form={form} scores={scores} onRestart={restart} /> : null}
    </div>
  );
}
