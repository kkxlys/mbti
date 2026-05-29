import { redirect } from "next/navigation";
import { hasAdminSession, isAdminAuthConfigured } from "../../../lib/admin-auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function errorMessage(error?: string) {
  switch (error) {
    case "config":
      return "后台尚未配置管理员账号。";
    case "invalid":
      return "账号或密码不正确。";
    case "locked":
      return "尝试次数过多，请稍后再试。";
    case "origin":
      return "请求来源异常，请刷新页面后重试。";
    default:
      return "";
  }
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const config = isAdminAuthConfigured();
  if (config.configured && (await hasAdminSession())) {
    redirect("/admin");
  }

  const params = searchParams ? await searchParams : {};
  const message = errorMessage(params.error);

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <span className="admin-eyebrow">后台管理</span>
        <h1>管理员登录</h1>
        <p>仅限项目管理员访问。后台包含订单、支付和用户线索信息。</p>

        {!config.configured ? (
          <div className="admin-alert">
            <strong>后台未启用</strong>
            <span>请先配置 ADMIN_USERNAME、ADMIN_PASSWORD_HASH 和 ADMIN_SESSION_SECRET。</span>
          </div>
        ) : null}

        {message ? <div className="admin-alert danger">{message}</div> : null}

        <form className="admin-login-form" action="/api/admin/login" method="post">
          <label>
            <span>管理员账号</span>
            <input
              autoComplete="username"
              disabled={!config.configured}
              minLength={4}
              name="username"
              required
              type="text"
            />
          </label>
          <label>
            <span>管理员密码</span>
            <input
              autoComplete="current-password"
              disabled={!config.configured}
              minLength={12}
              name="password"
              required
              type="password"
            />
          </label>
          <button className="admin-primary-button" disabled={!config.configured} type="submit">
            登录后台
          </button>
        </form>
      </section>
    </main>
  );
}
