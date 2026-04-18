// homeView.js
window.HomeView = {
    render() {
        const div = document.createElement('div');
        div.className = 'view-section';
        div.innerHTML = `
            <div class="card flex justify-between align-center">
                <div>
                    <h2>Správa turnajov</h2>
                    <p class="text-muted">Vyberte si existujúci turnaj alebo vytvorte nový.</p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="file" id="import-file" accept=".json" style="display:none;">
                    <button class="btn secondary" id="btn-import-tournament">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: middle;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Importovať
                    </button>
                    <button class="btn primary" id="btn-new-tournament">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: middle;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
                        Nový turnaj
                    </button>
                </div>
            </div>

            <div id="new-tournament-form" class="card hidden">
                <h3>Vytvoriť nový turnaj</h3>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Názov turnaja</label>
                        <input type="text" id="t-name" class="form-control" placeholder="Napr. Okresný prebor 2026">
                    </div>
                    <div class="form-group">
                        <label>Počet víťazných setov v zápase</label>
                        <select id="t-bestof" class="form-control">
                            <option value="3">Na 3 víťazné (Best of 5)</option>
                            <option value="2">Na 2 víťazné (Best of 3)</option>
                            <option value="4">Na 4 víťazné (Best of 7)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group mt-4">
                    <button class="btn success" id="btn-start-registration">Začať prezentáciu (registráciu hráčov)</button>
                    <button class="btn secondary" id="btn-cancel-new">Zrušiť</button>
                </div>
            </div>

            <div class="card">
                <h3>História turnajov</h3>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Názov</th>
                                <th>Dátum</th>
                                <th>Status</th>
                                <th>Akcie</th>
                            </tr>
                        </thead>
                        <tbody id="tournament-list">
                            <!-- Tournaments -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        return div;
    },

    init() {
        const formNew = document.getElementById('new-tournament-form');
        const listDiv = document.getElementById('tournament-list');
        
        document.getElementById('btn-new-tournament').onclick = () => {
            formNew.classList.remove('hidden');
        };
        document.getElementById('btn-cancel-new').onclick = () => {
            formNew.classList.add('hidden');
        };
        
        const fileInput = document.getElementById('import-file');
        document.getElementById('btn-import-tournament').onclick = () => fileInput.click();
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (!imported.id || !imported.name) throw new Error("Neplatný formát turnaja");
                    
                    const existing = DB.getTournament(imported.id);
                    if (existing) {
                        imported.id = Date.now().toString() + Math.floor(Math.random()*1000);
                        imported.name = imported.name + " (Importované)";
                    }
                    
                    DB.saveTournament(imported);
                    App.showAlert('Úspech', 'Turnaj bol úspešne importovaný.');
                    this.renderTournaments(document.getElementById('tournament-list'));
                } catch (err) {
                    App.showAlert('Chyba', 'Súbor sa nepodarilo načítať. ' + err.message);
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        };
        
        document.getElementById('btn-start-registration').onclick = () => {
            const name = document.getElementById('t-name').value.trim();
            const bestof = parseInt(document.getElementById('t-bestof').value, 10);
            if(!name) { App.showAlert('Chyba', 'Názov turnaja nemôže byť prázdny.'); return; }
            
            const newTourney = {
                id: Date.now().toString(),
                name: name,
                date: new Date().toLocaleDateString('sk-SK'),
                bestOf: bestof,  // 2, 3, or 4 winning sets needed
                status: 'registration', // registration, groups, ko, finished
                participants: [], // array of {player, seedRank?} 
                groups: [], 
                groupMatches: [],
                koBracket: []
            };
            
            DB.saveTournament(newTourney);
            App.navigate('registration', { tournamentId: newTourney.id });
        };

        this.renderTournaments(listDiv);
    },

    renderTournaments(tbody) {
        const ts = DB.getTournaments();
        tbody.innerHTML = '';
        if(ts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Zatiaľ žiadne turnaje v archíve.</td></tr>';
            return;
        }
        
        // render reversed (newest first)
        ts.slice().reverse().forEach(t => {
            const tr = document.createElement('tr');
            
            let statusBadge = '<span class="badge active">Otvorený</span>';
            if(t.status === 'finished') statusBadge = '<span class="badge finished">Ukončený</span>';
            
            tr.innerHTML = `
                <td><strong>${t.name}</strong></td>
                <td>${t.date}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-small primary btn-open" data-id="${t.id}">Otvoriť</button>
                    <button class="btn btn-small secondary btn-export" data-id="${t.id}">Export</button>
                    <button class="btn btn-small danger btn-delete" data-id="${t.id}">Zmazať</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // bind events
        tbody.querySelectorAll('.btn-open').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.getAttribute('data-id');
                const t = DB.getTournament(id);
                if(t.status === 'registration') App.navigate('registration', { tournamentId: id });
                else if (t.status === 'groups') App.navigate('groups', { tournamentId: id });
                else if (t.status === 'ko' || t.status === 'finished') App.navigate('bracket', { tournamentId: id });
            };
        });

        tbody.querySelectorAll('.btn-export').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.getAttribute('data-id');
                const t = DB.getTournament(id);
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(t, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "turnaj_" + t.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            };
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.getAttribute('data-id');
                const conf = await App.showConfirm('Odstrániť', 'Naozaj chcete zmazať tento turnaj z histórie?');
                if(conf) {
                    DB.deleteTournament(id);
                    this.renderTournaments(tbody);
                }
            };
        });
    }
};
