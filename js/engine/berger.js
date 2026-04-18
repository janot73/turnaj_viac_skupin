// berger.js

window.BergerEngine = {
    // Basic Circle method for round-robin
    // Returns array of rounds, each round is an array of matches [p1Index, p2Index] (0-based)
    getBergerTable(n) {
        let isOdd = n % 2 !== 0;
        let playersCount = isOdd ? n + 1 : n;
        let rounds = playersCount - 1;
        let matchesPerRound = playersCount / 2;
        
        let table = [];
        let players = [];
        for(let i=0; i<playersCount; i++) players.push(i);
        
        for (let r = 0; r < rounds; r++) {
            let round = [];
            for (let m = 0; m < matchesPerRound; m++) {
                let p1 = players[m];
                let p2 = players[playersCount - 1 - m];
                
                // If it's the dummy player, this is a bye, we skip adding actual match
                if(p1 === playersCount - 1 && isOdd) continue;
                if(p2 === playersCount - 1 && isOdd) continue;
                
                // Swap purely to make output nicer (lower seed left, except 1)
                // Actually round robin order usually has rules for colors, we don't need color in TT as much
                round.push([p1, p2]);
            }
            table.push(round);
            
            // Rotate players (index 0 is fixed, index 1 to N-1 rotate right)
            players.splice(1, 0, players.pop());
        }
        return table; // [[ [0,3], [1,2] ], [ [0,2], [3,1] ], ...]
    },

    // Generuje všetky zápasy zo všetkých skupín a prepletá ich tak aby skončili zhruba naraz
    generateAllMatches(groups) {
        let allMatches = []; // Bude obsahovať { id, groupId, groupName, p1, p2, round, status, resultStr, sets: [] }
        let groupRounds = [];

        // Najprv si vygenerujeme Bergerove kolá pre každú skupinu
        groups.forEach(g => {
            let n = g.players.length;
            if(n < 2) {
                groupRounds.push([]);
                return;
            }
            let table = this.getBergerTable(n);
            let roundsObj = table.map((rndMatches, rIdx) => {
                return rndMatches.map(m => {
                    return {
                        id: 'm_' + g.id + '_' + rIdx + '_' + m[0] + '_' + m[1],
                        groupId: g.id,
                        groupName: g.name,
                        p1: g.players[m[0]],
                        p2: g.players[m[1]],
                        round: rIdx + 1,
                        status: 'pending',
                        resultStr: '',
                        sets: [], // [9, -7, 6]
                        p1sets: 0,
                        p2sets: 0
                    };
                });
            });
            groupRounds.push(roundsObj);
        });

        // Teraz potrebujeme prepliesť zápasy. 
        // Nájdeme maximálny počet kôl.
        let maxRounds = 0;
        groupRounds.forEach(rnds => { if(rnds.length > maxRounds) maxRounds = rnds.length; });

        // Aby sme splnili podmienku: "skupiny ktoré majú viac hráčov musia končiť zarovno zo skupinami ktoré majú hráčov menej"
        // Ideálne je zarovnávať podľa "percenta" odohratého turnaja, alebo postupne odzadu priraďovať posledné kolá k posledným globálnym kolám.
        // Najjednoduchšie: GlobalRound 1 až maxRounds.
        // Pre skupinu, ktorá má menej kôl ako maxRounds, roztiahneme tie kolá.
        // Alebo jednoducho: v každom iterovaní globálneho kola i (0..maxRounds-1) vytiahneme kolo zo skupiny s určitou pravdepodobnosťou, resp. postupne.
        // Konkrétny krok: Priradíme skupinové kolá ku globálnym odzadu. (Posledné kolo skupiny bude v poslednom globálnom koši).
        let globalBoxes = Array.from({length: maxRounds}, () => []);
        
        for(let gInd = 0; gInd < groupRounds.length; gInd++) {
            let rnds = groupRounds[gInd];
            if(rnds.length === 0) continue;
            
            // Map the specific group rounds back to front into global boxes
            let skipFactor = maxRounds / rnds.length;
            for(let i=0; i<rnds.length; i++) {
                // Vypočítame kam patrí toto kolo. i=0 -> box 0. i=rnds.length-1 -> box maxRounds-1
                let targetBox = -1;
                if(rnds.length === 1) targetBox = maxRounds - 1; // ak len 1 kolo, dajte na koniec? nie, skor do stredu. Dame na koniec.
                else targetBox = Math.round(i * (maxRounds - 1) / (rnds.length - 1));
                
                globalBoxes[targetBox].push(...rnds[i]);
            }
        }

        // Flatten -> toto zaručí prepletenie, pričom dlhšie skupiny hrajú stále, a kratšie len občas.
        let matchNumber = 1;
        globalBoxes.forEach(boxMatches => {
            // Premiešame v rámci jedného pásma (aby nešli vždy len A B C, ale zmiešane, ak chceme. Necháme A B C rešpektované id-čkami).
            // Pridelime číslo zápasu
            boxMatches.forEach(m => {
                m.matchNo = matchNumber++;
                allMatches.push(m);
            });
        });

        return allMatches;
    }
};
