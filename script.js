// IMPORTAMOS FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TU CONFIGURACIÓN
const firebaseConfig = {
  apiKey: "AIzaSyBduWRoZK8ia-UP3W-tJWtVu3_lTHKRp9M",
  authDomain: "blox-games-78e8b.firebaseapp.com",
  projectId: "blox-games-78e8b",
  storageBucket: "blox-games-78e8b.firebasestorage.app",
  messagingSenderId: "882404453394",
  appId: "1:882404453394:web:c79ee2a8cb29a6cd837ccb",
  measurementId: "G-BFKX5P23SN"
};

// INICIALIZAR
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// FUNCIÓN GLOBAL PARA GUARDAR PUNTOS
window.guardarPuntaje = async (juego, puntos) => {
    const user = auth.currentUser;
    if (user) {
        try {
            await addDoc(collection(db, "puntuaciones"), {
                nombre: user.displayName,
                foto: user.photoURL,
                juego: juego,
                puntos: puntos,
                fecha: new Date()
            });
            console.log("Puntaje guardado!");
        } catch (e) {
            console.error("Error al guardar:", e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LOGIN ---
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');

    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            signInWithPopup(auth, provider).catch(e => alert("Error: " + e.message));
        });
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => { localStorage.removeItem('bloxUsername'); location.reload(); });
        });
        onAuthStateChanged(auth, (user) => {
            if (user) {
                loginBtn.style.display = 'none';
                userInfo.style.display = 'flex';
                userPhoto.src = user.photoURL;
                userName.innerText = user.displayName.split(' ')[0];
                localStorage.setItem('bloxUsername', user.displayName);
            } else {
                loginBtn.style.display = 'inline-block';
                userInfo.style.display = 'none';
            }
        });
    }

    // --- 2. RANKING ---
    const tablaRanking = document.getElementById('tabla-ranking-body');
    if (tablaRanking) {
        cargarRankingGlobal();
    }

    async function cargarRankingGlobal() {
        try {
            const q = query(collection(db, "puntuaciones"), orderBy("puntos", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            
            tablaRanking.innerHTML = ""; 
            let posicion = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const fila = `
                    <tr>
                        <td class="player-rank">#${posicion}</td>
                        <td style="display:flex; align-items:center; gap:10px;">
                            <img src="${data.foto}" style="width:24px; height:24px; border-radius:50%;">
                            ${data.nombre}
                        </td>
                        <td>${data.juego}</td>
                        <td class="player-score">${data.puntos}</td>
                    </tr>
                `;
                tablaRanking.innerHTML += fila;
                posicion++;
            });
            if(querySnapshot.empty) {
                tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Sé el primero en el ranking.</td></tr>`;
            }
        } catch (error) {
            console.error("Error ranking:", error);
            tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center;">Error cargando datos.</td></tr>`;
        }
    }

    // --- 3. FILTROS Y ANIMACIONES (LO QUE FALTABA) ---
    const buttons = document.querySelectorAll('.category-buttons .btn');
    const subButtons = document.querySelectorAll('.sub-filter');
    const cards = document.querySelectorAll('.game-card');
    let currentCategory = 'all'; let currentTag = 'all';

    function filterGames() {
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            const cardTag = card.getAttribute('data-tag');
            const matchCat = (currentCategory === 'all' || cardCat === currentCategory);
            let matchTag = true;
            if (currentTag !== 'all') matchTag = (cardTag === currentTag);
            
            if (matchCat && matchTag) {
                card.style.display = 'flex';
                setTimeout(() => card.style.opacity = '1', 50);
            } else {
                card.style.display = 'none';
                card.style.opacity = '0';
            }
        });
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.getAttribute('data-filter');
            subButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('.sub-filter[data-tag="all"]').classList.add('active');
            currentTag = 'all';
            filterGames();
        });
    });

    subButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            subButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTag = this.getAttribute('data-tag');
            filterGames();
        });
    });

    // SCROLL REVEAL (Hace aparecer los juegos)
    const revealElements = document.querySelectorAll('.reveal');
    function checkReveal() {
        const windowHeight = window.innerHeight;
        revealElements.forEach((reveal) => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - 50) {
                reveal.classList.add('active');
                reveal.style.opacity = "1";
            }
        });
    }
    window.addEventListener('scroll', checkReveal);
    checkReveal(); // Ejecutar al inicio
    // Parche de seguridad
    setTimeout(() => { document.querySelectorAll('.reveal').forEach(el => el.style.opacity = '1'); }, 500);
});
