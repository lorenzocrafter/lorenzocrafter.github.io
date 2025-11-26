document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Lógica de Filtros (Categorías) ---
    // Seleccionamos los botones que están dentro del contenedor de categorías
    const buttons = document.querySelectorAll('.category-buttons .btn');
    const cards = document.querySelectorAll('.game-card');

    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            
            // A. Parte Visual (Lo que ya tenías):
            // Quita el color al botón anterior y se lo pone al nuevo
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // B. Parte Funcional (Lo NUEVO):
            // Lee qué categoría pide el botón (ej: "accion")
            const filterValue = this.getAttribute('data-filter');

            cards.forEach(card => {
                // Lee de qué categoría es la tarjeta
                const cardCategory = card.getAttribute('data-category');

                // Si es 'all' (Todos) o coincide la categoría, muéstralo
                if (filterValue === 'all' || cardCategory === filterValue) {
                    card.style.display = 'flex'; 
                    // Pequeño efecto suave al aparecer
                    setTimeout(() => card.style.opacity = '1', 50);
                } else {
                    // Si no coincide, ocúltalo
                    card.style.display = 'none';
                    card.style.opacity = '0';
                }
            });
        });
    });

    // --- 2. Smooth Scroll (Desplazamiento suave) ---
    // Hace que cuando toques "Juegos" en el menú, baje suavemente
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

});
