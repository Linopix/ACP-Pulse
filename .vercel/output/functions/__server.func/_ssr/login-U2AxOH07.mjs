import { C as require_jsx_runtime, x as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { g as useHydrated, h as useCurrentUserState, n as AuthSkeleton, s as StudioIntro, t as AuthCard } from "./pulse-landing-CrPH949W.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-U2AxOH07.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const { user, isPending } = useCurrentUserState();
	if (!useHydrated() || isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioIntro, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSkeleton, {}) });
	if (user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioIntro, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthCard, {}) });
}
//#endregion
export { Login as component };
