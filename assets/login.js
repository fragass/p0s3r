import { getSupabase } from "/assets/supabaseClient.js";

const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");

const submitBtn = document.getElementById("submitBtn");
const signupExtra = document.getElementById("signupExtra");
const msg = document.getElementById("msg");

let mode = "login"; // login | signup
let supabase = null;

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

function bindToggleLink(){
  const el = document.getElementById("toggleMode");
  if (!el) return;

  el.addEventListener("click", (e) => {
    e.preventDefault();
    mode = mode === "login" ? "signup" : "login";
    signupExtra.style.display = mode === "signup" ? "grid" : "none";
    submitBtn.textContent = mode === "signup" ? "Criar conta" : "Entrar";

    document.querySelector("#toggleRow").innerHTML =
      mode === "signup"
        ? `Já tem conta? <a class="link" href="#" id="toggleMode">Entrar</a>`
        : `Não tem conta? <a class="link" href="#" id="toggleMode">Cadastrar</a>`;

    msg.textContent = "";
    bindToggleLink();
  });
}
bindToggleLink();

async function ensureReady(){
  supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) window.location.replace("/p0s3r.html");
}
ensureReady();

async function setUsernameForUser(userId, desired){
  const clean = String(desired || "").trim().toLowerCase();
  if(!/^[a-z0-9_]{3,20}$/.test(clean)){
    throw new Error("Username inválido. Use a-z, 0-9, _ e 3-20 caracteres.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: clean })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

submitBtn.addEventListener("click", async () => {
  msg.textContent = "…";
  submitBtn.disabled = true;

  try{
    if(!supabase) supabase = await getSupabase();

    if(mode === "signup"){
      const { data, error } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value
      });
      if(error) throw error;

      const userId = data.user?.id;
      if(userId){
        await setUsernameForUser(userId, username.value);
      }

      msg.textContent = "Conta criada. Agora faça login.";
      mode = "login";
      signupExtra.style.display = "none";
      submitBtn.textContent = "Entrar";
      document.querySelector("#toggleRow").innerHTML =
        `Não tem conta? <a class="link" href="#" id="toggleMode">Cadastrar</a>`;
      bindToggleLink();
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });
      if(error) throw error;

      window.location.replace("/p0s3r.html");
    }
  } catch(e){
    const msgRaw = e?.message || "Erro.";
    if (msgRaw.toLowerCase().includes("email not confirmed")) {
      msg.textContent = "Email não confirmado. Desative a confirmação no Supabase (Auth → Providers → Email) ou confirme o email do usuário.";
    } else {
      msg.textContent = msgRaw;
    }
  } finally {
    submitBtn.disabled = false;
  }
});
