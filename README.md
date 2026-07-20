# iProjectX

Enterprise project management and delivery platform.

## Product direction

iProjectX is evolving from a local Streamlit + Excel PMO tool into a **multi-tenant SaaS web platform** with:

- Modern interactive web UI
- Organization workspaces and role-based access
- Seat-based subscription plans
- White-label branding per enterprise customer
- Full portfolio / delivery / finance / governance modules

## Start here (new SaaS platform)

```bash
cd platform
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

- App: http://localhost:3000
- Demo login: `demo@iprojectx.com` / `demo1234`

See [`platform/README.md`](platform/README.md) for full SaaS documentation.

## Legacy Streamlit app (reference)

The original local/desktop-oriented Streamlit application remains in the repository root (`app.py`, `pages/`, `utils/`, `data/PMO_Master.xlsx`) for domain reference and migration continuity.

```bash
pip install -r requirements.txt
python generate_master.py
streamlit run app.py
```
