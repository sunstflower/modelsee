
```bash
git clone https://github.com/<your-username>/modelsee.git
cd modelsee
```

```bash
cd backend
python3.12 -m venv .venv312
source .venv312/bin/activate


pip install -r requirements_layers.txt
pip install -r requirements_ml.txt

pip install redis hiredis chardet

backend
python -m uvicorn ml_backend:app --host 127.0.0.1 --port 8000 --reload
```

```bash
cd backend
npm install
npm run start
```

```bash
cd modelsee
npm install
npm run dev
```


## 启动 TensorBoard（端口 6006）

```bash
cd backend
source .venv312/bin/activate
tensorboard --logdir runs --port 6006 --host 127.0.0.1
```
