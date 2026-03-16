/*
================================================================================
ARCHIVO: js/ui/finance.js
DESCRIPCIÓN: Controlador de Cartera, Flujo de Caja, Egresos y Obligaciones.
================================================================================
*/

import { State } from '../state.js';
import { API } from '../api.js';
import { CoreUI } from './core.js';

export const FinanceUI = {
    refEditId: null,
    refSaldoActual: 0,
    movEditObj: null,

    renderPasivos() {
        const totalPasivos = State.data.pasivos.reduce((sum, p) => sum + (Number(p.saldo) || 0), 0);
        const el = document.getElementById('bal-pasivos');
        if (el) el.innerText = CoreUI.COP.format(totalPasivos);
    },

    abrirModalPasivos() {
        const sel = document.getElementById('pas-select');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccione...</option>';
        if (State.data.pasivos.length === 0) {
            sel.innerHTML += `<option value="" disabled>No tienes obligaciones pendientes</option>`;
        } else {
            State.data.pasivos.forEach(p => {
                sel.innerHTML += `<option value="${p.id}">${p.acreedor} (Debes: ${CoreUI.COP.format(p.saldo)})</option>`;
            });
        }
        const m = document.getElementById('pas-monto');
        if (m) m.value = '';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAbonarPasivo')).show();
    },

    seleccionarPasivo() {
        const id = document.getElementById('pas-select').value;
        const p = State.data.pasivos.find(x => x.id === id);
        const m = document.getElementById('pas-monto');
        if (p && m) m.value = p.saldo;
    },

    doAbonoPasivo() {
        const sel = document.getElementById('pas-select');
        const m = document.getElementById('pas-monto');
        if (!sel || !m) return;
        
        const id = sel.value;
        const monto = parseFloat(m.value) || 0;
        if (!id || monto <= 0) return alert("Verifica el monto a pagar.");
        
        const pIdx = State.data.pasivos.findIndex(x => x.id === id);
        let acreedorName = "Desconocido";
        if (pIdx > -1) {
            acreedorName = State.data.pasivos[pIdx].acreedor;
            State.data.pasivos[pIdx].saldo -= monto;
            if (State.data.pasivos[pIdx].saldo <= 0) {
                State.data.pasivos.splice(pIdx, 1);
            }
        }
        
        if (State.data.metricas) State.data.metricas.saldo -= monto;
        State.data.historial.unshift({ 
            desc: "Pago a Deuda: " + acreedorName, 
            tipo: "egreso", 
            monto: monto, 
            fecha: new Date().toISOString().split('T')[0], 
            _originalIndex: State.data.historial.length, 
            saldo: State.data.metricas.saldo 
        });
        
        bootstrap.Modal.getInstance(document.getElementById('modalAbonarPasivo')).hide();
        this.renderPasivos();
        this.render();
        const bCaja = document.getElementById('bal-caja');
        if (bCaja && State.data.metricas) bCaja.innerText = CoreUI.COP.format(State.data.metricas.saldo || 0);
        CoreUI.showToast("Pago de obligación registrado", "success");
        
        API.call('abonarPasivo', { idPasivo: id, monto: monto, acreedor: acreedorName });
    },

    updateGastosSelect() {
        const dl = document.getElementById('g-vinculo-list');
        if (dl) {
            dl.innerHTML = ''; 
            if (State.data.ultimasVentas && State.data.ultimasVentas.length > 0) {
                State.data.ultimasVentas.forEach(v => { 
                    const o = document.createElement('option'); 
                    o.value = `${v.desc} [${v.id}]`; 
                    dl.appendChild(o); 
                });
            }
            if (State.data.inv && State.data.inv.length > 0) {
                const invSorted = [...State.data.inv].sort((a,b) => a.nombre.localeCompare(b.nombre));
                invSorted.forEach(p => {
                    const o = document.createElement('option');
                    o.value = `Stock: ${p.nombre} [${p.id}]`;
                    dl.appendChild(o);
                });
            }
        }
    },

    verificarBanco() {
        const real = parseFloat(document.getElementById('audit-banco').value) || 0;
        const sys = (State.data.metricas && State.data.metricas.saldo) ? State.data.metricas.saldo : 0;
        const diff = sys - real;
        const el = document.getElementById('audit-res');
        if (Math.abs(diff) < 1) { 
            el.innerHTML = '<span class="badge bg-success">✅ Perfecto</span>'; 
        } else { 
            el.innerHTML = `<span class="badge bg-danger">❌ Desfase: ${CoreUI.COP.format(diff)}</span>`; 
        }
    },

    doIngresoExtra() {
        const desc = document.getElementById('inc-desc').value;
        const cat = document.getElementById('inc-cat').value;
        const monto = document.getElementById('inc-monto').value;
        if (!desc || !monto) return alert("Falta descripción o monto");
        
        let acreedor = "";
        let fechaLimite = "";
        if (cat === 'Prestamo') {
            acreedor = document.getElementById('inc-acreedor').value;
            fechaLimite = document.getElementById('inc-fecha-limite').value;
            if (!acreedor || !fechaLimite) return alert("Los datos del préstamo son obligatorios");
        }
        
        const ingresoNum = parseFloat(monto) || 0;
        if (State.data.metricas) State.data.metricas.saldo += ingresoNum;
        State.data.historial.unshift({ 
            desc: "Ingreso Extra: " + desc, 
            tipo: "ingresos", 
            monto: ingresoNum, 
            fecha: new Date().toISOString().split('T')[0], 
            _originalIndex: State.data.historial.length, 
            saldo: State.data.metricas.saldo 
        });
        
        if (cat === 'Prestamo') {
            State.data.pasivos.push({
                id: "PAS-" + Date.now(), acreedor: acreedor, monto: ingresoNum, saldo: ingresoNum, fechaLimite: fechaLimite
            });
            this.renderPasivos();
        }
        
        document.getElementById('inc-desc').value = '';
        document.getElementById('inc-monto').value = '';
        
        const elAcreedor = document.getElementById('inc-acreedor');
        const elFechaLim = document.getElementById('inc-fecha-limite');
        const elBox = document.getElementById('box-prestamo');
        if (elAcreedor) elAcreedor.value = '';
        if (elFechaLim) elFechaLim.value = '';
        if (elBox) elBox.style.display = 'none';
        document.getElementById('inc-cat').value = 'Venta Externa';
        
        this.render();
        const bCaja = document.getElementById('bal-caja');
        if (bCaja && State.data.metricas) bCaja.innerText = CoreUI.COP.format(State.data.metricas.saldo || 0);
        CoreUI.showToast("Ingreso registrado", "success");
        
        API.call('registrarIngresoExtra', { desc: desc, cat: cat, monto: monto, acreedor: acreedor, fechaLimite: fechaLimite });
    },

    doGasto() {
        const desc = document.getElementById('g-desc').value;
        const monto = document.getElementById('g-monto').value;
        const vinculoRaw = document.getElementById('g-vinculo').value; 
        
        if (!desc || !monto) return alert("Falta descripción o monto");

        let vinculoClean = "";
        const match = vinculoRaw.match(/\[(.*?)\]$/); 
        if (match && match[1]) {
            vinculoClean = match[1];
        } else {
            vinculoClean = vinculoRaw; 
        }

        const d = { desc: desc, cat: document.getElementById('g-cat').value, monto: monto, vinculo: vinculoClean };

        const gastoNum = parseFloat(monto) || 0;
        if (State.data.metricas) State.data.metricas.saldo -= gastoNum;
        State.data.historial.unshift({ 
            desc: "Gasto: " + desc, 
            tipo: "egreso", 
            monto: gastoNum, 
            fecha: new Date().toISOString().split('T')[0], 
            _originalIndex: State.data.historial.length, 
            saldo: State.data.metricas.saldo 
        });

        document.getElementById('g-desc').value = '';
        document.getElementById('g-monto').value = '';
        document.getElementById('g-vinculo').value = '';
        this.render();
        
        const bCaja = document.getElementById('bal-caja');
        if (bCaja && State.data.metricas) bCaja.innerText = CoreUI.COP.format(State.data.metricas.saldo || 0);
        CoreUI.showToast("Gasto registrado", "success");

        API.call('registrarGasto', d);
    },

    render() { 
        const s = document.getElementById('ab-cli'); 
        if (s) {
            s.innerHTML = '<option value="">Seleccione...</option>'; 
            (State.data.deudores || []).filter(d => d.estado !== 'Castigado').forEach(d => { 
                s.innerHTML += `<option value="${d.idVenta}">${d.cliente} - ${d.producto} (Debe: ${CoreUI.COP.format(d.saldo)})</option>`; 
            });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const elFecha = document.getElementById('ab-fecha');
        if (elFecha) elFecha.value = today;

        const elSearch = document.getElementById('hist-search');
        const q = elSearch ? elSearch.value.toLowerCase() : "";
        const h = document.getElementById('hist-list'); 
        if (!h) return;
        
        h.innerHTML = ''; 
        let dataHist = State.data.historial || []; 
        
        dataHist.forEach((x, originalIndex) => { x._originalIndex = originalIndex; });

        if (q) {
            dataHist = dataHist.filter(x => (x.desc && x.desc.toLowerCase().includes(q)) || (x.monto && x.monto.toString().includes(q)));
        }

        if (dataHist.length === 0) { 
            h.innerHTML = '<div class="text-center text-muted p-3">Sin movimientos registrados.</div>'; 
        } else { 
            dataHist.forEach((x) => { 
                const i = (x.tipo.includes('ingreso') || x.tipo.includes('abono')); 
                const btnEdit = `<button class="btn btn-sm btn-light border-0 text-muted ms-2" onclick='window.Finance.abrirEditMov(${x._originalIndex})'><i class="fas fa-pencil-alt"></i></button>`;
                const saldoMoment = (x.saldo !== undefined) ? `<small class="text-muted d-block" style="font-size:0.7rem;">Saldo: ${CoreUI.COP.format(x.saldo)}</small>` : '';
                h.innerHTML += `<div class="mov-item d-flex align-items-center mb-2 p-2 border-bottom"><div class="mov-icon me-3 ${i?'text-success':'text-danger'}"><i class="fas fa-${i?'arrow-down':'arrow-up'}"></i></div><div class="flex-grow-1 lh-1"><div class="fw-bold small">${x.desc}</div><small class="text-muted" style="font-size:0.75rem">${x.fecha}</small></div><div class="text-end"><div class="fw-bold ${i?'text-success':'text-danger'}">${i?'+':'-'} ${CoreUI.COP.format(x.monto)}</div>${saldoMoment}</div>${btnEdit}</div>`; 
            }); 
        }
    },

    abrirEditMov(index) {
        if (!State.data.historial[index]) return;
        this.movEditObj = State.data.historial[index]; 
        document.getElementById('ed-mov-desc').value = this.movEditObj.desc;
        document.getElementById('ed-mov-monto').value = this.movEditObj.monto;
        
        const elJust = document.getElementById('ed-mov-justificacion');
        if (elJust) elJust.value = ""; 
        
        const fechaRaw = this.movEditObj.fecha;
        let fechaIso = "";
        if (fechaRaw.includes('/')) { 
            const parts = fechaRaw.split('/'); 
            if (parts.length === 3) fechaIso = `${parts[2]}-${parts[1]}-${parts[0]}`; 
        } else { 
            fechaIso = fechaRaw.split(' ')[0]; 
        }
        
        document.getElementById('ed-mov-fecha').value = fechaIso;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditMov')).show();
    },

    guardarEdicionMovimiento() {
        if (!this.movEditObj) return;
        const nuevaFecha = document.getElementById('ed-mov-fecha').value;
        const nuevoMonto = document.getElementById('ed-mov-monto').value;
        const elJust = document.getElementById('ed-mov-justificacion');
        const justificacion = elJust ? elJust.value.trim() : "Corrección";
        
        if (!nuevaFecha || !nuevoMonto) return alert("Fecha y monto requeridos");
        if (elJust && justificacion.length < 5) return alert("⚠️ Debe escribir una justificación válida para alterar la caja.");
        
        const originalClone = Object.assign({}, this.movEditObj);
        const payload = { original: originalClone, fecha: nuevaFecha, monto: nuevoMonto, justificacion: justificacion };
        
        this.movEditObj.fecha = nuevaFecha;
        this.movEditObj.monto = nuevoMonto;
        
        bootstrap.Modal.getInstance(document.getElementById('modalEditMov'))?.hide();
        this.render();
        CoreUI.showToast("Movimiento actualizado (Guardando...)", "success");
        API.call('editarMovimiento', payload).then(r => { 
            if (!r.exito) { alert("Error al editar: " + r.error); if (window.App) window.App.loadData(true); } 
        });
    },

    doAbono() {
        const id = document.getElementById('ab-cli').value;
        if (!id) return alert("Seleccione un cliente");
        
        const s = document.getElementById('ab-cli');
        const txt = s.options[s.selectedIndex].text;
        const cli = txt.split(' - ')[0].trim();
        const monto = document.getElementById('ab-monto').value;
        const fechaVal = document.getElementById('ab-fecha').value;
        
        const abonoNum = parseFloat(monto) || 0;
        if (State.data.metricas) State.data.metricas.saldo += abonoNum;
        
        const dIndex = State.data.deudores.findIndex(x => x.idVenta === id);
        if (dIndex > -1) {
            State.data.deudores[dIndex].saldo -= abonoNum;
            if (State.data.deudores[dIndex].saldo < 0) State.data.deudores[dIndex].saldo = 0;
            if (State.data.deudores[dIndex].saldo <= 100) {
                State.data.deudores[dIndex].estado = 'Pagado';
            }
        }
        
        State.data.historial.unshift({ 
            desc: "Abono: " + cli, 
            tipo: "abono", 
            monto: abonoNum, 
            fecha: fechaVal || new Date().toISOString().split('T')[0], 
            _originalIndex: State.data.historial.length, 
            saldo: State.data.metricas.saldo 
        });
        
        document.getElementById('ab-monto').value = '';
        this.renderCartera();
        this.render();
        
        const bCaja = document.getElementById('bal-caja');
        if (bCaja && State.data.metricas) bCaja.innerText = CoreUI.COP.format(State.data.metricas.saldo || 0);
        CoreUI.showToast("Abono registrado", "success");
        
        API.call('registrarAbono', { idVenta: id, monto: monto, cliente: cli, fecha: fechaVal });
    },

    renderCartera() {
        const c = document.getElementById('cartera-list');
        const bal = document.getElementById('bal-cartera');
        if (!c) return;
        
        c.innerHTML = '';
        
        const activos = (State.data.deudores || []).filter(d => d.estado !== 'Castigado');
        const castigados = (State.data.deudores || []).filter(d => d.estado === 'Castigado');
        
        const totalDeuda = activos.reduce((acc, d) => acc + d.saldo, 0);
        
        if (activos.length === 0) {
            c.innerHTML = '<div class="text-center text-muted p-5">👏 Excelente, no hay deudas pendientes.</div>';
        } else {
            activos.forEach(d => {
                let fechaTxt = d.fechaLimite ? `<small class="text-muted"><i class="far fa-calendar-alt"></i> Vence: ${d.fechaLimite}</small>` : '<small class="text-muted">Sin fecha</small>';
                let planDetalle = "";
                let badgeAdelanto = "";
                
                if (d.fechaLimiteRaw && (d.deudaInicial || 0) <= 0 && d.saldo > 0) {
                    const fl = new Date(d.fechaLimiteRaw);
                    const hoy = new Date();
                    const diffDays = Math.ceil((fl.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 30) {
                        badgeAdelanto = `<span class="badge bg-success mt-1"><i class="fas fa-check-circle"></i> Adelantado</span>`;
                    }
                }

                if ((d.deudaInicial || 0) > 0) {
                    planDetalle = `<div class="mt-2 p-2 bg-warning border rounded text-dark" style="font-size:0.85rem;"><div class="d-flex justify-content-between fw-bold"><span><i class="fas fa-exclamation-triangle"></i> Faltante Inicial:</span><span>${CoreUI.COP.format(d.deudaInicial)}</span></div></div>`;
                } else {
                    const valCuotaReal = parseFloat(d.valCuota) || 0;
                    const numCuotas = parseInt(d.cuotas) || 1;
                    
                    if (valCuotaReal > 0) {
                        let cuotasRestantes = (d.saldo / valCuotaReal).toFixed(1);
                        if (cuotasRestantes.endsWith('.0')) cuotasRestantes = parseInt(cuotasRestantes);
                        planDetalle = `<div class="mt-2 p-2 bg-light border rounded" style="font-size:0.85rem;"><div class="d-flex justify-content-between"><span>Cuota Fija:</span><strong>${CoreUI.COP.format(valCuotaReal)}</strong></div><div class="d-flex justify-content-between text-danger fw-bold"><span>Restan:</span><span>${cuotasRestantes} Cuotas</span></div></div>`;
                    } else if (numCuotas > 1 && d.saldo > 0) {
                        const cuotaEstimada = d.saldo / numCuotas; 
                        planDetalle = `<div class="mt-2 p-2 bg-light border rounded" style="font-size:0.85rem;"><div class="d-flex justify-content-between text-muted"><span>Plan Original:</span><span>${numCuotas} Cuotas</span></div><div class="d-flex justify-content-between text-danger fw-bold"><span>Cuota Aprox:</span><span>${CoreUI.COP.format(cuotaEstimada)} (Est)</span></div></div>`;
                    }
                }

                c.innerHTML += `
                <div class="card-k card-debt">
                    <div class="d-flex justify-content-between align-items-start">
                        <div style="min-width: 0; flex: 1; padding-right: 10px;">
                            <h6 class="fw-bold mb-1 text-truncate">${d.cliente}</h6>
                            <small class="text-muted d-block text-truncate">${d.producto}</small>
                            ${fechaTxt}
                        </div>
                        <div class="text-end" style="white-space: nowrap;">
                            <h5 class="fw-bold text-danger m-0">${CoreUI.COP.format(d.saldo)}</h5>
                            <span class="badge-debt d-inline-block mt-1">Pendiente</span>
                            <button class="btn btn-sm text-muted p-0 ms-1" onclick="window.Finance.castigarDeuda('${d.idVenta}', '${d.cliente.replace(/'/g, "\\'")}')" title="Castigar Cartera"><i class="fas fa-skull-crossbones"></i></button>
                            <br>${badgeAdelanto}
                        </div>
                    </div>
                    <div class="mt-2 d-flex gap-2 flex-wrap justify-content-end border-top pt-2">
                        <button class="btn btn-xs btn-outline-success flex-fill" onclick="window.Finance.notificarCobroWA('${d.idVenta}')" title="Cobrar Cuota"><i class="fab fa-whatsapp"></i> Cobrar</button>
                        <button class="btn btn-xs btn-outline-info flex-fill fw-bold" onclick="window.Finance.compartirBalanceWA('${d.idVenta}')" title="Enviar Extracto"><i class="fas fa-file-invoice-dollar"></i> Balance</button>
                        <button class="btn btn-xs btn-outline-primary flex-fill" onclick="window.Finance.abrirModalRefinanciar('${d.idVenta}', '${d.cliente.replace(/'/g, "\\'")}', ${d.saldo})" title="Refinanciar Deuda">🔄 Refinanc.</button>
                    </div>
                    ${planDetalle}
                </div>`;
            });
        }
        
        if (castigados.length > 0) {
            c.innerHTML += `<hr class="my-4"><h6 class="text-muted mb-3"><i class="fas fa-skull-crossbones"></i> Cartera Castigada (${castigados.length})</h6>`;
            castigados.forEach(d => {
                 c.innerHTML += `
                 <div class="card-k bg-light opacity-75">
                    <div class="d-flex justify-content-between">
                        <div><strong>${d.cliente}</strong><br><small>${d.producto}</small></div>
                        <div class="text-end text-muted fw-bold">${CoreUI.COP.format(d.saldo)}<br><small class="badge bg-secondary">Castigado</small></div>
                    </div>
                 </div>`;
            });
        }
        
        if (bal) bal.innerText = CoreUI.COP.format(totalDeuda);
    },

    notificarCobroWA(idVenta) {
        const d = State.data.deudores.find(x => x.idVenta === idVenta);
        if (!d) return alert("Error: Deuda no encontrada en memoria.");
        
        let msg = `👑 *KING'S SHOP* 👑\n\nHola 👋 espero que estés muy bien! 🌟\n\n`;
        
        if ((d.deudaInicial || 0) > 0) {
            msg += `Pasamos por aquí para recordarte el saldo pendiente de la *Cuota Inicial* de tu compra:\n\n`;
            msg += `📦 *Producto:* ${d.producto}\n`;
            msg += `⚠️ *Faltante Inicial:* ${CoreUI.COP.format(d.deudaInicial)}\n\n`;
            msg += `Quedamos muy atentos a tu comprobante de pago para formalizar tu plan. ¡Gracias por tu confianza! 🤝`;
        } else {
            const valCuotaReal = parseFloat(d.valCuota) || 0;
            const fechaTxt = d.fechaLimite || "Pago Inmediato";
            
            msg += `Pasamos por aquí para recordarte el pago de tu *${d.producto}* 📦.\n\n`;
            
            if (valCuotaReal > 0) {
                msg += `💳 *Cuota:* ${CoreUI.COP.format(valCuotaReal)}\n`;
            } else {
                msg += `💳 *Saldo Total:* ${CoreUI.COP.format(d.saldo)}\n`;
            }
            
            msg += `📅 *Fecha:* ${fechaTxt}\n\nQuedamos muy atentos a tus comprobantes. ¡Gracias por tu confianza! 🤝`;
        }
        
        window.open("https://wa.me/?text=" + encodeURIComponent(msg), '_blank');
    },

    compartirBalanceWA(idVenta) {
        const d = State.data.deudores.find(x => x.idVenta === idVenta);
        if (!d) return alert("Error: Deuda no encontrada en memoria.");
        
        let msg = `👑 *KING'S SHOP* 👑\n\nHola 👋.\n\nTe compartimos el estado de tu crédito por el *${d.producto}* 📦:\n\n`;
        
        if ((d.deudaInicial || 0) > 0) {
            msg += `⚠️ *Aviso:* Aún tienes un saldo pendiente de ${CoreUI.COP.format(d.deudaInicial)} correspondiente a la Cuota Inicial.\n\n`;
            msg += `⏳ *Saldo Total Pendiente:* ${CoreUI.COP.format(d.saldo)}\n\n`;
            msg += `Una vez cubiertas las iniciales, te enviaremos el extracto de tus cuotas. 🤝`;
        } else {
            const valCuotaReal = parseFloat(d.valCuota) || 0;
            const numCuotas = parseInt(d.cuotas) || 1;
            
            if (valCuotaReal > 0 && numCuotas > 1) {
                let deudaOriginal = valCuotaReal * numCuotas;
                if (deudaOriginal < d.saldo) deudaOriginal = d.saldo; 
                let totalAbonado = deudaOriginal - d.saldo;
                if (totalAbonado < 0) totalAbonado = 0;
                let cuotasCubiertas = (totalAbonado / valCuotaReal).toFixed(1);
                if (cuotasCubiertas.endsWith('.0')) cuotasCubiertas = parseInt(cuotasCubiertas);

                msg += `💰 *Financiado:* ${CoreUI.COP.format(deudaOriginal)} (${numCuotas} Cuotas)\n`;
                msg += `✅ *Total Abonado:* ${CoreUI.COP.format(totalAbonado)} (Aprox. ${cuotasCubiertas} cuotas cubiertas)\n`;
                msg += `⏳ *Saldo Pendiente:* ${CoreUI.COP.format(d.saldo)}\n\n`;
            } else {
                msg += `⏳ *Saldo Pendiente:* ${CoreUI.COP.format(d.saldo)}\n\n`;
            }
            msg += `Cualquier duda estamos a tu disposición. 🤝`;
        }
        
        window.open("https://wa.me/?text=" + encodeURIComponent(msg), '_blank');
    },

    abrirModalRefinanciar(id, cliente, saldo) {
        this.refEditId = id;
        this.refSaldoActual = parseFloat(saldo) || 0;
        document.getElementById('ref-cliente').value = cliente;
        document.getElementById('ref-saldo-actual').value = CoreUI.COP.format(this.refSaldoActual);
        document.getElementById('ref-cargo').value = "0";
        document.getElementById('ref-cuotas').value = "1";
        
        const today = new Date();
        today.setMonth(today.getMonth() + 1);
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        document.getElementById('ref-fecha').value = `${yyyy}-${mm}-${dd}`;
        
        this.calcRefinanciamiento();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalRefinanciar')).show();
    },

    calcRefinanciamiento() {
        const cargo = parseFloat(document.getElementById('ref-cargo').value) || 0;
        const cuotas = parseInt(document.getElementById('ref-cuotas').value) || 1;
        const nuevoSaldo = this.refSaldoActual + cargo;
        const nuevaCuota = nuevoSaldo / cuotas;
        
        document.getElementById('ref-nuevo-saldo').innerText = CoreUI.COP.format(nuevoSaldo);
        document.getElementById('ref-nueva-cuota').innerText = CoreUI.COP.format(nuevaCuota) + " / mes";
    },

    procesarRefinanciamiento() {
        if (!this.refEditId) return;
        const cargo = parseFloat(document.getElementById('ref-cargo').value) || 0;
        const cuotas = parseInt(document.getElementById('ref-cuotas').value) || 1;
        const fecha = document.getElementById('ref-fecha').value;
        
        if (!fecha || cuotas < 1) return alert("Verifica las cuotas y la fecha");
        
        const d = { idVenta: this.refEditId, cargoAdicional: cargo, nuevasCuotas: cuotas, nuevaFecha: fecha };
        
        const dIdx = State.data.deudores.findIndex(x => x.idVenta === this.refEditId);
        if (dIdx > -1) {
            State.data.deudores[dIdx].saldo += cargo;
            State.data.deudores[dIdx].valCuota = (State.data.deudores[dIdx].saldo) / cuotas;
            State.data.deudores[dIdx].cuotas = cuotas;
            State.data.deudores[dIdx].fechaLimite = fecha;
        }
        
        bootstrap.Modal.getInstance(document.getElementById('modalRefinanciar'))?.hide();
        this.renderCartera();
        CoreUI.showToast("Cartera refinanciada (Guardando...)", "success");
        API.call('refinanciarDeuda', d).then(r => { if (!r.exito && window.App) window.App.loadData(true); });
    },

    castigarDeuda(id, nombre) {
        Swal.fire({
            title: '¿Castigar Cartera?',
            text: `Vas a enviar a "${nombre}" a la lista negra.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#000',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, Castigar'
        }).then((result) => {
            if (result.isConfirmed) {
                const d = State.data.deudores.find(x => x.idVenta === id);
                if (d) d.estado = 'Castigado';
                this.renderCartera();
                CoreUI.showToast("Cartera castigada (Guardando...)", "success");
                API.call('castigarCartera', { idVenta: id }).then(r => { if (!r.exito && window.App) window.App.loadData(true); });
            }
        });
    }
};
