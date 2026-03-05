import { getSupabase } from "/assets/supabaseClient.js";

const app = document.getElementById("app");
const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

const sbMsg = document.getElementById("sbMsg");
const searchInput = document.getElementById("searchInput");

const dmUserInput = document.getElementById("dmUserInput");
const dmCreateBtn = document.getElementById("dmCreateBtn");

const logoutBtn = document.getElementById("logoutBtn");

const dmList = document.getElementById("dmList");
const groupList = document.getElementById("groupList");

const chatAvatar = document.getElementById("chatAvatar");
const chatTitle = document.getElementById("chatTitle");
const chatSub = document.getElementById("chatSub");
const addMemberBtn = document.getElementById("addMemberBtn");

const msgs = document.getElementById("msgs");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("file");

// Modais
const groupModal = document.getElementById("groupModal");
const groupOpenBtn = document.getElementById("groupOpenBtn");
const groupCloseBtn = document.getElementById("groupCloseBtn");
const groupTitle = document.getElementById("groupTitle");
const groupMembers = document.getElementById("groupMembers");
const groupCreateBtn = document.getElementById("groupCreateBtn");
const groupMsg = document.getElementById("groupMsg");

const memberModal = document.getElementById("memberModal");
const memberCloseBtn = document.getElementById("memberCloseBtn");
const memberUsername = document.getElementById("memberUsername");
const memberAddBtn = document.getElementById("memberAddBtn");
const memberMsg = document.getElementById("memberMsg");

let supabase = null;
let session = null;
let me = null;

let threads = [];
let activeThread = null; // {id,type,title}
let pollTimer = null;

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}
function initials(name){
  const s = (name || "?").replace("@","").trim();
  return (s[0] || "?").toUpperCase();
}
function setTheme(theme){
  app.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeLabel.textContent = isDark ? "Light" : "Dark";
  localStorage.setItem("theme", theme);
}
setTheme(localStorage.getItem("theme") || "light");
themeBtn.addEventListener("click", () => {
  const cur = app.getAttribute("data-theme");
  setTheme(cur === "dark" ? "light" : "dark");
});

function showModal(el){ el.style.display = "flex"; }
function hideModal(el){ el.style.display = "none"; }

groupOpenBtn.addEventListener("click", () => {
  groupMsg.textContent = "";
  groupTitle.value = "";
  groupMembers.value = "";
  showModal(groupModal);
});
groupCloseBtn.addEventListener("click", () => hideModal(groupModal));
groupModal.addEventListener("click", (e) => { if(e.target === groupModal) hideModal(groupModal); });

memberCloseBtn.addEventListener("click", () => hideModal(memberModal));
memberModal.addEventListener("click", (e) => { if(e.target === memberModal) hideModal(memberModal); });

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/login.html";
});

async function requireSession(){
  supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  session = data.session;
  if(!session) window.location.href = "/login.html";

  const { data: u } = await supabase.auth.getUser();
  me = u.user;
}

