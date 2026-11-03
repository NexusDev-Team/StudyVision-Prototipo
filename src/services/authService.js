// Autenticação MOCK de front-end (Sprint 4): usuários e sessão ficam em
// localStorage. Não há backend de contas — serve para demonstrar rotas
// privadas. Senhas são guardadas como hash SHA-256 (nunca em texto puro).

const USERS_KEY = "sv_users";
const SESSION_KEY = "sv_session";

export const DEMO_USER = {
  name: "Usuário Demo",
  email: "demo@studyvision.com",
  password: "jovi2026",
};

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(`studyvision:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const publicUser = ({ name, email }) => ({ name, email });

// Garante o usuário demo — idempotente, chamado a cada login/cadastro.
async function ensureDemoUser() {
  const users = readUsers();
  if (users.some((u) => u.email === DEMO_USER.email)) return;
  users.push({
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    passwordHash: await hashPassword(DEMO_USER.password),
  });
  writeUsers(users);
}

export function getSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY));
    return raw && raw.email ? { name: raw.name, email: raw.email } : null;
  } catch {
    return null;
  }
}

export async function login(email, password) {
  await ensureDemoUser();
  const user = readUsers().find((u) => u.email === normalizeEmail(email));
  const hash = await hashPassword(password);
  if (!user || user.passwordHash !== hash) {
    return { ok: false, error: "E-mail ou senha incorretos." };
  }
  const session = publicUser(user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

export async function register({ name, email, password }) {
  await ensureDemoUser();
  const users = readUsers();
  const normalized = normalizeEmail(email);
  if (users.some((u) => u.email === normalized)) {
    return { ok: false, error: "Já existe uma conta com esse e-mail." };
  }
  const user = { name: String(name).trim(), email: normalized, passwordHash: await hashPassword(password) };
  writeUsers([...users, user]);
  const session = publicUser(user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
