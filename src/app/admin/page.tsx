import { redirect } from "next/navigation";
import { hasAdminSession, isAdminAuthConfigured } from "../../lib/admin-auth";
import { listOrders } from "../../lib/orders";
import { listUsers, maskOpenid } from "../../lib/users";
import { getWechatPayConfigStatus } from "../../lib/wechat-pay";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function dateTime(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function genderLabel(value?: string) {
  if (value === "male") return "男";
  if (value === "female") return "女";
  return "--";
}

function paymentConfigStatus() {
  try {
    return getWechatPayConfigStatus();
  } catch {
    return {
      configured: false,
      missing: ["WECHAT_PAY_VERIFY_KEYS_JSON 格式错误"]
    };
  }
}

export default async function AdminPage() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }

  const orders = listOrders();
  const users = listUsers();
  const paidOrders = orders.filter((order) => order.status === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const gross = paidOrders.reduce((sum, order) => sum + order.amountCents, 0);
  const payConfig = paymentConfigStatus();
  const adminConfig = isAdminAuthConfigured();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">星轨志愿局</span>
          <h1>后台管理</h1>
          <p>订单、用户线索与支付配置状态。敏感标识默认脱敏展示。</p>
        </div>
        <form action="/api/admin/logout" method="post">
          <button className="admin-secondary-button" type="submit">退出</button>
        </form>
      </header>

      <section className="admin-stat-grid" aria-label="运营总览">
        <article>
          <span>订单总数</span>
          <strong>{orders.length}</strong>
        </article>
        <article>
          <span>已支付</span>
          <strong>{paidOrders.length}</strong>
        </article>
        <article>
          <span>待支付</span>
          <strong>{pendingOrders.length}</strong>
        </article>
        <article>
          <span>实收金额</span>
          <strong>{money(gross)}</strong>
        </article>
      </section>

      <section className="admin-grid">
        <article className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span>Orders</span>
              <h2>订单列表</h2>
            </div>
            <em>{orders.length} 条</em>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>状态</th>
                  <th>方式</th>
                  <th>金额</th>
                  <th>结果</th>
                  <th>分数/性别</th>
                  <th>用户</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.length ? (
                  orders.map((order) => (
                    <tr key={order.outTradeNo}>
                      <td>{order.outTradeNo}</td>
                      <td><span className={`admin-status ${order.status}`}>{order.status}</span></td>
                      <td>{order.mode}</td>
                      <td>{money(order.amountCents)}</td>
                      <td>{order.resultType ?? "--"}</td>
                      <td>{order.score ?? "--"} / {genderLabel(order.gender)}</td>
                      <td>{maskOpenid(order.openid)}</td>
                      <td>{dateTime(order.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>暂无订单。当前为内存存储，接数据库后可保留历史数据。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="admin-side">
          <article className="admin-panel">
            <div className="admin-panel-title">
              <div>
                <span>Security</span>
                <h2>安全状态</h2>
              </div>
            </div>
            <ul className="admin-check-list">
              <li className={adminConfig.configured ? "ok" : "warn"}>
                管理员鉴权：{adminConfig.configured ? "已启用" : "未配置"}
              </li>
              <li className={payConfig.configured ? "ok" : "warn"}>
                微信支付配置：{payConfig.configured ? "已完整" : "待补齐"}
              </li>
              {!payConfig.configured ? <li>缺少：{payConfig.missing.join("、")}</li> : null}
            </ul>
          </article>

          <article className="admin-panel">
            <div className="admin-panel-title">
              <div>
                <span>Users</span>
                <h2>用户线索</h2>
              </div>
              <em>{users.length} 人</em>
            </div>
            <div className="admin-user-list">
              {users.length ? (
                users.map((user) => (
                  <div className="admin-user-item" key={user.openid}>
                    <strong>{maskOpenid(user.openid)}</strong>
                    <span>{user.lastResultType ?? "--"} · {user.lastScore ?? "--"} 分 · {genderLabel(user.lastGender)}</span>
                    <small>订单 {user.orderCount}，支付 {user.paidOrderCount}，更新 {dateTime(user.updatedAt)}</small>
                  </div>
                ))
              ) : (
                <p>暂无用户线索。服务号 OAuth 接入后，会按 openid 聚合。</p>
              )}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
