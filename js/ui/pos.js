/*
================================================================================
ARCHIVO: js/ui/pos.js
DESCRIPCIÓN: Controlador del Punto de Venta, Carrito y Generador de Cotizaciones.
================================================================================
*/

import { State } from '../state.js';
import { API } from '../api.js';
import { CoreUI } from './core.js';

export const POSUI = {
    calculatedValues: { total: 0, inicial: 0, base: 0, descuento: 0 },
    usuarioForzoInicial: false,

    renderPos() {
        const searchEl = document.getElementById('pos-search');
        const placeholder = document.getElementById('pos-placeholder');
        const c = document.getElementById('pos-list'); 
        if (!searchEl || !placeholder || !c) return;
        
        const q = searchEl.value.toLowerCase().trim();
        c.innerHTML = '';
        
        if (!q) { placeholder.style.display = 'block'; return; }
        placeholder.style.display = 'none';

        const lista = State.data.inv || [];
        const res = lista.filter(p => (p.nombre && p.nombre.toLowerCase().includes(q)) || (p.cat && p.cat.toLowerCase().includes(q)));
        
        if (res.length === 0) { c.innerHTML = '<div class="text-center text-muted py-3">No encontrado</div>'; return; }

        res.slice(0, 20).forEach(p => {
            const active = State.cart.some(x => x.id === p.id) ? 'active' : '';
            const precioDisplay = p.publico > 0 ? CoreUI.COP.format(p.publico) : `<span class="text-muted small">Costo: ${CoreUI.COP.format(p.costo)}</span>`;
            const descCorto = p.cat + (p.prov ? `<br><span style="color: var(--primary); font-weight: bold; font-size: 0.75rem;">Prov: ${p.prov}</span>` : '');

            const div = document.createElement('div');
            div.className = `pos-row-lite ${active}`;
            div.onclick = () => this.toggleCart(p, div);
            div.innerHTML = `
                <div class="info" style="min-width: 0; flex: 1; padding-right: 10px;">
                    <div class="name" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal;">${p.nombre}</div>
                    <div class="meta mt-1">${descCorto}</div>
                </div>
                <div class="price" style="white-space: nowrap;">${precioDisplay}</div>
            `;
            c.appendChild(div);
        });
    },

    toggleCart(p, el) {
        const cart = State.getCart();
        const idx = cart.findIndex(x => x.id === p.id);
        
        if (idx > -1) { 
            cart.splice(idx, 1); 
            if (el) el.classList.remove('active'); 
        } else { 
            let item = Object.assign({}, p);
            item.cantidad = 1;
            item.conIva = false;
            item.modificadoManualmente = false; 
            
            if (item.publico > 0) {
                item.precioUnitarioFinal = item.publico; 
                if (item.costo > 0) {
                    item.margenIndividual = ((item.publico / item.costo) - 1) * 100;
                } else {
                    item.margenIndividual = 100;
                }
                item.modificadoManualmente = true; 
            } else {
                const elUtil = document.getElementById('c-util');
                const globalUtil = parseFloat(elUtil ? elUtil.value : 30) || 30;
                item.margenIndividual = globalUtil; 
                item.precioUnitarioFinal = (item.costo || 0) * (1 + globalUtil / 100);
            }
            
            item.descuentoIndividual = 0;
            cart.push(item); 
            if (el) el.classList.add('active'); 
        }
        
        State.setCart(cart);
        this.updateCartUI();
    },

    agregarAlCarritoDesdeInv(id) {
        const p = State.data.inv.find(x => x.id === id);
        if (!p) return CoreUI.showToast("Producto no encontrado", "danger");
        
        const cart = State.getCart();
        const idx = cart.findIndex(x => x.id === p.id);
        
        if (idx > -1) { 
            cart[idx].cantidad++; 
        } else { 
            let item = Object.assign({}, p);
            item.cantidad = 1;
            item.conIva = false;
            item.modificadoManualmente = false; 
            
            if (item.publico > 0) {
                item.precioUnitarioFinal = item.publico; 
                if (item.costo > 0) {
                    item.margenIndividual = ((item.publico / item.costo) - 1) * 100;
                } else {
                    item.margenIndividual = 100;
                }
                item.modificadoManualmente = true; 
            } else {
                const elUtil = document.getElementById('c-util');
                const globalUtil = parseFloat(elUtil ? elUtil.value : 30) || 30;
                item.margenIndividual = globalUtil; 
                item.precioUnitarioFinal = (item.costo || 0) * (1 + globalUtil / 100);
            }
            
            item.descuentoIndividual = 0;
            cart.push(item); 
        }
        
        State.setCart(cart);
        this.updateCartUI();
        CoreUI.showToast("🛍️ Agregado al carrito: " + p.nombre, "success");
    },

    abrirEditorItem(id) {
        const item = State.cart.find(x => x.id === id);
        if (!item) return;
        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('edit-item-nombre').value = item.nombre;
        document.getElementById('edit-item-costo').value = item.costo || 0;
        
        document.getElementById('edit-item-margen').value = item.margenIndividual.toFixed(1);
        document.getElementById('edit-item-desc').value = item.descuentoIndividual || 0;
        document.getElementById('edit-item-iva').checked = item.conIva || false;
        
        const pactadoEl = document.getElementById('edit-item-precio-pactado');
        if (pactadoEl) pactadoEl.value = '';
        
        this.calcEditorItem();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditItem')).show();
    },

    calcEditorItem() {
        const costo = parseFloat(document.getElementById('edit-item-costo').value) || 0;
        const margen = parseFloat(document.getElementById('edit-item-margen').value) || 0;
        const descPrc = parseFloat(document.getElementById('edit-item-desc').value) || 0; 
        const iva = document.getElementById('edit-item-iva').checked;
        
        const precioLista = costo * (1 + margen / 100);
        const descuentoMonto = precioLista * (descPrc / 100);
        let precioNeto = precioLista - descuentoMonto;
        
        if (precioNeto < 0) precioNeto = 0;
        if (iva) precioNeto *= 1.19;
        
        document.getElementById('edit-item-total').innerText = CoreUI.COP.format(Math.round(precioNeto));
    },

    aplicarPrecioPactado() {
        const costo = parseFloat(document.getElementById('edit-item-costo').value) || 0;
        const margen = parseFloat(document.getElementById('edit-item-margen').value) || 0;
        const precioPactado = parseFloat(document.getElementById('edit-item-precio-pactado').value) || 0;
        const iva = document.getElementById('edit-item-iva').checked;

        if (precioPactado <= 0) {
            document.getElementById('edit-item-desc').value = 0;
            this.calcEditorItem();
            return;
        }

        const precioObjetivoBase = iva ? (precioPactado / 1.19) : precioPactado;
        const precioLista = costo * (1 + margen / 100);
        
        if (precioLista > 0) {
            const descuentoRequeridoMonto = precioLista - precioObjetivoBase;
            let descuentoRequeridoPrc = (descuentoRequeridoMonto / precioLista) * 100;
            
            if (descuentoRequeridoPrc < 0) {
                 descuentoRequeridoPrc = 0;
                 const nuevoMargen = ((precioObjetivoBase / costo) - 1) * 100;
                 document.getElementById('edit-item-margen').value = nuevoMargen.toFixed(1);
            }
            
            document.getElementById('edit-item-desc').value = descuentoRequeridoPrc.toFixed(2);
        }
        this.calcEditorItem();
    },

    guardarEditorItem() {
        const id = document.getElementById('edit-item-id').value;
        const item = State.cart.find(x => x.id === id);
        if (item) {
            item.nombre = document.getElementById('edit-item-nombre').value;
            item.margenIndividual = parseFloat(document.getElementById('edit-item-margen').value) || 0;
            item.descuentoIndividual = parseFloat(document.getElementById('edit-item-desc').value) || 0; 
            item.conIva = document.getElementById('edit-item-iva').checked;
            item.modificadoManualmente = true; 
        }
        bootstrap.Modal.getInstance(document.getElementById('modalEditItem'))?.hide();
        this.updateCartUI(true);
    },

    toggleItemIva(id) {
        const item = State.cart.find(x => x.id === id);
        if (item) {
            item.conIva = !item.conIva;
            this.updateCartUI();
        }
    },

    changeQty(id, delta) {
        const item = State.cart.find(x => x.id === id);
        if (item) {
            item.cantidad += delta;
            if (item.cantidad <= 0) {
                const idx = State.cart.findIndex(x => x.id === id);
                State.cart.splice(idx, 1);
                this.renderPos();
            }
            this.updateCartUI();
        }
    },

    agregarItemManual() {
        const nombre = prompt("Nombre del ítem / servicio:");
        if (!nombre) return;
        const precioStr = prompt("Precio de venta ($):");
        if (!precioStr) return;
        const precio = parseFloat(precioStr);
        if (isNaN(precio)) return alert("Precio inválido");

        const costoStr = prompt("Costo interno ($) (Deja vacío o 0 si no aplica):");
        const costo = parseFloat(costoStr) || 0;

        State.cart.push({
            id: 'MANUAL-' + Date.now(),
            nombre: nombre, cat: 'Manual', costo: costo, publico: precio, cantidad: 1,
            conIva: false, manual: true, modificadoManualmente: true,
            margenIndividual: costo > 0 ? ((precio / costo) - 1) * 100 : 100,
            descuentoIndividual: 0, precioUnitarioFinal: precio
        });
        this.updateCartUI(true);
    },

    updateCartUI(keepOpen = false) {
        const count = State.cart.reduce((acc, item) => acc + (item.cantidad || 1), 0);
        
        const btnFloat = document.getElementById('btn-float-cart');
        if (btnFloat) {
            btnFloat.style.display = count > 0 ? 'block' : 'none';
            btnFloat.innerText = "🛒 " + count;
        }
        
        const isMobile = window.innerWidth < 992 && document.getElementById('mobile-cart')?.classList.contains('visible');
        let activeParent = isMobile ? document.getElementById('mobile-cart') : document.getElementById('desktop-cart-container');
        if (!activeParent) activeParent = document.getElementById('desktop-cart-container'); 
        const isEximir = activeParent && activeParent.querySelector('#c-eximir') ? activeParent.querySelector('#c-eximir').checked : false;

        const panels = [document.getElementById('desktop-cart-container'), document.getElementById('mobile-cart')];
        
        panels.forEach(parent => {
            if (!parent) return;
            const dateInput = parent.querySelector('#c-fecha');
            if (dateInput && !dateInput.value) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                dateInput.value = `${yyyy}-${mm}-${dd}`;
            }
            
            const inputConcepto = parent.querySelector('#c-concepto');
            
            if (State.cart.length === 0) {
                if (inputConcepto) inputConcepto.style.display = 'block';
                parent.querySelectorAll('#cart-items-list').forEach(e => e.style.display = 'none');
            } else {
                if (inputConcepto) { inputConcepto.style.display = 'none'; inputConcepto.value = ''; }
                parent.querySelectorAll('#cart-items-list').forEach(e => e.style.display = 'block');
            }
            
            const metodoLocal = parent.querySelector('#c-metodo') ? parent.querySelector('#c-metodo').value : 'Contado';
            const boxVip = parent.querySelector('#box-vip');
            if (metodoLocal === "Crédito") {
                if (boxVip) boxVip.style.display = 'block';
            } else {
                if (boxVip) boxVip.style.display = 'none';
            }
        });

        if (State.cart.length === 0 && !keepOpen) {
            const mobCart = document.getElementById('mobile-cart');
            if (mobCart) mobCart.classList.remove('visible');
        }
        
        this.calcCart(); 
    },

    toggleManual() {
        const isMobile = window.innerWidth < 992 && document.getElementById('mobile-cart')?.classList.contains('visible');
        let activeParent = isMobile ? document.getElementById('mobile-cart') : document.getElementById('desktop-cart-container');
        if (!activeParent) activeParent = document.getElementById('desktop-cart-container');

        if (!activeParent) return;
        const isManual = activeParent.querySelector('#c-manual') ? activeParent.querySelector('#c-manual').checked : false;
        const inpTotal = activeParent.querySelector('#res-cont-input');
        const inpUtil = activeParent.querySelector('#c-util');

        if (isManual) { 
            if (inpUtil) inpUtil.disabled = true; 
            setTimeout(() => { if (inpTotal) inpTotal.focus(); }, 100); 
        } else { 
            if (inpUtil) inpUtil.disabled = false; 
        }
        this.calcCart();
    },

    calcCart() {
        const isMobile = window.innerWidth < 992 && document.getElementById('mobile-cart')?.classList.contains('visible');
        let activeParent = isMobile ? document.getElementById('mobile-cart') : document.getElementById('desktop-cart-container');
        if (!activeParent) activeParent = document.getElementById('desktop-cart-container'); 
        if (!activeParent) return;

        const cuotas = parseInt(activeParent.querySelector('#c-cuotas') ? activeParent.querySelector('#c-cuotas').value : 1) || 1;
        const metodo = activeParent.querySelector('#c-metodo') ? activeParent.querySelector('#c-metodo').value : 'Contado';
        const conIvaGlobal = activeParent.querySelector('#c-iva') ? activeParent.querySelector('#c-iva').checked : false;
        const isManual = activeParent.querySelector('#c-manual') ? activeParent.querySelector('#c-manual').checked : false;
        const utilGlobal = parseFloat(activeParent.querySelector('#c-util') ? activeParent.querySelector('#c-util').value : 30) || 0; 
        const descuentoGlobalPrc = parseFloat(activeParent.querySelector('#c-desc') ? activeParent.querySelector('#c-desc').value : 0) || 0; 
        const tasaMensual = parseFloat(activeParent.querySelector('#c-int') ? activeParent.querySelector('#c-int').value : 5) || 0; 
        const targetVal = parseFloat(activeParent.querySelector('#c-target') ? activeParent.querySelector('#c-target').value : 0);
        const tieneTarget = !isNaN(targetVal) && targetVal > 0;
        const isEximir = activeParent.querySelector('#c-eximir') ? activeParent.querySelector('#c-eximir').checked : false;
        
        let baseParaCalculo = 0;
        let totalFinal = 0;
        let descuentoDineroTotal = 0; 

        if (State.cart.length > 0) {
            State.cart.forEach(item => {
                let c = item.costo || 0;
                let q = item.cantidad || 1;
                
                if (item.manual) {
                    totalFinal += (item.precioUnitarioFinal * q);
                    baseParaCalculo += (item.precioUnitarioFinal * q);
                } else {
                    let m = item.modificadoManualmente ? item.margenIndividual : utilGlobal;
                    let precioLista = c * (1 + m / 100);
                    let dPrc = descuentoGlobalPrc > 0 ? descuentoGlobalPrc : (item.descuentoIndividual || 0);
                    let descuentoDinero = precioLista * (dPrc / 100);
                    descuentoDineroTotal += (descuentoDinero * q);
                    
                    let px = precioLista - descuentoDinero;
                    if (px < 0) px = 0;
                    if (item.conIva || conIvaGlobal) px *= 1.19;
                    item.precioUnitarioFinal = px;
                    
                    baseParaCalculo += (c * q);
                    totalFinal += (px * q);
                }
            });
        } else {
            const resContInput = activeParent.querySelector('#res-cont-input');
            const manualVal = resContInput ? parseFloat(resContInput.value) : 0;
            baseParaCalculo = isNaN(manualVal) ? 0 : manualVal;
            let precioListaBruto = baseParaCalculo * (1 + utilGlobal / 100);
            descuentoDineroTotal = precioListaBruto * (descuentoGlobalPrc / 100);
            totalFinal = precioListaBruto - descuentoDineroTotal;
            if (totalFinal < 0) totalFinal = 0;
            if (conIvaGlobal) totalFinal *= 1.19; 
        }

        if (tieneTarget) {
            totalFinal = targetVal;
            if (activeParent.querySelector('#c-int')) activeParent.querySelector('#c-int').value = 0;
            if (activeParent.querySelector('#c-desc')) activeParent.querySelector('#c-desc').value = 0;
            descuentoDineroTotal = 0;
            
            if (State.cart.length > 0) {
                let totalPrevio = State.cart.reduce((acc, b) => acc + ((b.precioUnitarioFinal || 0) * b.cantidad), 0);
                State.cart.forEach(item => {
                    let peso = totalPrevio > 0 ? ((item.precioUnitarioFinal || 0) * item.cantidad) / totalPrevio : 1 / State.cart.length;
                    item.precioUnitarioFinal = (targetVal * peso) / item.cantidad;
                });
            }
        }

        const inpInicial = activeParent.querySelector('#c-inicial');
        const activeEl = document.activeElement;
        const isTypingInicial = (activeEl && activeEl.id === 'c-inicial' && activeParent.contains(activeEl));
        let inicial = 0;
        
        if (isTypingInicial) {
            if (inpInicial && inpInicial.value === "") {
                this.usuarioForzoInicial = false;
                inicial = isEximir ? 0 : Math.round(totalFinal * 0.30);
            } else if (inpInicial) {
                this.usuarioForzoInicial = true;
                inicial = parseFloat(inpInicial.value);
                if (isNaN(inicial)) inicial = 0;
            }
        } else if (this.usuarioForzoInicial && inpInicial && inpInicial.value !== "") {
            inicial = parseFloat(inpInicial.value);
            if (isNaN(inicial)) inicial = 0;
        } else {
            this.usuarioForzoInicial = false;
            inicial = isEximir ? 0 : Math.round(totalFinal * 0.30);
        }
        
        this.calculatedValues.inicial = inicial;
        
        if (!tieneTarget && metodo === "Crédito") {
            let saldoTemp = totalFinal - inicial;
            if (saldoTemp < 0) saldoTemp = 0;
            const interesTotal = saldoTemp * (tasaMensual / 100) * cuotas;
            totalFinal = totalFinal + interesTotal;
        }
        
        this.calculatedValues.base = baseParaCalculo; 
        this.calculatedValues.total = totalFinal;
        this.calculatedValues.descuento = descuentoDineroTotal;

        let valorCuota = 0;
        if (metodo === "Crédito") {
            let saldo = totalFinal - inicial;
            if (saldo < 0) saldo = 0;
            valorCuota = saldo / cuotas;
        }

        const panels = [document.getElementById('desktop-cart-container'), document.getElementById('mobile-cart')];
        
        panels.forEach(parent => {
            if (!parent) return;

            if (parent !== activeParent) {
                if (parent.querySelector('#c-cuotas') && document.activeElement !== parent.querySelector('#c-cuotas')) parent.querySelector('#c-cuotas').value = cuotas;
                if (parent.querySelector('#c-metodo') && document.activeElement !== parent.querySelector('#c-metodo')) parent.querySelector('#c-metodo').value = metodo;
                if (parent.querySelector('#c-iva') && document.activeElement !== parent.querySelector('#c-iva')) parent.querySelector('#c-iva').checked = conIvaGlobal;
                if (parent.querySelector('#c-manual') && document.activeElement !== parent.querySelector('#c-manual')) parent.querySelector('#c-manual').checked = isManual;
                if (parent.querySelector('#c-util') && document.activeElement !== parent.querySelector('#c-util')) parent.querySelector('#c-util').value = utilGlobal;
                if (parent.querySelector('#c-desc') && document.activeElement !== parent.querySelector('#c-desc')) parent.querySelector('#c-desc').value = descuentoGlobalPrc;
                if (parent.querySelector('#c-int') && document.activeElement !== parent.querySelector('#c-int')) parent.querySelector('#c-int').value = tasaMensual;
                if (parent.querySelector('#c-target') && document.activeElement !== parent.querySelector('#c-target')) parent.querySelector('#c-target').value = isNaN(targetVal) ? '' : targetVal;
                if (parent.querySelector('#c-cliente') && document.activeElement !== parent.querySelector('#c-cliente')) parent.querySelector('#c-cliente').value = activeParent.querySelector('#c-cliente') ? activeParent.querySelector('#c-cliente').value : "";
                if (parent.querySelector('#c-nit') && document.activeElement !== parent.querySelector('#c-nit')) parent.querySelector('#c-nit').value = activeParent.querySelector('#c-nit') ? activeParent.querySelector('#c-nit').value : "";
                if (parent.querySelector('#c-tel') && document.activeElement !== parent.querySelector('#c-tel')) parent.querySelector('#c-tel').value = activeParent.querySelector('#c-tel') ? activeParent.querySelector('#c-tel').value : "";
                if (parent.querySelector('#c-incluir-desc') && document.activeElement !== parent.querySelector('#c-incluir-desc')) parent.querySelector('#c-incluir-desc').checked = activeParent.querySelector('#c-incluir-desc') ? activeParent.querySelector('#c-incluir-desc').checked : false;
                if (parent.querySelector('#c-eximir') && document.activeElement !== parent.querySelector('#c-eximir')) parent.querySelector('#c-eximir').checked = isEximir;
            }

            if (State.cart.length > 0) {
                const listContainer = parent.querySelector('#cart-items-list');
                if (listContainer) {
                    let html = '';
                    State.cart.forEach(x => {
                        const px = x.precioUnitarioFinal || 0;
                        const isLocked = x.modificadoManualmente ? `<i class="fas fa-lock" style="font-size:0.6rem; color:var(--gold);"></i>` : '';
                        html += `
                        <div class="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom">
                            <div class="lh-1" style="flex:1;">
                                <small class="fw-bold" style="color:var(--primary);">${isLocked} ${x.nombre}</small><br>
                                <small class="text-muted">${CoreUI.COP.format(Math.round(px))} c/u</small>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <button class="btn btn-sm ${x.modificadoManualmente ? 'btn-dark' : 'btn-light border'} py-0 px-2 text-primary" onclick="window.POS.abrirEditorItem('${x.id}')" title="Editar precio/descuento">✏️</button>
                                <button class="btn btn-sm ${x.conIva ? 'btn-success' : 'btn-outline-secondary'} py-0 px-2 fw-bold" onclick="window.POS.toggleItemIva('${x.id}')" title="Aplicar IVA"><small>IVA</small></button>
                                <button class="btn btn-sm btn-light border py-0 px-2" onclick="window.POS.changeQty('${x.id}', -1)">-</button>
                                <span class="fw-bold small">${x.cantidad || 1}</span>
                                <button class="btn btn-sm btn-light border py-0 px-2" onclick="window.POS.changeQty('${x.id}', 1)">+</button>
                            </div>
                        </div>`;
                    });
                    listContainer.innerHTML = html;
                }
            }

            const rowDesc = parent.querySelector('#row-descuento');
            const resDescVal = parent.querySelector('#res-desc-val');
            if (descuentoDineroTotal > 0 && !tieneTarget) {
                if (rowDesc) { rowDesc.style.display = 'block'; if (resDescVal) resDescVal.innerText = "- " + CoreUI.COP.format(descuentoDineroTotal); }
            } else {
                if (rowDesc) rowDesc.style.display = 'none';
            }

            const pInpInicial = parent.querySelector('#c-inicial');
            if (parent !== activeParent || !isTypingInicial) {
                if (pInpInicial && pInpInicial.value !== String(inicial)) {
                    pInpInicial.value = inicial; 
                }
            }

            const rowCred = parent.querySelectorAll('#row-cred'); 
            const totalText = parent.querySelectorAll('#res-cont');
            const inputTotal = parent.querySelector('#res-cont-input');

            if (metodo === "Crédito") {
                totalText.forEach(e => { e.innerText = CoreUI.COP.format(Math.round(totalFinal)); e.style.display = 'block'; });
                if (State.cart.length === 0) { if (inputTotal) inputTotal.style.display = 'inline-block'; } else { if (inputTotal) inputTotal.style.display = 'none'; }

                rowCred.forEach(e => { 
                    e.style.display = 'block'; 
                    if (e.querySelector('#res-ini')) e.querySelector('#res-ini').innerText = CoreUI.COP.format(Math.round(inicial)); 
                    if (e.querySelector('#res-cuota-val')) e.querySelector('#res-cuota-val').innerText = CoreUI.COP.format(Math.round(valorCuota)); 
                    if (e.querySelector('#res-cuota-txt')) e.querySelector('#res-cuota-txt').innerText = `x ${cuotas} mes(es)`; 
                });
                
                if (pInpInicial) {
                    pInpInicial.style.display = 'block'; 
                    pInpInicial.disabled = false;
                    pInpInicial.style.background = '#fff';
                }
            } else { 
                totalText.forEach(e => { e.innerText = CoreUI.COP.format(Math.round(totalFinal)); e.style.display = 'block'; });
                if (State.cart.length === 0) {
                    if (inputTotal) inputTotal.style.display = 'inline-block';
                    if (isManual) totalText.forEach(e => e.style.display = 'none');
                } else { if (inputTotal) inputTotal.style.display = 'none'; }
                
                rowCred.forEach(e => e.style.display = 'none'); 
                if (pInpInicial) pInpInicial.style.display = 'none'; 
            }
        });
    },

    guardarCotizacionActual() {
        const desktopCart = document.getElementById('desktop-cart-container');
        const mobileCart = document.getElementById('mobile-cart');
        
        const cliDesktop = desktopCart ? desktopCart.querySelector('#c-cliente').value : "";
        const cliMobile = mobileCart ? mobileCart.querySelector('#c-cliente').value : "";
        const cli = cliDesktop || cliMobile;
        
        if (!cli) return alert("Falta Cliente para guardar la cotización");
        
        const parent = (window.innerWidth < 992 && mobileCart && mobileCart.classList.contains('visible')) ? mobileCart : desktopCart;
        if (!parent) return;
        if (State.cart.length === 0 && !parent.querySelector('#c-concepto').value && this.calculatedValues.total <= 0) return alert("El carrito está vacío");

        const idGenerado = parent.getAttribute('data-cotizacion-id') || ('COT-' + Date.now());
        const isEximir = parent.querySelector('#c-eximir') ? parent.querySelector('#c-eximir').checked : false;

        const paquete = {
            id: idGenerado,
            fecha: parent.querySelector('#c-fecha').value || new Date().toISOString().split('T')[0],
            cliente: cli,
            nit: parent.querySelector('#c-nit') ? parent.querySelector('#c-nit').value : '',
            tel: parent.querySelector('#c-tel') ? parent.querySelector('#c-tel').value : '',
            metodo: parent.querySelector('#c-metodo').value,
            cuotas: parent.querySelector('#c-cuotas').value,
            iva: parent.querySelector('#c-iva').checked,
            manual: parent.querySelector('#c-manual').checked,
            util: parent.querySelector('#c-util').value,
            desc: parent.querySelector('#c-desc').value,
            int: parent.querySelector('#c-int').value,
            target: parent.querySelector('#c-target').value,
            concepto: parent.querySelector('#c-concepto').value,
            eximir: isEximir,
            inicialPersonalizada: this.usuarioForzoInicial,
            cart: JSON.parse(JSON.stringify(State.cart)),
            total: this.calculatedValues.total
        };

        const idx = State.data.cotizaciones.findIndex(x => x.id === idGenerado);
        if (idx > -1) { State.data.cotizaciones[idx] = paquete; } 
        else { State.data.cotizaciones.unshift(paquete); }

        CoreUI.showToast("Cotización guardada exitosamente", "success");
        this.clearCart();
        API.call('guardarCotizacion', paquete);
    },

    renderCotizaciones() {
        const c = document.getElementById('cotizaciones-list');
        if (!c) return;
        c.innerHTML = '';
        const activas = State.data.cotizaciones.filter(x => x.estado !== 'Facturada');
        
        if (activas.length === 0) {
            c.innerHTML = '<div class="text-center text-muted p-4">No hay cotizaciones pendientes</div>';
            return;
        }
        
        activas.forEach(cot => {
            c.innerHTML += `
            <div class="card-k mb-2 border-start border-4 border-info bg-white shadow-sm p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div style="flex:1; min-width:0;">
                        <strong class="text-primary text-truncate d-block">${cot.cliente}</strong>
                        <small class="text-muted d-block">${cot.fecha} | Total: <strong class="text-dark">${CoreUI.COP.format(cot.total)}</strong></small>
                        <small class="text-secondary">${cot.cart.length} Item(s) | ${cot.metodo}</small>
                    </div>
                    <div class="d-flex flex-column gap-2 ms-2">
                        <button class="btn btn-sm btn-primary fw-bold" onclick="window.POS.cargarCotizacion('${cot.id}')">✏️ Retomar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.POS.eliminarCotizacion('${cot.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            </div>`;
        });
    },

    cargarCotizacion(id) {
        const cot = State.data.cotizaciones.find(x => x.id === id);
        if (!cot) return;
        
        State.setCart(JSON.parse(JSON.stringify(cot.cart)));
        this.usuarioForzoInicial = cot.inicialPersonalizada || false;
        
        const panels = [document.getElementById('desktop-cart-container'), document.getElementById('mobile-cart')];
        panels.forEach(parent => {
            if (!parent) return;
            if (parent.querySelector('#c-cliente')) parent.querySelector('#c-cliente').value = cot.cliente || '';
            if (parent.querySelector('#c-nit')) parent.querySelector('#c-nit').value = cot.nit || '';
            if (parent.querySelector('#c-tel')) parent.querySelector('#c-tel').value = cot.tel || '';
            if (parent.querySelector('#c-fecha')) parent.querySelector('#c-fecha').value = cot.fecha || '';
            if (parent.querySelector('#c-metodo')) parent.querySelector('#c-metodo').value = cot.metodo || 'Contado';
            if (parent.querySelector('#c-cuotas')) parent.querySelector('#c-cuotas').value = cot.cuotas || 1;
            if (parent.querySelector('#c-iva')) parent.querySelector('#c-iva').checked = cot.iva || false;
            if (parent.querySelector('#c-manual')) parent.querySelector('#c-manual').checked = cot.manual || false;
            if (parent.querySelector('#c-util')) parent.querySelector('#c-util').value = cot.util || 30;
            if (parent.querySelector('#c-desc')) parent.querySelector('#c-desc').value = cot.desc || 0;
            if (parent.querySelector('#c-int')) parent.querySelector('#c-int').value = cot.int || 5;
            if (parent.querySelector('#c-target')) parent.querySelector('#c-target').value = cot.target || '';
            if (parent.querySelector('#c-concepto')) parent.querySelector('#c-concepto').value = cot.concepto || '';
            if (parent.querySelector('#c-eximir')) parent.querySelector('#c-eximir').checked = cot.eximir || false;
            
            parent.setAttribute('data-cotizacion-id', id);
        });
        
        bootstrap.Modal.getInstance(document.getElementById('modalCotizaciones'))?.hide();
        CoreUI.showToast("Cotización cargada al carrito", "info");
        this.updateCartUI(true);
    },

    eliminarCotizacion(id) {
        if (!confirm("¿Eliminar esta cotización permanentemente?")) return;
        State.data.cotizaciones = State.data.cotizaciones.filter(x => x.id !== id);
        this.renderCotizaciones();
        API.call('eliminarCotizacion', id);
    },

    toggleMobileCart() { 
        const mc = document.getElementById('mobile-cart');
        if (mc) {
            mc.classList.toggle('visible'); 
            this.updateCartUI(true);
        }
    },

    toggleIni() { 
        const isMobile = window.innerWidth < 992 && document.getElementById('mobile-cart')?.classList.contains('visible');
        const parent = isMobile ? document.getElementById('mobile-cart') : document.getElementById('desktop-cart-container');
        if (!parent) return;
        
        const metodo = parent.querySelector('#c-metodo').value;
        const boxVip = parent.querySelector('#box-vip');
        
        if (metodo !== "Crédito") { 
            this.usuarioForzoInicial = false; 
            if (boxVip) boxVip.style.display = 'none';
            const elEx = parent.querySelector('#c-eximir');
            if (elEx) elEx.checked = false;
        } else {
            if (boxVip) boxVip.style.display = 'block';
        }
        this.calcCart(); 
    },

    clearCart() { 
        State.clearCart(); 
        this.usuarioForzoInicial = false;
        
        const panels = [document.getElementById('desktop-cart-container'), document.getElementById('mobile-cart')];
        panels.forEach(parent => {
            if (!parent) return;
            const inpInicial = parent.querySelector('#c-inicial');
            if (inpInicial) inpInicial.value = '';
            const inpDesc = parent.querySelector('#c-desc');
            if (inpDesc) inpDesc.value = '0';
            const inpConcepto = parent.querySelector('#c-concepto');
            if (inpConcepto) inpConcepto.value = '';
            const inpEximir = parent.querySelector('#c-eximir');
            if (inpEximir) inpEximir.checked = false;
            
            parent.removeAttribute('data-cotizacion-id');
        });
        
        this.renderPos(); 
        this.updateCartUI(); 
    },

    embellecerDescripcion(texto) {
        if (!texto) return "";
        const lineas = texto.split('\n');
        const bonitas = lineas.map(l => {
            const tl = l.trim();
            if (!tl) return "";
            if (tl.startsWith('-') || tl.startsWith('🔹') || tl.startsWith('•') || tl.startsWith('*')) {
                return "• " + tl.replace(/^[-•*🔹]\s*/, '');
            }
            return "• " + tl;
        }).filter(l => l !== "").join('\n');
        return bonitas;
    },

    async shareQuote() {
        const desktopCart = document.getElementById('desktop-cart-container');
        const mobileCart = document.getElementById('mobile-cart');
        const isMobile = window.innerWidth < 992 && mobileCart && mobileCart.classList.contains('visible');
        const parent = isMobile ? mobileCart : desktopCart || desktopCart;

        const cli = parent.querySelector('#c-cliente').value || "Cliente";
        let concepto = "";
        const incDesc = parent.querySelector('#c-incluir-desc') ? parent.querySelector('#c-incluir-desc').checked : false;
        
        const total = this.calculatedValues.total;
        const metodo = parent.querySelector('#c-metodo').value;
        
        let msg = `👑 *KING'S SHOP SAS*\n\nHola *${cli.trim()}*, esta es tu cotización:\n\n`;
        
        let fileToShare = null;
        let hasImage = false;
        let firstImgUrl = "";

        if (incDesc && State.cart.length > 0) {
            for (let x of State.cart) {
                const p = State.data.inv.find(inv => inv.id === x.id); 
                const desc = p ? p.desc : (x.desc || "");
                const foto = p ? p.foto : (x.foto || "");
                const fixedUrl = CoreUI.fixDriveLink(foto);
                
                if (fixedUrl && fixedUrl.length > 10 && !firstImgUrl) {
                    firstImgUrl = fixedUrl;
                }
                
                msg += `🛍️ *Producto:* ${x.cantidad}x ${x.nombre.toUpperCase()}\n`;
                const descBonita = this.embellecerDescripcion(desc);
                if (descBonita) {
                    msg += `📋 *Detalles:*\n${descBonita}\n\n`;
                } else {
                    msg += `\n`;
                }
            }
            msg += `────────────────\n\n`;

            if (firstImgUrl) {
                const loader = document.getElementById('loader');
                if (loader) loader.style.display = 'flex';
                try {
                    fileToShare = await this.getFileFromUrlAsync(firstImgUrl, 'cotizacion_kingshop');
                    if (fileToShare) hasImage = true;
                } catch(e) {
                    console.error("Error descargando imagen para cotización", e);
                }
                if (loader) loader.style.display = 'none';
            }
        } else {
            if (State.cart.length > 0) { 
                concepto = State.cart.map(x => `${x.cantidad}x ${x.nombre}`).join(', '); 
            } else { 
                concepto = parent.querySelector('#c-concepto').value || "Varios"; 
            }
            msg += `📦 *Producto(s):* ${concepto}\n\n`;
        }
        
        if (metodo === "Crédito") {
            const inicial = this.calculatedValues.inicial;
            const cuotas = parseInt(parent.querySelector('#c-cuotas').value) || 1;
            const resCuotaVal = parent.querySelector('#res-cuota-val');
            const valorCuota = resCuotaVal ? resCuotaVal.innerText : 0;
            msg += `💳 *Método:* Crédito\n💰 *Valor Total (Financiado):* ${CoreUI.COP.format(total)}\n• *Inicial:* ${CoreUI.COP.format(inicial)}\n📅 *Plan:* ${cuotas} cuotas de *${valorCuota}*\n\n`;
        } else {
            msg += `💵 *Método:* Contado\n💰 *Total a Pagar:* ${CoreUI.COP.format(total)}\n\n`;
        }
        
        msg += `🤝 _Quedamos a su entera disposición para procesar su pedido._`;
        
        if (hasImage && navigator.canShare) {
            const shareData = { title: "Cotización King's Shop", text: msg, files: [fileToShare] };
            if (navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                    CoreUI.showToast("¡Cotización compartida con éxito!", "success");
                    return; 
                } catch (err) {
                    console.error("Error compartiendo cotización nativamente:", err);
                }
            }
        }

        if (firstImgUrl) {
            msg = msg.replace(`Hola *${cli.trim()}*, esta es tu cotización:\n\n`, `Hola *${cli.trim()}*, esta es tu cotización:\n\n🖼️ *Imagen:* ${firstImgUrl}\n\n`);
        }

        window.open("https://wa.me/?text=" + encodeURIComponent(msg), '_blank');
    },

    shareProdWhatsApp(id) {
        const p = State.data.inv.find(x => x.id === id);
        if (!p) return alert("Producto no encontrado");
        const nombre = p.nombre.toUpperCase();
        const precio = p.publico > 0 ? CoreUI.COP.format(p.publico) : 'Consultar';
        const descripcionBonita = this.embellecerDescripcion(p.desc);
        const linkFoto = CoreUI.fixDriveLink(p.foto); 
        
        let msg = `👑 *KING'S SHOP SAS*\n\n`;
        if (linkFoto && linkFoto.length > 10) { msg += `🖼️ *Imagen:* ${linkFoto}\n\n`; }
        msg += `🛍️ *Producto:* ${nombre}\n💳 *Inversión:* ${precio}\n\n`;
        if (descripcionBonita) { msg += `📋 *Detalles:*\n${descripcionBonita}\n\n`; }
        msg += `🤝 _Quedamos a su entera disposición._`; 
        
        window.open("https://wa.me/?text=" + encodeURIComponent(msg), '_blank');
    },

    async getFileFromUrlAsync(url, defaultName) {
        try {
            if (url.startsWith('data:image')) {
                const arr = url.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) { u8arr[n] = bstr.charCodeAt(n); }
                return new File([u8arr], defaultName + ".jpg", { type: mime });
            } else {
                const response = await fetch(url, { mode: 'cors' });
                const blob = await response.blob();
                return new File([blob], defaultName + ".jpg", { type: blob.type || "image/jpeg" });
            }
        } catch(e) {
            console.error("Fallo al convertir URL a File:", e);
            return null;
        }
    },

    async shareProductNative(id) {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'flex';
        
        try {
            const p = State.data.inv.find(x => x.id === id);
            if (!p) {
                if (loader) loader.style.display = 'none';
                return alert("Producto no encontrado");
            }
            
            const nombre = p.nombre.toUpperCase();
            const precio = p.publico > 0 ? CoreUI.COP.format(p.publico) : 'Consultar';
            const desc = this.embellecerDescripcion(p.desc);
            
            let shareText = `👑 *KING'S SHOP SAS*\n\n🛍️ *Producto:* ${nombre}\n💳 *Inversión:* ${precio}\n\n`;
            if (desc) { shareText += `📋 *Detalles:*\n${desc}\n\n`; }
            shareText += `🤝 _Quedamos a su entera disposición._`;
            
            const shareData = { title: nombre, text: shareText };
            let hasImage = false;
            const fixedUrl = CoreUI.fixDriveLink(p.foto);
            
            if (fixedUrl && fixedUrl.length > 5) {
                const cleanName = p.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const file = await this.getFileFromUrlAsync(fixedUrl, cleanName);
                if (file) {
                    shareData.files = [file];
                    hasImage = true;
                }
            }
            
            if (loader) loader.style.display = 'none';

            if (navigator.canShare && navigator.share) {
                if (hasImage && !navigator.canShare({ files: shareData.files })) {
                    console.warn("El dispositivo no soporta compartir archivos, se enviará solo texto.");
                    delete shareData.files;
                }
                await navigator.share(shareData);
                CoreUI.showToast("¡Compartido con éxito!", "success");
            } else {
                alert("Tu navegador no soporta compartir nativamente. Abriendo WhatsApp clásico.");
                this.shareProdWhatsApp(id);
            }
        } catch(error) {
            if (loader) loader.style.display = 'none';
            console.error("Error compartiendo:", error);
            if (error.name !== 'AbortError') {
                alert("No se pudo compartir el archivo nativamente. Abriendo texto clásico.");
                this.shareProdWhatsApp(id); 
            } else {
                CoreUI.showToast("Compartir cancelado por el usuario", "info");
            }
        }
    },

    finalizarVenta() {
        const desktopCart = document.getElementById('desktop-cart-container');
        const mobileCart = document.getElementById('mobile-cart');
        const isMobile = window.innerWidth < 992 && mobileCart && mobileCart.classList.contains('visible');
        const parent = isMobile ? mobileCart : desktopCart || desktopCart;

        const cli = parent.querySelector('#c-cliente').value;
        if (!cli) return alert("Falta Cliente");
        const metodo = parent.querySelector('#c-metodo').value;
        const fechaVal = parent.querySelector('#c-fecha').value;
        const cuotasVal = parseInt(parent.querySelector('#c-cuotas').value) || 1;
        const isEximir = parent.querySelector('#c-eximir') ? parent.querySelector('#c-eximir').checked : false;
        
        if (this.calculatedValues.total <= 0) return alert("Precio 0 no permitido");
        
        const itemsData = [];
        if (State.cart.length > 0) {
            State.cart.forEach(p => {
                const qty = p.cantidad || 1;
                const unitPrice = p.precioUnitarioFinal || 0;
                for (let i = 0; i < qty; i++) {
                    itemsData.push({ nombre: p.nombre, cat: p.cat, costo: p.costo, precioVenta: unitPrice });
                }
            });
        } else {
            const nombreManual = parent.querySelector('#c-concepto').value || "Venta Manual";
            let costoManual = this.calculatedValues.base;
            if (costoManual === 0 && this.calculatedValues.total > 0) {
                costoManual = Math.round(this.calculatedValues.total / 1.3);
            }
            itemsData.push({ nombre: nombreManual, cat: "General", costo: costoManual, precioVenta: this.calculatedValues.total });
        }

        if (metodo === "Crédito" && this.calculatedValues.total > 0) {
            const sumaItemsBase = itemsData.reduce((a, b) => a + b.precioVenta, 0);
            const difInteres = this.calculatedValues.total - sumaItemsBase;
            if (difInteres > 0.01) {
                itemsData.push({ nombre: "Intereses de Financiación", cat: "Financiero", costo: 0, precioVenta: difInteres });
            }
        }
        
        const idCotiz = parent.getAttribute('data-cotizacion-id');
        const d = { 
            items: itemsData, cliente: cli, metodo: metodo, 
            inicial: (metodo === 'Crédito') ? this.calculatedValues.inicial : 0, 
            inicialPersonalizada: this.usuarioForzoInicial, eximirInicial: isEximir, 
            vendedor: State.currentUserAlias, fechaPersonalizada: fechaVal, 
            cuotas: cuotasVal, idCotizacion: idCotiz 
        };
        
        const btn = parent.querySelector('#btn-vender-main');
        if (btn) { btn.innerText = "Procesando..."; btn.disabled = true; }
        
        API.call('procesarVentaCarrito', d).then(r => { 
            if (btn) { btn.innerText = "✅ VENDER / FACTURAR"; btn.disabled = false; }
            if (r.exito) { 
                if (r.offline) { 
                    alert("Venta guardada OFFLINE. Se subirá cuando haya internet."); 
                    this.clearCart(); 
                } else { 
                    CoreUI.showToast("¡Venta Registrada con Éxito!", "success");
                    this.clearCart();
                    if (window.App) window.App.loadData(true); 
                } 
            } else { 
                alert(r.error); 
            } 
        });
    },

    compressImage(file, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const elem = document.createElement('canvas');
                    const scaleFactor = maxWidth / img.width;
                    elem.width = maxWidth;
                    elem.height = img.height * scaleFactor;
                    const ctx = elem.getContext('2d');
                    ctx.drawImage(img, 0, 0, elem.width, elem.height);
                    resolve(elem.toDataURL(file.type, quality));
                }
                img.onerror = error => reject(error);
            }
            reader.onerror = error => reject(error);
        });
    }
};
