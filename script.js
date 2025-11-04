// Constants i variables globals
const DAILY_GOAL = 2000; 
const GLASS_VOLUME = 250;
const BOTTLE_VOLUME = 1000;

let currentWater = 0;
let waterHistory = [];

// Elements del DOM
const waterDropFill = document.getElementById('waterDropFill');
const waterPercentage = document.getElementById('waterPercentage');
const addGlassBtn = document.getElementById('addGlass');
const addBottleBtn = document.getElementById('addBottle');
const resetWaterBtn = document.getElementById('resetWater');
const historyList = document.getElementById('historyList');
const comparisonChartCtx = document.getElementById('comparisonChart').getContext('2d');
const zoomChartBtn = document.getElementById('zoomChart');
const downloadChartBtn = document.getElementById('downloadChart');
const chartModal = document.getElementById('chartModal');
const closeModalBtn = document.getElementById('closeModal');
const zoomedChartCtx = document.getElementById('zoomedChart').getContext('2d');
const particlesContainer = document.getElementById('particlesContainer');

// Gràfic de comparació
let comparisonChart;
let zoomedChart;

// Variables para WebGL
let scene, camera, renderer, plane, mouseX = 0, mouseY = 0;

// Inicialització
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadWaterData();
    initApp(); 
    updateDisplay(true);
    initializeCharts();
    setupDailyReset();
    initParticles();
    initWebGL();
    checkPWAInstall();
});

// Configuració dels listeners d'esdeveniments
function setupEventListeners() {
    addGlassBtn.addEventListener('click', addGlass);
    addBottleBtn.addEventListener('click', addBottle);
    resetWaterBtn.addEventListener('click', resetWater);
    zoomChartBtn.addEventListener('click', openChartModal);
    closeModalBtn.addEventListener('click', closeChartModal);
    downloadChartBtn.addEventListener('click', downloadChart);
    
    chartModal.addEventListener('click', function(event) {
        if (event.target === chartModal) {
            closeChartModal();
        }
    });

    // Seguimiento del ratón para efectos WebGL
    document.addEventListener('mousemove', function(event) {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Prevenir zoom en PWA
    document.addEventListener('touchmove', function(event) {
        if (event.scale !== 1) {
            event.preventDefault();
        }
    }, { passive: false });
}

// Inicialització de l'aplicació
function initApp() {
    console.log("Aplicació d'hidratació premium inicialitzada");
    tippy('[data-tippy-content]', {
        theme: 'premium', 
        animation: 'scale-subtle',
        inertia: true,
    });
}

// Inicializar WebGL para efectos líquidos
function initWebGL() {
    // Configurar escena
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('webgl-canvas'),
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Crear geometría para el plano de fondo
    const geometry = new THREE.PlaneGeometry(2, 2, 32, 32);
    
    // Crear material con shader personalizado para efecto líquido
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            mouse: { value: new THREE.Vector2(0, 0) },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: `
            varying vec2 vUv;
            uniform float time;
            uniform vec2 mouse;
            
            void main() {
                vUv = uv;
                
                // Efecto de onda basado en la posición del ratón
                vec3 pos = position;
                float dist = distance(uv, vec2(0.5, 0.5));
                float wave = sin(dist * 10.0 - time * 3.0) * 0.02;
                
                pos.z += wave;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec2 mouse;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            void main() {
                vec2 uv = vUv;
                
                // Efecto de distorsión líquida
                float distortion = sin(uv.x * 10.0 + time) * 0.005 +
                                 sin(uv.y * 8.0 + time * 1.3) * 0.005;
                
                uv.x += distortion;
                uv.y += distortion;
                
                // Color base con gradiente
                vec3 color1 = vec3(0.1, 0.5, 0.8);
                vec3 color2 = vec3(0.3, 0.7, 1.0);
                
                vec3 finalColor = mix(color1, color2, uv.y);
                
                // Añadir efecto de brillo basado en la posición del ratón
                float mouseDist = distance(uv, mouse);
                float glow = 0.1 * (1.0 - smoothstep(0.0, 0.3, mouseDist));
                
                finalColor += vec3(glow);
                
                gl_FragColor = vec4(finalColor, 0.1);
            }
        `,
        transparent: true
    });

    plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    camera.position.z = 1;

    // Animación
    function animate() {
        requestAnimationFrame(animate);
        
        // Actualizar uniformes
        material.uniforms.time.value += 0.01;
        material.uniforms.mouse.value.x = mouseX;
        material.uniforms.mouse.value.y = mouseY;
        
        renderer.render(scene, camera);
    }
    
    animate();

    // Redimensionar
    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    });
}

