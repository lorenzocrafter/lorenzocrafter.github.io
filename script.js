// --- CONFIGURACIÓN ---
const ADMIN_EMAIL = "lorenzocrafter@gmail.com"; 

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, increment, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- AUDIO FX ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let uiAudioCtx;
const playSound = (type) => {
    if (!uiAudioCtx) uiAudioCtx = new AudioContext();
    if (uiAudioCtx.state === 'suspended') uiAudioCtx.resume();
    const osc = uiAudioCtx.createOscillator(); const gain = uiAudioCtx.createGain();
    osc.connect(gain); gain.connect(uiAudioCtx.destination);
    
    if(type==='buy') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(600, uiAudioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(1200, uiAudioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, uiAudioCtx.currentTime); gain.gain.linearRampToValueAtTime(0, uiAudioCtx.currentTime + 0.2);
    } else if (type==='error') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, uiAudioCtx.currentTime); 
        osc.frequency.linearRampToValueAtTime(100, uiAudioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, uiAudioCtx.currentTime); gain.gain.linearRampToValueAtTime(0, uiAudioCtx.currentTime + 0.2);
    } else {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, uiAudioCtx.currentTime); 
        gain.gain.setValueAtTime(0.02, uiAudioCtx.currentTime); gain.gain.linearRampToValueAtTime(0, uiAudioCtx.currentTime + 0.05);
    }
    osc.start(); osc.stop(uiAudioCtx.currentTime + 0.2);
};

// --- NOTIFICACIONES VISUALES (TOAST) ---
window.showToast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '🚫' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
};

// --- TIENDA ---
window.comprarBorde = async (tipo, precio) => {
    const user = auth.currentUser;
    if (!user) { playSound('error'); return showToast("Inicia sesión para comprar", "error"); }

    const userRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
        const monedas = docSnap.data().monedas || 0;
        if (monedas >= precio) {
            // Compra instantánea (sin confirmación fea)
            await updateDoc(userRef, {
                monedas: increment(-precio),
                bordeActivo: typeToClass(tipo)
            });
            playSound('buy');
            showToast(`¡Comprado! Borde ${tipo.toUpperCase()} equipado`, "success");
            aplicarBorde(typeToClass(tipo));
        } else {
            playSound('error');
            showToast(`Te faltan ${precio - monedas} monedas`, "error");
        }
    }
};

function typeToClass(t) { return t==='gold'?'border-gold':t==='red'?'border-red':t==='rainbow'?'border-rainbow':''; }
function aplicarBorde(c) { const i=document.getElementById('userPhoto'); if(i&&c){ i.classList.remove('border-gold','border-red','border-rainbow'); i.classList.add(c); i.style.border='none'; } }

// --- GUARDAR PUNTOS ---
window.guardarPuntaje = async (juego, puntos) => {
    const user = auth.currentUser;
    if (user) {
        const monedas = Math.ceil(puntos/10);
        const userRef = doc(db, "usuarios", user.uid);
        try { await updateDoc(userRef, { monedas: increment(monedas) }); } catch(e){}

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

// --- INTERFAZ ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');
    const coinDisplay = document.getElementById('coinDisplay');
    
    // Modales
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
                        if(coinDisplay) { coinDisplay.style.display="flex"; coinDisplay.innerText=`💰 ${s.data().monedas||0}`; }
                        if(s.data().bordeActivo) aplicarBorde(s.data().bordeActivo);
                    } else setDoc(userRef, { email: user.email, monedas: 0 });
                });
                if(user.email === ADMIN_EMAIL) document.body.classList.add('is-admin');
            } else {
                loginBtn.style.display = 'inline-block'; userInfo.style.display = 'none';
                if(coinDisplay) coinDisplay.style.display = "none";
            }
        });
    }
    
    // Hover Sound
    document.querySelectorAll('.game-card, .btn, .nav-links a, .sub-filter, .rank-tab').forEach(el => el.addEventListener('mouseenter', () => playSound('hover')));

    // Ranking, Chat, Filtros y Scroll (Se mantienen igual, el script carga todo)
    const searchInput = document.getElementById('searchInput');
    const buttons = document.querySelectorAll('.category-buttons .btn');
    const subButtons = document.querySelectorAll('.sub-filter');
    const cards = document.querySelectorAll('.game-card');
    let currentCategory = 'all'; let currentTag = 'all'; let searchTerm = '';

    function filterGames() {
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category'); const cardTag = card.getAttribute('data-tag');
            const gameId = card.getAttribute('data-game-id'); const title = card.querySelector('h3').innerText.toLowerCase();
            let matchCat = true;
            if (currentCategory === 'favoritos') { const myFavs = JSON.parse(localStorage.getItem('bloxFavs')) || []; matchCat = myFavs.includes(gameId); } 
            else if (currentCategory !== 'all') { matchCat = (cardCat === currentCategory); }
            let matchTag = true; if (currentTag !== 'all') matchTag = (cardTag === currentTag);
            const matchSearch = title.includes(searchTerm);
            if (matchCat && matchTag && matchSearch) { card.style.display = 'flex'; setTimeout(() => card.style.opacity = '1', 50); } 
            else { card.style.display = 'none'; card.style.opacity = '0'; }
        });
    }
    if(searchInput) searchInput.addEventListener('input', (e) => { searchTerm = e.target.value.toLowerCase(); filterGames(); });
    buttons.forEach(btn => { btn.addEventListener('click', function() { buttons.forEach(b => b.classList.remove('active')); this.classList.add('active'); currentCategory = this.getAttribute('data-filter'); if(currentCategory === 'favoritos') { subButtons.forEach(b => b.classList.remove('active')); currentTag = 'all'; } filterGames(); }); });
    subButtons.forEach(btn => { btn.addEventListener('click', function(e) { e.preventDefault(); subButtons.forEach(b => b.classList.remove('active')); this.classList.add('active'); currentTag = this.getAttribute('data-tag'); filterGames(); }); });

    window.toggleFav = (btn, gameId, event) => {
        event.stopPropagation(); btn.classList.toggle('active');
        let favs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
        if (btn.classList.contains('active')) { if (!favs.includes(gameId)) favs.push(gameId); } else { favs = favs.filter(id => id !== gameId); }
        localStorage.setItem('bloxFavs', JSON.stringify(favs));
        const activeFilter = document.querySelector('.filter-btn.active');
        if(activeFilter && activeFilter.getAttribute('data-filter') === 'favoritos') activeFilter.click();
    };

    const savedFavs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
    cards.forEach(card => { if (savedFavs.includes(card.getAttribute('data-game-id'))) card.querySelector('.fav-btn').classList.add('active'); });

    const revealElements = document.querySelectorAll('.reveal');
    function checkReveal() { const windowHeight = window.innerHeight; revealElements.forEach((reveal) => { if (reveal.getBoundingClientRect().top < windowHeight - 50) { reveal.classList.add('active'); reveal.style.opacity = "1"; } }); }
    window.addEventListener('scroll', checkReveal); checkReveal(); setTimeout(() => { document.querySelectorAll('.reveal').forEach(el => el.style.opacity = '1'); }, 500);
});
