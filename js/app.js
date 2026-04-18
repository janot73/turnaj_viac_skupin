// app.js - Main Application Logic
const App = {
    currentTournamentId: null,
    
    init() {
        this.cacheDOM();
        this.bindEvents();
        
        // Router state
        this.views = {
            home: window.HomeView,
            players: window.PlayersView,
            registration: window.RegistrationView,
            groups: window.GroupsView,
            bracket: window.BracketView
        };
        
        this.navigate('home');
    },
    
    cacheDOM() {
        this.container = document.getElementById('app-container');
        this.navHome = document.getElementById('nav-home');
        this.navPlayers = document.getElementById('nav-players');
        
        this.modal = document.getElementById('modal-container');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.modalCancel = document.getElementById('modal-cancel');
    },
    
    bindEvents() {
        this.navHome.addEventListener('click', () => this.navigate('home'));
        this.navPlayers.addEventListener('click', () => this.navigate('players'));
    },
    
    navigate(viewName, params = {}) {
        // Clear active states
        this.navHome.classList.remove('active');
        this.navPlayers.classList.remove('active');
        
        if(viewName === 'home') this.navHome.classList.add('active');
        if(viewName === 'players') this.navPlayers.classList.add('active');
        
        this.container.innerHTML = '';
        
        const view = this.views[viewName];
        if (view && view.render) {
            const el = view.render(params);
            this.container.appendChild(el);
            if(view.init) view.init(params);
        }
    },
    
    showAlert(title, message) {
        this.modalTitle.innerText = title;
        this.modalMessage.innerText = message;
        this.modalCancel.classList.add('hidden');
        this.modal.classList.remove('hidden');
        
        return new Promise((resolve) => {
            this.modalConfirm.onclick = () => {
                this.modal.classList.add('hidden');
                resolve(true);
            };
        });
    },
    
    showConfirm(title, message) {
        this.modalTitle.innerText = title;
        this.modalMessage.innerText = message;
        this.modalCancel.classList.remove('hidden');
        this.modal.classList.remove('hidden');
        
        return new Promise((resolve) => {
            this.modalConfirm.onclick = () => {
                this.modal.classList.add('hidden');
                resolve(true);
            };
            this.modalCancel.onclick = () => {
                this.modal.classList.add('hidden');
                resolve(false);
            };
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
