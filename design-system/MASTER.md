# Design System Master

Product: 星轨志愿局

Style: 明亮赛博校园、轻视觉小说、抽卡式报告、工具化推荐。

## Principles

- First screen must be usable, not a pure marketing hero.
- Mobile first, because the main user is a high school graduate on a phone.
- Quiz can be playful; checkout and report must feel trustworthy.
- No nested cards.
- No structural emoji icons; use SVG icons or custom illustrated assets.
- Keep card and button radius at 8px or below.
- Every animation must explain state or progress.

## Tokens

```css
:root {
  --bg: #f7f8ff;
  --surface: #ffffff;
  --surface-soft: #eefbff;
  --ink: #171625;
  --muted: #64627a;
  --border: #e6e8f5;
  --primary: #ff4f81;
  --primary-strong: #e3366a;
  --secondary: #00b8c8;
  --accent: #ffd84a;
  --mint: #45d6a3;
  --violet-accent: #7c5cff;
  --success: #28b778;
  --warning: #ff9b3d;
  --danger: #e84b5f;
}
```

## Typography

- Body: Noto Sans SC
- Latin and numbers: Inter
- Base body size: 16px
- Body line-height: 1.5-1.7
- No viewport-based font scaling
- Letter spacing: 0

## Layout

- Mobile: 375px must work without horizontal scroll.
- Tablet: two-column only when content remains readable.
- Desktop: max content width 1120-1200px.
- Use 4/8px spacing scale.
- Sticky bottom CTA must reserve safe-area padding.

## Components

- Buttons: 44px minimum height, 8px radius, visible loading and disabled states.
- Inputs: visible labels, helper text, inline errors.
- Quiz options: full-row tap target, stable min-height, selected state includes more than color.
- Cards: only for individual units, not for section wrappers.
- Charts: include text summary for accessibility.

## Motion

- Micro-interactions: 120-180ms.
- Page transitions: 180-260ms.
- Complex confirmation: under 800ms.
- Use transform and opacity only.
- Respect `prefers-reduced-motion`.

## Page Tone

- Score and quiz: playful, absurd, student-friendly.
- Checkout: clear, secure, minimal jokes.
- Report: structured, confident, data-backed.

## Primary Pages

- `/`: score intake and test entry.
- `/quiz/intro`: short story setup.
- `/quiz`: 48-question test.
- `/checkout`: locked preview and payment.
- `/report/generating`: async AI generation status.
- `/report/:id`: full AI report.
- `/share/:id`: lightweight share preview.
