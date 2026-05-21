"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BookOpen,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  LineChart,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  Radar,
  School,
  Share2,
  ShieldCheck,
  Sparkles,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import questionBank from "../../data/question-bank-gaokao-absurd-48.json";

type Step = "home" | "intro" | "quiz" | "checkout" | "generating" | "report";
type Dimension = "EI" | "SN" | "TF" | "JP";
type Letter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
type Gender = "neutral" | "male" | "female";

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
  gender: Gender;
  province: string;
  track: string;
  total: string;
  rank: string;
  chinese: string;
  math: string;
  english: string;
  electiveA: string;
  electiveB: string;
  electiveC: string;
  city: string;
  preference: string;
};

type ScoreMap = Record<Letter, number>;

const questions = questionBank.questions as Question[];

const initialForm: ScoreForm = {
  gender: "neutral",
  province: "浙江",
  track: "物理 + 化学 + 生物",
  total: "612",
  rank: "28500",
  chinese: "118",
  math: "126",
  english: "132",
  electiveA: "82",
  electiveB: "78",
  electiveC: "76",
  city: "杭州 / 上海 / 南京",
  preference: "AI科技、数字媒体、稳定就业"
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
    title: "志愿宇宙冒险家",
    quote: "脑洞负责点火，行动负责把地图跑亮。",
    vibe: "灵感跃迁 / 开放探索"
  },
  ENFJ: {
    title: "校园主线召集人",
    quote: "你很擅长把人的期待，整理成一条能一起走的路。",
    vibe: "共情组织 / 氛围发动"
  },
  ENTJ: {
    title: "专业战略指挥官",
    quote: "目标不是写在纸上的，是拿来拆解、推进和验收的。",
    vibe: "目标驱动 / 战略规划"
  },
  ENTP: {
    title: "脑洞开荒辩论王",
    quote: "别人看到专业名，你已经开始改写它的未来版本。",
    vibe: "创新试探 / 反套路思考"
  },
  ESFP: {
    title: "高能社交体验官",
    quote: "你适合在真实现场获得反馈，越体验越知道自己要什么。",
    vibe: "现场感知 / 活力表达"
  },
  ESFJ: {
    title: "同频氛围守护者",
    quote: "你不是只会照顾别人，你也会把秩序变得有人情味。",
    vibe: "关系协调 / 稳定支持"
  },
  ESTJ: {
    title: "计划表终结者",
    quote: "当别人还在许愿，你已经把步骤排进日历。",
    vibe: "规则执行 / 高效推进"
  },
  ESTP: {
    title: "现实副本速通者",
    quote: "你更相信现场信息，边跑边修正才是你的主场。",
    vibe: "即时判断 / 实战解决"
  },
  INFP: {
    title: "精神宇宙写诗人",
    quote: "你需要的不只是专业名字，而是能安放意义感的方向。",
    vibe: "价值感知 / 内在叙事"
  },
  INFJ: {
    title: "未来航线预言家",
    quote: "你会从细节里看见远方，也会为远方保留温柔。",
    vibe: "洞察长期 / 深度共情"
  },
  INTJ: {
    title: "长期主义建模师",
    quote: "你不迷信热门，你更关心系统十年后还能不能成立。",
    vibe: "系统建模 / 长线布局"
  },
  INTP: {
    title: "知识迷宫拆解员",
    quote: "越复杂的问题越像邀请函，你会忍不住把它拆开看看。",
    vibe: "逻辑探索 / 概念拆解"
  },
  ISFP: {
    title: "灵感生活收藏家",
    quote: "你对喜欢和不喜欢很敏锐，适合从作品和体验里找答案。",
    vibe: "审美直觉 / 温和创作"
  },
  ISFJ: {
    title: "稳态成长守护者",
    quote: "你不是保守，你是在认真确认哪条路能长久地照顾自己。",
    vibe: "细致守护 / 稳定成长"
  },
  ISTJ: {
    title: "细节秩序工程师",
    quote: "你能把复杂选择拆成证据、规则和可执行清单。",
    vibe: "事实校准 / 秩序管理"
  },
  ISTP: {
    title: "动手解法猎人",
    quote: "你不爱空谈，但很会在真实问题里找到能跑的解法。",
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
  { value: "neutral", label: "不限定", hint: "使用默认角色" },
  { value: "male", label: "男生", hint: "展示男版角色" },
  { value: "female", label: "女生", hint: "展示女版角色" }
];

