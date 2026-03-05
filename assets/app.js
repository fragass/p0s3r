const app = document.getElementById("app");
const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

const meLabel = document.getElementById("meLabel");
const sbMsg = document.getElementById("sbMsg");

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

// modais
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

let token = null;
let me = null;

let threads = [];
let activeThread = null;
let pollTimer = null;

function setTheme(theme){
  app.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeLabel.textContent = isDark ? "Light" : "Dark";
  localStorage.setItem("theme", theme);
}
setTheme(localStorage.getItem("theme") || "light");
themeBtn.addEventListener("click", () => {
  const cur = app.getAttribute("data-theme") || "light";
  setTheme(cur === "dark" ? "light" : "dark");
});

function show(el){ el.style.display = "flex"; }
function hide(el){ el.style.display = "none"; }

groupOpenBtn.addEventListener("click", () => {
  groupMsg.textContent = "";
  groupTitle.value = "";
  groupMembers.value = "";
  show(groupModal);
});
groupCloseBtn.addEventListener("click", () => hide(groupModal));
groupModal.addEventListener("click", (e)=>{ if(e.target===groupModal) hide(groupModal); });

memberCloseBtn.addEventListener("click", ()=> hide(memberModal));
memberModal.addEventListener("click", (e)=>{ if(e.target===memberModal) hide(memberModal); });

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}
function initials(name){
  const s = (name || "?").replace("@","").trim();
  return (s[0] || "?").toUpperCase();
}
function setSb(t){ sbMsg.textContent = t || ""; }

async function api(path, opts = {}){
  const headers = {
    "Content-Type":"application/json",
    ...(opts.headers || {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
  const res = await fetch(path, { ...opts, headers });
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function bootAuth(){
  token = localStorage.getItem("token");
  if(!token) return window.location.replace("/index.html");

  const meRes = await api("/api/auth.me", { method:"GET" });
  me = meRes.user;

  meLabel.textContent = `Logado como @${me.username}`;
}

logoutBtn.addEventListener("click", async () => {
  try { await api("/api/auth.logout", { method:"POST", body:"{}" }); } catch {}
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.replace("/index.html");
});

async function loadThreads(){
  const data = await api("/api/threads.list", { method:"GET" });
  threads = data.threads || [];
  renderThreads();
}

function renderThreads(){
  dmList.innerHTML = "";
  groupList.innerHTML = "";

  const dms = threads.filter(t => t.type === "dm");
  const grps = threads.filter(t => t.type === "group");

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

  if(!dms.length){
    const x = document.createElement("div");
    x.className = "small"; x.style.padding="8px 10px";
    x.textContent = "Sem DMs.";
    dmList.appendChild(x);
  } else dms.forEach(t => dmList.appendChild(makeItem(t)));

  if(!grps.length){
    const x = document.createElement("div");
    x.className = "small"; x.style.padding="8px 10px";
    x.textContent = "Sem grupos.";
    groupList.appendChild(x);
  } else grps.forEach(t => groupList.appendChild(makeItem(t)));
}

dmCreateBtn.addEventListener("click", async () => {
  try{
    setSb("Criando DM…");
    const u = dmUserInput.value.trim().toLowerCase();
    const out = await api("/api/dm.create", {
      method:"POST",
      body: JSON.stringify({ username: u })
    });
    dmUserInput.value = "";
    setSb("DM pronto ✅");
    await loadThreads();
    await openThread(out.thread.id);
  } catch(e){
    setSb(e.message);
  }
});

groupCreateBtn.addEventListener("click", async () => {
  groupMsg.textContent = "Criando…";
  groupCreateBtn.disabled = true;
  try{
    const title = groupTitle.value.trim();
    const members = groupMembers.value.split("\n").map(s=>s.trim().toLowerCase()).filter(Boolean);

    const out = await api("/api/group.create", {
      method:"POST",
      body: JSON.stringify({ title, members })
    });

    groupMsg.textContent = "Criado ✅";
    hide(groupModal);
    await loadThreads();
    await openThread(out.thread.id);
  } catch(e){
    groupMsg.textContent = e.message;
  } finally {
    groupCreateBtn.disabled = false;
  }
});

addMemberBtn.addEventListener("click", () => {
  memberMsg.textContent = "";
  memberUsername.value = "";
  show(memberModal);
});

memberAddBtn.addEventListener("click", async () => {
  memberMsg.textContent = "Adicionando…";
  memberAddBtn.disabled = true;
  try{
    const u = memberUsername.value.trim().toLowerCase();
    await api("/api/group.addMember", {
      method:"POST",
      body: JSON.stringify({ thread_id: activeThread.id, username: u })
    });
    hide(memberModal);
  } catch(e){
    memberMsg.textContent = e.message;
  } finally {
    memberAddBtn.disabled = false;
  }
});

function formatHHMM(dateStr){
  if(!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
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

async function loadMessages(scroll){
  if(!activeThread?.id) return;

  const data = await api(`/api/messages.list?thread_id=${encodeURIComponent(activeThread.id)}`, { method:"GET" });
  const items = data.messages || [];

  msgs.innerHTML = items.map(m => {
    const mine = m.sender_id === me.id;
    const name = mine ? "Você" : (m.sender_username ? `@${m.sender_username}` : "User");
    const t = formatHHMM(m.created_at);

    const attach = m.attachment_url
      ? `<div style="margin-top:8px;">
           <a class="link" href="${escapeHtml(m.attachment_url)}" target="_blank" rel="noreferrer">
             📎 ${escapeHtml(m.attachment_name || "anexo")}
           </a>
         </div>` : "";

    const body = m.body ? `<div class="text">${escapeHtml(m.body)}</div>` : "";

    return `
      <div class="msg ${mine ? "me":""}">
        <div class="avatar">${initials(name)}</div>
        <div class="bubble">
          <div class="meta"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(t)}</span></div>
          ${body}${attach}
        </div>
      </div>
    `;
  }).join("") || `<div class="small" style="text-align:center;margin-top:16px;">Sem mensagens.</div>`;

  if(scroll) msgs.scrollTop = msgs.scrollHeight;
}

attachBtn.addEventListener("click", ()=> fileInput.click());

async function uploadBase64(file){
  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab);
  let bin = "";
  for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);

  const out = await api("/api/upload.file", {
    method:"POST",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      dataBase64: b64
    })
  });

  return out;
}

async function send(){
  if(!activeThread?.id) return;

  sendBtn.disabled = true;
  try{
    const text = input.value.trim();
    const file = fileInput.files?.[0] || null;
    if(!text && !file) return;

    let att = null;
    if(file){
      att = await uploadBase64(file);
      fileInput.value = "";
    }

    await api("/api/messages.send", {
      method:"POST",
      body: JSON.stringify({
        thread_id: activeThread.id,
        body: text || null,
        attachment_url: att?.url || null,
        attachment_name: att?.name || null,
        attachment_type: att?.type || null
      })
    });

    input.value = "";
    await loadThreads();
    await loadMessages(true);
  } catch(e){
    setSb(e.message);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", send);
input.addEventListener("keydown", (e)=>{
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    send();
  }
});

(async function start(){
  await bootAuth();
  await loadThreads();
})();
