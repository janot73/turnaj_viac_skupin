// db.js - Layer over localStorage
const DB = {
    PLAYERS_KEY: 'tt_players',
    TOURNAMENTS_KEY: 'tt_tournaments',

    init() {
        if (!localStorage.getItem(this.PLAYERS_KEY)) {
            localStorage.setItem(this.PLAYERS_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.TOURNAMENTS_KEY)) {
            localStorage.setItem(this.TOURNAMENTS_KEY, JSON.stringify([]));
        }
    },

    // Players
    getPlayers() {
        return JSON.parse(localStorage.getItem(this.PLAYERS_KEY));
    },

    savePlayers(players) {
        localStorage.setItem(this.PLAYERS_KEY, JSON.stringify(players));
    },

    addPlayer(player) {
        const players = this.getPlayers();
        // Generate an ID if needed
        player.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        players.push(player);
        this.savePlayers(players);
        return player;
    },

    updatePlayer(updatedPlayer) {
        let players = this.getPlayers();
        players = players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
        this.savePlayers(players);
    },

    deletePlayer(id) {
        let players = this.getPlayers();
        players = players.filter(p => p.id !== id);
        this.savePlayers(players);
    },

    // Tournaments
    getTournaments() {
        return JSON.parse(localStorage.getItem(this.TOURNAMENTS_KEY));
    },

    saveTournaments(tournaments) {
        localStorage.setItem(this.TOURNAMENTS_KEY, JSON.stringify(tournaments));
    },

    getTournament(id) {
        const t = this.getTournaments();
        return t.find(x => x.id === id);
    },

    saveTournament(tourney) {
        let t = this.getTournaments();
        const idx = t.findIndex(x => x.id === tourney.id);
        if (idx !== -1) {
            t[idx] = tourney;
        } else {
            t.push(tourney);
        }
        this.saveTournaments(t);
    },

    deleteTournament(id) {
        let t = this.getTournaments();
        t = t.filter(x => x.id !== id);
        this.saveTournaments(t);
    },

    // Utilities
    exportPlayersCSV() {
        const players = this.getPlayers();
        if(players.length === 0) return "";
        const header = ["id", "regNo", "name", "club", "points"];
        const rows = players.map(p => [p.id, p.regNo, `"${p.name}"`, `"${p.club}"`, p.points].join(","));
        return [header.join(","), ...rows].join("\n");
    },

    getNextUnregisteredRegNo() {
        const players = this.getPlayers();
        let maxReg = 100000;
        players.forEach(p => {
            const r = parseInt(p.regNo);
            if (!isNaN(r) && r >= 100001 && r <= 999999 && r > maxReg) {
                maxReg = r;
            }
        });
        return maxReg + 1;
    }
};

DB.init();
