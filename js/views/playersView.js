// playersView.js
window.PlayersView = {
    render() {
        const div = document.createElement('div');
        div.className = 'view-section';
        div.innerHTML = `
            <div class="card flex justify-between align-center">
                <h2>Databáza hráčov</h2>
                <div class="flex gap-2">
                    <button class="btn secondary" id="btn-import-csv">Import CSV</button>
                    <input type="file" id="file-import" accept=".csv" class="hidden">
                    <button class="btn secondary" id="btn-export-csv">Export CSV</button>
                    <button class="btn primary" id="btn-show-add">Pridať hráča</button>
                </div>
            </div>

            <div id="add-player-form" class="card hidden">
                <h3>Vytvoriť/Upraviť hráča</h3>
                <div class="grid-3">
                    <div class="form-group">
                        <label>Reg. číslo</label>
                        <input type="text" id="p-regNo" class="form-control" placeholder="Autom. pre neregistrovaných">
                    </div>
                    <div class="form-group">
                        <label>Priezvisko a Meno</label>
                        <input type="text" id="p-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Klub</label>
                        <input type="text" id="p-club" class="form-control" value="Bez klubu">
                    </div>
                    <div class="form-group">
                        <label>Rebríček (Hodnota od 1 do 999999)</label>
                        <input type="number" id="p-points" class="form-control" step="0.01">
                        <small class="text-muted">1-1000 SVK, 1001-10000 Kraj, atď.</small>
                    </div>
                </div>
                <input type="hidden" id="p-id">
                <div class="form-group mt-4">
                    <button class="btn success" id="btn-save-player">Uložiť</button>
                    <button class="btn secondary" id="btn-cancel-player">Zrušiť</button>
                </div>
            </div>

            <div id="import-mapping-form" class="card hidden">
                <h3>Nastavenie stĺpcov pre Import</h3>
                <p class="text-muted" style="margin-bottom: 20px;">Priraďte stĺpce z Vášho súboru k položkám v databáze.</p>
                <div class="grid-2" style="margin-bottom: 20px;">
                    <div class="form-group">
                        <label>Reg. číslo</label>
                        <select id="map-regNo" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label>Priezvisko a Meno</label>
                        <select id="map-name" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label>Klub</label>
                        <select id="map-club" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label>Rebríček</label>
                        <select id="map-points" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label>Interné ID (Voliteľné pre aktualizáciu)</label>
                        <select id="map-id" class="form-control"></select>
                    </div>
                </div>
                <div class="form-group mt-4">
                    <button class="btn success" id="btn-run-import">Naimportovať dáta</button>
                    <button class="btn secondary" id="btn-cancel-import">Zrušiť</button>
                </div>
            </div>

            <div class="card">
                <div class="form-group">
                    <input type="text" id="search-player" class="form-control" placeholder="Hľadať podľa mena, reg. čísla, alebo klubu...">
                </div>
                <div class="flex gap-2 mt-4 mb-2">
                    <button class="btn danger hidden" id="btn-delete-selected">Zmazať označené</button>
                    <button class="btn danger" id="btn-delete-all">Zmazať všetky záznamy</button>
                </div>
                <div class="table-responsive" style="max-height: 60vh; overflow-y: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px"><input type="checkbox" id="check-all-players"></th>
                                <th>Reg. č.</th>
                                <th>Meno</th>
                                <th>Klub</th>
                                <th>Rebríček</th>
                                <th>Akcie</th>
                            </tr>
                        </thead>
                        <tbody id="players-list">
                            <!-- Players array -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        return div;
    },

    init() {
        this.listBody = document.getElementById('players-list');
        this.addForm = document.getElementById('add-player-form');
        this.searchInput = document.getElementById('search-player');
        this.mappingForm = document.getElementById('import-mapping-form');
        
        // Buttons
        document.getElementById('btn-show-add').onclick = () => this.showForm();
        document.getElementById('btn-cancel-player').onclick = () => this.hideForm();
        document.getElementById('btn-save-player').onclick = () => this.savePlayer();

        // Delete Multiple
        document.getElementById('btn-delete-selected').onclick = () => this.deleteSelected();
        document.getElementById('btn-delete-all').onclick = () => this.deleteAll();
        
        document.getElementById('check-all-players').onchange = (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.check-player').forEach(cb => cb.checked = isChecked);
            this.updateDeleteSelectedVisibility();
        };
        
        // CSV
        document.getElementById('btn-cancel-import').onclick = () => this.mappingForm.classList.add('hidden');
        document.getElementById('btn-export-csv').onclick = () => this.exportCSV();
        document.getElementById('btn-import-csv').onclick = () => document.getElementById('file-import').click();
        document.getElementById('file-import').onchange = (e) => this.importCSV(e.target.files[0]);
        
        // Search
        this.searchInput.addEventListener('input', () => this.renderTable());
        
        this.renderTable();
    },

    showForm(p = null) {
        this.addForm.classList.remove('hidden');
        if(p) {
            document.getElementById('p-id').value = p.id;
            document.getElementById('p-regNo').value = p.regNo;
            document.getElementById('p-name').value = p.name;
            document.getElementById('p-club').value = p.club;
            document.getElementById('p-points').value = p.points;
        } else {
            document.getElementById('p-id').value = '';
            document.getElementById('p-regNo').value = DB.getNextUnregisteredRegNo();
            document.getElementById('p-name').value = '';
            document.getElementById('p-club').value = 'Bez klubu';
            // Auto rebríček for completely unregistered players will default to their regNo
            document.getElementById('p-points').value = ''; 
        }
    },
    
    hideForm() {
        this.addForm.classList.add('hidden');
    },

    savePlayer() {
        const id = document.getElementById('p-id').value;
        let regNo = document.getElementById('p-regNo').value.trim();
        const name = document.getElementById('p-name').value.trim();
        const club = document.getElementById('p-club').value.trim();
        let points = parseFloat(document.getElementById('p-points').value);
        
        if(!name) { App.showAlert('Chyba', 'Meno je povinné!'); return; }
        if(!regNo) regNo = DB.getNextUnregisteredRegNo().toString();
        if(isNaN(points)) points = parseFloat(regNo); // Predvolené ako regNo
        
        // overenie či hráč s takým rebríčkom neexistuje (must be unique)
        const players = DB.getPlayers();
        const duplicateRank = players.find(x => x.points === points && x.id !== id);
        if(duplicateRank) {
            App.showAlert('Chyba', 'Rebríček sa nesmie opakovať. Hráč ' + duplicateRank.name + ' už má rebríček ' + points);
            return;
        }

        const p = { id: id || null, regNo, name, club, points };
        
        if(id) DB.updatePlayer(p);
        else DB.addPlayer(p);
        
        this.hideForm();
        this.renderTable();
    },

    renderTable() {
        let players = DB.getPlayers();
        const q = this.searchInput.value.toLowerCase();
        
        if(q) {
            players = players.filter(p => 
                p.name.toLowerCase().includes(q) || 
                p.regNo.toLowerCase().includes(q) || 
                p.club.toLowerCase().includes(q)
            );
        }
        
        // Sort by rank
        players.sort((a,b) => a.points - b.points);
        
        this.listBody.innerHTML = '';
        players.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="check-player" value="${p.id}"></td>
                <td>${p.regNo}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.club}</td>
                <td>${p.points}</td>
                <td>
                    <button class="btn btn-small secondary btn-edit" data-id="${p.id}">Upraviť</button>
                    <button class="btn btn-small danger btn-delete" data-id="${p.id}">Zmazať</button>
                </td>
            `;
            this.listBody.appendChild(tr);
        });
        
        this.listBody.querySelectorAll('.btn-edit').forEach(b => {
             b.onclick = (e) => {
                 const id = e.target.getAttribute('data-id');
                 const p = DB.getPlayers().find(x=>x.id===id);
                 this.showForm(p);
             }
        });
        
        this.listBody.querySelectorAll('.btn-delete').forEach(b => {
             b.onclick = async (e) => {
                 const id = e.target.getAttribute('data-id');
                 if(await App.showConfirm('Zmazať', 'Odstrániť tohto hráča z databázy?')) {
                     DB.deletePlayer(id);
                     this.renderTable();
                 }
             }
        });
        
        this.listBody.querySelectorAll('.check-player').forEach(cb => {
            cb.onchange = () => this.updateDeleteSelectedVisibility();
        });
        const checkAll = document.getElementById('check-all-players');
        if(checkAll) checkAll.checked = false;
        this.updateDeleteSelectedVisibility();
    },

    updateDeleteSelectedVisibility() {
        const checkedBoxes = document.querySelectorAll('.check-player:checked');
        const btnDeleteSelected = document.getElementById('btn-delete-selected');
        
        if (checkedBoxes.length > 0) {
             btnDeleteSelected.classList.remove('hidden');
             btnDeleteSelected.innerText = 'Zmazať označené (' + checkedBoxes.length + ')';
        } else {
             btnDeleteSelected.classList.add('hidden');
        }
    },

    async deleteSelected() {
        const checkedBoxes = document.querySelectorAll('.check-player:checked');
        if(checkedBoxes.length === 0) return;
        
        if(await App.showConfirm('Zmazať', 'Naozaj chcete natrvalo odstrániť ' + checkedBoxes.length + ' vybraných hráčov z databázy?')) {
             let players = DB.getPlayers();
             const idsToRemove = Array.from(checkedBoxes).map(cb => cb.value);
             players = players.filter(p => !idsToRemove.includes(p.id));
             DB.savePlayers(players);
             this.renderTable();
        }
    },

    async deleteAll() {
        if(await App.showConfirm('Kompletné zmazanie', 'VAROVANIE: Naozaj chcete natrvalo ZMAZAŤ ÚPLNE VŠETKÝCH hráčov z databázy?!')) {
             DB.savePlayers([]);
             this.renderTable();
        }
    },

    exportCSV() {
        const csv = DB.exportPlayersCSV();
        if(!csv) { App.showAlert('Info', 'Žiadni hráči na export.'); return; }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "hraci_stolny_tenis.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    importCSV(file) {
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            if(lines.length < 1) {
                App.showAlert('Chyba', 'Súbor je buď prázdny alebo nemá správny formát.');
                return;
            }
            
            let separator = lines[0].includes(';') ? ';' : ',';
            let regex = new RegExp(separator + '(?=(?:(?:[^"]*"){2})*[^"]*$)', 'g');
            
            const firstLine = lines[0].split(regex);
            const headers = firstLine.map((h, i) => ({ idx: i, name: h.replace(/"/g, '').trim() || 'Stĺpec ' + (i+1) }));
            
            // Generate options
            let optionsHtml = '<option value="-1">-- Ignorovať / Nevyberať --</option>';
            headers.forEach(h => {
                optionsHtml += '<option value="' + h.idx + '">' + h.name + '</option>';
            });
            
            const selReg = document.getElementById('map-regNo');
            const selName = document.getElementById('map-name');
            const selClub = document.getElementById('map-club');
            const selPoints = document.getElementById('map-points');
            const selId = document.getElementById('map-id');
            
            selReg.innerHTML = optionsHtml;
            selName.innerHTML = optionsHtml;
            selClub.innerHTML = optionsHtml;
            selPoints.innerHTML = optionsHtml;
            selId.innerHTML = optionsHtml;
            
            // Auto-guess based on header name
            headers.forEach(h => {
                let lower = h.name.toLowerCase();
                if(lower.includes('reg') || lower.includes('číslo')) selReg.value = h.idx;
                if(lower.includes('men') || lower.includes('name')) selName.value = h.idx;
                if(lower.includes('klub') || lower.includes('club')) selClub.value = h.idx;
                if(lower.includes('bod') || lower.includes('reb') || lower.includes('point')) selPoints.value = h.idx;
                if(lower === 'id') selId.value = h.idx;
            });
            
            this.mappingForm.classList.remove('hidden');
            document.getElementById('file-import').value = ''; // Reset input to allow choosing the same file again if canceled
            
            document.getElementById('btn-run-import').onclick = () => {
                this.executeImport(lines, selReg.value, selName.value, selClub.value, selPoints.value, selId.value, regex);
            };
        };
        reader.readAsText(file);
    },

    executeImport(lines, idxReg, idxName, idxClub, idxPoints, idxId, regex) {
        idxReg = parseInt(idxReg);
        idxName = parseInt(idxName);
        idxClub = parseInt(idxClub);
        idxPoints = parseInt(idxPoints);
        idxId = parseInt(idxId);
        
        if(idxName === -1) {
            App.showAlert('Chyba', 'Stĺpec pre Meno musí byť zvolený.');
            return;
        }

        let count = 0;
        const currentPlayers = DB.getPlayers();
        // Skip header lines (assuming row 0 is header)
        for(let i=1; i<lines.length; i++) {
            if(!lines[i].trim()) continue;
            const row = lines[i].split(regex);
            if(row.length > 0) {
                let id = idxId !== -1 && row[idxId] ? row[idxId].replace(/"/g,'').trim() : '';
                let regNo = idxReg !== -1 && row[idxReg] ? row[idxReg].replace(/"/g,'').trim() : '';
                let name = idxName !== -1 && row[idxName] ? row[idxName].replace(/"/g,'').trim() : '';
                let club = idxClub !== -1 && row[idxClub] ? row[idxClub].replace(/"/g,'').trim() : 'Bez klubu';
                // Remove commas replacing dots in numbering if needed, but assuming standard format here
                let rawPoints = idxPoints !== -1 && row[idxPoints] ? parseFloat(row[idxPoints].replace(/"/g,'').replace(',','.')) : NaN;
                let points = isNaN(rawPoints) ? NaN : rawPoints;
                
                if(!name) continue; // Meno nesmie byť prázdne
                
                if(!id) id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                
                const existingIdx = currentPlayers.findIndex(x=>x.id===id);
                const newP = { id, regNo, name, club, points };
                if(existingIdx !== -1) {
                    currentPlayers[existingIdx] = newP;
                } else {
                    currentPlayers.push(newP);
                }
                count++;
            }
        }
        DB.savePlayers(currentPlayers);
        this.mappingForm.classList.add('hidden');
        this.renderTable();
        App.showAlert('Import', 'Úspešne naimportovaných alebo aktualizovaných ' + count + ' riadkov (hráčov).');
    }
};
