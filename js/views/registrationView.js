// registrationView.js
window.RegistrationView = {
    render(params) {
        this.tournamentId = params.tournamentId;
        const tournament = DB.getTournament(this.tournamentId);
        
        const div = document.createElement('div');
        div.className = 'view-section';
        div.innerHTML = `
            <div class="card flex justify-between align-center">
                <h2>Prezentácia a Zoznam účastníkov</h2>
                <div>
                    <span class="badge active" style="font-size:1.1rem" id="reg-count">
                        Počet zaregistrovaných hráčov: ${tournament.participants.length}
                    </span>
                </div>
            </div>

            <div class="grid-2">
                <!-- Vyhľadávanie a Pridávanie z DB -->
                <div class="card">
                    <h3>Vyhľadať v Databáze</h3>
                    <div class="form-group flex gap-2">
                        <input type="text" id="reg-search" class="form-control" placeholder="Priezvisko alebo Reg. číslo...">
                    </div>
                    <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                        <table>
                            <tbody id="db-results">
                                <!-- Search results -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-4 border-t pt-4">
                        <h4>Meno nebolo nájdené?</h4>
                        <button class="btn secondary mt-2" id="btn-quick-add">Pridať nového hráča do databázy a turnaja</button>
                    </div>
                </div>

                <!-- Zoznam prihlásených -->
                <div class="card">
                    <h3>Zaregistrovaní hráči</h3>
                    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Reg. č.</th>
                                    <th>Meno</th>
                                    <th>Rebríček</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="registered-list">
                                <!-- Reg players -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-4" id="end-registration-panel">
                        <button class="btn primary" id="btn-end-reg" style="width: 100%;">Koniec registrácie</button>
                    </div>

                    <div class="mt-4 hidden" id="draw-panel">
                        <div class="form-group">
                            <label>Počet skupín</label>
                            <input type="number" id="num-groups" class="form-control" value="4" min="1">
                        </div>
                        <div class="form-group">
                            <label>Počet nasadených hráčov</label>
                            <input type="number" id="num-seeds" class="form-control" value="0" min="0">
                        </div>
                        <button class="btn success mt-2" id="btn-draw-groups" style="width: 100%;">Vylosovať skupiny</button>
                    </div>

                    <div class="mt-4 hidden" id="adjustment-panel">
                        <h3>Korekcia vyžrebovaných skupín</h3>
                        <p class="text-muted text-sm">Prehodenie je možné len horizontálne (v rámci rovnakého koša). Kliknite na dvoch hráčov v rovnakom riadku pre ich výmenu.</p>
                        <div class="table-responsive mt-2">
                            <table id="adjustment-table" style="text-align: center; border-collapse: collapse;">
                                <!-- dynamically generated -->
                            </table>
                        </div>
                        <button class="btn success mt-4" id="btn-confirm-groups" style="width: 100%;">Potvrdiť a prejsť na skupiny</button>
                        <button class="btn danger mt-2" id="btn-cancel-draft" style="width: 100%;">Zrušiť a losovať znova</button>
                    </div>
                </div>
            </div>
            
            <!-- Quick Add Modal forms are basically calling the app.js prompt, but we'll include a small inline block -->
            <div id="quick-add-form" class="card hidden mt-4">
                 <h3>Rýchle pridanie</h3>
                 <div class="flex gap-2">
                     <input type="text" id="qa-name" class="form-control" placeholder="Meno">
                     <input type="text" id="qa-club" class="form-control" placeholder="Klub" value="Bez klubu">
                     <input type="number" id="qa-points" class="form-control" placeholder="Rebríček (napr. 100001)" min="1">
                     <button class="btn primary" id="btn-save-qa">Uložiť</button>
                     <button class="btn secondary" id="btn-cancel-qa">Zrušiť</button>
                 </div>
            </div>
        `;
        return div;
    },

    init() {
        this.t = DB.getTournament(this.tournamentId);
        if(!this.t) return;
        
        this.resultsBody = document.getElementById('db-results');
        this.regBody = document.getElementById('registered-list');
        this.searchInput = document.getElementById('reg-search');
        this.countBadge = document.getElementById('reg-count');
        
        this.searchInput.addEventListener('input', () => this.searchDB());
        this.searchDB(); // Initial show some
        
        this.renderRegistered();
        
        // Quick Add
        document.getElementById('btn-quick-add').onclick = () => {
            document.getElementById('quick-add-form').classList.remove('hidden');
            document.getElementById('qa-points').value = DB.getNextUnregisteredRegNo();
        };
        document.getElementById('btn-cancel-qa').onclick = () => document.getElementById('quick-add-form').classList.add('hidden');
        document.getElementById('btn-save-qa').onclick = () => this.saveQuickAdd();
        
        // Draw logic
        document.getElementById('btn-end-reg').onclick = () => {
            if(this.t.participants.length < 2) {
                App.showAlert('Error', 'Na turnaj sú potrební aspoň 2 hráči.'); return;
            }
            document.getElementById('end-registration-panel').classList.add('hidden');
            document.getElementById('draw-panel').classList.remove('hidden');
            
            // Odhad skupin - default napr. 4 hraci v skupine
            const pCount = this.t.participants.length;
            let estGrp = Math.max(1, Math.floor(pCount / 4));
            document.getElementById('num-groups').value = estGrp;
            document.getElementById('num-seeds').value = estGrp * 2; // Default 2 per group seeded
        };
        
        document.getElementById('btn-draw-groups').onclick = () => this.drawGroups();
        document.getElementById('btn-confirm-groups').onclick = () => this.confirmGroups();
        document.getElementById('btn-cancel-draft').onclick = () => {
            this.t.status = 'registration';
            this.t.groups = [];
            DB.saveTournament(this.t);
            document.getElementById('adjustment-panel').classList.add('hidden');
            document.getElementById('draw-panel').classList.remove('hidden');
        };

        if(this.t.status === 'groups-draft') {
            document.getElementById('end-registration-panel').classList.add('hidden');
            document.getElementById('adjustment-panel').classList.remove('hidden');
            this.selectedCell = null;
            this.renderAdjustmentTable();
        }
    },

    searchDB() {
        const q = this.searchInput.value.toLowerCase();
        let players = DB.getPlayers();
        if(q) {
            players = players.filter(p => p.name.toLowerCase().includes(q) || p.regNo.toLowerCase().includes(q));
        }
        
        // Filter out already registered
        const registeredIds = this.t.participants.map(x => x.id);
        players = players.filter(p => !registeredIds.includes(p.id));
        
        // Sort by rank top first to make searching easier
        players.sort((a,b) => a.points - b.points);
        
        // Limit to 20 to avoid freezing
        const toShow = players.slice(0, 20);
        
        this.resultsBody.innerHTML = '';
        toShow.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td><small>${p.club}</small></td>
                <td>${p.points}</td>
                <td><button class="btn btn-small success btn-add-reg" data-id="${p.id}">Pridať</button></td>
            `;
            this.resultsBody.appendChild(tr);
        });
        
        this.resultsBody.querySelectorAll('.btn-add-reg').forEach(b => {
             b.onclick = (e) => this.addToTournament(e.target.getAttribute('data-id'));
        });
    },

    addToTournament(playerId) {
        const p = DB.getPlayers().find(x=>x.id===playerId);
        if(!p) return;
        this.t.participants.push(Object.assign({}, p)); // clone object for safety
        DB.saveTournament(this.t);
        this.searchDB();
        this.renderRegistered();
    },

    removeFromTournament(playerId) {
        this.t.participants = this.t.participants.filter(x => x.id !== playerId);
        DB.saveTournament(this.t);
        this.searchDB();
        this.renderRegistered();
    },

    renderRegistered() {
        this.countBadge.innerText = 'Počet zaregistrovaných hráčov: ' + this.t.participants.length;
        this.regBody.innerHTML = '';
        this.t.participants.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.regNo}</td>
                <td><strong>${p.name}</strong><br><small>${p.club}</small></td>
                <td>${p.points}</td>
                <td><button class="btn btn-small danger btn-rem-reg" data-id="${p.id}">✖</button></td>
            `;
            this.regBody.appendChild(tr);
        });
        
        this.regBody.querySelectorAll('.btn-rem-reg').forEach(b => {
             b.onclick = (e) => this.removeFromTournament(e.target.getAttribute('data-id'));
        });
    },

    saveQuickAdd() {
        const name = document.getElementById('qa-name').value.trim();
        const club = document.getElementById('qa-club').value.trim() || 'Bez klubu';
        let pointsText = document.getElementById('qa-points').value;
        const regNo = DB.getNextUnregisteredRegNo().toString();
        
        if(!name) { App.showAlert('Error', 'Meno je povinné'); return; }
        let points = parseFloat(pointsText);
        if(isNaN(points)) points = parseFloat(regNo);
        
        const dupRank = DB.getPlayers().find(x => x.points === points);
        if(dupRank){
             App.showAlert('Chyba', 'Číslo rebríčka sa nesmie opakovať. Je už použité.'); return;
        }
        
        const p = DB.addPlayer({ regNo, name, club, points });
        document.getElementById('quick-add-form').classList.add('hidden');
        document.getElementById('qa-name').value = '';
        
        this.addToTournament(p.id);
    },

    drawGroups() {
        const groupsCount = parseInt(document.getElementById('num-groups').value, 10);
        const seedsCount = parseInt(document.getElementById('num-seeds').value, 10);
        
        if(groupsCount < 1 || groupsCount > this.t.participants.length) {
            App.showAlert('Chyba', 'Neplatný počet skupín.'); return;
        }

        // Zavolanie enginu na vygenerovanie skupín
        const generatedGroups = window.DrawGroupsEngine.draw(this.t.participants, groupsCount, seedsCount);
        
        // Uloženie
        this.t.groupsCount = groupsCount;
        this.t.groups = generatedGroups;
        this.t.status = 'groups-draft';
        DB.saveTournament(this.t);
        
        document.getElementById('draw-panel').classList.add('hidden');
        document.getElementById('adjustment-panel').classList.remove('hidden');
        this.selectedCell = null;
        this.renderAdjustmentTable();
    },

    renderAdjustmentTable() {
        const table = document.getElementById('adjustment-table');
        table.innerHTML = '';
        
        let maxPlayers = 0;
        this.t.groups.forEach(g => { if(g.players.length > maxPlayers) maxPlayers = g.players.length; });
        
        let thead = '<thead><tr>';
        this.t.groups.forEach(g => {
            thead += `<th>${g.name}</th>`;
        });
        thead += '</tr></thead>';
        table.innerHTML += thead;
        
        let tbody = document.createElement('tbody');
        for(let r = 0; r < maxPlayers; r++) {
            let tr = document.createElement('tr');
            this.t.groups.forEach((g, cIdx) => {
                let td = document.createElement('td');
                td.style.border = '1px solid var(--border-color)';
                td.style.padding = '0.5rem';
                td.style.cursor = 'pointer';
                td.dataset.row = r;
                td.dataset.col = cIdx;
                
                let p = g.players[r];
                if(p) {
                    td.innerHTML = `<strong>${p.name}</strong><br><small>${p.club}</small><br><span class="badge text-xs">${p.points}</span>`;
                } else {
                    td.innerHTML = `<span class="text-muted">- prázdne -</span>`;
                }
                
                if(this.selectedCell && this.selectedCell.r === r && this.selectedCell.c === cIdx) {
                    td.style.backgroundColor = 'var(--primary-color)';
                    td.style.color = 'white';
                }
                
                td.onclick = () => this.handleCellClick(r, cIdx);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
    },

    handleCellClick(r, c) {
        if(!this.selectedCell) {
            this.selectedCell = { r, c };
            this.renderAdjustmentTable();
        } else {
            if(this.selectedCell.r !== r) {
                App.showAlert('Neplatná výmena', 'Hráčov môžete presúvať iba v rámci rovnakého výkonnostného koša (horizontálne v tom istom riadku).');
                this.selectedCell = null;
                this.renderAdjustmentTable();
                return;
            }
            if(this.selectedCell.c !== c) {
                // Vykonat vymenu
                let p1 = this.t.groups[this.selectedCell.c].players[r];
                let p2 = this.t.groups[c].players[r];
                
                if(p2) this.t.groups[this.selectedCell.c].players[r] = p2;
                else this.t.groups[this.selectedCell.c].players.splice(r, 1);
                
                if(p1) this.t.groups[c].players[r] = p1;
                else this.t.groups[c].players.splice(r, 1);
                
                // Oprava poli, ak by zostali undefined diery
                this.t.groups.forEach(g => {
                    g.players = g.players.filter(x => x !== undefined);
                });
                
                DB.saveTournament(this.t);
            }
            this.selectedCell = null;
            this.renderAdjustmentTable();
        }
    },

    confirmGroups() {
        this.t.status = 'groups';
        DB.saveTournament(this.t);
        App.showAlert('Úspech', 'Skupiny boli úspešne potvrdené. Presun do správy skupín.').then(() => {
            App.navigate('groups', { tournamentId: this.t.id });
        });
    }
};
