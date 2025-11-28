// --- CONFIGURACIÓN ---
const ADMIN_EMAIL = "lorenzocrafteryt@gmail.com"; 

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, increment, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- FUNCIÓN: COMPRAR EN LA TIENDA ---
window.comprarBorde = async (tipo, precio) => {
    const user = auth.currentUser;
    if (!user) return alert("Debes iniciar sesión.");

    const userRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const monedas = docSnap.data().monedas || 0;
        if (monedas >= precio) {
            if (confirm(`¿Gastar ${precio} monedas en el borde ${tipo.toUpperCase()}?`)) {
                // Restar monedas y guardar el borde
                await updateDoc(userRef, {
                    monedas: increment(-precio),
                    bordeActivo: typeToClass(tipo) // Guardamos la clase CSS
                });
                alert("¡Compra exitosa! Tu perfil se ve genial.");
                // Actualizar visualmente al instante
                aplicarBorde(typeToClass(tipo));
            }
        } else {
            alert(`Te faltan ${precio - monedas} monedas. ¡Juega más!`);
        }
    }
};

// Helper: Convertir nombre corto a clase CSS
function typeToClass(tipo) {
    if (tipo === 'gold') return 'border-gold';
    if (tipo === 'red') return 'border-red';
    if (tipo === 'rainbow') return 'border-rainbow';
    return '';
}

// Helper: Aplicar borde visualmente
function aplicarBorde(clase) {
    const img = document.getElementById('userPhoto');
    if (img && clase) {
        // Quitar bordes viejos
        img.classList.remove('border-gold', 'border-red', 'border-rainbow');
        // Poner nuevo
        img.classList.add(clase);
        // Quitar el borde azul por defecto
        img.style.border = 'none';
    }
}

// --- FUNCIONES DE JUEGO Y PUNTOS ---
window.guardarPuntaje = async (juego, puntos) => {
    const user = auth.currentUser;
    if (user) {
        // 1. Pagar monedas
        const monedasGanadas = Math.ceil(puntos / 10);
        const userRef = doc(db, "usuarios", user.uid);
        try { 
            await updateDoc(userRef, { monedas: increment(monedasGanadas) }); 
            // Animación monedas
            const cd = document.getElementById('coinDisplay');
            if(cd) { cd.classList.add('coin-pop'); setTimeout(()=>cd.classList.remove('coin-pop'), 300); }
        } catch (e) { console.error(e); }

        // 2. Guardar Récord (con Borde Actual)
        const alias = localStorage.getItem('customAlias') || user.displayName;
        const avatar = localStorage.getItem('customAvatar') || user.photoURL;
        
        // Recuperamos el borde actual de la base de datos para guardarlo en el ranking
        let bordeActual = '';
        const uSnap = await getDoc(userRef);
        if(uSnap.exists()) bordeActual = uSnap.data().bordeActivo || '';

        const docId = `${user.uid}_${juego.replace(/\s/g, '')}`; 
        const docRef = doc(db, "puntuaciones", docId);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && puntos <= docSnap.data().puntos) return;
            
            await setDoc(docRef, {
                nombre: alias,
                foto: avatar,
                borde: bordeActual, // ¡Guardamos el borde en el récord!
                juego: juego,
                puntos: puntos,
                fecha: new Date(),
                uid: user.uid
            });
        } catch (e) { console.error(e); }
    }
};

// --- RESTO DE FUNCIONES (Favoritos, Admin, etc) ---
window.toggleFav = (btn, gameId, event) => {
    event.stopPropagation(); btn.classList.toggle('active');
    let favs = JSON.parse(localStorage.getItem('bloxFavs')) || [];
    if (btn.classList.contains('active')) { if (!favs.includes(gameId)) favs.push(gameId); } else { favs = favs.filter(id => id !== gameId); }
    localStorage.setItem('bloxFavs', JSON.stringify(favs));
};

