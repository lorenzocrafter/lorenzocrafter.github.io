// --- CONFIGURACIÓN DE ADMIN ---
const ADMIN_EMAIL = "lorenzocrafteryt@gmail.com"; // <--- ¡CAMBIA ESTO POR TU CORREO!

// IMPORTAMOS FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, increment, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURACIÓN FIREBASE
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

// --- FUNCIONES GLOBALES (ACCESIBLES DESDE HTML) ---

// 1. SISTEMA DE ECONOMÍA (PAGOS)
async function pagarJugador(uid, puntos) {
    const monedasGanadas = Math.ceil(puntos / 10);
    if (monedasGanadas > 0) {
        const userRef = doc(db, "usuarios", uid);
        try {
            await updateDoc(userRef, { monedas: increment(monedasGanadas) });
            const coinDisplay = document.getElementById('coinDisplay');
            if(coinDisplay) {
                coinDisplay.classList.add('coin-pop');
                setTimeout(() => coinDisplay.classList.remove('coin-pop'), 300);
            }
        } catch (e) { console.error("Error pago:", e); }
    }
}

// 2. GUARDAR PUNTOS (INTELIGENTE)
window.guardarPuntaje = async (juego, puntos) => {
    const user = auth.currentUser;
    if (user) {
        const alias = localStorage.getItem('customAlias') || user.displayName;
        const avatar = localStorage.getItem('customAvatar') || user.photoURL;
        
        // Pagar primero
        await pagarJugador(user.uid, puntos);

        // Guardar Récord
        const docId = `${user.uid}_${juego.replace(/\s/g, '')}`; 
        const docRef = doc(db, "puntuaciones", docId);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && puntos <= docSnap.data().puntos) return;
            
            await setDoc(docRef, {
                nombre: alias,
                foto: avatar,
                juego: juego,
                puntos: puntos,
                fecha: new Date(),
                uid: user.uid
            });
        } catch (e) { console.error(e); }
    }
};

// 3. FAVORITOS
window.toggleFav = (btn, gameId, event) => {
    event.stopPropagation();
    btn.classList.toggle('active');
    let favs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
    if (btn.classList.contains('active')) { if (!favs.includes(gameId)) favs.push(gameId); } 
    else { favs = favs.filter(id => id !== gameId); }
    localStorage.setItem('bloxFavs', JSON.stringify(favs));
};

// 4. ADMIN: BORRAR MENSAJE
window.deleteMessage = async (msgId) => {
    if(!confirm("¿Borrar mensaje?")) return;
    try { await deleteDoc(doc(db, "chat", msgId)); } catch(e) { alert("Error al borrar"); }
};

