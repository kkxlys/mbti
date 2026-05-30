# Docker 部署说明

## 最短路径

Ubuntu 服务器上进入项目目录后：

```bash
bash scripts/server-setup-ubuntu.sh
bash scripts/install-caddy-ubuntu.sh soul-major.cn
bash scripts/deploy-server.sh
```

第一条装 Docker 和 Docker Compose 插件；第二条装 Caddy 并自动申请 HTTPS；第三条构建并启动项目。

如果 Caddy 安装时遇到 `curl: (35) Recv failure: Connection reset by peer`，改用 Nginx：

```bash
bash scripts/install-nginx-debian.sh soul-major.cn
```

等 DNS 指向服务器、80/443 放行后再签 HTTPS：

```bash
sudo certbot --nginx -d soul-major.cn -d www.soul-major.cn
```

## 我已经填好的

- 域名回调：`https://soul-major.cn/api/pay/wechat/notify`
- 报告价格：`990` 分
- Docker 生产启动参数
- 健康检查：`/api/health`
- 后台 Cookie 线上 Secure：`ADMIN_COOKIE_SECURE=true`

## 你必须自己填的

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `WECHAT_MP_APP_SECRET`：服务号 AppSecret，微信内 JSAPI 支付获取 openid 必填。
- `WECHAT_OAUTH_SESSION_SECRET`：OAuth 会话签名密钥，建议 32 位以上随机字符串。
- 微信支付密钥、公钥 ID 等参数可以先留空，后面申请好再补。

## 生成后台密码哈希

本地有 Node/npm 时：

```bash
npm run admin:hash -- "换成至少12位的强密码"
```

服务器只有 Docker 时：

```bash
bash scripts/admin-hash-docker.sh "换成至少12位的强密码"
```

把输出填进 `.env.production`：

```env
ADMIN_USERNAME=你的管理员账号
ADMIN_PASSWORD_HASH=脚本输出的值
ADMIN_SESSION_SECRET=脚本输出的值
```

## 启动

```bash
cp .env.production.example .env.production
docker compose up -d --build
docker compose ps
```

如果使用证书/公钥文件，建议放到服务器项目目录的 `certs/` 下，然后在 `.env.production` 里填容器内路径：

```env
WECHAT_PAY_APPID=wx634eed8e020b866f
WECHAT_MP_APPID=wx634eed8e020b866f
WECHAT_MP_APP_SECRET=服务号AppSecret
WECHAT_SITE_URL=https://soul-major.cn
WECHAT_OAUTH_SESSION_SECRET=32位以上随机字符串
WECHAT_PAY_MCHID=1745810998
WECHAT_PAY_PRIVATE_KEY_PATH=/app/certs/apiclient_key.pem
WECHAT_PAY_PUBLIC_KEY_PATH=/app/certs/pub_key.pem
```

`certs/` 会通过 Docker Compose 只读挂载到容器，不会被打进镜像层。

默认只绑定 `127.0.0.1:3000`，建议用 Nginx/Caddy 反代到 `https://soul-major.cn`。

微信内 JSAPI 支付还需要在平台后台配置：

- 微信公众平台 -> 公众号设置 -> 功能设置 -> 网页授权域名：`soul-major.cn`
- 微信支付商户平台 -> 产品中心 -> 开发配置 -> JSAPI 支付授权目录：`https://soul-major.cn/`
- 微信支付商户平台 -> 产品中心 -> 开发配置 -> 支付回调通知地址：`https://soul-major.cn/api/pay/wechat/notify`

配置网页授权域名时，微信会给一个 `MP_verify_*.txt` 校验文件。把它放到项目 `public/` 目录后重新部署，访问 `https://soul-major.cn/MP_verify_xxx.txt` 能看到文件内容再提交校验。

## 检查

```bash
curl http://127.0.0.1:3000/api/health
```
