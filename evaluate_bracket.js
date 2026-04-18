const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:8082/', {waitUntil: 'networkidle0'});
    
    // Evaluate in browser to generate mock matches and render bracket
    await page.evaluate(() => {
        const mockBracket = [];
        mockBracket.push([]);
        
        let qf = [];
        for(let i=1; i<=4; i++){
            qf.push({matchId: 'qf'+i, p1: {name: 'A'+i}, p2: {name: 'B'+i}, status: 'finished', roundLevel: 4});
        }
        mockBracket.push(qf);
        
        let sf = [];
        sf.push({matchId: 'sf1', p1: {name: 'W1'}, p2: {name: 'W2'}, status: 'finished', roundLevel: 2});
        sf.push({matchId: 'sf2', p1: {name: 'W3'}, p2: {name: 'W4'}, status: 'finished', roundLevel: 2});
        mockBracket.push(sf);
        
        mockBracket.push([{matchId: 'fin', p1: {name: 'F1'}, p2: {name: 'F2'}, status: 'finished', roundLevel: 1}]);
        
        window.bracketTest = { id: 'mock123', koBracket: mockBracket };
        
        document.body.innerHTML = '<div id="main-content"></div>';
        window.App = { navigate: () => {}, showConfirm: () => true, showAlert: () => {} };
        window.DB = { saveTournament: () => {} };
        
        if(window.BracketView) {
            window.BracketView.t = window.bracketTest;
            const el = window.BracketView.render();
            document.getElementById('main-content').appendChild(el);
            window.BracketView.init();
        }
    });
    
    await page.screenshot({path: 'bracket_screen.png', fullPage: true});
    await page.emulateMediaType('print');
    await page.screenshot({path: 'bracket_print.png', fullPage: true});
    await browser.close();
})();
