function seleccionarJuego(nombreJuego) {
    alert("¡Iniciando " + nombreJuego + "! 🎮 Preparando motores...");
    // Aquí en el futuro podrías redirigir a otra página real
}

// Esto hace que los botones de categoría cambien de color al hacer clic
const botones = document.querySelectorAll('.btn');

botones.forEach(boton => {
    boton.addEventListener('click', function() {
        // Quitar la clase 'active' a todos
        botones.forEach(b => b.classList.remove('active'));
        // Poner la clase 'active' al que clickeaste
        this.classList.add('active');
    });
});
