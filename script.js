// IMPORTAMOS FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TU CONFIGURACIÓN (NO LA TOQUES)
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

// --- FUNCIÓN GLOBAL PARA GUARDAR PUNTOS (USANDO ALIAS) ---
window.guardarPuntaje = async (juego, puntos) => {
    const user = auth.currentUser;
    if (user) {
        // PRIORIDAD: ¿Tiene un alias local guardado? Si no, usa el de Google.
        const alias = localStorage.getItem('customAlias') || user.displayName;
        
        try {
            await addDoc(collection(db, "puntuaciones"), {
                nombre: alias, // Guardamos el ALIAS, no el nombre real
                foto: user.photoURL,
                juego: juego,
                puntos: puntos,
                fecha: new Date()
            });
            console.log(`Puntaje guardado para ${alias}`);
        } catch (e) {
            console.error("Error al guardar:", e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GESTIÓN DE USUARIO Y ALIAS ---
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');
    const editNameBtn = document.getElementById('editNameBtn');

    // Función para actualizar la interfaz con el nombre correcto
    function updateDisplayName(googleName) {
        const storedAlias = localStorage.getItem('customAlias');
        userName.innerText = storedAlias || googleName.split(' ')[0]; // Muestra Alias o Primer nombre
    }

    if(loginBtn) {
        // Login
        loginBtn.addEventListener('click', () => {
            signInWithPopup(auth, provider).catch(e => alert("Error: " + e.message));
        });

        // Logout
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => { 
                localStorage.removeItem('bloxUsername');
                // Opcional: No borramos el alias para que lo recuerde al volver
                location.reload(); 
            });
        });

        // Cambiar Alias
        if(editNameBtn) {
            editNameBtn.addEventListener('click', () => {
                const current = userName.innerText;
                const newName = prompt("Ingresa tu nuevo Gamertag (Alias):", current);
                if(newName && newName.trim() !== "") {
                    // Guardamos en memoria local
                    localStorage.setItem('customAlias', newName.trim());
                    // Actualizamos visualmente
                    userName.innerText = newName.trim();
                }
            });
        }

        // Monitor de Estado
        onAuthStateChanged(auth, (user) => {
            if (user) {
                loginBtn.style.display = 'none';
                userInfo.style.display = 'flex';
                userPhoto.src = user.photoURL;
                updateDisplayName(user.displayName); // Usamos nuestra función inteligente
                localStorage.setItem('bloxUsername', user.displayName);
            } else {
                loginBtn.style.display = 'inline-block';
                userInfo.style.display = 'none';
            }
        });
    }

    // --- 2. BUSCADOR Y FILTROS ---
    const searchInput = document.getElementById('searchInput');
    const buttons = document.querySelectorAll('.category-buttons .btn');
    const subButtons = document.querySelectorAll('.sub-filter');
    const cards = document.querySelectorAll('.game-card');
    
    let currentCategory = 'all';
    let currentTag = 'all';
    let searchTerm = '';

    function filterGames() {
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            const cardTag = card.getAttribute('data-tag');
            const title = card.querySelector('h3').innerText.toLowerCase();

            // 1. Filtro por Categoría
            const matchCat = (currentCategory === 'all' || cardCat === currentCategory);
            
            // 2. Filtro por Etiqueta (Nuevo/Clásico)
            let matchTag = true;
            if (currentTag !== 'all') matchTag = (cardTag === currentTag);

            // 3. Filtro por Búsqueda
            const matchSearch = title.includes(searchTerm);

            // Tienen que cumplirse TODAS las condiciones
            if (matchCat && matchTag && matchSearch) {
                card.style.display = 'flex';
                setTimeout(() => card.style.opacity = '1', 50);
            } else {
                card.style.display = 'none';
                card.style.opacity = '0';
            }
        });
    }

    // Evento Búsqueda
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            filterGames();
        });
    }

    // Evento Categorías
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.getAttribute('data-filter');
            // Resetear subfiltros para no confundir
            subButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('.sub-filter[data-tag="all"]').classList.add('active');
            currentTag = 'all';
            filterGames();
        });
    });

    // Evento Sub-menú
    subButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            subButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTag = this.getAttribute('data-tag');
            filterGames();
        });
    });

    // --- 3. RANKING (Si estamos en esa página) ---
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

    // --- 4. SCROLL REVEAL ---
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
    checkReveal();
    setTimeout(() => { document.querySelectorAll('.reveal').forEach(el => el.style.opacity = '1'); }, 500);
});
