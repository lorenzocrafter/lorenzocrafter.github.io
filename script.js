// IMPORTAMOS FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LOGIN GOOGLE ---
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');

    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            signInWithPopup(auth, provider)
                .then((result) => console.log("Conectado"))
                .catch((error) => alert("Error: " + error.message));
        });

        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                localStorage.removeItem('bloxUsername');
                location.reload();
            });
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

    // --- 2. SISTEMA DE FILTRADO TOTAL (Categoría + Submenú) ---
    const catButtons = document.querySelectorAll('.filter-btn'); // Botones grandes
    const subButtons = document.querySelectorAll('.sub-filter'); // Nuevos/Clásicos
    const cards = document.querySelectorAll('.game-card');

    let currentCategory = 'all';
    let currentTag = 'all';

    // Función maestra que decide qué mostrar
    function filterGames() {
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            const cardTag = card.getAttribute('data-tag');

            // ¿Cumple la categoría? (O está en 'todos')
            const matchCat = (currentCategory === 'all' || cardCat === currentCategory);
            
            // ¿Cumple el tag? (O está en 'populares/todos', o el juego es 'popular')
            // Nota: Para simplificar, si estás en "Populares" mostramos todo, 
            // si estás en "Nuevos" solo los nuevos, etc.
            let matchTag = true;
            if (currentTag !== 'all') {
                matchTag = (cardTag === currentTag);
            }

            if (matchCat && matchTag) {
                card.style.display = 'flex';
                setTimeout(() => card.style.opacity = '1', 50);
            } else {
                card.style.display = 'none';
                card.style.opacity = '0';
            }
        });
    }

    // Click en Categorías (Acción / Puzzle)
    catButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            catButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.getAttribute('data-filter');
            
            // Reseteamos el subfiltro visualmente para no confundir
            subButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('.sub-filter[data-tag="all"]').classList.add('active');
            currentTag = 'all';

            filterGames();
        });
    });

    // Click en Sub-menú (Nuevos / Clásicos)
    subButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); // Evitar saltos raros
            subButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTag = this.getAttribute('data-tag');
            filterGames();
        });
    });

    // --- 3. SMOOTH SCROLL (Por si el CSS falla en algún navegador viejo) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
});
// --- EFECTO DE PARTÍCULAS ---
const canvas = document.getElementById('hero-particles');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let particlesArray;

    // Ajustar tamaño
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight; // O altura del hero section

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5; // Puntos pequeños
            this.speedX = Math.random() * 1 - 0.5; // Movimiento lento
            this.speedY = Math.random() * 1 - 0.5;
            this.color = Math.random() > 0.5 ? 'rgba(0, 255, 242,' : 'rgba(112, 0, 255,'; // Cyan o Morado
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            // Rebotar en bordes (o reaparecer)
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.fillStyle = this.color + Math.random() + ')'; // Parpadeo
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particlesArray = [];
        const numberOfParticles = 60; // Cantidad de partículas
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
        }
        requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();

    // Redimensionar si cambia la ventana
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    });
}
// --- SCROLL REVEAL ---
window.addEventListener('scroll', () => {
    const reveals = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;
    const elementVisible = 150;

    reveals.forEach((reveal) => {
        const elementTop = reveal.getBoundingClientRect().top;
        if (elementTop < windowHeight - elementVisible) {
            reveal.classList.add('active');
        }
    });
});
// Disparar una vez al inicio por si ya se ve
window.dispatchEvent(new Event('scroll'));
