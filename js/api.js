/*
================================================================================
ARCHIVO: js/api.js
DESCRIPCIÓN: Módulo de conexión Fetch y gestor de sincronización Offline.
================================================================================
*/

export const API = {
    // URL de despliegue de Google Apps Script
    URL: "https://script.google.com/macros/s/AKfycbzWEqQQTow3irxkTU4Y3CVJshtfjo1s2m1dwSicRihQ42_fArC6L9MAuQoUPUfzzXYS/exec",
    
    async call(action, data = null) {
        const payload = { action: action, data: data };
        
        if (data && typeof data === 'object') {
            payload.data.aliasOperador = localStorage.getItem('kingshop_alias') || "Anonimo";
        }

        if (!navigator.onLine && action !== 'obtenerDatosCompletos') {
            this.guardarEnCola(action, payload.data);
            return { exito: true, offline: true }; 
        }

        try {
            const response = await fetch(this.URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (e) {
            console.error("Error API:", e);
            if (action !== 'obtenerDatosCompletos') {
                this.guardarEnCola(action, payload.data);
                return { exito: true, offline: true };
            }
            return { exito: false, error: e.toString() };
        }
    },

    guardarEnCola(accion, datos) {
        let cola = JSON.parse(localStorage.getItem('kingshop_queue') || "[]");
        cola.push({ action: accion, data: datos, timestamp: Date.now() });
        localStorage.setItem('kingshop_queue', JSON.stringify(cola));
    },

    async sincronizarColaOffline() {
        let cola = JSON.parse(localStorage.getItem('kingshop_queue') || "[]");
        if (cola.length === 0) return;

        let nuevaCola = [];
        for (let item of cola) {
            try {
                const response = await fetch(this.URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: item.action, data: item.data })
                });
                const res = await response.json();
                if (!res.exito) throw new Error(res.error);
            } catch (e) {
                console.error("Fallo al sincronizar item:", item, e);
                nuevaCola.push(item); 
            }
        }
        
        localStorage.setItem('kingshop_queue', JSON.stringify(nuevaCola));
        if (nuevaCola.length === 0 && window.App) {
            window.App.loadData(true); 
        }
    }
};
