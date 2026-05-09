# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Integration with Backend

- **Dev proxy:** Vite is configured to proxy `'/api'` to `http://localhost:3000` (see `vite.config.js`). During local development you can leave `VITE_API_BASE_URL` empty so the frontend requests like `/api/...` are forwarded to the backend.
- **Environment:** Create `frontend/.env.development` with `VITE_API_BASE_URL=` (empty) to use the proxy. For production builds set `VITE_API_BASE_URL` to your backend origin (for example `https://api.mydomain.com`).
- **API client:** The API client is implemented at `frontend/src/lib/api.js` and reads `import.meta.env.VITE_API_BASE_URL`. Ensure calls use paths beginning with `/api` (for example `/api/incidents`).
- **Backend:** Start the backend with `cd backend && npm run dev` (or `npm start`). The backend listens on `PORT` from `.env` or defaults to `3000`.
- **Quick test:** After starting both servers, visit `http://localhost:5173` (Vite dev) and call `GET /api/health` from the browser or app; the backend should respond `OK`.
