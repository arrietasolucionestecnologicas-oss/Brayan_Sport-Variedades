/*
================================================================================
ARCHIVO: js/ui/inventory.js
DESCRIPCIÓN: Controlador del Módulo Inventario (Pestañas, Filtros, CRUD).
================================================================================
*/

import { State } from '../state.js';
import { API } from '../api.js';
import { CoreUI } from './core.js';

export const InventoryUI = {
    currentTab: 'Tecnologia', 
    prodEdit: null,

    // Lógica de cambio de Pestaña y visualización del filtro Atributos
    setTab(tabName) {
        this.currentTab = tabName;
        
        const attrFilter = document.getElementById('filter-attr');
        if (attrFilter) {
            // Mostrar filtro Niño/Hombre/Mujer solo en Ropa y Zapatos
            if (tabName === 'Ropa' || tabName === 'Zapatos') {
                attrFilter.style.display = 'inline-block';
            } else {
                attrFilter.style.display = 'none';
                attrFilter.value = ''; 
            }
        }
        
        this.render();
    },

    render() {
        const c = document.getElementById('inv-list');
        if (!c) return;

        const q = (document.getElementById('inv-search')?.value || "").toLowerCase().trim();
        const filterProv = document.getElementById('filter-prov')?.value || "";
        const filterAttr = document.getElementById('filter-attr')?.value || "";

        c.innerHTML = '';
        let lista = State.data.inv || [];

        // 1. Filtrado por Pestaña Activa (Apunta a catWeb o cat)
        lista = lista.filter(p => {
            const cat = String(p.catWeb || p.cat || "").toLowerCase();
            const tab = this.currentTab.toLowerCase();
            return cat.includes(tab) || cat === tab;
        });

        // 2. Filtrado por Búsqueda de Texto
        if (q) {
            lista = lista.filter(p => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
        }

        // 3. Filtrado por Proveedor
        if (filterProv) {
            const fClean = filterProv.trim().toLowerCase();
            lista = lista.filter(p => p.prov && String(p.prov).trim().toLowerCase().includes(fClean));
        }

        // 4. Filtrado por Género/Edad (Atributos Extras)
        if (filterAttr) {
            const aClean = filterAttr.trim().toLowerCase();
            // Asume que la columna Atributos_Extras viene mapeada del backend como p.atributos o p.Atributos_Extras
            lista = lista.filter(p => {
                const attrs = String(p.Atributos_Extras || p.atributos || "").toLowerCase();
                return attrs.includes(aClean);
            });
        }

        if (lista.length === 0) {
            c.innerHTML = `<div class="text-center text-muted p-5 w-100" style="grid-column: 1 / -1;">
                <i class="fas fa-box-open fs-1 mb-3 opacity-50"></i><br>
                No hay productos en <b>${this.currentTab}</b> con los filtros actuales.
            </div>`;
            return;
        }

        // Renderizado del Grid
        lista.slice(0, 50).forEach(p => {
            const fixedUrl = CoreUI.fixDriveLink(p.foto);
            const imgHtml = fixedUrl ? `<img src="${fixedUrl}">` : `<i class="bi bi-box-seam" style="font-size:3rem; color:#eee;"></i>`;
            const precioDisplay = p.publico > 0 ? CoreUI.COP.format(p.publico) : 'N/A';
            
            // Botones delegados al módulo POS (Expuesto globalmente en app.js)
            const btnAddCart = `<div class="btn-copy-mini text-white" style="background:var(--primary); border-color:var(--primary);" onclick="window.POS.agregarAlCarritoDesdeInv('${p.id}')" title="Agregar al Carrito"><i class="fas fa-cart-plus"></i></div>`;
            const btnShareNative = `<div class="btn-copy-mini text-white" style="background:#25D366; border-color:#25D366;" onclick="window.POS.shareProductNative('${p.id}')" title="Compartir Tarjeta Web"><i class="fas fa-share-nodes"></i></div>`;

            const div = document.createElement('div');
            div.className = 'card-catalog';
            div.innerHTML = `
                <div class="cat-img-box">${imgHtml}<div class="btn-edit-float" onclick="window.Inventory.prepararEdicion('${p.id}')"><i class="fas fa-pencil-alt"></i></div></div>
                <div class="cat-body">
                    <div class="cat-title text-truncate" style="white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.nombre}</div>
                    <div class="cat-price">${precioDisplay}</div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted" style="font-size:0.7rem;">Prov: ${p.prov || 'N/A'}</small>
                        <small class="text-muted" style="font-size:0.7rem;">Costo: ${CoreUI.COP.format(p.costo || 0)}</small>
                    </div>
                </div>
                <div class="cat-actions">
                    <div class="btn-copy-mini" onclick="window.UI.copyingDato('${p.id}')" title="Copiar ID">ID</div>
                    <div class="btn-copy-mini" onclick="window.UI.copyingDato('${p.nombre.replace(/'/g, "\\'")}')" title="Copiar Nombre">Nom</div>
                    ${btnAddCart}${btnShareNative}
                </div>`;
            c.appendChild(div);
        });
    },

    prepararEdicion(id) {
        const p = State.data.inv.find(x => x.id === id);
        if (p) {
            this.prodEdit = p;
            document.getElementById('inp-edit-nombre').value = p.nombre;
            document.getElementById('inp-edit-categoria').value = p.cat;
            document.getElementById('inp-edit-costo').value = p.costo;
            document.getElementById('inp-edit-publico').value = p.publico || 0;
            
            let m = 30;
            if (p.costo > 0 && p.publico > 0) m = ((p.publico / p.costo) - 1) * 100;
            const elMargen = document.getElementById('inp-edit-margen');
            if (elMargen) elMargen.value = m.toFixed(1);

            document.getElementById('inp-edit-proveedor').value = p.prov;
            document.getElementById('inp-edit-desc').value = p.desc;
            document.getElementById('inp-edit-web').checked = p.enWeb || false;
            document.getElementById('inp-edit-cat-web').value = p.catWeb || 'tecnologia';
            
            document.getElementById('inp-file-foto').value = "";
            document.getElementById('img-preview-box').style.display = 'none';
            
            const fixedUrl = CoreUI.fixDriveLink(p.foto);
            if (fixedUrl) { 
                document.getElementById('img-preview-box').src = fixedUrl; 
                document.getElementById('img-preview-box').style.display = 'block';
            }
            
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEdicion'));
            modal.show();
        } else {
            alert("Producto no encontrado en memoria");
        }
    },

    guardarCambiosAvanzado() {
        if (!this.prodEdit) return; 
        
        const newVal = { 
            id: this.prodEdit.id, 
            nombre: document.getElementById('inp-edit-nombre').value, 
            cat: document.getElementById('inp-edit-categoria').value, 
            prov: document.getElementById('inp-edit-proveedor').value.toUpperCase().trim(), 
            costo: parseFloat(document.getElementById('inp-edit-costo').value) || 0, 
            publico: parseFloat(document.getElementById('inp-edit-publico').value) || 0, 
            desc: document.getElementById('inp-edit-desc').value, 
            foto: this.prodEdit.foto || "", 
            enWeb: document.getElementById('inp-edit-web').checked, 
            catWeb: document.getElementById('inp-edit-cat-web').value 
        };
        
        const fileInput = document.getElementById('inp-file-foto');
        const f = fileInput ? fileInput.files[0] : null;
        
        let promise = Promise.resolve(null);
        if (f && window.POS) { // Usamos compresión de imagen si está en POS
            promise = window.POS.compressImage(f);
        }

        promise.then(b64 => {
            const idx = State.data.inv.findIndex(x => x.id === this.prodEdit.id);
            if (idx > -1) { 
                if (b64) newVal.foto = b64; 
                State.data.inv[idx] = newVal; 
            }
            
            this.render(); 
            if (window.POS) window.POS.renderPos(); 
            
            bootstrap.Modal.getInstance(document.getElementById('modalEdicion'))?.hide();
            CoreUI.showToast("Guardando cambios en servidor...", "info");
            
            const payload = { 
                id: newVal.id, 
                nombre: newVal.nombre, 
                categoria: newVal.cat, 
                proveedor: newVal.prov, 
                costo: newVal.costo, 
                publico: newVal.publico, 
                descripcion: newVal.desc, 
                urlExistente: this.prodEdit.foto || "", 
                enWeb: newVal.enWeb, 
                catWeb: newVal.catWeb 
            };
            
            if (b64) { 
                payload.imagenBase64 = b64.split(',')[1]; 
                payload.mimeType = f.type; 
                payload.nombreArchivo = f.name; 
            }
            
            API.call('guardarProductoAvanzado', payload).then(r => { 
                if(r.exito) CoreUI.showToast("¡Guardado exitoso!", "success"); 
                else CoreUI.showToast("Error guardando: " + r.error, "danger"); 
            });
        });
    },

    eliminarProductoActual() {
        if (!this.prodEdit) return;
        
        Swal.fire({
            title: '¿Eliminar Producto?',
            text: "Esta acción es irreversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#000',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, Eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                CoreUI.showToast("Eliminando...", "warning");
                API.call('eliminarProductoBackend', { id: this.prodEdit.id }).then(r => {
                    if (r.exito) location.reload();
                    else alert("Error: " + r.error);
                });
            }
        });
    }
};
