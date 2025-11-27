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

console.log("Firebase inicializado correctamente."); // CHIVATO 1

// --- FUNCIÓN GLOBAL PARA GUARDAR ---
window.guardarPuntaje = async (juego, puntos) => {
    const user = auth.currentUser;
    if (user) {
        try {
            console.log("Intentando guardar puntaje...", juego, puntos); // CHIVATO 2
            await addDoc(collection(db, "puntuaciones"), {
                nombre: user.displayName,
                foto: user.photoURL,
                juego: juego,
                puntos: puntos,
                fecha: new Date()
            });
            console.log("¡Puntaje guardado en la nube con éxito!"); // CHIVATO 3
        } catch (e) {
            console.error("ERROR AL GUARDAR:", e); // CHIVATO ERROR
            alert("No se pudo guardar el récord: " + e.message);
        }
    } else {
        console.log("No se guardó: Usuario no logueado.");
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
            signInWithPopup(auth, provider).then(() => console.log("Login OK")).catch(e => console.error(e));
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

    // --- 2. RANKING (CON CHIVATOS) ---
    const tablaRanking = document.getElementById('tabla-ranking-body');
    
    if (tablaRanking) {
        console.log("Estamos en la página de Ranking. Iniciando carga..."); // CHIVATO 4
        cargarRankingGlobal();
    }

    async function cargarRankingGlobal() {
        try {
            console.log("Pidiendo datos a Firebase..."); // CHIVATO 5
            const q = query(collection(db, "puntuaciones"), orderBy("puntos", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            
            console.log("Datos recibidos. Cantidad:", querySnapshot.size); // CHIVATO 6
            
            tablaRanking.innerHTML = ""; 

            let posicion = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Fila:", data); // CHIVATO 7
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
                tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">La base de datos está vacía. ¡Juega para inaugurarla!</td></tr>`;
            }

        } catch (error) {
            console.error("ERROR CRÍTICO AL LEER RANKING:", error); // CHIVATO ERROR FINAL
            tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error: ${error.message} <br> Mira la consola (F12) para más detalles.</td></tr>`;
        }
    }

    // --- 3. FILTROS Y UI ---
    // (El resto del código se mantiene igual para filtros y scroll)
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

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
});
