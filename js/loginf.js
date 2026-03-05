let mode = "login";

const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const submitBtn = document.getElementById("submitBtn");
const errorMsg = document.getElementById("errorMsg");

function setMode(next) {
  mode = next;
  if (mode === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    submitBtn.textContent = "Entrar";
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    submitBtn.textContent = "Criar conta";
  }
  errorMsg.textContent = "";
}

tabLogin.addEventListener("click", () => setMode("login"));
tabRegister.addEventListener("click", () => setMode("register"));

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const endpoint = mode === "login" ? "/api/login" : "/api/register";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json().catch(() => ({}));

  if (result.success) {
    sessionStorage.setItem("token", result.token);
    sessionStorage.setItem("loggedUser", result.user);
    window.location.href = "m3yxe8u27wpoovbz.html";
  } else {
    errorMsg.textContent = result.message || "Usuário ou senha inválidos!";
  }
});

setMode("login");
