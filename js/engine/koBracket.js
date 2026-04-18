// koBracket.js

window.KoBracketEngine = {
    // players je pole kvalifikovanych hracov (napr s _seedGroup='A', _pos=1)
    generateBracket(players, groupsCount) {
        let count = players.length;
        let bracketSize = 2;
        while(bracketSize < count) bracketSize *= 2;
        
        let winners = players.filter(p => p._pos === 1);
        let runners = players.filter(p => p._pos === 2);
        let others = players.filter(p => p._pos > 2); // ak existuju
        
        // Zoradenie vitazov od najlepsich 
        winners.sort((a,b) => (a._seedGroup||'').localeCompare(b._seedGroup||''));
        // Zoradenie druhych miest naopak, aby isli intuitivnejsie do druhej polovice (hruby odhad)
        runners.sort((a,b) => (b._seedGroup||'').localeCompare(a._seedGroup||'')); 
        others.sort(() => Math.random() - 0.5);
        
        // Zlúčenie do globálneho power-rebríčka
        let sortedPlayers = [...winners, ...runners, ...others];
        
        // Matematicky vzorec na nasadenie standardneho turnaja
        let seedOrder = [0, 1];
        while(seedOrder.length < bracketSize) {
            let nextArr = [];
            let len = seedOrder.length;
            for(let i=0; i<len; i++) {
                if(i % 2 === 0) {
                    // Pre párne indexy ide favorit Hore (vľavo)
                    nextArr.push(seedOrder[i]);
                    nextArr.push(len * 2 - 1 - seedOrder[i]);
                } else {
                    // Pre nepárne indexy ide favorit Dole (vpravo), aby sa vytvorilo vizuálne zrkadlo "zvonka"
                    nextArr.push(len * 2 - 1 - seedOrder[i]);
                    nextArr.push(seedOrder[i]);
                }
            }
            seedOrder = nextArr;
        }

        // Naplnenie pozícii
        let positions = Array.from({length: bracketSize}, () => null);
        for(let slot=0; slot<bracketSize; slot++) {
            let rankOfSlot = seedOrder[slot];
            if (rankOfSlot < sortedPlayers.length) {
                positions[slot] = sortedPlayers[rankOfSlot];
            } else {
                positions[slot] = { id: 'bye', name: 'Voľný žreb' };
            }
        }

        // Anti-konflikt medzi hráčmi tej istej skupiny aspoň pre 1. kolo
        for(let i=0; i<bracketSize; i+=2) {
             let p1 = positions[i]; let p2 = positions[i+1];
             if(p1.id !== 'bye' && p2.id !== 'bye' && p1._seedGroup === p2._seedGroup) {
                  // Vymena p2 za ineho z dalsieho matchu
                  for(let j=0; j<bracketSize; j++) {
                       if(j!==i && j!==i+1 && positions[j].id !== 'bye' && positions[j]._pos > 1) {
                            if(positions[j]._seedGroup !== p1._seedGroup) {
                                 let temp = positions[i+1];
                                 positions[i+1] = positions[j];
                                 positions[j] = temp;
                                 break;
                            }
                       }
                  }
             }
        }

        return this.generateRoundsObj(positions);
    },

    generateRoundsObj(initialPositions) {
        let size = initialPositions.length; // power of 2 (2, 4, 8, 16)
        let rounds = []; // [Round 1, Quarter, Semi, Final]
        let numberOfRounds = Math.log2(size);
        
        // Round 1
        let round1 = [];
        for(let i = 0; i < size; i += 2) {
            let p1 = initialPositions[i];
            let p2 = initialPositions[i+1];
            
            let autoAdvance = (p1.id === 'bye' || p2.id === 'bye');
            let wId = p1.id === 'bye' ? p2.id : (p2.id === 'bye' ? p1.id : null);
            
            round1.push({
                matchId: 'k_' + 1 + '_' + (i/2),
                roundLevel: 1, // 1 = lowest (napr. osemfinalé)
                p1: p1,
                p2: p2,
                status: autoAdvance ? 'finished' : 'pending',
                winnerId: wId, 
                p1sets: autoAdvance ? 0 : 0, 
                p2sets: autoAdvance ? 0 : 0,
                resultStr: '',
                tableNo: ''
            });
        }
        rounds.push(round1);
        
        // Higher rounds
        for(let r = 2; r <= numberOfRounds; r++) {
            let rMatches = [];
            let prevRoundMatches = rounds[r-2].length;
            for(let i = 0; i < prevRoundMatches; i += 2) {
                rMatches.push({
                    matchId: 'k_' + r + '_' + (i/2),
                    roundLevel: r,
                    p1: { id: null, name: 'Víťaz ' + rounds[r-2][i].matchId },
                    p2: { id: null, name: 'Víťaz ' + rounds[r-2][i+1].matchId },
                    status: 'pending',
                    winnerId: null,
                    p1sets: 0, p2sets: 0, resultStr: '', tableNo: '',
                    dependsOn: [rounds[r-2][i].matchId, rounds[r-2][i+1].matchId]
                });
            }
            rounds.push(rMatches);
            
            // Third place match ak sme vo finále
            if(r === numberOfRounds) {
                rounds.push([{ // Ukladáme akoby r+1 do array, ale ide o zapas o 3.miesto
                    matchId: 'k_3rd',
                    roundLevel: 99, // Special
                    p1: { id: null, name: 'Porazený semifinále 1' },
                    p2: { id: null, name: 'Porazený semifinále 2' },
                    status: 'pending', winnerId: null, p1sets: 0, p2sets: 0, resultStr: '', tableNo: '',
                    dependsOn: [rounds[r-2][0].matchId, rounds[r-2][1].matchId] // z predch. kola (semi)
                }]);
            }
        }
        return rounds;
    },

    updateDependentMatches(rounds) {
        // Skontroluje celý pavúk a ak nižšie kolo bolo ukončené, posunie víťaza vyššie
        for(let r=1; r<rounds.length; r++) { // OD kola 2
            let is3rdMatch = rounds[r][0].matchId === 'k_3rd';
            
            for(let m of rounds[r]) {
                if(!m.dependsOn) continue;
                
                // Nájdenie zápasov z ktorých tento závisí
                let p1Match = null, p2Match = null;
                for(let prev of rounds) {
                    let r1 = prev.find(x => x.matchId === m.dependsOn[0]);
                    if(r1) p1Match = r1;
                    let r2 = prev.find(x => x.matchId === m.dependsOn[1]);
                    if(r2) p2Match = r2;
                }
                
                if(p1Match && p1Match.status === 'finished') {
                    if(!is3rdMatch) {
                        m.p1 = p1Match.winnerId === p1Match.p1.id ? p1Match.p1 : p1Match.p2;
                    } else {
                        m.p1 = p1Match.winnerId === p1Match.p1.id ? p1Match.p2 : p1Match.p1;
                    }
                }
                if(p2Match && p2Match.status === 'finished') {
                    if(!is3rdMatch) {
                        m.p2 = p2Match.winnerId === p2Match.p1.id ? p2Match.p1 : p2Match.p2;
                    } else {
                        m.p2 = p2Match.winnerId === p2Match.p1.id ? p2Match.p2 : p2Match.p1;
                    }
                }
            }
        }
    }
};
