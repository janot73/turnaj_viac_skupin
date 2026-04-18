// drawGroups.js - Engine for Seeding and Drafting players into Groups
window.DrawGroupsEngine = {
    draw(participants, numGroups, seedsPerGroup) {
        // Sort players by best rank first (lowest points number)
        let players = [...participants].sort((a,b) => a.points - b.points);
        
        let groups = Array.from({length: numGroups}, () => []);
        
        // Vytvorenie košov po 'numGroups' hráčov
        let baskets = [];
        for (let i = 0; i < players.length; i += numGroups) {
            baskets.push(players.slice(i, i + numGroups));
        }

        const clubConflict = (group, player) => {
            if(!player.club || player.club.toLowerCase() === 'bez klubu') return false;
            return group.some(p => p.club === player.club);
        };

        for (let bInd = 0; bInd < baskets.length; bInd++) {
            let basket = baskets[bInd];
            
            // Je to nasadený kôš?
            if (bInd < seedsPerGroup) {
                // Snake system
                // if bInd is even: 0, 1, 2, ...
                // if bInd is odd: N-1, N-2, ...
                let dirList = [];
                for(let i=0; i<numGroups; i++) dirList.push(i);
                if (bInd % 2 !== 0) dirList.reverse();
                
                // My chceme k hráčom v koši pridať aj ich poradie,
                // a pri kolízii klubu ich skúsime prehodiť v rámci TOHTO koša s iným.
                // Jednoduchý prístup: priradíme a ak je konflikt, skúsime nájsť swap
                let assignment = Array(numGroups).fill(null);
                
                for(let i=0; i<basket.length; i++) {
                    assignment[i] = basket[i];
                }
                
                // Swap logic for clubs
                for(let i=0; i<basket.length; i++) {
                    const gInd = dirList[i];
                    if(assignment[i] && clubConflict(groups[gInd], assignment[i])) {
                        // Skúsime ho vymeniť s niektorým iným hráčom v tom istom koši (napr. za ním)
                        for(let j=0; j<basket.length; j++) {
                            if(i===j) continue;
                            const swapGInd = dirList[j];
                            if(assignment[j] && !clubConflict(groups[gInd], assignment[j]) && !clubConflict(groups[swapGInd], assignment[i])) {
                                // Swap
                                let tmp = assignment[i];
                                assignment[i] = assignment[j];
                                assignment[j] = tmp;
                                break;
                            }
                        }
                    }
                }
                
                // Add to groups
                for(let i=0; i<basket.length; i++) {
                    if(assignment[i]) {
                        groups[dirList[i]].push(assignment[i]);
                    }
                }
                
            } else {
                // Nenasadený kôš - dolosovanie náhodne
                // Zamiešame kôš
                let randomBasket = [...basket];
                randomBasket.sort(() => Math.random() - 0.5);
                
                // Na to, do ktorých skupín dať: najskôr zoradíme skupiny podľa najmenšieho počtu hráčov aby sa zapĺňali rovnomerne
                let validGroups = [];
                for(let i=0; i<numGroups; i++) validGroups.push(i);
                
                for(let p of randomBasket) {
                    // Try finding a group without conflict among groups with min players
                    validGroups.sort((a,b) => groups[a].length - groups[b].length);
                    
                    let minLen = groups[validGroups[0]].length;
                    let candidates = validGroups.filter(g => groups[g].length === minLen);
                    
                    // Shuffle candidates
                    candidates.sort(() => Math.random() - 0.5);
                    
                    let target = candidates[0];
                    // Try conflict free
                    let noConflict = candidates.find(g => !clubConflict(groups[g], p));
                    if(noConflict !== undefined) {
                        target = noConflict;
                    } else if (candidates.length < validGroups.length) {
                        // try to find any valid group without conflict
                        let anyNoConflict = validGroups.find(g => !clubConflict(groups[g], p));
                        if(anyNoConflict !== undefined && groups[anyNoConflict].length <= minLen + 1) {
                           target = anyNoConflict;
                        }
                    }
                    
                    groups[target].push(p);
                    // Remove target from validGroups for THIS basket distribution cycle so we distribute evenly
                    validGroups = validGroups.filter(x => x !== target);
                    if(validGroups.length === 0) {
                        // Reset for next pass if basket size > groups (which shouldn't be since basket is numGroups size slice)
                        for(let i=0; i<numGroups; i++) validGroups.push(i);
                    }
                }
            }
        }
        
        return groups.map((g, idx) => ({ id: (idx+1).toString(), name: 'Skupina ' + String.fromCharCode(65 + idx), players: g }));
    }
};
