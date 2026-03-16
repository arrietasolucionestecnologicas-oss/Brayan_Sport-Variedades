/*
================================================================================
ARCHIVO: js/state.js
DESCRIPCIÓN: Gestor centralizado de estado y LocalStorage (Single Source of Truth)
================================================================================
*/

export const State = {
    data: {
        inv: [], provs: [], deud: [], ped: [], hist: [], 
        cats: [], proveedores: [], ultimasVentas: [], 
        cotizaciones: [], pasivos: [], metricas: {}
    },
    cart: [],
    currentUserAlias: "Anonimo",

    setAlias(alias) {
        this.currentUserAlias = alias;
    },

    updateData(newData) {
        this.data = { ...this.data, ...newData };
        
        // Mapeo estructurado para compatibilidad
        this.data.inv = newData.inventario || [];
        this.data.historial = newData.historial || []; 
        this.data.proveedores = newData.proveedores || [];
        this.data.ultimasVentas = newData.ultimasVentas || []; 
        this.data.ped = newData.pedidos || [];
        this.data.deudores = newData.deudores || [];
        this.data.cotizaciones = newData.cotizaciones || [];
        this.data.pasivos = newData.pasivos || [];
        this.data.metricas = newData.metricas || { saldo: 0, ventaMes: 0, gananciaMes: 0 };
    },

    saveLocal(newData) {
        localStorage.setItem('kingshop_data', JSON.stringify(newData));
        localStorage.setItem('kingshop_last_sync', new Date().toISOString());
    },

    loadLocal() {
        const raw = localStorage.getItem('kingshop_data');
        return raw ? JSON.parse(raw) : null;
    },

    getCart() { 
        return this.cart; 
    },
    
    setCart(newCart) { 
        this.cart = newCart; 
    },
    
    clearCart() { 
        this.cart = []; 
    }
};