async function api(path, opts = {}){
  const token = session?.access_token;
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  const res = await fetch(path, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

function renderThreads(){
  const f = (searchInput.value || "").trim().toLowerCase();

  const dms = threads.filter(t => t.type === "dm" && (!f || t.title.toLowerCase().includes(f)));
  const grps = threads.filter(t => t.type === "group" && (!f || t.title.toLowerCase().includes(f)));

  dmList.innerHTML = "";
  groupList.innerHTML = "";

  const makeItem = (t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-item" + (activeThread?.id === t.id ? " active" : "");
    btn.innerHTML = `
      <div class="avatar">${initials(t.title)}</div>
      <div class="chat-meta">
        <div class="chat-topline">
          <div class="chat-name">${escapeHtml(t.title)}</div>
          <div class="chat-time">${escapeHtml(t.last_time || "")}</div>
        </div>
        <div class="chat-preview">${escapeHtml(t.last_preview || "")}</div>
      </div>
    `;
    btn.addEventListener("click", () => openThread(t.id));
    return btn;
  };

  if(dms.length === 0){
    const x = document.createElement("div");
    x.className = "small";
    x.style.padding = "8px 10px";
    x.textContent = "Sem DMs.";
    dmList.appendChild(x);
  } else {
    dms.forEach(t => dmList.appendChild(makeItem(t)));
  }

  if(grps.length === 0){
    const x = document.createElement("div");
    x.className = "small";
    x.style.padding = "8px 10px";
    x.textContent = "Sem grupos.";
    groupList.appendChild(x);
  } else {
    grps.forEach(t => groupList.appendChild(makeItem(t)));
  }
}

async function loadThreads(){
  const data = await api("/api/threads.list", { method: "GET" });
  threads = data.threads || [];
  renderThreads();
}

searchInput.addEventListener("input", renderThreads);

dmCreateBtn.addEventListener("click", async () => {
  sbMsg.textContent = "Criando DM…";
  try{
    const username = dmUserInput.value.trim().toLowerCase();
    if(!/^[a-z0-9_]{3,20}$/.test(username)){
      throw new Error("Username inválido (a-z, 0-9, _ e 3-20).");
    }
    const out = await api("/api/dm.create", {
      method: "POST",
      body: JSON.stringify({ username })
    });
    sbMsg.textContent = "DM pronto ✅";
    dmUserInput.value = "";
    await loadThreads();
    await openThread(out.thread.id);
  } catch(e){
    sbMsg.textContent = e.message;
  }
});

groupCreateBtn.addEventListener("click", async () => {
  groupMsg.textContent = "Criando grupo…";
  groupCreateBtn.disabled = true;
  try{
    const title = groupTitle.value.trim();
    const members = groupMembers.value
      .split("\n")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const out = await api("/api/group.create", {
      method: "POST",
      body: JSON.stringify({ title, members })
    });

    groupMsg.textContent = "Grupo criado ✅";
    await loadThreads();
    await openThread(out.thread.id);
    hideModal(groupModal);
  } catch(e){
    groupMsg.textContent = e.message;
  } finally {
    groupCreateBtn.disabled = false;
  }
});

addMemberBtn.addEventListener("click", () => {
  memberMsg.textContent = "";
  memberUsername.value = "";
  showModal(memberModal);
});

memberAddBtn.addEventListener("click", async () => {
  memberMsg.textContent = "Adicionando…";
  memberAddBtn.disabled = true;
  try{
    const u = memberUsername.value.trim().toLowerCase();
    if(!/^[a-z0-9_]{3,20}$/.test(u)){
      throw new Error("Username inválido.");
    }
    if(!activeThread?.id) throw new Error("Nenhum chat selecionado.");
    if(activeThread.type !== "group") throw new Error("Isso só funciona em grupo.");

    await api("/api/group.addMember", {
      method: "POST",
      body: JSON.stringify({ thread_id: activeThread.id, username: u })
    });

    memberMsg.textContent = "Adicionado ✅";
    hideModal(memberModal);
  } catch(e){
    memberMsg.textContent = e.message;
  } finally {
    memberAddBtn.disabled = false;
  }
});

function formatHHMM(dateStr){
  if(!dateStr) return "";
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

async function openThread(threadId){
  activeThread = threads.find(t => t.id === threadId) || null;
  if(!activeThread) return;

  chatTitle.textContent = activeThread.title;
  chatSub.textContent = activeThread.type === "group" ? "Grupo" : "DM";
  chatAvatar.textContent = initials(activeThread.title);

  addMemberBtn.style.display = activeThread.type === "group" ? "inline-flex" : "none";

  renderThreads();
  await loadMessages(true);

  if(pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => loadMessages(false), 1500);
}

async function loadMessages(forceScroll){
  if(!activeThread?.id) return;

  const data = await api(`/api/messages.list?thread_id=${encodeURIComponent(activeThread.id)}`, { method: "GET" });
  const items = data.messages || [];

  msgs.innerHTML = `<div class="day">Hoje</div>` + items.map(m => {
    const mine = m.sender_id === me.id;
    const name = mine ? "Você" : (m.sender_username ? `@${m.sender_username}` : "User");
    const t = formatHHMM(m.created_at);

    const attach = m.attachment_url
      ? `<div style="margin-top:8px;">
           <a class="link" href="${escapeHtml(m.attachment_url)}" target="_blank" rel="noreferrer">
             📎 ${escapeHtml(m.attachment_name || "anexo")}
           </a>
         </div>`
      : "";

    const body = m.body
      ? `<div class="text">${escapeHtml(m.body).replace(/@(\w+)/g,'<span class="mention">@$1</span>')}</div>`
      : "";

    return `
      <div class="msg ${mine ? "me" : ""}">
        <div class="avatar">${initials(name)}</div>
        <div class="bubble">
          <div class="meta"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(t)}</span></div>
          ${body}
          ${attach}
        </div>
      </div>
    `;
  }).join("");

  if(forceScroll) msgs.scrollTop = msgs.scrollHeight;
}

attachBtn.addEventListener("click", () => fileInput.click());

async function uploadViaApi(file){
  // Lê base64 (MVP)
  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab);
  let binary = "";
  for(let i=0;i<bytes.length;i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);

  const out = await api("/api/upload.file", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      dataBase64: b64
    })
  });

  return out; // {url,name,type}
}

async function send(){
  if(!activeThread?.id) return;

  sendBtn.disabled = true;
  try{
    const text = input.value.trim();
    const file = fileInput.files?.[0] || null;

    if(!text && !file) return;

    let attachment = null;
    if(file){
      attachment = await uploadViaApi(file);
      fileInput.value = "";
    }

    await api("/api/messages.send", {
      method: "POST",
      body: JSON.stringify({
        thread_id: activeThread.id,
        body: text || null,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null
      })
    });

    input.value = "";
    await loadThreads();
    await loadMessages(true);
  } catch(e){
    sbMsg.textContent = e.message;
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", send);
input.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    send();
  }
});

(async function boot(){
  await requireSession();
  await loadThreads();
})();