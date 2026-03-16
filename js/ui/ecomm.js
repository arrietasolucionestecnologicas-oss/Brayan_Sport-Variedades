/*
================================================================================
ARCHIVO: js/ui/ecomm.js
DESCRIPCIÓN: Controlador del Módulo E-Commerce (Administración Web).
================================================================================
*/

import { State } from '../state.js';
import { API } from '../api.js';
import { CoreUI } from './core.js';

export const EcommUI = {
    render() {
        const q = (document.getElementById('web-search')?.value || "").toLowerCase().trim();
        const c = document.getElementById('web-list');
        if (!c) return;
        
        c.innerHTML = '';
        let lista = (State.data.inv || []).filter(p => p.enWeb === true);
        
        if (q) { 
            lista = lista.filter(p => p.nombre.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)); 
        }
        
        if (lista.length === 0) { 
            c.innerHTML = `<div class="text-center text-muted p-5"><div style="font-size:2rem">🌐</div><p>No hay productos en Web.<br>Actívalos desde Inventario.</p></div>`; 
            return; 
        }
        
        lista.slice(0, 50).forEach(p => {
            const fixedUrl = CoreUI.fixDriveLink(p.foto);
            const img = fixedUrl ? `<img src="${fixedUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">` : `<div style="width:50px; height:50px; background:#eee; border-radius:5px;">📷</div>`;
            c.innerHTML += `
            <div class="card-k">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-2 align-items-center">
                        ${img}
                        <div>
                            <strong>${p.nombre}</strong><br>
                            <small class="badge bg-primary">${p.catWeb}</small> <small class="text-muted">| ${CoreUI.COP.format(p.publico)}</small>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger fw-bold" onclick="window.Ecomm.toggleWebStatus('${p.id}')">Desactivar</button>
                </div>
            </div>`;
        });
    },

    toggleWebStatus(id) {
        const idx = State.data.inv.findIndex(x => x.id === id);
        if (idx > -1) {
            const p = State.data.inv[idx];
            p.enWeb = !p.enWeb; 
            
            this.render(); 
            if (window.Inventory) window.Inventory.render(); 
            
            CoreUI.showToast("Estado Web actualizado", "info");
            
            const payload = { 
                id: p.id, nombre: p.nombre, categoria: p.cat, proveedor: p.prov, 
                costo: p.costo, publico: p.publico, descripcion: p.desc, 
                urlExistente: p.foto || "", enWeb: p.enWeb, catWeb: p.catWeb 
            };
            API.call('guardarProductoAvanzado', payload);
        }
    }
};