// 5. ADMIN: BORRAR RÉCORD
window.deleteRecord = async (docId) => {
    if(!confirm("¿Borrar récord del ranking?")) return;
    try { await deleteDoc(doc(db, "puntuaciones", docId)); window.location.reload(); } catch(e) { alert("Error al borrar"); }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- GESTIÓN DE USUARIO ---
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');
    const coinDisplay = document.getElementById('coinDisplay');
    
    // Modal Alias
    const editNameBtn = document.getElementById('editNameBtn');
    const aliasModal = document.getElementById('aliasModal');
    const newAliasInput = document.getElementById('newAliasInput');
    const saveAliasBtn = document.getElementById('saveAliasBtn');
    const cancelAliasBtn = document.getElementById('cancelAliasBtn');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const googleAvatarOption = document.getElementById('googleAvatarOption');
    let selectedAvatarUrl = null;

    function updateProfileUI(user) {
        const storedAlias = localStorage.getItem('customAlias');
        const storedAvatar = localStorage.getItem('customAvatar');
        userName.innerText = storedAlias || user.displayName.split(' ')[0];
        userPhoto.src = storedAvatar || user.photoURL;
        if(googleAvatarOption) { googleAvatarOption.src = user.photoURL; googleAvatarOption.dataset.src = user.photoURL; }
        
        // ACTIVAR MODO ADMIN SI ES EL CORREO CORRECTO
        if (user.email === ADMIN_EMAIL) {
            document.body.classList.add('is-admin');
        }
    }

    async function inicializarBilletera(user) {
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, { email: user.email, monedas: 0 });
        }
        onSnapshot(userRef, (doc) => {
            const data = doc.data();
            if(data && coinDisplay) {
                coinDisplay.style.display = "flex";
                coinDisplay.innerText = `💰 ${data.monedas || 0}`;
            }
        });
    }

    if(loginBtn) {
        loginBtn.addEventListener('click', () => signInWithPopup(auth, provider).catch(e => alert(e.message)));
        logoutBtn.addEventListener('click', () => { signOut(auth).then(() => { localStorage.removeItem('bloxUsername'); location.reload(); }); });

        if(editNameBtn) editNameBtn.addEventListener('click', () => {
            aliasModal.style.display = 'flex'; newAliasInput.value = userName.innerText;
            const current = localStorage.getItem('customAvatar') || auth.currentUser.photoURL;
            selectedAvatarUrl = current;
            avatarOptions.forEach(img => {
                img.classList.remove('selected');
                if(img.dataset.src === current || (img.id === 'googleAvatarOption' && !localStorage.getItem('customAvatar'))) img.classList.add('selected');
            });
        });
        avatarOptions.forEach(img => {
            img.addEventListener('click', () => {
                avatarOptions.forEach(i => i.classList.remove('selected')); img.classList.add('selected'); selectedAvatarUrl = img.dataset.src;
            });
        });
        if(saveAliasBtn) saveAliasBtn.addEventListener('click', () => {
            const newName = newAliasInput.value.trim();
            if(newName.length > 0 && newName.length <= 12) {
                localStorage.setItem('customAlias', newName); userName.innerText = newName;
                if(selectedAvatarUrl) { localStorage.setItem('customAvatar', selectedAvatarUrl); userPhoto.src = selectedAvatarUrl; }
                aliasModal.style.display = 'none';
            } else alert("Nombre inválido.");
        });
        if(cancelAliasBtn) cancelAliasBtn.addEventListener('click', () => aliasModal.style.display = 'none');

        onAuthStateChanged(auth, (user) => {
            if (user) {
                loginBtn.style.display = 'none'; userInfo.style.display = 'flex';
                updateProfileUI(user);
                inicializarBilletera(user);
                localStorage.setItem('bloxUsername', user.displayName);
            } else {
                loginBtn.style.display = 'inline-block'; userInfo.style.display = 'none';
                if(coinDisplay) coinDisplay.style.display = "none";
                document.body.classList.remove('is-admin');
            }
        });
    }

    // --- RANKING ---
    const tablaRanking = document.getElementById('tabla-ranking-body');
    const rankTabs = document.querySelectorAll('.rank-tab');

    if (tablaRanking) {
        const defaultGame = document.querySelector('.rank-tab.active').getAttribute('data-game');
        cargarRanking(defaultGame);
        rankTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                rankTabs.forEach(t => t.classList.remove('active')); tab.classList.add('active');
                cargarRanking(tab.getAttribute('data-game'));
            });
        });
    }

    async function cargarRanking(juegoSeleccionado) {
        tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#888;">Cargando... ⏳</td></tr>`;
        try {
            const q = query(collection(db, "puntuaciones"), where("juego", "==", juegoSeleccionado), orderBy("puntos", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            tablaRanking.innerHTML = ""; 
            let posicion = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let rankIcon = `#${posicion}`;
                if(posicion === 1) rankIcon = "🥇"; if(posicion === 2) rankIcon = "🥈"; if(posicion === 3) rankIcon = "🥉";
                
                // BOTÓN BORRAR (Visible solo si eres Admin)
                const deleteBtn = `<button class="delete-btn" onclick="deleteRecord('${doc.id}')" style="color:red; margin-left:10px;">🗑️</button>`;

                const fila = `<tr><td class="player-rank">${rankIcon}</td><td style="display:flex; align-items:center; gap:10px;"><img src="${data.foto}" style="width:24px; height:24px; border-radius:50%;">${data.nombre} ${deleteBtn}</td><td>${data.juego}</td><td class="player-score">${data.puntos}</td></tr>`;
                tablaRanking.innerHTML += fila;
                posicion++;
            });
            if(querySnapshot.empty) tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Sin datos.</td></tr>`;
        } catch (error) { console.error(error); tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center;">Error cargando.</td></tr>`; }
    }

    // --- INTERFAZ (Filtros, Scroll, Favoritos) ---
    const searchInput = document.getElementById('searchInput');
    const buttons = document.querySelectorAll('.category-buttons .btn');
    const subButtons = document.querySelectorAll('.sub-filter');
    const cards = document.querySelectorAll('.game-card');
    let currentCategory = 'all'; let currentTag = 'all'; let searchTerm = '';

    // Cargar Favoritos
    const savedFavs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
    cards.forEach(card => { if (savedFavs.includes(card.getAttribute('data-game-id'))) card.querySelector('.fav-btn').classList.add('active'); });

    function filterGames() {
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category'); const cardTag = card.getAttribute('data-tag');
            const gameId = card.getAttribute('data-game-id');
            const title = card.querySelector('h3').innerText.toLowerCase();
            
            let matchCat = true;
            if (currentCategory === 'favoritos') {
                const myFavs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
                matchCat = myFavs.includes(gameId);
            } else if (currentCategory !== 'all') matchCat = (cardCat === currentCategory);
            
            let matchTag = true; if (currentTag !== 'all') matchTag = (cardTag === currentTag);
            const matchSearch = title.includes(searchTerm);

            if (matchCat && matchTag && matchSearch) { card.style.display = 'flex'; setTimeout(() => card.style.opacity = '1', 50); }
            else { card.style.display = 'none'; card.style.opacity = '0'; }
        });
    }
    if(searchInput) searchInput.addEventListener('input', (e) => { searchTerm = e.target.value.toLowerCase(); filterGames(); });
    buttons.forEach(btn => { btn.addEventListener('click', function() { buttons.forEach(b => b.classList.remove('active')); this.classList.add('active'); currentCategory = this.getAttribute('data-filter'); if(currentCategory === 'favoritos') { subButtons.forEach(b => b.classList.remove('active')); currentTag = 'all'; } filterGames(); }); });
    subButtons.forEach(btn => { btn.addEventListener('click', function(e) { e.preventDefault(); subButtons.forEach(b => b.classList.remove('active')); this.classList.add('active'); currentTag = this.getAttribute('data-tag'); filterGames(); }); });

    const revealElements = document.querySelectorAll('.reveal');
    function checkReveal() { const windowHeight = window.innerHeight; revealElements.forEach((reveal) => { const elementTop = reveal.getBoundingClientRect().top; if (elementTop < windowHeight - 50) { reveal.classList.add('active'); reveal.style.opacity = "1"; } }); }
    window.addEventListener('scroll', checkReveal); checkReveal(); setTimeout(() => { document.querySelectorAll('.reveal').forEach(el => el.style.opacity = '1'); }, 500);

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let uiAudioCtx;
    const playHoverSound = () => {
        if (!uiAudioCtx) uiAudioCtx = new AudioContext(); if (uiAudioCtx.state === 'suspended') uiAudioCtx.resume();
        const osc = uiAudioCtx.createOscillator(); const gain = uiAudioCtx.createGain();
        osc.connect(gain); gain.connect(uiAudioCtx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, uiAudioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, uiAudioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.02, uiAudioCtx.currentTime); gain.gain.linearRampToValueAtTime(0, uiAudioCtx.currentTime + 0.05);
        osc.start(); osc.stop(uiAudioCtx.currentTime + 0.05);
    };
    document.querySelectorAll('.game-card, .btn, .nav-links a, .sub-filter, .rank-tab').forEach(el => el.addEventListener('mouseenter', playHoverSound));

    // --- CHAT GLOBAL ---
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
            if(!user) { alert("Inicia sesión."); return; } if(text === "") return;
            const alias = localStorage.getItem('customAlias') || user.displayName.split(' ')[0];
            const avatar = localStorage.getItem('customAvatar') || user.photoURL;
            try { await addDoc(collection(db, "chat"), { usuario: alias, foto: avatar, mensaje: text, timestamp: serverTimestamp() }); chatInput.value = ""; } catch(e) { console.error(e); }
        };
        sendBtn.addEventListener('click', sendMessage); chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
        
        const qChat = query(collection(db, "chat"), orderBy("timestamp", "desc"), limit(20));
        onSnapshot(qChat, (snapshot) => {
            messagesBox.innerHTML = ''; const msgs = []; snapshot.forEach(doc => msgs.push({id: doc.id, ...doc.data()})); msgs.reverse();
            msgs.forEach(data => {
                if(!data.timestamp) return; 
                const isMine = auth.currentUser && (localStorage.getItem('customAlias') === data.usuario || auth.currentUser.displayName.includes(data.usuario));
                
                // BOTÓN BORRAR MENSAJE (Solo Admin)
                const deleteBtn = `<button class="delete-btn" onclick="deleteMessage('${data.id}')" style="color:red; font-size:10px;">🗑️</button>`;

                const div = document.createElement('div'); div.className = `message ${isMine ? 'mine' : ''}`;
                const userImg = data.foto || "https://api.dicebear.com/9.x/avataaars/svg?seed=Ghost";
                div.innerHTML = `<div style="display:flex; align-items:flex-start; gap:5px; margin-bottom:5px;"><img src="${userImg}" style="width:20px; height:20px; border-radius:50%; margin-top:2px;"><div><span class="msg-user">${data.usuario} ${deleteBtn}:</span> <span class="msg-content">${data.mensaje}</span></div></div>`;
                messagesBox.appendChild(div);
            });
            messagesBox.scrollTop = messagesBox.scrollHeight;
        });
    }
});