const genderLabels: Record<Gender, string> = {
  neutral: "不限定",
  male: "男生",
  female: "女生"
};

function personaImage(type: string, gender: Gender) {
  const folder = gender === "male" ? "personas-male" : gender === "female" ? "personas-female" : "personas-v3";
  return `/images/${folder}/${type.toLowerCase()}.png`;
}

const majors = [
  {
    name: "人工智能",
    fit: 92,
    tags: ["N", "T", "数学"],
    why: "适合喜欢拆问题、做模型、把脑洞落到系统里的同学。",
    risk: "数学、编程和英文资料阅读压力较高。"
  },
  {
    name: "数据科学与大数据技术",
    fit: 89,
    tags: ["S", "T", "就业"],
    why: "把分数、趋势、规律变成判断依据，和志愿分析脑回路很搭。",
    risk: "需要长期练习统计、数据库和工程能力。"
  },
  {
    name: "数字媒体技术",
    fit: 88,
    tags: ["N", "F", "创作"],
    why: "兼顾创意表达和技术实现，适合喜欢二次元、交互和内容产品的人。",
    risk: "不同学校培养方向差异大，要看课程表。"
  },
  {
    name: "计算机科学与技术",
    fit: 86,
    tags: ["T", "J", "通用"],
    why: "基础扎实、迁移面广，是后续转AI、产品、研发的主线入口。",
    risk: "竞争强，需要持续自学，不能只靠上课。"
  },
  {
    name: "软件工程",
    fit: 84,
    tags: ["T", "P", "项目"],
    why: "适合喜欢把想法做成可运行产品的人，反馈感明确。",
    risk: "项目节奏快，容易被deadline追着跑。"
  },
  {
    name: "信息管理与信息系统",
    fit: 82,
    tags: ["S", "T", "管理"],
    why: "在技术、业务和数据之间搭桥，适合不想只写代码的同学。",
    risk: "学校差异较大，需确认是否偏管理或偏技术。"
  },
  {
    name: "应用心理学",
    fit: 80,
    tags: ["F", "N", "人"],
    why: "适合对人、行为和决策很敏感，也愿意做长期观察的人。",
    risk: "本科就业路径需要提前规划，读研概率较高。"
  },
  {
    name: "网络与新媒体",
    fit: 79,
    tags: ["E", "N", "表达"],
    why: "能把表达欲、热点感和数据判断结合起来。",
    risk: "行业变化快，需要作品集和实习经历支撑。"
  },
  {
    name: "自动化",
    fit: 77,
    tags: ["S", "T", "工程"],
    why: "适合喜欢系统控制、硬件联动和工程落地的人。",
    risk: "课程硬核，物理和数学基础要跟上。"
  },
  {
    name: "法学",
    fit: 75,
    tags: ["J", "T", "表达"],
    why: "规则意识、表达能力和逻辑链条都能派上用场。",
    risk: "就业门槛和考试压力较高，需要强自律。"
  }
];

