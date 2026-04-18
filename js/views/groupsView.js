// groupsView.js

window.GroupsView = {
    render(params) {
        this.tournamentId = params.tournamentId;
        const tournament = DB.getTournament(this.tournamentId);
        
        const div = document.createElement('div');
        div.className = 'view-section';
        div.innerHTML = `
            <div class="card flex justify-between align-center print-hide">
                <h2>Skupinová fáza: ${tournament.name}</h2>
                <div class="flex gap-2">
                    <button class="btn secondary" id="btn-print-matches">Vytlačiť aktuálne zobrazenie</button>
                    ${(tournament.status === 'ko' || tournament.status === 'finished') ? 
                        `<button class="btn primary" id="btn-back-ko">Späť na Pavúka</button>` : 
                        `<button class="btn success" id="btn-finish-groups">Ukončiť skupiny a prejsť na KO</button>`
                    }
                </div>
            </div>

            <!-- Prepinace -->
            <div class="card print-hide">
                <div class="flex gap-4">
                    <button class="btn primary" id="tab-matches">Zoznam zápasov</button>
                    <button class="btn secondary" id="tab-tabulka">Prehľad skupín</button>
                    <button class="btn secondary" id="tab-score-slips">Zápisnice na stoly</button>
                </div>
            </div>

            <!-- Tab: Zapasy -->
            <div id="view-matches" class="card">
                <h3>Zoznam zápasov (Prepletené)</h3>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Zápas č.</th>
                                <th>Skupina</th>
                                <th>Stôl</th>
                                <th style="text-align: right">Hráč 1</th>
                                <th>vs</th>
                                <th>Hráč 2</th>
                                <th style="text-align:center">Sety</th>
                                <th>Skóre</th>
                                <th class="print-hide">Akcia</th>
                            </tr>
                        </thead>
                        <tbody id="matches-list">
                            <!-- Matches -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tab: Tabulky -->
            <div id="view-tables" class="hidden">
               <!-- Vygeneruje sa dynamicky -->
            </div>
            
            <!-- Tab: Zapisnice (Lístky) -->
            <div id="view-score-slips" class="hidden" style="display: flex; gap: 20px; flex-wrap: wrap;">
               <!-- Vygeneruje sa dynamicky -->
            </div>
            
            <style>
                .score-slip {
                    width: calc(50% - 10px);
                    border: 2px solid #ccc;
                    padding: 15px;
                    margin-bottom: 20px;
                    box-sizing: border-box;
                    background: #fff;
                    color: #000;
                    page-break-inside: avoid;
                }
                .score-slip .header { margin: 0 0 10px 0; font-size: 1.1rem; border-bottom: 1px solid #ccc; padding-bottom: 5px;}
                .score-slip .p-names { font-size: 1.3rem; margin-bottom: 15px; font-weight: bold;}
                .score-slip table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                .score-slip th, .score-slip td { border: 1px solid #999 !important; padding: 10px !important; text-align: center; }
                .score-slip td { height: 40px; }
                .score-slip .sign { display: flex; justify-content: space-between; margin-top: 20px; font-size: 0.9rem;}
                @media print {
                    .print-hide { display: none !important; }
                    body { background: white; color: black; }
                    .card { box-shadow: none; border: none; }
                    #view-matches table, #view-matches th, #view-matches td { border: 1px solid black !important; }
                    #view-tables table, #view-tables th, #view-tables td { border: 1px solid black !important; }
                    .score-slip { border-color: #000; }
                }
            </style>
        `;
        return div;
    },

    init() {
        this.t = DB.getTournament(this.tournamentId);
        
        // Vygenerovanie ak neexistuju
        if(!this.t.groupMatches || this.t.groupMatches.length === 0) {
            this.t.groupMatches = window.BergerEngine.generateAllMatches(this.t.groups);
            DB.saveTournament(this.t);
        }
        
        // Tabs
        const tabM = document.getElementById('tab-matches');
        const tabT = document.getElementById('tab-tabulka');
        const tabS = document.getElementById('tab-score-slips');
        
        const views = {
             matches: document.getElementById('view-matches'),
             tables: document.getElementById('view-tables'),
             slips: document.getElementById('view-score-slips')
        };
        
        tabM.onclick = () => {
             tabM.className = 'btn primary'; tabT.className = 'btn secondary'; tabS.className = 'btn secondary';
             views.matches.classList.remove('hidden'); views.tables.classList.add('hidden'); views.slips.classList.add('hidden');
             this.renderMatches();
        };
        tabT.onclick = () => {
             tabM.className = 'btn secondary'; tabT.className = 'btn primary'; tabS.className = 'btn secondary';
             views.matches.classList.add('hidden'); views.tables.classList.remove('hidden'); views.slips.classList.add('hidden');
             this.renderTables();
        };
        tabS.onclick = () => {
             tabM.className = 'btn secondary'; tabT.className = 'btn secondary'; tabS.className = 'btn primary';
             views.matches.classList.add('hidden'); views.tables.classList.add('hidden'); views.slips.classList.remove('hidden');
             this.renderScoreSlips();
        };

        // Print limits
        document.getElementById('btn-print-matches').onclick = () => window.print();

        const btnFinish = document.getElementById('btn-finish-groups');
        if (btnFinish) btnFinish.onclick = () => this.finishGroups();
        
        const btnBackKo = document.getElementById('btn-back-ko');
        if (btnBackKo) btnBackKo.onclick = () => App.navigate('bracket', { tournamentId: this.t.id });

        if (this.t.status === 'ko' || this.t.status === 'finished') {
             tabT.click();
        } else {
             this.renderMatches();
        }
    },

    renderMatches() {
        const tbody = document.getElementById('matches-list');
        tbody.innerHTML = '';
        
        const reqWins = parseInt(this.t.bestOf, 10) || 3;
        const maxSets = reqWins * 2 - 1;

        this.t.groupMatches.forEach((m, index) => {
            const tr = document.createElement('tr');
            tr.id = 'match-row-' + index;
            if (m.status === 'finished') {
                tr.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            }
            
            let parts = (m.resultStr || '').split(/[,\s]+/).filter(x => x.trim().length > 0);
            let inputsHtml = '<div class="flex gap-1" style="justify-content: center">';
            for(let s=0; s<maxSets; s++) {
                 const v = parts[s] || '';
                 inputsHtml += '<input type="text" class="form-control set-box print-hide" style="width:36px; padding:4px 2px; text-align:center" data-idx="' + index + '" data-set="' + s + '" value="' + v + '">';
            }
            inputsHtml += '</div>';
            
            tr.innerHTML = `
                <td><strong>${m.matchNo}</strong></td>
                <td><span class="badge active">${m.groupName}</span></td>
                <td><input type="text" style="width:50px" class="form-control table-input print-hide" value="${m.tableNo || ''}" data-idx="${index}">
                    <span style="display:none" class="print-show">${m.tableNo || '_____'}</span></td>
                <td style="text-align: right; font-size: 1.1rem; ${m.status==='finished' && m.p1sets > m.p2sets ? 'font-weight:bold' : ''}">${m.p1.name}</td>
                <td>-</td>
                <td style="font-size: 1.1rem; ${m.status==='finished' && m.p2sets > m.p1sets ? 'font-weight:bold' : ''}">${m.p2.name}</td>
                <td class="print-hide">
                    ${inputsHtml}
                </td>
                <td class="print-show" style="display:none;"></td>
                <td style="text-align: center;">
                    <strong id="score-text-${index}" style="font-size: 1.2rem;">${(m.status === 'finished' || m.resultStr) ? m.p1sets + ' : ' + m.p2sets : ''}</strong>
                </td>
                <td class="print-hide">
                    <button class="btn btn-small secondary btn-clear-m ${m.resultStr ? '' : 'hidden'}" id="btn-clear-${index}" data-idx="${index}">Vymazať</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add Print Show css dynamic logic inline
        let extraCSS = document.getElementById('dyn-print-css');
        if(!extraCSS) {
            extraCSS = document.createElement('style');
            extraCSS.id = 'dyn-print-css';
            document.head.appendChild(extraCSS);
        }
        extraCSS.innerHTML = `@media print { .print-show { display: table-cell !important; } .table-input { display:none;} .set-input { display:none;} }`;

        // Bind auto-save on change / keyup
        tbody.querySelectorAll('.set-box').forEach(b => {
             b.addEventListener('input', (e) => this.autoSaveMatch(e.target.getAttribute('data-idx')));
        });
        tbody.querySelectorAll('.btn-clear-m').forEach(b => {
             b.onclick = (e) => {
                 const idx = e.target.getAttribute('data-idx');
                 document.querySelectorAll('.set-box[data-idx="' + idx + '"]').forEach(inp => inp.value = '');
                 this.autoSaveMatch(idx);
             };
        });
        tbody.querySelectorAll('.table-input').forEach(b => {
             b.onchange = (e) => {
                 const idx = e.target.getAttribute('data-idx');
                 this.t.groupMatches[idx].tableNo = e.target.value;
                 DB.saveTournament(this.t);
             }
        });
    },

    autoSaveMatch(idx) {
        const m = this.t.groupMatches[idx];
        const inputs = Array.from(document.querySelectorAll('.set-box[data-idx="' + idx + '"]'));
        
        let allValues = inputs.map(inp => inp.value.trim());
        let val = allValues.filter(x => x !== '').join(', ');
        
        // Parse results
        let p1wins = 0, p2wins = 0;
        let p1balls = 0, p2balls = 0;
        const reqWins = parseInt(this.t.bestOf, 10) || 3;
        const validParts = [];
        
        for(let part of allValues) {
            if(!part) continue;
            // Allow just '-' as valid intermediate typing state
            if(part === '-') continue; 

            let num = parseInt(part, 10);
            if(isNaN(num) || num === 0) continue;
            
            validParts.push(num);
            let absNum = Math.abs(num);
            let winPoints = absNum < 10 ? 11 : absNum + 2;
            let losePoints = absNum;

            if(num < 0) {
                p2wins++;
                p2balls += winPoints;
                p1balls += losePoints;
            } else if(num > 0) {
                p1wins++;
                p1balls += winPoints;
                p2balls += losePoints;
            }
        }
        
        m.resultStr = val;
        m.p1balls = p1balls;
        m.p2balls = p2balls;
        
        // Is finished logic
        if (p1wins >= reqWins || p2wins >= reqWins || (validParts.length === (reqWins*2 - 1))) {
            m.status = 'finished';
        } else if (val === '') {
            m.status = 'pending';
        } else {
            m.status = 'pending';
        }

        m.p1sets = p1wins;
        m.p2sets = p2wins;
        
        DB.saveTournament(this.t);
        
        // Update DOM inline without stealing focus
        const scoreLbl = document.getElementById('score-text-' + idx);
        const rowTr = document.getElementById('match-row-' + idx);
        const btnClear = document.getElementById('btn-clear-' + idx);
        
        if(m.status === 'finished') {
            scoreLbl.innerText = m.p1sets + ' : ' + m.p2sets;
            rowTr.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            btnClear.classList.remove('hidden');
        } else {
             scoreLbl.innerText = val ? (m.p1sets + ' : ' + m.p2sets) : '';
             rowTr.style.backgroundColor = '';
             if (val) btnClear.classList.remove('hidden');
             else btnClear.classList.add('hidden');
        }
    },

    renderScoreSlips() {
        const container = document.getElementById('view-score-slips');
        container.innerHTML = '';
        
        const reqWins = parseInt(this.t.bestOf, 10) || 3;
        const maxSets = reqWins * 2 - 1;
        
        this.t.groupMatches.forEach((m) => {
            const slip = document.createElement('div');
            slip.className = 'score-slip';
            
            let thHtml = '<th>Hráč</th>';
            let p1Html = '<td style="text-align:left"><strong>' + m.p1.name + '</strong></td>';
            let p2Html = '<td style="text-align:left"><strong>' + m.p2.name + '</strong></td>';
            
            for(let s=1; s<=maxSets; s++) {
                thHtml += '<th>' + s + '.</th>';
                p1Html += '<td></td>';
                p2Html += '<td></td>';
            }
            thHtml += '<th>Výsledok</th>';
            p1Html += '<td></td>';
            p2Html += '<td></td>';
            
            slip.innerHTML = '<div class="header">Skupina: <strong>' + m.groupName + '</strong> | Zápas č. ' + m.matchNo + ' | Stôl: ' + (m.tableNo || '_____') + '</div>' + 
                             '<div class="p-names">' + m.p1.name + ' <span style="font-weight:normal; font-size: 1rem">vs</span> ' + m.p2.name + '</div>' +
                             '<table>' +
                             '<thead><tr>' + thHtml + '</tr></thead>' +
                             '<tbody><tr>' + p1Html + '</tr><tr>' + p2Html + '</tr></tbody>' +
                             '</table>' +
                             '<div class="sign"><span>Podpis: _________________________</span><span>Podpis: _________________________</span></div>';
            container.appendChild(slip);
        });
    },

    renderTables() {
        const container = document.getElementById('view-tables');
        container.innerHTML = '';
        
        // Spätná kompatibilita pre staršie zápasy
        let needsSave = false;
        this.t.groupMatches.forEach(m => {
            if (m.resultStr && m.p1balls === undefined) {
                let p1b = 0, p2b = 0;
                const parts = m.resultStr.split(/[,\s]+/).map(x => x.trim()).filter(x => x);
                for(let part of parts) {
                    if(part === '-') continue; 
                    let num = parseInt(part, 10);
                    if(isNaN(num) || num === 0) continue;
                    let absNum = Math.abs(num);
                    let wp = absNum < 10 ? 11 : absNum + 2;
                    if(num < 0) { p2b += wp; p1b += absNum; }
                    else { p1b += wp; p2b += absNum; }
                }
                m.p1balls = p1b; m.p2balls = p2b;
                needsSave = true;
            }
        });
        if (needsSave) DB.saveTournament(this.t);

        this.t.groups.forEach(g => {
            // Získame iba zápasy pre túto skupinu
            const gm = this.t.groupMatches.filter(m => m.groupId === g.id);
            
            // Vyhodnotime cez ITTF
            const rows = window.IttfEngine.evaluateGroup(g.players, gm);
            
            const tableWrap = document.createElement('div');
            tableWrap.className = 'card mb-4';
            
            let tbodyHtml = '';
            rows.forEach((r, idx) => {
                tbodyHtml += `
                    <tr>
                        <td><strong>${idx + 1}.</strong></td>
                        <td>${r.player.name}</td>
                        <td><small>${r.player.club}</small></td>
                        <td>${r.played}</td>
                        <td>${r.won}</td>
                        <td>${r.lost}</td>
                        <td>${r.setsWon} : ${r.setsLost}</td>
                        <td>${r.ballsWon} : ${r.ballsLost}</td>
                        <td><strong>${r.pts}</strong></td>
                    </tr>
                `;
                // Aktualizujeme si aj do global group poradia
                let actualPIndex = g.players.findIndex(x=>x.id===r.player.id);
                if(actualPIndex !== -1) g.players[actualPIndex]._finalRank = idx + 1;
            });
            
            tableWrap.innerHTML = `
                <h3>${g.name}</h3>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Z.</th>
                                <th>Hráč</th>
                                <th>Klub</th>
                                <th>Odohraté</th>
                                <th>V</th>
                                <th>P</th>
                                <th>Sety</th>
                                <th>Lopty</th>
                                <th>Body</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tbodyHtml}
                        </tbody>
                    </table>
                </div>
            `;
            
            if (rows.minitables && rows.minitables.length > 0) {
                let mtDetails = document.createElement('details');
                mtDetails.style.marginTop = '10px';
                mtDetails.style.marginBottom = '10px';
                mtDetails.className = 'print-hide';
                mtDetails.innerHTML = '<summary style="cursor:pointer; color: #3b82f6; font-weight:bold; padding: 5px 0;">Zobraziť pomocnú minitabuľku zo vzájomných zápasov pri zhode z tejto skupiny</summary>';
                
                let wrap = document.createElement('div');
                wrap.style.paddingTop = '10px';
                
                rows.minitables.forEach((mt, idx) => {
                    let tHtml = `
                    <div class="table-responsive" style="margin-bottom:15px; border-left: 3px solid #3b82f6;">
                        <table style="font-size: 0.9rem;">
                            <thead style="background: rgba(59, 130, 246, 0.1);">
                                <tr>
                                    <th>Hráč</th>
                                    <th>Sety</th>
                                    <th>Lopty</th>
                                    <th>Body vo vz. z.</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    mt.table.forEach(r => {
                        tHtml += `
                                <tr>
                                    <td><strong>${r.player.name}</strong></td>
                                    <td>${r.setsWon} : ${r.setsLost}</td>
                                    <td>${r.ballsWon} : ${r.ballsLost}</td>
                                    <td><strong>${r.pts}</strong></td>
                                </tr>
                        `;
                    });
                    tHtml += '</tbody></table></div>';
                    wrap.innerHTML += tHtml;
                });
                
                mtDetails.appendChild(wrap);
                tableWrap.appendChild(mtDetails);
            }
            
            container.appendChild(tableWrap);
        });
        
        // Zapiseme _finalRank do storage ak sa zavola toto zobrazenie pred postupom
        DB.saveTournament(this.t);
    },

    finishGroups() {
        // Kontrola ci su vsetky zapasy
        const pending = this.t.groupMatches.filter(m => m.status !== 'finished');
        if(pending.length > 0) {
            App.showAlert('Nemôžete pokračovať', `Vyplňte výsledky všetkých zápasov v skupinách. Zostáva: ${pending.length}`);
            return;
        }
        
        // Istota prepocitania 
        this.renderTables(); 
        
        // Vytvorenie KO z pierwszych dwóch miejsc
        let qualified = [];
        this.t.groups.forEach(g => {
            // players by _finalRank
            let p1 = g.players.find(x => x._finalRank === 1);
            let p2 = g.players.find(x => x._finalRank === 2);
            if(p1) qualified.push({ ...p1, _seedGroup: g.name, _pos: 1 });
            if(p2) qualified.push({ ...p2, _seedGroup: g.name, _pos: 2 });
        });
        
        if(qualified.length === 0) return;
        
        // Nasadenie do Pavúka
        this.t.koBracket = window.KoBracketEngine.generateBracket(qualified, this.t.groupsCount);
        this.t.status = 'ko';
        
        DB.saveTournament(this.t);
        
        App.showAlert('Hotovo', 'Skupiny boli vyhodnotené, presúvame sa na KO pavúka.').then(() => {
            App.navigate('bracket', { tournamentId: this.t.id });
        });
    }
};
