/*
================================================================================
ARCHIVO: /js/app.js
DESCRIPCIÓN: Punto de entrada principal (ES6 Module). Orquestador de dependencias.
================================================================================
*/

// Simulación de importaciones de la nueva estructura modular
import { API } from './api.js';
import { State } from './state.js';
import { InventoryUI } from './ui/inventory.js';
import { POSUI } from './ui/pos.js';
import { FinanceUI } from './ui/finance.js';
import { EcommUI } from './ui/ecomm.js';
import { CoreUI } from './ui/core.js';

class AppController {
    constructor() {
        this.currentUserAlias = "Anonimo";
    }

    async init() {
        console.log("Inicializando Arquitectura Modular AST...");
        
        // 1. Verificación de Identidad Local
        this.verificarIdentidad();
        
        // 2. Configurar Listeners de Estado de Red (Offline/Online)
        window.addEventListener('online', this.updateOnlineStatus.bind(this));
        window.addEventListener('offline', this.updateOnlineStatus.bind(this));
        this.updateOnlineStatus();

        // 3. Renderizar Plantillas Base (Ej. Carrito)
        CoreUI.setupTemplates();

        // 4. Restauración de última vista
        const lastView = localStorage.getItem('lastView') || 'pos';
        const btn = document.querySelector(`.nav-btn[onclick*="'${lastView}'"]`);
        CoreUI.nav(lastView, btn || document.querySelector('.nav-btn'));

        // 5. Carga de Datos y Renderizado
        await this.loadData();
        
        // 6. Exposición de Controladores al Global Window (Solo lo necesario para HTML UI)
        this.exponerModulos();
    }

    verificarIdentidad() {
        const alias = localStorage.getItem('kingshop_alias');
        if (!alias) {
            const modalLogin = new bootstrap.Modal(document.getElementById('modalLoginApp'));
            modalLogin.show();
        } else {
            this.currentUserAlias = alias;
            const userDisplay = document.getElementById('user-display');
            if(userDisplay) userDisplay.innerText = this.currentUserAlias;
            State.setAlias(alias);
        }
    }

    guardarIdentidad() {
        const alias = document.getElementById('login-alias').value.trim();
        if (alias.length < 3) return alert("Ingresa un alias válido (Mín. 3 letras).");
        localStorage.setItem('kingshop_alias', alias);
        this.verificarIdentidad();
        bootstrap.Modal.getInstance(document.getElementById('modalLoginApp')).hide();
        CoreUI.showToast(`Bienvenido, ${alias}`, "success");
    }

    updateOnlineStatus() {
        const status = document.getElementById('offline-indicator');
        if (navigator.onLine) {
            status.style.display = 'none';
            API.sincronizarColaOffline(); 
        } else {
            status.style.display = 'block';
        }
    }

    async loadData(silent = false) {
        if (!silent) document.getElementById('loader').style.display = 'flex';
        
        try {
            const res = await API.call('obtenerDatosCompletos');
            if (res && res.inventario) {
                State.saveLocal(res);
                this.renderAll(res);
            } else {
                this.fallbackLocalData();
            }
        } catch (error) {
            console.error("Fallo de red en carga inicial", error);
            this.fallbackLocalData(silent);
        } finally {
            document.getElementById('loader').style.display = 'none';
        }
    }

    fallbackLocalData(silent = false) {
        const local = State.loadLocal();
        if (local) {
            this.renderAll(local);
            if (!silent) CoreUI.showToast("Modo Offline: Datos locales cargados", "warning");
        }
    }

    renderAll(data) {
        State.updateData(data); // Centraliza los datos en el store global
        
        // Notifica a los módulos de UI que deben renderizar la información fresca
        InventoryUI.render();
        POSUI.renderPos();
        FinanceUI.render();
        FinanceUI.renderCartera();
        EcommUI.render();
        
        CoreUI.updateDashboardMetrics(data.metricas);
    }

    exponerModulos() {
        // Enlaza el Scope estático del HTML con los módulos ES6 orientados a objetos
        window.App = this;
        window.UI = CoreUI;
        window.Inventory = InventoryUI;
        window.POS = POSUI;
        window.Finance = FinanceUI;
        window.Ecomm = EcommUI;
    }
}

// Arranque de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.init();
});
