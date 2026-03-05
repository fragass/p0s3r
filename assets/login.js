const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

const username = document.getElementById("username");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const msg = document.getElementById("msg");

function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeLabel.textContent = isDark ? "Light" : "Dark";
  localStorage.setItem("theme", theme);
}
setTheme(localStorage.getItem("theme") || "light");
themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  setTheme(cur === "dark" ? "light" : "dark");
});

function setMsg(t){ msg.textContent = t || ""; }

async function api(path, body){
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body || {})
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

(function boot(){
  const token = localStorage.getItem("token");
  if(token) window.location.replace("/p0s3r.html");
})();

loginBtn.addEventListener("click", async () => {
  setMsg("Entrando…");
  loginBtn.disabled = true;

  try{
    const out = await api("/api/auth.login", {
      username: username.value.trim().toLowerCase(),
      password: password.value
    });

    localStorage.setItem("token", out.token);
    localStorage.setItem("user", out.user.username);
    window.location.replace("/p0s3r.html");
  } catch(e){
    setMsg(e.message);
  } finally {
    loginBtn.disabled = false;
  }
});

registerBtn.addEventListener("click", async () => {
  setMsg("Criando conta…");
  registerBtn.disabled = true;

  try{
    await api("/api/auth.register", {
      username: username.value.trim().toLowerCase(),
      password: password.value
    });
    setMsg("Conta criada ✅ agora clique em Entrar.");
  } catch(e){
    setMsg(e.message);
  } finally {
    registerBtn.disabled = false;
  }
});