function emptyScores(): ScoreMap {
  return { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
}

function calculateScores(answers: Record<string, string>): ScoreMap {
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

function AppHeader({ step, onHome }: { step: Step; onHome: () => void }) {
  return (
    <header className="site-header">
      <button className="brand-button" onClick={onHome} aria-label="返回首页">
        <span className="brand-mark">
          <Sparkles size={18} />
        </span>
        <span>
          <strong>星轨志愿局</strong>
          <small>Gaokao Major Lab</small>
        </span>
      </button>
      <nav aria-label="主导航">
        <span className={step === "quiz" ? "nav-pill active" : "nav-pill"}>测试</span>
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
  const fields: { key: keyof ScoreForm; label: string; type?: string }[] = [
    { key: "province", label: "省份" },
    { key: "track", label: "选科组合" },
    { key: "total", label: "总分", type: "number" },
    { key: "rank", label: "位次", type: "number" },
    { key: "chinese", label: "语文", type: "number" },
    { key: "math", label: "数学", type: "number" },
    { key: "english", label: "外语", type: "number" },
    { key: "electiveA", label: "选考一", type: "number" },
    { key: "electiveB", label: "选考二", type: "number" },
    { key: "electiveC", label: "选考三", type: "number" },
    { key: "city", label: "目标城市" },
    { key: "preference", label: "兴趣关键词" }
  ];

  return (
    <section className="score-panel" aria-labelledby="score-title">
      <div className="section-kicker">
        <GraduationCap size={16} />
        高考副本结算台
      </div>
      <h1 id="score-title">测一测你的高考后人格航线</h1>
      <p className="lead">
        输入成绩和偏好，再完成48道抽象题。支付后生成完整 AI 专业建议。
      </p>
      <div className="gender-picker" role="radiogroup" aria-label="角色性别">
        <span>角色性别</span>
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
      <div className="score-grid">
        {fields.map((field) => (
          <label className={field.key === "preference" || field.key === "city" ? "field wide" : "field"} key={field.key}>
            <span>{field.label}</span>
            <input
              inputMode={field.type === "number" ? "numeric" : "text"}
              type={field.type ?? "text"}
              value={form[field.key]}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="home-actions">
        <button className="primary-button" onClick={onStart}>
          开始人格校准
          <ArrowRight size={18} />
        </button>
        <span className="safe-note">
          <ShieldCheck size={16} />
          娱乐参考，不替代正式志愿咨询
        </span>
      </div>
    </section>
  );
}

function AttributePanel({ form }: { form: ScoreForm }) {
  const subjectData = [
    ["语文", numberValue(form.chinese), 150],
    ["数学", numberValue(form.math), 150],
    ["外语", numberValue(form.english), 150],
    ["选考一", numberValue(form.electiveA), 100],
    ["选考二", numberValue(form.electiveB), 100],
    ["选考三", numberValue(form.electiveC), 100]
  ] as const;

  return (
    <aside className="attribute-panel">
      <div className="hero-visual">
        <Image
          src="/images/hero-campus.png"
          alt="明亮赛博校园与志愿终端插画"
          width={900}
          height={700}
          priority
        />
      </div>
      <div className="stat-card">
        <div className="stat-card-header">
          <span>学科属性面板</span>
          <strong>{form.total || "--"} 分</strong>
        </div>
        <div className="subject-bars">
          {subjectData.map(([label, value, max]) => (
            <div className="subject-row" key={label}>
              <span>{label}</span>
              <div className="bar-track">
                <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
              </div>
              <strong>{value || "--"}</strong>
            </div>
          ))}
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
          <Bot size={16} />
          志愿系统已启动
        </div>
        <h1>高考后精神状态测试</h1>
        <p>
          高考副本已通关，志愿系统正在读取你的隐藏人格参数。接下来是48道抽象题，没有标准答案，按第一反应选就好。
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
            维度
          </span>
        </div>
        <div className="home-actions">
          <button className="ghost-button" onClick={onBack}>
            <ArrowLeft size={18} />
            返回修改成绩
          </button>
          <button className="primary-button" onClick={onStart}>
            进入测试
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
  answers,
  currentIndex,
  setCurrentIndex,
  onAnswer,
  onFinish
}: {
  answers: Record<string, string>;
  currentIndex: number;
  setCurrentIndex: (value: number) => void;
  onAnswer: (questionId: string, optionId: string) => void;
  onFinish: () => void;
}) {
  const question = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const canFinish = answeredCount === questions.length;

  return (
    <main className="quiz-shell page-enter">
      <section className="quiz-card">
        <div className="quiz-topline">
          <span>第 {currentIndex + 1} / {questions.length} 题</span>
          <span>{progress}% 校准</span>
        </div>
        <div className="progress-track" aria-label="答题进度">
          <i style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="quiz-tag">{question.tags.join(" / ")}</p>
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
              onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            >
              下一题
              <ArrowRight size={18} />
            </button>
          ) : (
            <button className="primary-button" disabled={!canFinish} onClick={onFinish}>
              查看报告预览
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </section>
      <aside className="quiz-side">
        <Image src="/images/quiz-mascot.png" alt="AI向导插画" width={520} height={520} />
        <div className="signal-card">
          <span>人格信号</span>
          <strong>{answeredCount >= 8 ? "稳定读取中" : "正在预热"}</strong>
          <p>{answeredCount >= 32 ? "专业推荐模块已准备上线。" : "每8题会让系统多解锁一层人格参数。"}</p>
        </div>
      </aside>
    </main>
  );
}

function CheckoutStep({
  scores,
  onBack,
  onPay
}: {
  scores: ScoreMap;
  onBack: () => void;
  onPay: () => void;
}) {
  const type = resultType(scores);

  return (
    <main className="checkout-layout page-enter">
      <section className="checkout-preview">
        <div className="section-kicker">
          <LockKeyhole size={16} />
          报告预览已生成
        </div>
        <h1>解锁完整报告</h1>
        <p className="lead">
          系统已完成48题人格校准。支付后生成 AI 专业建议，包含人格解读、专业 Top 榜和志愿行动清单。
        </p>
        <div className="blur-report">
          <Image src="/images/checkout-unlock.png" alt="报告解锁插画" width={760} height={560} />
          <div className="locked-chip">
            <LockKeyhole size={16} />
            核心建议待解锁
          </div>
        </div>
      </section>
      <aside className="payment-panel">
        <div className="mini-result">
          <span>已识别人格轮廓</span>
          <strong>{type} · {typeTitles[type]}</strong>
          <p>完整解释和专业建议将在支付后生成。</p>
        </div>
        <div className="pay-box">
          <div>
            <span>报告解锁价</span>
            <strong>¥ 9.90</strong>
          </div>
          <p>当前为前端演示支付，后续可接微信支付 / 支付宝回调。</p>
        </div>
        <button className="pay-method active">
          <Wallet size={18} />
          微信支付
        </button>
        <button className="pay-method">
          <CreditCard size={18} />
          支付宝
        </button>
        <button className="primary-button full" onClick={onPay}>
          支付后生成 AI 专业建议
          <ArrowRight size={18} />
        </button>
        <button className="ghost-button full" onClick={onBack}>
          返回修改答案
        </button>
      </aside>
    </main>
  );
}

function GeneratingStep({ progress }: { progress: number }) {
  const stages = ["人格参数校准中", "正在读取学科属性", "正在匹配专业宇宙坐标", "正在生成志愿建议"];
  const activeStage = Math.min(stages.length - 1, Math.floor(progress / 28));

  return (
    <main className="generating-layout page-enter">
      <section className="generating-card">
        <LoaderCircle className="spin" size={36} />
        <h1>AI 报告生成中</h1>
        <p>通常需要10-30秒。当前演示会快速生成一份完整报告。</p>
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
  const image = personaImage(type, form.gender);
  const sortedMajors = [...majors].sort((a, b) => b.fit - a.fit);

  return (
    <main className="report-layout page-enter">
      <section className="report-hero">
        <Image src="/images/report-header.png" alt="AI专业报告插画" width={1100} height={680} />
        <div className="report-hero-content">
          <div className="section-kicker">
            <Radar size={16} />
            完整报告
          </div>
          <h1>{type} {title}</h1>
          <p>
            你的测试结果更像“有脑洞但不乱飞，能把兴趣和现实慢慢拼起来”的路线。下面是基于成绩、选科和人格分数生成的专业建议。
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
          <Image src={image} alt={`${type} ${title} ${genderLabels[form.gender]}二次元角色卡`} width={760} height={1100} />
          <div className="character-card-caption">
            <span>{type}</span>
            <strong>{title}</strong>
            <em>{persona.vibe} · {genderLabels[form.gender]}</em>
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
            学科属性
          </div>
          <div className="score-summary">
            <strong>{form.total} 分</strong>
            <span>{form.province} · {form.track}</span>
            <span>位次 {form.rank || "待补充"}</span>
          </div>
          <p>
            数学和外语分数表现更亮，适合优先查看需要逻辑建模、信息检索和长期自学能力的专业。位次越准确，后续真实志愿推荐越稳定。
          </p>
        </article>
      </section>

      <section className="persona-gallery-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              <Sparkles size={16} />
              16型人格图鉴
            </div>
            <h2>每一种结果都有自己的角色卡</h2>
          </div>
          <span className="subtle-badge">当前命中：{type} {title} · {genderLabels[form.gender]}</span>
        </div>
        <div className="persona-gallery">
          {personaOrder.map((personaType) => {
            const item = personaData[personaType];
            const itemImage = personaImage(personaType, form.gender);
            const active = personaType === type;
            return (
              <article className={active ? "persona-card active" : "persona-card"} key={personaType}>
                <Image src={itemImage} alt={`${personaType} ${item.title} ${genderLabels[form.gender]}角色卡`} width={360} height={520} />
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
              <School size={16} />
              专业推荐 Top 10
            </div>
            <h2>推荐先从这些专业开始查培养方案</h2>
          </div>
          <span className="subtle-badge">匹配度由前端演示算法生成</span>
        </div>
        <div className="major-list">
          {sortedMajors.map((major, index) => (
            <article className="major-card" key={major.name}>
              <div className="major-rank">{String(index + 1).padStart(2, "0")}</div>
              <div className="major-main">
                <div className="major-title-row">
                  <h3>{major.name}</h3>
                  <span>匹配度 {major.fit}%</span>
                </div>
                <p>{major.why}</p>
                <div className="tag-row">
                  {major.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="risk-box">
                <strong>需要确认</strong>
                <span>{major.risk}</span>
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
            <li>用真实位次对比近三年录取线，不只看总分。</li>
            <li>打开目标学校培养方案，确认课程是否符合预期。</li>
            <li>把城市、专业、就业方向分开比较，不要混成一个感觉。</li>
            <li>和家长沟通时用“备选方案 + 风险说明”，别只用热爱硬冲。</li>
          </ol>
        </article>
        <article className="share-card">
          <Image src="/images/share-poster-bg.png" alt="分享海报背景预览" width={520} height={760} />
          <div>
            <strong>{title}</strong>
            <span>分享页只展示人格称号，完整专业建议保留在报告内。</span>
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

  const scores = useMemo(() => calculateScores(answers), [answers]);

  useEffect(() => {
    const saved = window.localStorage.getItem("soul-major-demo");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        form?: Partial<ScoreForm>;
        answers?: Record<string, string>;
        currentIndex?: number;
      };
      if (parsed.form) setForm({ ...initialForm, ...parsed.form, gender: parsed.form.gender ?? "neutral" });
      if (parsed.answers) setAnswers(parsed.answers);
      if (typeof parsed.currentIndex === "number") setCurrentIndex(parsed.currentIndex);
    } catch {
      window.localStorage.removeItem("soul-major-demo");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "soul-major-demo",
      JSON.stringify({
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
    if (currentIndex < questions.length - 1) {
      window.setTimeout(() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1)), 160);
    }
  }

  function restart() {
    setStep("home");
    setAnswers({});
    setCurrentIndex(0);
    setGenerationProgress(0);
  }

  return (
    <div className="app-shell">
      <AppHeader step={step} onHome={() => setStep("home")} />

      {step === "home" ? (
        <main className="home-layout page-enter">
          <ScoreInput form={form} setForm={setForm} onStart={() => setStep("intro")} />
          <AttributePanel form={form} />
        </main>
      ) : null}

      {step === "intro" ? (
        <IntroStep onBack={() => setStep("home")} onStart={() => setStep("quiz")} />
      ) : null}

      {step === "quiz" ? (
        <QuizStep
          answers={answers}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          onAnswer={handleAnswer}
          onFinish={() => setStep("checkout")}
        />
      ) : null}

      {step === "checkout" ? (
        <CheckoutStep scores={scores} onBack={() => setStep("quiz")} onPay={() => setStep("generating")} />
      ) : null}

      {step === "generating" ? <GeneratingStep progress={generationProgress} /> : null}

      {step === "report" ? <ReportStep form={form} scores={scores} onRestart={restart} /> : null}
    </div>
  );
}
