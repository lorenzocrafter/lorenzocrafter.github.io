// --- CONFIGURACIÓN ---
const ADMIN_EMAIL = "lorenzocrafteryt@gmail.com"; // TU EMAIL

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// AÑADIDO: arrayUnion para guardar items
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, increment, arrayUnion, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBduWRoZK8ia-UP3W-tJWtVu3_lTHKRp9M",
  authDomain: "blox-games-78e8b.firebaseapp.com",
  projectId: "blox-games-78e8b",
  storageBucket: "blox-games-78e8b.firebasestorage.app",
  messagingSenderId: "882404453394",
  appId: "1:882404453394:web:c79ee2a8cb29a6cd837ccb",
  measurementId: "G-BFKX5P23SN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 1. SISTEMA VISUAL ---
window.showToast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    if(!container) return alert(msg);
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '🚫' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
};

// --- 2. TIENDA E INVENTARIO ---
function typeToClass(t) { return t==='gold'?'border-gold':t==='red'?'border-red':t==='rainbow'?'border-rainbow':''; }

function aplicarBorde(c) { 
    const i = document.getElementById('userPhoto'); 
    if(i && c){ 
        i.classList.remove('border-gold','border-red','border-rainbow'); 
        i.classList.add(c); 
        i.style.border='none'; 
    } 
}

window.comprarBorde = async (tipo, precio) => {
    const user = auth.currentUser;
    if (!user) return showToast("Inicia sesión para comprar.", "error");

    const userRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        const monedas = data.monedas || 0;
        const inventario = data.inventario || []; // Lista de cosas compradas
        const bordeDeseado = typeToClass(tipo);

        // CASO 1: YA LO COMPRASTE ANTES
        if (inventario.includes(bordeDeseado)) {
            await updateDoc(userRef, { bordeActivo: bordeDeseado });
            showToast(`¡Borde ${tipo} equipado!`, "success");
            aplicarBorde(bordeDeseado);
            return; // Salimos para no cobrar
        }

        // CASO 2: NO LO TIENES (HAY QUE COMPRAR)
        if (monedas >= precio) {
            // Cobrar, poner activo y AGREGAR AL INVENTARIO
            await updateDoc(userRef, {
                monedas: increment(-precio),
                bordeActivo: bordeDeseado,
                inventario: arrayUnion(bordeDeseado) 
            });
            showToast(`¡Compra exitosa! -${precio} monedas`, "success");
            aplicarBorde(bordeDeseado);
        } else {
            showToast(`Te faltan ${precio - monedas} monedas.`, "error");
        }
    }
};

// --- 3. GUARDAR PUNTOS ---
window.guardarPuntaje = async (juego, puntos) => {
    const user = auth.currentUser;
    if (user) {
        // Pagar
        const monedas = Math.ceil(puntos/10);
        const userRef = doc(db, "usuarios", user.uid);
        try { await updateDoc(userRef, { monedas: increment(monedas) }); } catch(e){}

        // Guardar Récord
        const alias = localStorage.getItem('customAlias') || user.displayName;
        const avatar = localStorage.getItem('customAvatar') || user.photoURL;
        
        let borde = '';
        const snap = await getDoc(userRef);
        if(snap.exists()) borde = snap.data().bordeActivo || '';

        const docId = `${user.uid}_${juego.replace(/\s/g, '')}`;
        const docRef = doc(db, "puntuaciones", docId);
        try {
            const s = await getDoc(docRef);
            if(s.exists() && puntos <= s.data().puntos) return;
            await setDoc(docRef, { nombre: alias, foto: avatar, borde: borde, juego: juego, puntos: puntos, fecha: new Date(), uid: user.uid });
        } catch(e){}
    }
};

// --- 4. FAVORITOS, ADMIN, ETC ---
window.toggleFav = (btn, gameId, event) => {
    event.stopPropagation();
    btn.classList.toggle('active');
    let favs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
    if (btn.classList.contains('active')) { if (!favs.includes(gameId)) favs.push(gameId); } 
    else { favs = favs.filter(id => id !== gameId); }
    localStorage.setItem('bloxFavs', JSON.stringify(favs));
    const activeFilter = document.querySelector('.filter-btn.active');
    if(activeFilter && activeFilter.getAttribute('data-filter') === 'favoritos') activeFilter.click();
};

window.deleteMessage = async (id) => { if(confirm("Borrar?")) await deleteDoc(doc(db, "chat", id)); };
window.deleteRecord = async (id) => { if(confirm("Borrar?")) await deleteDoc(doc(db, "puntuaciones", id)); window.location.reload(); };


// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');
    const coinDisplay = document.getElementById('coinDisplay');
    
    const editNameBtn = document.getElementById('editNameBtn');
    const aliasModal = document.getElementById('aliasModal');
    const newAliasInput = document.getElementById('newAliasInput');
    const saveAliasBtn = document.getElementById('saveAliasBtn');
    const cancelAliasBtn = document.getElementById('cancelAliasBtn');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const googleAvatarOption = document.getElementById('googleAvatarOption');
    const shopBtn = document.getElementById('shopBtn');
    let selectedAvatarUrl = null;

    if(loginBtn) {
        loginBtn.addEventListener('click', () => signInWithPopup(auth, provider).catch(e => showToast(e.message, "error")));
        logoutBtn.addEventListener('click', () => { signOut(auth).then(() => { localStorage.removeItem('bloxUsername'); location.reload(); }); });

        if(editNameBtn) editNameBtn.addEventListener('click', () => { aliasModal.style.display = 'flex'; newAliasInput.value = userName.innerText; });
        if(cancelAliasBtn) cancelAliasBtn.addEventListener('click', () => aliasModal.style.display = 'none');
        
        avatarOptions.forEach(img => {
            img.addEventListener('click', () => {
                avatarOptions.forEach(i => i.classList.remove('selected'));
                img.classList.add('selected'); selectedAvatarUrl = img.dataset.src;
            });
        });

        if(saveAliasBtn) saveAliasBtn.addEventListener('click', () => {
            const newName = newAliasInput.value.trim();
            if(newName.length > 0) {
                localStorage.setItem('customAlias', newName); userName.innerText = newName;
                if(selectedAvatarUrl) { localStorage.setItem('customAvatar', selectedAvatarUrl); userPhoto.src = selectedAvatarUrl; }
                aliasModal.style.display = 'none';
                showToast("Perfil actualizado", "success");
            }
        });

        if(shopBtn) shopBtn.addEventListener('click', () => document.getElementById('shopModal').style.display = 'flex');

        onAuthStateChanged(auth, (user) => {
            if (user) {
                loginBtn.style.display = 'none'; userInfo.style.display = 'flex';
                userName.innerText = localStorage.getItem('customAlias') || user.displayName.split(' ')[0];
                userPhoto.src = localStorage.getItem('customAvatar') || user.photoURL;
                if(googleAvatarOption) { googleAvatarOption.src = user.photoURL; googleAvatarOption.dataset.src = user.photoURL; }
                
                const userRef = doc(db, "usuarios", user.uid);
                onSnapshot(userRef, (s) => {
                    if(s.exists()) {
                        const data = s.data();
                        if(coinDisplay) { coinDisplay.style.display="flex"; coinDisplay.innerText=`💰 ${data.monedas||0}`; }
                        if(data.bordeActivo) aplicarBorde(data.bordeActivo);
                    } else setDoc(userRef, { email: user.email, monedas: 0, inventario: [] });
                });

                if(user.email === ADMIN_EMAIL) document.body.classList.add('is-admin');
            } else {
                loginBtn.style.display = 'inline-block'; userInfo.style.display = 'none';
                if(coinDisplay) coinDisplay.style.display = "none";
            }
        });
    }

    const tablaRanking = document.getElementById('tabla-ranking-body');
    const rankTabs = document.querySelectorAll('.rank-tab');

    if (tablaRanking) {
        const loadRank = async (game) => {
            tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando...</td></tr>`;
            try {
                const q = query(collection(db, "puntuaciones"), where("juego", "==", game), orderBy("puntos", "desc"), limit(10));
                const snap = await getDocs(q);
                tablaRanking.innerHTML = "";
                let p = 1;
                snap.forEach(d => {
                    const dat = d.data();
                    const del = `<button class="delete-btn" onclick="deleteRecord('${d.id}')">🗑️</button>`;
                    const cls = dat.borde || '';
                    const stl = cls ? '' : 'border:2px solid #555;';
                    let rIcon = p===1?'🥇':p===2?'🥈':p===3?'🥉':`#${p}`;
                    tablaRanking.innerHTML += `<tr><td class="player-rank">${rIcon}</td><td style="display:flex;align-items:center;gap:10px;"><img src="${dat.foto}" class="${cls}" style="width:24px;height:24px;border-radius:50%;${stl};object-fit:cover;">${dat.nombre} ${del}</td><td>${dat.juego}</td><td class="player-score">${dat.puntos}</td></tr>`;
                    p++;
                });
                if(snap.empty) tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Sin datos.</td></tr>`;
            } catch(e) { console.error(e); }
        };
        const def = document.querySelector('.rank-tab.active');
        if(def) loadRank(def.getAttribute('data-game'));
        rankTabs.forEach(t => t.addEventListener('click', () => {
            rankTabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); loadRank(t.getAttribute('data-game'));
        }));
    }

    const searchInput = document.getElementById('searchInput');
    const buttons = document.querySelectorAll('.category-buttons .btn');
    const subButtons = document.querySelectorAll('.sub-filter');
    const cards = document.querySelectorAll('.game-card');
    let currentCategory = 'all'; let currentTag = 'all'; let searchTerm = '';

    const savedFavs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
    cards.forEach(card => { if (savedFavs.includes(card.getAttribute('data-game-id'))) { const btn = card.querySelector('.fav-btn'); if(btn) btn.classList.add('active'); } });

    function filterGames() {
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category'); const cardTag = card.getAttribute('data-tag');
            const gameId = card.getAttribute('data-game-id'); const title = card.querySelector('h3').innerText.toLowerCase();
            let matchCat = true;
            if (currentCategory === 'favoritos') { const myFavs = JSON.parse(localStorage.getItem('bloxFavs')) || []; matchCat = myFavs.includes(gameId); } 
            else if (currentCategory !== 'all') { matchCat = (cardCat === currentCategory); }
            let matchTag = true; if (currentTag !== 'all') matchTag = (cardTag === currentTag);
            const matchSearch = title.includes(searchTerm);
            if (matchCat && matchTag && matchSearch) { card.style.display = 'flex'; setTimeout(() => card.style.opacity = '1', 10); } 
            else { card.style.display = 'none'; card.style.opacity = '0'; }
        });
    }

    if(searchInput) searchInput.addEventListener('input', (e) => { searchTerm = e.target.value.toLowerCase(); filterGames(); });
    buttons.forEach(btn => { btn.addEventListener('click', function() { buttons.forEach(b => b.classList.remove('active')); this.classList.add('active'); currentCategory = this.getAttribute('data-filter'); if(currentCategory === 'favoritos') { subButtons.forEach(b => b.classList.remove('active')); currentTag = 'all'; } filterGames(); }); });
    subButtons.forEach(btn => { btn.addEventListener('click', function(e) { e.preventDefault(); subButtons.forEach(b => b.classList.remove('active')); this.classList.add('active'); currentTag = this.getAttribute('data-tag'); filterGames(); }); });

    const chatToggle = document.getElementById('chatToggleBtn');
    const chatContainer = document.getElementById('chatContainer');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesBox = document.getElementById('chatMessages');

    if(chatToggle) {
        chatToggle.addEventListener('click', () => chatContainer.classList.add('open'));
        closeChatBtn.addEventListener('click', () => chatContainer.classList.remove('open'));
        const sendMessage = async () => {
            const text = chatInput.value.trim(); const user = auth.currentUser;
            if(!user) { showToast("Inicia sesión para chatear", "error"); return; } if(text === "") return;
            const alias = localStorage.getItem('customAlias') || user.displayName.split(' ')[0];
            const avatar = localStorage.getItem('customAvatar') || user.photoURL;
            try { await addDoc(collection(db, "chat"), { usuario: alias, foto: avatar, mensaje: text, timestamp: serverTimestamp() }); chatInput.value = ""; } catch(e){ console.error(e); }
        };
        sendBtn.addEventListener('click', sendMessage); chatInput.addEventListener('keypress', (e) => { if(e.key==='Enter') sendMessage(); });
        const qChat = query(collection(db, "chat"), orderBy("timestamp", "desc"), limit(20));
        onSnapshot(qChat, (snap) => {
            messagesBox.innerHTML = ''; const msgs = []; snap.forEach(d => msgs.push({id:d.id, ...d.data()})); msgs.reverse();
            msgs.forEach(d => { if(!d.timestamp) return; const isMine = auth.currentUser && (localStorage.getItem('customAlias')===d.usuario || auth.currentUser.displayName.includes(d.usuario)); const delBtn = `<button class="delete-btn" onclick="deleteMessage('${d.id}')" style="color:red;font-size:10px;margin-left:5px;">🗑️</button>`; const img = d.foto || "https://api.dicebear.com/9.x/bottts/svg?seed=bot"; messagesBox.innerHTML += `<div class="message ${isMine?'mine':''}" style="display:flex; gap:8px; align-items:start; margin-bottom:8px;"><img src="${img}" style="width:20px;height:20px;border-radius:50%;"><div><span class="msg-user">${d.usuario}${delBtn}:</span> <span class="msg-content">${d.mensaje}</span></div></div>`; });
            messagesBox.scrollTop = messagesBox.scrollHeight;
        });
    }

    const revealElements = document.querySelectorAll('.reveal');
    function checkReveal() { const windowHeight = window.innerHeight; revealElements.forEach((reveal) => { if (reveal.getBoundingClientRect().top < windowHeight - 50) { reveal.classList.add('active'); reveal.style.opacity = "1"; } }); }
    window.addEventListener('scroll', checkReveal); checkReveal(); setTimeout(() => { document.querySelectorAll('.reveal').forEach(el => el.style.opacity = '1'); }, 500);

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let uiAudioCtx;
    const playHoverSound = () => { if (!uiAudioCtx) uiAudioCtx = new AudioContext(); if (uiAudioCtx.state === 'suspended') uiAudioCtx.resume(); const osc = uiAudioCtx.createOscillator(); const gain = uiAudioCtx.createGain(); osc.connect(gain); gain.connect(uiAudioCtx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(800, uiAudioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, uiAudioCtx.currentTime + 0.05); gain.gain.setValueAtTime(0.02, uiAudioCtx.currentTime); gain.gain.linearRampToValueAtTime(0, uiAudioCtx.currentTime + 0.05); osc.start(); osc.stop(uiAudioCtx.currentTime + 0.05); };
    document.querySelectorAll('.game-card, .btn, .nav-links a, .sub-filter, .rank-tab').forEach(el => el.addEventListener('mouseenter', playHoverSound));
});
