// Estado global de AgroConnect
let inventario = JSON.parse(localStorage.getItem("agro_inventario")) || {};
let usuarioActual = null;
let rolActual = null;
let monedaActual = "Bs";
const TASA_CAMBIO = 6.96;
let chartInstance = null;

const USUARIOS = {
    admin: { pass: "1234", rol: "Administrador" },
    operador: { pass: "0000", rol: "Operador" }
};

// --- LOGIN Y SEGURIDAD ---
document.getElementById("btn-login").addEventListener("click", validarLogin);
document.getElementById("login-pass").addEventListener("keypress", (e) => {
    if (e.key === "Enter") validarLogin();
});

function validarLogin() {
    const usr = document.getElementById("login-user").value.trim();
    const pwd = document.getElementById("login-pass").value.trim();
    const err = document.getElementById("login-error");

    if (USUARIOS[usr] && USUARIOS[usr].pass === pwd) {
        usuarioActual = usr;
        rolActual = USUARIOS[usr].rol;
        err.textContent = "";
        document.getElementById("user-badge").textContent = `${usr} (${rolActual})`;
        document.getElementById("login-screen").classList.remove("active");
        document.getElementById("main-screen").classList.add("active");
        renderizarTodo();
    } else {
        err.textContent = "Usuario o contraseña incorrectos.";
    }
}

document.getElementById("btn-logout").addEventListener("click", () => {
    document.getElementById("main-screen").classList.remove("active");
    document.getElementById("login-screen").classList.add("active");
    document.getElementById("login-pass").value = "";
});

// --- NAVEGACIÓN Y ATAJOS ALT + 1-6 ---
const navBtns = document.querySelectorAll(".nav-btn");
navBtns.forEach(btn => {
    btn.addEventListener("click", () => cambiarSeccion(btn.dataset.section));
});

function cambiarSeccion(secId) {
    navBtns.forEach(b => b.classList.toggle("active", b.dataset.section === secId));
    document.querySelectorAll(".tab-section").forEach(s => s.classList.remove("active"));
    document.getElementById(`sec-${secId}`).classList.add("active");

    if (secId === "tarjetas") renderizarTarjetas();
    if (secId === "analitica") renderizarGrafico();
}

document.addEventListener("keydown", (e) => {
    if (e.altKey) {
        const map = { "1": "inventario", "2": "tarjetas", "3": "analitica", "4": "calculadora", "5": "respaldos", "6": "creditos" };
        if (map[e.key]) cambiarSeccion(map[e.key]);
    }
});

// --- TEMA Y MONEDA ---
document.getElementById("btn-theme").addEventListener("click", (e) => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    e.currentTarget.innerHTML = isLight
    ? '<i class="fa-solid fa-sun"></i> Claro'
    : '<i class="fa-solid fa-moon"></i> Oscuro';
});

document.getElementById("btn-currency").addEventListener("click", (e) => {
    monedaActual = monedaActual === "Bs" ? "$us" : "Bs";
    e.currentTarget.textContent = `Moneda: ${monedaActual}`;
    renderizarTodo();
});

function formatearMonto(montoBs) {
    const val = monedaActual === "$us" ? montoBs / TASA_CAMBIO : montoBs;
    return `${val.toFixed(2)} ${monedaActual}`;
}

// --- CRUD DE INVENTARIO ---
function guardarEnDisco() {
    localStorage.setItem("agro_inventario", JSON.stringify(inventario));
}

document.getElementById("btn-save-prod").addEventListener("click", () => {
    const nombre = document.getElementById("prod-name").value.trim();
    const costo = parseFloat(document.getElementById("prod-cost").value);
    const cantidad = parseFloat(document.getElementById("prod-qty").value);
    const unidad = document.getElementById("prod-unit").value;
    const telefono = document.getElementById("prod-phone").value.trim();

    if (!nombre || isNaN(costo) || isNaN(cantidad) || cantidad <= 0 || !telefono) {
        alert("Completa todos los campos con valores numéricos válidos.");
        return;
    }

    const precioJusto = (costo / cantidad) * 1.30;
    inventario[nombre] = { costo, cantidad, unidad, precioJusto, telefono };
    guardarEnDisco();
    renderizarTodo();

    ["prod-name", "prod-cost", "prod-qty", "prod-phone"].forEach(id => document.getElementById(id).value = "");
});

function eliminarProducto(nombre) {
    if (rolActual !== "Administrador") {
        alert("Permiso denegado: Solo un Administrador puede eliminar productos.");
        return;
    }
    if (confirm(`¿Eliminar '${nombre}' permanentemente?`)) {
        delete inventario[nombre];
        guardarEnDisco();
        renderizarTodo();
    }
}

// --- SÚPER DEMO REGIONAL TIQUINA ---
document.getElementById("btn-demo").addEventListener("click", () => {
    const demo = {
        "Trucha Fresca Titicaca": { costo: 450, cantidad: 3, unidad: "Kilogramo (kg)", precioJusto: 195.00, telefono: "+591 71234567" },
                                                     "Papa Imilla Seleccionada": { costo: 280, cantidad: 18, unidad: "Arroba (@)", precioJusto: 20.22, telefono: "+591 72345678" },
                                                     "Haba Verde Orgánica": { costo: 320, cantidad: 4, unidad: "Quintal (qq)", precioJusto: 104.00, telefono: "+591 73456789" },
                                                     "Quinua Real Sica Sica": { costo: 600, cantidad: 25, unidad: "Kilogramo (kg)", precioJusto: 31.20, telefono: "+591 74567890" },
                                                     "Queso Pasteurizado Tiquina": { costo: 350, cantidad: 2, unidad: "Unidad", precioJusto: 227.50, telefono: "+591 76789012" },
                                                     "Oca Soleada Andina": { costo: 180, cantidad: 15, unidad: "Arroba (@)", precioJusto: 15.60, telefono: "+591 77890123" }
    };
    inventario = { ...inventario, ...demo };
    guardarEnDisco();
    renderizarTodo();
});

