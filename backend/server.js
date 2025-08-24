const express = require('express');
const cors = require('cors');
const path = require('path');
const { json, urlencoded } = require('body-parser');

// 简易的 TensorBoard 路由（无需外部模块）
const tensorboardRoutes = express.Router();
tensorboardRoutes.post('/prepare', (req, res) => {
  const { logdir } = req.body || {};
  const resolvedLogdir = logdir || './runs';
  // 仅返回建议命令与访问地址，实际启动建议在后端 shell 中运行
  return res.json({
    success: true,
    logdir: resolvedLogdir,
    command: `tensorboard --logdir ${resolvedLogdir} --port 6006 --host 127.0.0.1`,
    url: 'http://127.0.0.1:6006'
  });
});

const app = express();
const PORT = process.env.PORT || 5001;

// 中间件
app.use(cors());
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));

// 路由
app.use('/api/tensorboard', tensorboardRoutes);

// 简单的健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器正常运行' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 