/*
================================================================================
ARCHIVO: js/ui/core.js
DESCRIPCIÓN: Módulo de utilidades globales de UI, navegación y componentes DOM.
================================================================================
*/

export const CoreUI = {
    COP: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }),

    setupTemplates() {
        const tpl = document.getElementById('tpl-cart')?.innerHTML;
        const desktopCart = document.getElementById('desktop-cart-container');
        const mobileCart = document.getElementById('mobile-cart');
        
        if (tpl) {
            if (desktopCart) desktopCart.innerHTML = tpl;
            if (mobileCart) mobileCart.innerHTML = tpl;
        }

        document.querySelectorAll('#c-inicial').forEach(el => {
            el.removeAttribute('disabled');
            el.style.background = '#fff';
            if (window.POS) el.oninput = window.POS.calcCart.bind(window.POS);
        });
    },

    nav(view, btn) {
        document.querySelectorAll('.view-sec').forEach(e => e.style.display = 'none');
        const target = document.getElementById('view-' + view);
        if (target) target.style.display = 'block';
        
        document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
        if (btn) btn.classList.add('active');
        
        localStorage.setItem('lastView', view);
    },

    showToast(msg, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0 show mb-2`;
        toast.role = 'alert';
        toast.innerHTML = `<div class="d-flex"><div class="toast-body fw-bold">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    fixDriveLink(url) {
        if (!url) return "";
        try { url = decodeURIComponent(url).trim(); } catch(e) {}
        const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return "https://lh3.googleusercontent.com/d/" + match[1] + "=w1000";
        }
        return url.split(' ')[0];
    },

    copyingDato(txt) {
        if (!txt || txt === 'undefined' || txt === '0') return alert("Dato vacío o no disponible");
        navigator.clipboard.writeText(txt).then(() => { 
            this.showToast("Copiado al portapapeles", "info"); 
        });
    },

    updateDashboardMetrics(metricas) {
        if (!metricas) return;
        const bCaja = document.getElementById('bal-caja');
        if (bCaja) bCaja.innerText = this.COP.format(metricas.saldo || 0);
        const bVentas = document.getElementById('bal-ventas');
        if (bVentas) bVentas.innerText = this.COP.format(metricas.ventaMes || 0);
        const bGanancia = document.getElementById('bal-ganancia');
        if (bGanancia) bGanancia.innerText = this.COP.format(metricas.gananciaMes || 0);
    },

    abrirModalNuevo() { 
        document.getElementById('new-id').value = ''; 
        document.getElementById('new-file-foto').value = ""; 
        document.getElementById('new-nombre').value = '';
        document.getElementById('new-categoria').value = '';
        document.getElementById('new-proveedor').value = '';
        document.getElementById('new-costo').value = '';
        document.getElementById('new-publico').value = '';
        document.getElementById('new-margen').value = '30';
        document.getElementById('new-desc').value = '';
        document.getElementById('new-web').checked = false;
        
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalNuevo'));
        modal.show(); 
    },

    abrirModalProv() { 
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalProv'));
        modal.show(); 
    },

    abrirModalCotizaciones() {
        if (window.POS) window.POS.renderCotizaciones();
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCotizaciones'));
        modal.show();
    },

    verBancos() {
        const msg = `👑 ¡Hola! Gracias por elegirnos 🛒\n\nPara procesar tu pedido, por favor realiza el pago mediante transferencia. Aquí tienes nuestros datos bancarios:\n\n🏦 Banco: Bancolombia\n💳 Tipo de cuenta: Ahorro\n🔢 No Cuenta: 767-000051-51\n🔢 Llave: 0090894825\n👤 Titular: KINGS SHOP SAS\n📄 NIT: 901866162-1\n\n📲 Importante: Una vez realizada la transacción, por favor envíanos una foto o captura del comprobante. 📦🚀\n\n¡Gracias por tu confianza! 🤝`;
        
        Swal.fire({
            title: 'Datos Bancarios',
            text: '¿Copiar plantilla de pago al portapapeles?',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sí, Copiar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#000',
            cancelButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                navigator.clipboard.writeText(msg).then(() => {
                    this.showToast("Datos copiados al portapapeles", "success");
                });
            }
        });
    }
};