// --- RENDERIZADO DE TABLA, TARJETAS Y GRÁFICOS ---
document.getElementById("search-input").addEventListener("input", renderizarTabla);

function renderizarTodo() {
    renderizarTabla();
    renderizarTarjetas();
}

function renderizarTabla() {
    const filtro = document.getElementById("search-input").value.toLowerCase();
    const tbody = document.getElementById("inv-tbody");
    tbody.innerHTML = "";

    let totalInv = 0;
    let totalGan = 0;

    Object.entries(inventario).forEach(([prod, d]) => {
        totalInv += d.costo;
        totalGan += d.costo * 0.30;

        if (!prod.toLowerCase().includes(filtro)) return;

        const bajoStock = d.cantidad <= 5;
        const badge = bajoStock
        ? `<span class="badge-warn">⚠️ STOCK BAJO</span>`
        : `<span class="badge-ok">✅ Óptimo</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td><b>${prod}</b></td>
        <td>${formatearMonto(d.costo)}</td>
        <td>${d.cantidad}</td>
        <td>${d.unidad}</td>
        <td class="text-green"><b>${formatearMonto(d.precioJusto)}</b></td>
        <td>${d.telefono}</td>
        <td>${badge}</td>
        <td>
        <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${prod}')">
        <i class="fa-solid fa-trash"></i>
        </button>
        </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("stat-inv").textContent = formatearMonto(totalInv);
    document.getElementById("stat-profit").textContent = formatearMonto(totalGan);
}

function renderizarTarjetas() {
    const container = document.getElementById("cards-container");
    container.innerHTML = "";

    Object.entries(inventario).forEach(([prod, d]) => {
        const card = document.createElement("div");
        card.className = "prod-card";
        card.innerHTML = `
        <h3>${prod}</h3>
        <p class="text-green mt-1"><b>Precio Justo: ${formatearMonto(d.precioJusto)}</b></p>
        <p class="subtitle mt-1">Stock: ${d.cantidad} ${d.unidad}</p>
        <small><i class="fa-solid fa-phone"></i> ${d.telefono}</small>
        `;
        container.appendChild(card);
    });
}

function renderizarGrafico() {
    const ctx = document.getElementById("financeChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();

    const labels = Object.keys(inventario);
    const data = Object.values(inventario).map(d => d.costo);

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Inversión Total por Producto (Bs)",
                              data,
                              backgroundColor: "#107c41",
                              borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- CALCULADORA PRO ---
document.getElementById("btn-calc").addEventListener("click", () => {
    const ins = parseFloat(document.getElementById("calc-insumos").value) || 0;
    const trans = parseFloat(document.getElementById("calc-transporte").value) || 0;
    const cant = parseFloat(document.getElementById("calc-cant").value);

    if (!cant || cant <= 0) {
        alert("Ingresa una cantidad producida válida.");
        return;
    }
    const unitario = (ins + trans) / cant;
    const justo = unitario * 1.30;
    document.getElementById("calc-result").innerHTML = `
    Costo Unitario: ${unitario.toFixed(2)} Bs <br>
    <span class="text-green">Precio Justo Recomendado (+30%): ${justo.toFixed(2)} Bs</span>
    `;
});

// --- EXPORTAR CSV Y RESPALDOS JSON ---
document.getElementById("btn-export-csv").addEventListener("click", () => {
    let csv = "Producto,Costo_Bs,Cantidad,Unidad,Precio_Justo_Bs,Telefono\n";
    Object.entries(inventario).forEach(([p, d]) => {
        csv += `"${p}",${d.costo},${d.cantidad},"${d.unidad}",${d.precioJusto.toFixed(2)},"${d.telefono}"\n`;
    });
    descargarArchivo(csv, "Inventario_AgroConnect.csv", "text/csv");
});

document.getElementById("btn-backup-export").addEventListener("click", () => {
    descargarArchivo(JSON.stringify(inventario, null, 2), "respaldo_agroconnect.json", "application/json");
});

document.getElementById("btn-backup-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        inventario = JSON.parse(ev.target.result);
        guardarEnDisco();
        renderizarTodo();
        alert("Base de datos restaurada con éxito.");
    };
    reader.readAsText(file);
});

function descargarArchivo(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
}

// --- MODAL DE IMPRESIÓN CON QR ---
document.getElementById("btn-print-modal").addEventListener("click", () => {
    const primerProd = Object.keys(inventario)[0];
    if (!primerProd) {
        alert("Agrega o carga productos primero para generar una etiqueta.");
        return;
    }
    const d = inventario[primerProd];
    const qrBox = document.getElementById("qr-container");
    qrBox.innerHTML = "";
    new QRCode(qrBox, {
        text: `PRODUCTO: ${primerProd} | PRECIO: ${d.precioJusto.toFixed(2)} Bs | TEL: ${d.telefono}`,
               width: 140,
               height: 140
    });
    document.getElementById("print-details").innerHTML = `
    <strong>${primerProd}</strong><br>
    Precio Justo: ${d.precioJusto.toFixed(2)} Bs (${d.unidad})<br>
    Contacto: ${d.telefono}
    `;
    document.getElementById("print-modal").classList.add("active");
});

document.getElementById("btn-close-print").addEventListener("click", () => {
    document.getElementById("print-modal").classList.remove("active");
});

document.getElementById("btn-do-print").addEventListener("click", () => {
    window.print();
});