window.deleteMessage = async (id) => { if(confirm("Borrar?")) await deleteDoc(doc(db, "chat", id)); };
window.deleteRecord = async (id) => { if(confirm("Borrar récord?")) await deleteDoc(doc(db, "puntuaciones", id)); window.location.reload(); };

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
    const shopBtn = document.getElementById('shopBtn'); // Botón Tienda
    let selectedAvatarUrl = null;

    // Función para cargar datos del usuario (Monedas y Borde)
    async function cargarDatosUsuario(user) {
        const userRef = doc(db, "usuarios", user.uid);
        
        // Escuchar cambios en tiempo real (Monedas y Borde)
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Actualizar Monedas
                if(coinDisplay) {
                    coinDisplay.style.display = "flex";
                    coinDisplay.innerText = `💰 ${data.monedas || 0}`;
                }
                // Actualizar Borde
                if(data.bordeActivo) aplicarBorde(data.bordeActivo);
            } else {
                // Si es nuevo, creamos su perfil
                setDoc(userRef, { email: user.email, monedas: 0, bordeActivo: '' });
            }
        });
    }

    if(loginBtn) {
        loginBtn.addEventListener('click', () => signInWithPopup(auth, provider).catch(e => alert(e.message)));
        logoutBtn.addEventListener('click', () => { signOut(auth).then(() => { localStorage.removeItem('bloxUsername'); location.reload(); }); });

        // Eventos Modales (Alias y Tienda)
        if(editNameBtn) editNameBtn.addEventListener('click', () => { aliasModal.style.display = 'flex'; newAliasInput.value = userName.innerText; });
        if(cancelAliasBtn) cancelAliasBtn.addEventListener('click', () => aliasModal.style.display = 'none');
        if(saveAliasBtn) saveAliasBtn.addEventListener('click', () => {
            const newName = newAliasInput.value.trim();
            if(newName.length > 0 && newName.length <= 12) {
                localStorage.setItem('customAlias', newName); userName.innerText = newName;
                if(selectedAvatarUrl) { localStorage.setItem('customAvatar', selectedAvatarUrl); userPhoto.src = selectedAvatarUrl; }
                aliasModal.style.display = 'none';
            } else alert("Nombre inválido.");
        });
        
        // Avatar Selection
        avatarOptions.forEach(img => {
            img.addEventListener('click', () => {
                avatarOptions.forEach(i => i.classList.remove('selected'));
                img.classList.add('selected'); selectedAvatarUrl = img.dataset.src;
            });
        });

        // Botón Tienda (Abre el modal #shopModal)
        if(shopBtn) {
            shopBtn.addEventListener('click', () => {
                document.getElementById('shopModal').style.display = 'flex';
            });
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                loginBtn.style.display = 'none'; userInfo.style.display = 'flex';
                userName.innerText = localStorage.getItem('customAlias') || user.displayName.split(' ')[0];
                userPhoto.src = localStorage.getItem('customAvatar') || user.photoURL;
                if(googleAvatarOption) { googleAvatarOption.src = user.photoURL; googleAvatarOption.dataset.src = user.photoURL; }
                
                cargarDatosUsuario(user); // <--- Carga monedas y bordes
                
                if(user.email === ADMIN_EMAIL) document.body.classList.add('is-admin');
            } else {
                loginBtn.style.display = 'inline-block'; userInfo.style.display = 'none';
                if(coinDisplay) coinDisplay.style.display = "none";
            }
        });
    }

    // --- RANKING (Con visualización de bordes) ---
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
                
                const deleteBtn = `<button class="delete-btn" onclick="deleteRecord('${doc.id}')" style="color:red; margin-left:10px;">🗑️</button>`;
                
                // APLICAR BORDE SI TIENE
                let imgClass = "";
                let imgStyle = "border: 2px solid #555;";
                if (data.borde) {
                    imgClass = data.borde; // 'border-gold', etc.
                    imgStyle = ""; // El estilo lo pone la clase
                }

                const fila = `<tr>
                    <td class="player-rank">${rankIcon}</td>
                    <td style="display:flex; align-items:center; gap:10px;">
                        <img src="${data.foto}" class="${imgClass}" style="width:24px; height:24px; border-radius:50%; ${imgStyle}">
                        ${data.nombre} ${deleteBtn}
                    </td>
                    <td>${data.juego}</td>
                    <td class="player-score">${data.puntos}</td>
                </tr>`;
                tablaRanking.innerHTML += fila;
                posicion++;
            });
            if(querySnapshot.empty) tablaRanking.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Sin datos.</td></tr>`;
        } catch (error) { console.error(error); }
    }

    // ... (El resto del código de Filtros, Scroll y Chat es idéntico, asegúrate de que esté o cópialo del anterior si falta) ...
    // He cortado aquí para abreviar, pero el Chat y los Filtros son iguales que la versión anterior.
    // Si necesitas que lo pegue TODO junto para no errar, avísame.
});
