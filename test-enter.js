import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Users\\SANTHOSHMOHAN\\.cache\\puppeteer\\chrome\\win64-151.0.7922.47\\chrome-win64\\chrome.exe' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.text().includes('handleSend') || msg.text().includes('onKeyDown')) {
       // Serialize arguments to see what Object is
       const args = msg.args();
       Promise.all(args.map(a => a.jsonValue())).then(vals => {
         console.log('BROWSER LOG:', JSON.stringify(vals));
       });
    }
  });

  await page.goto('http://localhost:5173/');
  
  // Wait for the chatbot input
  await page.waitForSelector('textarea');
  
  // Type message 1
  await page.type('textarea', 'message 1');
  await page.keyboard.press('Enter');
  
  // wait a bit for AI response
  await new Promise(r => setTimeout(r, 4000));
  
  // Type message 2
  await page.type('textarea', 'message 2');
  await page.keyboard.press('Enter');
  
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
})();