// Inicializar partículas flotantes
function initParticles() {
    for (let i = 0; i < 60; i++) {
        createParticle();
    }
}

function createParticle() {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Tamaño y posición aleatorios
    const size = Math.random() * 25 + 10;
    const posX = Math.random() * 100;
    const delay = Math.random() * 15;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.bottom = `-${size}px`;
    particle.style.animationDelay = `${delay}s`;
    
    particlesContainer.appendChild(particle);
    
    // Eliminar partícula después de la animación y crear una nueva
    setTimeout(() => {
        particle.remove();
        createParticle();
    }, 30000);
}

// Carregar dades de l'aigua des de localStorage
function loadWaterData() {
    const savedWater = localStorage.getItem('currentWater');
    const savedHistory = localStorage.getItem('waterHistory');
    const lastReset = localStorage.getItem('lastReset');
    
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
        resetWaterData();
        localStorage.setItem('lastReset', today);
    } else {
        currentWater = savedWater ? parseInt(savedWater) : 0;
        waterHistory = savedHistory ? JSON.parse(savedHistory) : [];
    }
}

// Guardar dades de l'aigua a localStorage
function saveWaterData() {
    localStorage.setItem('currentWater', currentWater.toString());
    localStorage.setItem('waterHistory', JSON.stringify(waterHistory));
}

// Restablir les dades de l'aigua
function resetWaterData() {
    currentWater = 0;
    waterHistory = [];
    saveWaterData();
}

// Configuració del restabliment diari
function setupDailyReset() {
    setInterval(function() {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            resetWaterData();
            updateDisplay();
            showNotification("S'ha restablert el consum d'aigua per al nou dia!");
        }
    }, 60000);
}

// Afegir un got d'aigua
function addGlass() {
    addWater(GLASS_VOLUME, 'Got', 'fa-solid fa-glass-water');
    createRippleEffect(addGlassBtn, 'rgba(33, 147, 176, 0.7)');
    playSoundEffect('glass');
}

// Afegir una ampolla d'aigua
function addBottle() {
    addWater(BOTTLE_VOLUME, 'Ampolla', 'fa-solid fa-bottle-water');
    createRippleEffect(addBottleBtn, 'rgba(0, 92, 151, 0.7)');
    playSoundEffect('bottle');
}

// Afegir aigua (funció principal)
function addWater(volume, type, icon) {
    const oldWater = currentWater;
    currentWater += volume;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
    
    waterHistory.unshift({
        type: type,
        volume: volume,
        icon: icon, 
        time: timeString,
        timestamp: now.getTime()
    });
    
    updateDisplay();
    saveWaterData();
    
    if (oldWater < DAILY_GOAL && currentWater >= DAILY_GOAL) {
        celebrateGoal();
    }
}

// Restablir tot el consum d'aigua
function resetWater() {
    createRippleEffect(resetWaterBtn, 'rgba(231, 56, 39, 0.7)');
    
    if (confirm("Estàs segur que vols eliminar tot el consum d'aigua d'avui?")) {
        resetWaterData();
        updateDisplay();
        showNotification("S'ha eliminat tot el consum d'aigua!");
    }
}

// Actualitzar la visualització
function updateDisplay(isInitialLoad = false) {
    const percentage = Math.min(100, (currentWater / DAILY_GOAL) * 100);
    const textPercentage = Math.round(percentage);
    
    // Actualizar la gota 3D
    if (waterDropFill) {
        waterDropFill.style.height = `${percentage}%`;
        
        // Efecto de onda en la superficie del agua
        if (!isInitialLoad) {
            const waveEffect = document.createElement('div');
            waveEffect.style.position = 'absolute';
            waveEffect.style.top = '0';
            waveEffect.style.left = '0';
            waveEffect.style.width = '100%';
            waveEffect.style.height = '10%';
            waveEffect.style.background = 'rgba(255, 255, 255, 0.3)';
            waveEffect.style.borderRadius = '50%';
            waveEffect.style.transform = 'translateY(-100%)';
            waveEffect.style.animation = 'waveRipple 0.5s ease-out forwards';
            
            waterDropFill.appendChild(waveEffect);
            
            setTimeout(() => {
                waveEffect.remove();
            }, 500);
        }
    }

    // Actualitzar el text del percentatge (amb GSAP)
    gsap.to({ val: parseInt(waterPercentage.textContent) || 0 }, {
        duration: isInitialLoad ? 0 : 2,
        ease: "power2.out",
        val: textPercentage,
        onUpdate: function() {
            waterPercentage.textContent = `${Math.round(this.targets()[0].val)}%`;
        }
    });
    
    updateHistoryList();
    updateCharts();
}

