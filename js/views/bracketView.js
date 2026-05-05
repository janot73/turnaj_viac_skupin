// bracketView.js

window.BracketView = {
    render(params) {
        this.tournamentId = params.tournamentId;
        const tournament = DB.getTournament(this.tournamentId);
        
        const div = document.createElement('div');
        div.className = 'view-section';
        div.innerHTML = `
            <div class="card flex justify-between align-center print-hide">
                <h2>Play-off Pavúk: ${tournament.name}</h2>
                <div class="flex gap-2">
                    <button class="btn secondary" id="btn-view-groups">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        Prehľad skupín
                    </button>
                    <button class="btn secondary" id="btn-print-bracket">Vytlačiť pavúka</button>
                    ${tournament.status !== 'finished' ? 
                        `<button class="btn danger" id="btn-revert-groups" title="Vrátiť sa o úroveň späť do Skupín a zmazať aktuálneho Pavúka">Zrušiť Pavúka (Späť)</button>
                         <button class="btn success" id="btn-finish-tourney">Ukončiť turnaj</button>` : 
                        `<button class="btn primary" disabled>Turnaj je ukončený</button>`
                    }
                </div>
            </div>

            <div class="card print-hide" id="bracket-tabs" style="display:none; margin-bottom: 1rem;">
                <div class="flex gap-4">
                    <button class="btn primary" id="tab-main-bracket">🏆 Hlavný Pavúk (Play-off)</button>
                    <button class="btn secondary" id="tab-cons-bracket">🏅 Pavúk Útechy (Consolation)</button>
                </div>
            </div>

            <div class="bracket-container card">
                <!-- Dynamicky vykreslené v init() -->
            </div>
            
            <style>
               .bracket-container {
                   display: flex;
                   gap: 2rem;
                   overflow-x: auto;
                   padding: 2rem 1rem;
                   min-width: 800px;
                   page-break-inside: avoid;
                   break-inside: avoid;
               }
               .bracket-column {
                   display: flex;
                   flex-direction: column;
                   justify-content: space-around;
                   flex: 1;
                   min-width: 250px;
               }
               .match-box {
                   border: 1px solid var(--border-color);
                   border-radius: var(--border-radius);
                   background: var(--surface-color);
                   margin: 0.5rem 0;
                   position: relative;
                   height: 145px;
                   min-height: 145px;
                   max-height: 145px;
                   display: flex;
                   flex-direction: column;
                   justify-content: flex-start;
               }
               .match-box.finished {
                   border-left: 4px solid var(--primary-color);
               }
               .player-row {
                   display: flex;
                   justify-content: space-between;
                   padding: 0.5rem;
                   border-bottom: 1px solid var(--border-color);
                   flex-shrink: 0;
               }
               .player-row:last-child {
                   border-bottom: none;
               }
               .player-row:first-child {
                   border-top-left-radius: var(--border-radius);
                   border-top-right-radius: var(--border-radius);
               }
               .player-row span {
                   white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; padding-right: 0.5rem;
               }
               .player-row.winner {
                   font-weight: bold;
                   color: var(--primary-color);
               }
               h2, h4 {
                   white-space: nowrap;
                   height: 1.5rem;
                   line-height: 1.5rem;
                   overflow: visible;
               }
               .match-controls {
                   padding: 0.5rem;
                   background: rgba(0,0,0,0.2);
                   display: flex;
                   gap: 0.5rem;
                   align-items: center;
                   border-bottom-left-radius: var(--border-radius);
                   border-bottom-right-radius: var(--border-radius);
                   flex-wrap: nowrap !important;
                   overflow: hidden;
               }
               .bracket-pair {
                   display: flex; flex-direction: column; flex: 1; position: relative;
               }
               /* Explicit Horizontal lines injected as DOM elements */
               .incoming-line {
                   position: absolute; left: -1rem; top: 50%; width: 1rem; border-top: 2px solid var(--primary-color); pointer-events: none; z-index: 10;
               }
               .outgoing-line {
                   position: absolute; right: -1rem; top: 50%; width: 1rem; border-top: 2px solid var(--primary-color); pointer-events: none; z-index: 10;
               }
               
               /* Vertical top match going down, spans its 0.5rem margin */
               .bracket-pair.has-next-match .match-box.match-top::after {
                   content: ''; position: absolute; right: -1rem; top: 50%; bottom: -0.55rem; border-right: 2px solid var(--primary-color);
               }
               /* Vertical bottom match going up, spans its 0.5rem margin */
               .bracket-pair.has-next-match .match-box.match-bottom::after {
                   content: ''; position: absolute; right: -1rem; top: -0.55rem; bottom: 50%; border-right: 2px solid var(--primary-color);
               }
               /* Vertical gap filler between matches */
               .bracket-gap-line {
                   flex: 1; border-right: 2px solid var(--primary-color); margin-right: -1rem; display: block; min-height: 0px;
               }
               
               @media print {
                   .bracket-container {
                       page-break-inside: avoid;
                       break-inside: avoid;
                   }
                   .bracket-gap-line, 
                   .bracket-pair.has-next-match .match-box::after, 
                   .incoming-line, .outgoing-line, .match-box {
                       border-color: black !important;
                   }
                   @page { size: landscape; margin: 10mm; }
                   .print-hide { /* handled specifically */ }
                   .card.print-hide { display: none !important; }
                   body { background: white; color: black; }
                   .card { box-shadow: none; border: none; padding: 0; margin: 0; }
                   .app-header { display: none !important; }
                   .match-controls { opacity: 0 !important; }
                   .match-box input { border: none !important; color: transparent !important; background: transparent !important; }
                   .match-box { border: 1px solid black !important; background: white; margin: 0.5rem 0 !important; }
                   .bracket-container { overflow-x: visible; padding: 0; }
                   h2, h4 { color: black; }
                   
                   .match-3rd::before { color: black !important; }
               }
               .match-3rd {
                   position: absolute;
                   bottom: 0px;
                   left: 0;
                   right: 0;
               }
               .match-3rd::before {
                   content: 'O 3. miesto';
                   position: absolute;
                   top: -1.3rem;
                   left: 0;
                   width: 100%;
                   text-align: center;
                   font-size: 0.8rem;
                   font-weight: 600;
                   color: var(--text-muted);
               }
            </style>
        `;
        return div;
    },

    init() {
        this.t = DB.getTournament(this.tournamentId);
        
        if(!this.t.koBracket || this.t.koBracket.length === 0) {
            App.showAlert('Chyba', 'KO Pavúk neexistuje.'); return;
        }

        // Tlacidlo tlace
        document.getElementById('btn-print-bracket').onclick = () => window.print();
        
        const viewGroupsBtn = document.getElementById('btn-view-groups');
        if(viewGroupsBtn) viewGroupsBtn.onclick = () => App.navigate('groups', { tournamentId: this.t.id });

        
        const finishBtn = document.getElementById('btn-finish-tourney');
        if(finishBtn) finishBtn.onclick = () => this.finishTournament();
        
        const revertBtn = document.getElementById('btn-revert-groups');
        if(revertBtn) {
            revertBtn.onclick = async () => {
                const ok = await App.showConfirm('Návrat do Skupín', 'Naozaj chcete zrušiť doterajšieho KO Pavúka a vrátiť sa späť do fázy zadávania skupín? Zápasy zadané v Pavúku sa natrvalo vymažú.');
                if(ok) {
                    this.t.status = 'groups';
                    this.t.koBracket = [];
                    DB.saveTournament(this.t);
                    App.navigate('groups', { tournamentId: this.t.id });
                }
            };
        }

        this.activeBracketName = 'main';
        
        const tabContainer = document.getElementById('bracket-tabs');
        const tabM = document.getElementById('tab-main-bracket');
        const tabC = document.getElementById('tab-cons-bracket');
        
        if (this.t.koBracketConsolation) {
            tabContainer.style.display = 'block';
            tabM.onclick = () => {
                tabM.className = 'btn primary'; tabC.className = 'btn secondary';
                this.activeBracketName = 'main';
                this.renderBracket();
            };
            tabC.onclick = () => {
                tabM.className = 'btn secondary'; tabC.className = 'btn primary';
                this.activeBracketName = 'consolation';
                this.renderBracket();
            };
        }

        this.renderBracket();
    },

    getActiveBracket() {
        return this.activeBracketName === 'consolation' ? this.t.koBracketConsolation : this.t.koBracket;
    },

    renderBracket() {
        let bracket = this.getActiveBracket();
        // Kontrola byes a update závislostí
        window.KoBracketEngine.updateDependentMatches(bracket);
        DB.saveTournament(this.t); // ulozit aktualizovany stav

        const container = document.querySelector('.bracket-container');
        container.innerHTML = '';
        
        let displayRounds = [];
        for(let r of bracket) {
            if(r.length > 0 && r[0].roundLevel === 99) {
                if(displayRounds.length > 0) displayRounds[displayRounds.length - 1].push(r[0]);
            } else {
                displayRounds.push([...r]);
            }
        }
        let rounds = displayRounds;
        
        const reqWins = parseInt(this.t.bestOf, 10) || 3;
        const maxSets = reqWins * 2 - 1;
        
        for(let rIndex = 0; rIndex < rounds.length; rIndex++) {
            let columnMatches = rounds[rIndex];
            
            // Kolonka pre kolo
            let colDiv = document.createElement('div');
            colDiv.className = 'bracket-column';
            
            let isFinalCol = (rIndex === rounds.length - 1);
            
            let title = document.createElement('h4');
            title.className = 'text-center mb-4';
            if(isFinalCol) title.innerText = 'Finále';
            else if(columnMatches.length === 2 && !isFinalCol) title.innerText = 'Semifinále';
            else if(columnMatches.length === 4 && !isFinalCol) title.innerText = 'Štvrťfinále';
            else if(columnMatches.length === 8 && !isFinalCol) title.innerText = 'Osemfinále';
            else if(columnMatches.length === 16 && !isFinalCol) title.innerText = 'Šestnásťfinále';
            else title.innerText = `Kolo ${rIndex + 1}`;
            
            colDiv.appendChild(title);
            
            for(let p=0; p<columnMatches.length; p+=2) {
                let pairDiv = document.createElement('div');
                pairDiv.className = 'bracket-pair' + (!isFinalCol ? ' has-next-match' : '');
                
                let matchesToRender = [columnMatches[p]];
                if(p + 1 < columnMatches.length) matchesToRender.push(columnMatches[p+1]);
                
                // explicit top flex spacer (25% gap equivalent)
                let topSpacer = document.createElement('div');
                topSpacer.style.flex = "0.5";
                pairDiv.appendChild(topSpacer);
                
                matchesToRender.forEach((m, idx) => {
                    let mBox = document.createElement('div');
                    mBox.className = 'match-box ' + (m.status === 'finished' ? 'finished' : '') + (m.roundLevel === 99 ? ' match-3rd' : '');
                    if (idx === 0) mBox.className += ' match-top';
                    if (idx === 1) mBox.className += ' match-bottom';
                    
                    let linesHtml = '';
                    if (rIndex > 0 && m.roundLevel !== 99) {
                        linesHtml += `<div class="incoming-line"></div>`;
                    }
                    if (!isFinalCol && m.roundLevel !== 99) {
                        linesHtml += `<div class="outgoing-line"></div>`;
                    }
                
                let p1Name = m.p1 && m.p1.name ? m.p1.name : (m.p1 === null ? 'TBD' : 'Voľný žreb');
                let p2Name = m.p2 && m.p2.name ? m.p2.name : (m.p2 === null ? 'TBD' : 'Voľný žreb');
                
                let p1Won = m.winnerId && m.p1 && m.winnerId === m.p1.id;
                let p2Won = m.winnerId && m.p2 && m.winnerId === m.p2.id;
                
                let isBye = !(m.p1 && m.p1.id && m.p1.id !== 'bye' && m.p2 && m.p2.id && m.p2.id !== 'bye');

                let controlHtml = '';
                let parts = (m.resultStr || '').split(/[,\\s]+/).map(x=>x.trim()).filter(x=>x);
                let boxes = '<div class="flex gap-1" style="justify-content:center; width:100%">';
                for(let s=0; s<maxSets; s++) {
                     let v = parts[s] || '';
                     boxes += '<input type="text" class="form-control set-box-ko print-hide" style="width:36px; padding:4px 2px; text-align:center" data-mid="' + m.matchId + '" data-set="' + s + '" value="' + v + '" ' + (isBye ? 'disabled' : '') + '>';
                }
                boxes += '</div>';
                
                if(m.status !== 'finished') {
                    controlHtml = `<div class="match-controls print-hide" style="flex-wrap: wrap; ${isBye ? 'opacity:0; pointer-events:none;' : ''}">${boxes}</div>`;
                } else {
                    controlHtml = `<div class="match-controls print-hide" style="flex-wrap: wrap; background: rgba(16, 185, 129, 0.1); ${isBye ? 'opacity:0; pointer-events:none;' : ''}">${boxes}` + 
                                  `<button class="btn-small secondary no-border mt-1" style="cursor:pointer; width:100%" onclick="window.BracketView.clearScore('${m.matchId}')">Vymazať</button></div>`;
                }

                mBox.innerHTML = `
                    ${linesHtml}
                    <div class="text-xs text-muted">Stôl: <input type="text" style="width:30px;background:none;border:none;color:#fff;" class="print-hide" value="${m.tableNo || ''}" onchange="window.BracketView.saveTable('${m.matchId}', this.value)"> <span class="print-show" style="display:none">${m.tableNo||''}</span></div>
                    <div class="player-row ${p1Won ? 'winner' : ''}">
                        <span>${p1Name}</span>
                        <span id="score-p1-${m.matchId}">${m.p1sets !== undefined ? m.p1sets : '-'}</span>
                    </div>
                    <div class="player-row ${p2Won ? 'winner' : ''}">
                        <span>${p2Name}</span>
                        <span id="score-p2-${m.matchId}">${m.p2sets !== undefined ? m.p2sets : '-'}</span>
                    </div>
                    ${controlHtml}
                `;
                
                pairDiv.appendChild(mBox);
                
                // Insert the HTML flex trunk structurally explicit
                if(idx === 0 && matchesToRender.length === 2 && !isFinalCol) {
                    let divGap = document.createElement('div');
                    divGap.className = 'bracket-gap-line';
                    divGap.style.flex = "1"; // 50% gap equivalent
                    pairDiv.appendChild(divGap);
                }
            });
            
            // explicit bottom flex spacer (25% gap equivalent)
            let bottomSpacer = document.createElement('div');
            bottomSpacer.style.flex = "0.5";
            pairDiv.appendChild(bottomSpacer);
            
            colDiv.appendChild(pairDiv);
        }
            
            container.appendChild(colDiv);
        }
        
        container.querySelectorAll('.set-box-ko').forEach(inp => {
            inp.addEventListener('input', (e) => this.autoSaveMatch(e.target.getAttribute('data-mid')));
        });
    },

    findMatch(matchId) {
        let bracket = this.getActiveBracket();
        for(let rnd of bracket) {
            for(let m of rnd) {
                if(m.matchId === matchId) return m;
            }
        }
        return null;
    },

    saveTable(matchId, val) {
        let m = this.findMatch(matchId);
        if(m) {
            m.tableNo = val;
            DB.saveTournament(this.t);
        }
    },

    autoSaveMatch(matchId) {
        let m = this.findMatch(matchId);
        if(!m) return;
        
        const inputs = Array.from(document.querySelectorAll('.set-box-ko[data-mid="' + matchId + '"]'));
        let allValues = inputs.map(inp => inp.value.trim());
        let val = allValues.filter(x => x !== '').join(', ');
        
        const reqWins = parseInt(this.t.bestOf, 10) || 3;
        let p1wins = 0, p2wins = 0;
        const validParts = [];
        
        for(let part of allValues) {
            if(!part) continue;
            if(part === '-') continue; 
            let num = parseInt(part, 10);
            if(isNaN(num) || num === 0) continue;
            validParts.push(num);
            if(num < 0) p2wins++;
            else if(num > 0) p1wins++;
        }
        
        m.resultStr = val;
        m.p1sets = p1wins;
        m.p2sets = p2wins;
        
        let oldStatus = m.status;
        let isFinished = p1wins >= reqWins || p2wins >= reqWins || (validParts.length === (reqWins*2 - 1));
        
        if (isFinished) {
            m.status = 'finished';
            m.winnerId = p1wins > p2wins ? m.p1.id : m.p2.id;
        } else {
            m.status = 'pending';
            m.winnerId = null;
        }
        
        if (oldStatus !== m.status) {
            if (oldStatus === 'finished') {
                this.cascadeClearSubsequentMatches(m.matchId);
            }
            DB.saveTournament(this.t);
            
            let activeSetIdx = document.activeElement ? document.activeElement.getAttribute('data-set') : null;
            this.renderBracket();
            if(activeSetIdx !== null) {
                let restoredInp = document.querySelector(`.set-box-ko[data-mid="${matchId}"][data-set="${activeSetIdx}"]`);
                if(restoredInp) {
                    restoredInp.focus();
                    let len = restoredInp.value.length;
                    restoredInp.setSelectionRange(len, len);
                }
            }
        } else {
            DB.saveTournament(this.t);
            let s1 = document.getElementById('score-p1-' + matchId);
            let s2 = document.getElementById('score-p2-' + matchId);
            if(s1) s1.innerText = m.p1sets;
            if(s2) s2.innerText = m.p2sets;
        }
    },

    clearScore(matchId) {
        document.querySelectorAll('.set-box-ko[data-mid="' + matchId + '"]').forEach(inp => inp.value = '');
        this.autoSaveMatch(matchId);
    },
    
    cascadeClearSubsequentMatches(matchId) {
        let bracket = this.getActiveBracket();
        // Recursive finding all dependent matches and clearing them too
        for(let rnd of bracket) {
            for(let subM of rnd) {
                if(subM.dependsOn && subM.dependsOn.includes(matchId)) {
                    // Cílový zápas je jasný
                    if(subM.dependsOn[0] === matchId) subM.p1 = { id: null, name: 'Čaká na súpera' };
                    if(subM.dependsOn[1] === matchId) subM.p2 = { id: null, name: 'Čaká na súpera' };
                    subM.status = 'pending';
                    subM.winnerId = null;
                    subM.p1sets = 0;
                    subM.p2sets = 0;
                    subM.resultStr = '';
                    // rekurzia posun v pred
                    this.cascadeClearSubsequentMatches(subM.matchId);
                }
            }
        }
    },

    finishTournament() {
        let reqMatches = [];
        
        let finals = this.t.koBracket[this.t.koBracket.length - 1];
        let preFinals = this.t.koBracket[this.t.koBracket.length - 2];
        if(finals[0].roundLevel === 99) {
             reqMatches.push(finals[0]); // 3rd match
             reqMatches.push(preFinals[0]); // zapas o 1st miesto
        } else {
             reqMatches.push(finals[0]);
        }
        
        if (this.t.koBracketConsolation) {
            let consFinals = this.t.koBracketConsolation[this.t.koBracketConsolation.length - 1];
            let consPreFinals = this.t.koBracketConsolation[this.t.koBracketConsolation.length - 2];
            if(consFinals[0].roundLevel === 99) {
                 reqMatches.push(consFinals[0]);
                 reqMatches.push(consPreFinals[0]);
            } else {
                 reqMatches.push(consFinals[0]);
            }
        }
        
        let allDone = true;
        for(let m of reqMatches) {
            if(m.status !== 'finished') allDone = false;
        }
        
        if(!allDone) {
            App.showAlert('Chyba', 'Koncový zápas (finále) ešte nie je odohraný.');
            return;
        }
        
        this.t.status = 'finished';
        DB.saveTournament(this.t);
        
        App.showAlert('Výborne!', 'Turnaj bol oficiálne ukončený a zapísaný do histórie.');
        this.renderBracket();
    }
};
