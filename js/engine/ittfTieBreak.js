// ittfTieBreak.js

window.IttfEngine = {
    // players = pole hracov v skupine [ {id...} ]
    // matches = zapasy len z TEJTO skupiny
    evaluateGroup(players, matches) {
        // Inicializácia riadkov
        let table = players.map(p => ({
            player: p,
            played: 0,
            won: 0,
            lost: 0,
            pts: 0,
            setsWon: 0,
            setsLost: 0,
            // Loptičky by sa tu rátali, keby sa zadávali presné stavy
            // z inputu typu "7" vieme len (11-7).
            ballsWon: 0, 
            ballsLost: 0
        }));

        let tableMap = {};
        table.forEach(r => tableMap[r.player.id] = r);

        // Naplnenie globálnej tabuľky
        matches.forEach(m => {
            if(m.status === 'finished') {
                const w = m.p1sets > m.p2sets ? m.p1.id : m.p2.id;
                const l = m.p1sets > m.p2sets ? m.p2.id : m.p1.id;
                
                tableMap[m.p1.id].played++;
                tableMap[m.p2.id].played++;
                
                tableMap[w].won++;
                tableMap[l].lost++;
                
                tableMap[w].pts += 2; // Výhra 2 body
                tableMap[l].pts += 1; // Prehra 1 bod
                
                tableMap[m.p1.id].setsWon += m.p1sets;
                tableMap[m.p1.id].setsLost += m.p2sets;
                tableMap[m.p2.id].setsWon += m.p2sets;
                tableMap[m.p2.id].setsLost += m.p1sets;
                
                tableMap[m.p1.id].ballsWon += (m.p1balls || 0);
                tableMap[m.p1.id].ballsLost += (m.p2balls || 0);
                tableMap[m.p2.id].ballsWon += (m.p2balls || 0);
                tableMap[m.p2.id].ballsLost += (m.p1balls || 0);
            }
        });

        // Rekurzívny sorting s minitabular resolvingom
        let minitables = [];
        let sorted = this.sortSubTable(table, matches, minitables);
        sorted.minitables = minitables;
        return sorted;
    },

    sortSubTable(rows, allMatches, collector) {
        if(rows.length <= 1) return rows;

        // V prvom rade zoradíme podľa bodov
        rows.sort((a,b) => b.pts - a.pts);

        let finalRows = [];
        let i = 0;
        
        while(i < rows.length) {
            let j = i;
            while(j < rows.length && rows[j].pts === rows[i].pts) {
                j++;
            }
            
            let tiedGroup = rows.slice(i, j);
            if(tiedGroup.length === 1) {
                finalRows.push(tiedGroup[0]);
            } else if(tiedGroup.length === rows.length) {
                // To prevent infinite loop if they are perfectly tied on PTS
                // We use Set Ratio
                let setRatioSort = tiedGroup.sort((a,b) => {
                    let aR = a.setsLost === 0 ? (a.setsWon > 0 ? 100 : 0) : a.setsWon / a.setsLost;
                    let bR = b.setsLost === 0 ? (b.setsWon > 0 ? 100 : 0) : b.setsWon / b.setsLost;
                    
                    if(bR !== aR) return bR - aR; // Higher ratio first
                    
                    let aBallRatio = a.ballsLost === 0 ? (a.ballsWon > 0 ? 1000 : 0) : a.ballsWon / a.ballsLost;
                    let bBallRatio = b.ballsLost === 0 ? (b.ballsWon > 0 ? 1000 : 0) : b.ballsWon / b.ballsLost;
                    
                    if(bBallRatio !== aBallRatio) return bBallRatio - aBallRatio;
                    
                    // User Rule: pri rovnosti rebríčkové body hraca
                    return a.player.points - b.player.points; 
                });
                for(let row of setRatioSort) finalRows.push(row);
            } else {
                // ITTF: Vytvoríme minitabuľku Z TÝCHTO ZÁPASOV
                let subPlayers = tiedGroup.map(r => r.player);
                let subPlayersIds = subPlayers.map(p => p.id);
                // Filter len zápasy medzi tými, čo majúhodnoty
                let subMatches = allMatches.filter(m => 
                    subPlayersIds.includes(m.p1.id) && subPlayersIds.includes(m.p2.id)
                );
                
                // evaluateGroup pre minitabuľku
                let minitab = this.miniEvaluateGroup(subPlayers, subMatches);
                
                if (collector) collector.push({ table: minitab });
                
                // Rešpektujúc že minitab vráti zoradené hráče vrátime ich z global rows
                for(let mRow of minitab) {
                    finalRows.push(rows.find(r => r.player.id === mRow.player.id));
                }
            }
            
            i = j;
        }

        return finalRows;
    },

    miniEvaluateGroup(players, matches) {
        let table = players.map(p => ({
            player: p,
            pts: 0,
            setsWon: 0,
            setsLost: 0,
            ballsWon: 0,
            ballsLost: 0
        }));
        let tableMap = {};
        table.forEach(r => tableMap[r.player.id] = r);

        matches.forEach(m => {
            if(m.status === 'finished') {
                const w = m.p1sets > m.p2sets ? m.p1.id : m.p2.id;
                const l = m.p1sets > m.p2sets ? m.p2.id : m.p1.id;
                
                tableMap[w].pts += 2;
                tableMap[l].pts += 1;
                
                tableMap[m.p1.id].setsWon += m.p1sets;
                tableMap[m.p1.id].setsLost += m.p2sets;
                tableMap[m.p2.id].setsWon += m.p2sets;
                tableMap[m.p2.id].setsLost += m.p1sets;
                
                tableMap[m.p1.id].ballsWon += (m.p1balls || 0);
                tableMap[m.p1.id].ballsLost += (m.p2balls || 0);
                tableMap[m.p2.id].ballsWon += (m.p2balls || 0);
                tableMap[m.p2.id].ballsLost += (m.p1balls || 0);
            }
        });

        // Simple sort pre mini tab
        table.sort((a,b) => {
            if(b.pts !== a.pts) return b.pts - a.pts;
            let aR = a.setsLost === 0 ? 100 : a.setsWon / a.setsLost;
            let bR = b.setsLost === 0 ? 100 : b.setsWon / b.setsLost;
            if(bR !== aR) return bR - aR;
            
            let aBallRatio = a.ballsLost === 0 ? (a.ballsWon > 0 ? 1000 : 0) : a.ballsWon / a.ballsLost;
            let bBallRatio = b.ballsLost === 0 ? (b.ballsWon > 0 ? 1000 : 0) : b.ballsWon / b.ballsLost;
            
            if(bBallRatio !== aBallRatio) return bBallRatio - aBallRatio;
            
            // fallback k nasadeniu
            return a.player.points - b.player.points;
        });
        return table;
    }
};