// Actualitzar la llista d'historial
function updateHistoryList() {
    historyList.innerHTML = '';
    
    if (waterHistory.length === 0) {
        historyList.innerHTML = `
            <div class="history-item">
                <div class="history-item-content">
                    <span class="history-icon"><i class="fa-solid fa-tint"></i></span>
                    <span class="history-text">Encara no has afegit aigua</span>
                </div>
            </div>
        `;
        return;
    }
    
    waterHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item animate__animated animate__fadeIn';
        historyItem.innerHTML = `
            <div class="history-item-content">
                <span class="history-icon"><i class="${item.icon}"></i></span>
                <span class="history-text">${item.type} (${item.volume}ml)</span>
                <span class="history-time">${item.time}</span>
            </div>
            <button class="delete-btn" data-index="${index}" data-tippy-content="Eliminar entrada">
                <i class="fa-solid fa-trash-alt"></i>
            </button>
        `;
        historyList.appendChild(historyItem);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteHistoryItem(index);
        });
        tippy(btn, {
            theme: 'premium',
            animation: 'scale-subtle',
            placement: 'left'
        });
    });
}

// Eliminar un element de l'historial
function deleteHistoryItem(index) {
    if (index >= 0 && index < waterHistory.length) {
        const removedVolume = waterHistory[index].volume;
        currentWater = Math.max(0, currentWater - removedVolume);
        
        waterHistory.splice(index, 1);
        
        updateDisplay();
        saveWaterData();
        showNotification("S'ha eliminat l'element de l'historial");
    }
}

// Inicialitzar els gràfics
function initializeCharts() {
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.font.weight = '400';
    Chart.defaults.color = '#5a6b8c';

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: 'Comparació del consum (ml)',
                font: { size: 16, weight: '600' },
                color: '#1a2b4b'
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(26, 43, 75, 0.9)',
                titleFont: { size: 14, weight: '600' },
                bodyFont: { size: 12 },
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw}ml`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: DAILY_GOAL * 1.25,
                grid: { color: 'rgba(0, 92, 151, 0.1)' },
                ticks: { color: '#1a2b4b' }
            },
            x: {
                grid: { display: false },
                ticks: {
                    color: '#1a2b4b',
                    font: { weight: '600' }
                }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        }
    };

    const chartData = {
        labels: ['El teu consum', 'Objectiu'],
        datasets: [{
            label: 'Consum d\'aigua',
            data: [currentWater, DAILY_GOAL],
            backgroundColor: [
                'rgba(112, 193, 255, 0.8)', 
                'rgba(0, 92, 151, 0.8)'   
            ],
            borderColor: ['#70c1ff', '#005c97'],
            borderWidth: 2,
            borderRadius: 10,
            borderSkipped: false,
        }]
    };

    comparisonChart = new Chart(comparisonChartCtx, { type: 'bar', data: JSON.parse(JSON.stringify(chartData)), options: chartOptions });
    zoomedChart = new Chart(zoomedChartCtx, { type: 'bar', data: JSON.parse(JSON.stringify(chartData)), options: chartOptions });
}

// Actualitzar els gràfics
function updateCharts() {
    const data = [currentWater, DAILY_GOAL];
    if (comparisonChart) {
        comparisonChart.data.datasets[0].data = data;
        comparisonChart.update('none');
    }
    if (zoomedChart) {
        zoomedChart.data.datasets[0].data = data;
        zoomedChart.update('none');
    }
}

// Obrir/Tancar Modal
function openChartModal() {
    chartModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => zoomedChart.resize(), 10);
}

function closeChartModal() {
    chartModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Descarregar el gràfic
function downloadChart() {
    const link = document.createElement('a');
    link.download = 'consum-aigua-' + new Date().toISOString().slice(0, 10) + '.png';
    link.href = comparisonChartCtx.canvas.toDataURL('image/png', 1.0);
    link.click();
    showNotification("S'ha descarregat el gràfic");
}

// Celebrar l'assoliment de l'objectiu
function celebrateGoal() {
    launchConfetti();
    playSoundEffect('celebration');
    
    gsap.to(".water-drop-3d", {
        duration: 0.3,
        scale: 1.1,
        y: -15,
        ease: "power2.out",
        yoyo: true,
        repeat: 3
    });
    
    showNotification("🎉 Felicitats! Has assolit el teu objectiu diari! 🎉", 5000);
}

// Llançar confeti
function launchConfetti() {
    const colors = ['#70c1ff', '#368ac0', '#005c97', '#ffffff'];
    confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: colors
    });
}

// Crear efecte de ripple (amb Anime.js)
function createRippleEffect(element, color) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    element.appendChild(ripple);
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    Object.assign(ripple.style, {
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        left: `${event.clientX - rect.left - size / 2}px`,
        top: `${event.clientY - rect.top - size / 2}px`,
        borderRadius: '50%',
        backgroundColor: color || 'rgba(255, 255, 255, 0.7)',
        transform: 'scale(0)',
        opacity: 1
    });

    anime({
        targets: ripple,
        scale: 4,
        opacity: 0,
        duration: 600,
        easing: 'easeOutExpo',
        complete: () => {
            ripple.remove();
        }
    });
}

// Reproduir efectes de so
function playSoundEffect(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        let freq = 400, dur = 0.1, gain = 0.3;
        
        switch(type) {
            case 'glass': freq = 880; dur = 0.2; gain = 0.2; break;
            case 'bottle': freq = 620; dur = 0.3; gain = 0.3; break;
            case 'celebration': freq = 1046; dur = 0.5; gain = 0.4; break;
        }
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        if (type === 'celebration') {
            oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, audioContext.currentTime + 0.1);
        }
        
        gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + dur);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + dur);
    } catch (e) {
        console.warn("L'API d'àudio no està suportada", e);
    }
}

// Mostrar notificació
function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'var(--color-text-primary)',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        zIndex: '2000',
        fontFamily: 'var(--font-primary)',
        fontWeight: '600',
        opacity: '0',
        transform: 'translateY(20px)'
    });
    
    document.body.appendChild(notification);
    
    anime({
        targets: notification,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutExpo'
    });

    setTimeout(() => {
        anime({
            targets: notification,
            opacity: [1, 0],
            translateY: [0, 20],
            duration: 500,
            easing: 'easeInExpo',
            complete: () => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }
        });
    }, duration);
}

// Comprobar si es PWA
function checkPWAInstall() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Executant com a PWA');
        // Aplicar estilos específicos para PWA
        document.body.classList.add('pwa-mode');
    }
}

// Manejar la instalación de PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar botón de instalación después de un tiempo
    setTimeout(() => {
        showInstallPrompt();
    }, 10000);
});

function showInstallPrompt() {
    if (deferredPrompt) {
        const installNotification = document.createElement('div');
        installNotification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--color-text-primary);
                color: white;
                padding: 15px 25px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 2000;
                font-family: var(--font-primary);
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 15px;
            ">
                <span>📱 Instal·lar com a app</span>
                <button style="
                    background: var(--color-water-light);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    color: var(--color-text-primary);
                    font-weight: 600;
                    cursor: pointer;
                ">Instal·lar</button>
                <button style="
                    background: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 5px;
                ">✕</button>
            </div>
        `;
        
        document.body.appendChild(installNotification);
        
        const installBtn = installNotification.querySelector('button');
        const closeBtn = installNotification.querySelectorAll('button')[1];
        
        installBtn.addEventListener('click', async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installNotification.remove();
            }
            deferredPrompt = null;
        });
        
        closeBtn.addEventListener('click', () => {
            installNotification.remove();
        });
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (installNotification.parentNode) {
                installNotification.remove();
            }
        }, 15000);
    }
}

// Funcionalidad de la Navbar
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const themeToggle = document.getElementById('themeToggle');
    const installBtn = document.getElementById('installBtn');

    // Scroll effect para la navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Toggle del menú móvil
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Cerrar menú al hacer clic en un enlace (móvil)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });

    // Cambio de tema
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Botón de instalación PWA
    if (installBtn) {
        installBtn.addEventListener('click', showInstallPrompt);
        
        // Ocultar botón si ya está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
            installBtn.style.display = 'none';
        }
    }

    // Navegación suave
    initSmoothScrolling();
}

// Cambio de tema
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// Navegación suave
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Actualizar enlace activo
                navLinks.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                // Scroll suave
                const offsetTop = targetElement.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Cargar tema guardado
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark' && themeToggle) {
        document.body.classList.add('dark-theme');
        const icon = themeToggle.querySelector('i');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

// Inicializar la navbar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initNavbar();
    loadSavedTheme();
    
    // Tooltips para la navbar
    tippy('#themeToggle', {
        content: 'Canviar tema',
        placement: 'bottom',
        theme: 'premium'
    });
    
    tippy('#installBtn', {
        content: 'Instal·lar app',
        placement: 'bottom',
        theme: 'premium'
    });
});
