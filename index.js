const { timeout } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const useProxy = require('puppeteer-page-proxy');
puppeteer.use(stealthPlugin());

const fs = require('fs');


const sqlite3 = require('sqlite3').verbose();

//adds school to db
async function reportCard(school) {
    const db = new sqlite3.Database('schools.db');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    const cookiesPath = 'cookies.json';
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        await page.setCookie(...cookies);
    }

    const stop = new Promise((resolve, reject) => {
        db.get(`SELECT 1 FROM school_cards WHERE school_name = ?`, school, (err, row) => {
            if (row) {
                console.log(`${school} already exists in database.`);
            }
            resolve(row);
        });
    });
    if (await stop) {
        await browser.close();
        return;
    }

    await page.goto(`https://www.niche.com/colleges/${school.replaceAll('The ', '').replaceAll('at ', '').replaceAll(' ', '-').replaceAll('&', '-and-').replaceAll("'", '').replaceAll(',', '').replaceAll('.', '').toLowerCase()}/#majors`);
    const cookies = await page.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

    async function captcha() {
        if (await page.evaluate(() => document.querySelector('.px-captcha-message')?.textContent)) {
            setTimeout(async function () {
                await page.mouse.move(650, 450);
                await page.mouse.down();
                setTimeout(() => page.mouse.up(), 10500);
            }, 6500);

        }

    }
    await captcha();

    if (await page.evaluate(() => document.querySelector('.page-not-found-wrapper')?.querySelector('h1').textContent == 'Page not found')) {
        console.log(`${school} not found in niche.`);
        await browser.close();
        return;
    }





    await page.waitForSelector('.postcard__content-wrap', { timeout: 50000 });
    if (await page.evaluate(() => document.querySelector('.report-card')?.textContent) == undefined) {
        console.log(`${school} has no report card.`);
        await browser.close();
        return;
    }
    const reportCard = await page.evaluate(function () {
        const queries = [...document.querySelector('.report-card').querySelector('.profile__bucket--2').querySelector('.ordered__list__bucket').querySelectorAll('.niche__grade')];
        return queries.map(el => el.textContent.slice(6));
    });

    await browser.close();

    let list = new Array(12).fill(null);

    //create report card for given school
    for (let i = 0; i < reportCard.length; i++) {
        if (reportCard[i].slice(0, 1) == 'A') {
            list[i] = 11;
        }
        else if (reportCard[i].slice(0, 1) == 'B') {
            list[i] = 8;
        }
        else if (reportCard[i].slice(0, 1) == 'C') {
            list[i] = 5;
        }
        else if (reportCard[i].slice(0, 1) == 'D') {
            list[i] = 2;
        }
        else if (reportCard[i].slice(0, 1) == 'F') {
            list[i] = 0;
        }

        if (reportCard[i].slice(1) == ' minus') {
            list[i] -= 1;
        }
        else if (reportCard[i].slice(1) == '+') {
            list[i] += 1;
        }
    }
    const listString = JSON.stringify(list);

    db.serialize(() => {
        db.run(`
            INSERT INTO school_cards (school_name, reportcard) VALUES (?, ?)`,
            [school, listString],
            (err) => {
                if (err) {
                    return console.log(err.message);
                }
                console.log(`${school} has been stored.`);
            }
        );

    });


    db.close();
}

//finds school in db
async function getSchool(school) {
    const db = new sqlite3.Database('schools.db');
    return new Promise((res, rej) => {
        db.get(`SELECT * FROM school_cards WHERE school_name = ?`, school, (err, row) => {
            if (row && !err) {
                res(row);
            }
            else if (!err) {
                res(null);
            }
        })
    })

}


//adds all colleges in a state
async function addState(state) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://www.4icu.org/us/${state.toLowerCase().replaceAll(' ', '-')}/a-z/`);
    await page.waitForSelector('.table-responsive', { timeout: 5000 });
    const allUniversities = await page.evaluate(() => {
        let all = [...document.querySelector('.table-responsive').querySelector('tbody').querySelectorAll('tr')];
        return all.map(el => el.textContent.split('\n')[2]);
    })
    await browser.close();

    for (let i = 0; i < allUniversities.length - 1; i++) {
        await reportCard(allUniversities[i]);
    }
}

//returns all universities in given state
async function getState(state) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://www.4icu.org/us/${state.toLowerCase().replaceAll(' ', '-')}/a-z/`);
    await page.waitForSelector('.table-responsive', { timeout: 5000 });
    const allUniversities = await page.evaluate(() => {
        let all = [...document.querySelector('.table-responsive').querySelector('tbody').querySelectorAll('tr')];
        return all.map(el => el.textContent.split('\n')[2]);
    })
    await browser.close();
    return await allUniversities.slice(0, -1);
}


//gets nth school in db
async function getNSchool(n) {
    const db = new sqlite3.Database('schools.db');
    if (n == 1) {
        return new Promise((res, rej) => {
            db.get(`SELECT * FROM school_cards ORDER BY id LIMIT 1`, (err, row) => {
                res(row);
            })
        })
    }
    else {
        return new Promise((res, rej) => {
            db.get(`SELECT * FROM school_cards ORDER BY id LIMIT 1 OFFSET ${n - 1}`, (err, row) => {
                res(row);
            })
        })
    }


}
//gets length of db
async function getLength() {
    const db = new sqlite3.Database('schools.db');
    return new Promise((res, rej) => {
        db.get(`SELECT COUNT(*) AS count FROM school_cards`, (err, row) => {
            res(row.count);
        })
    })

}

//finds best school given preferences
async function getClosest(userlist, iterations, state = null) {
    let removed = [];
    if (state) {
        for (let counter = 0; counter < iterations; counter++) {
            const statelist = await getState(state);
            let lowest = [999999, null];

            for (let i = 1; i < statelist.length; i++) {
                const school = await getSchool(statelist[i]);
                if (school == undefined || !school) {
                    continue;
                }
                let total = 0;
                let localnulltotal = 0;
                const reportcard = JSON.parse(school.reportcard);
                for (let j = 0; j < reportcard.length; j++) {
                    if (reportcard[j]) {
                        total += Math.abs(reportcard[j] - userlist[j]) * (userlist[j] * 3);
                    }
                    else {
                        localnulltotal++;
                    }
                }
                total /= reportcard.length;
                if (removed.includes(await school.id)) {
                    continue;
                }

                if (i == 1) {
                    lowest[0] = total;
                    lowest[1] = await school.id;
                }
                else {
                    if (total < lowest[0] && localnulltotal < 3) {
                        lowest[0] = total;
                        lowest[1] = await school.id;
                    }
                }


            }


            removed.push(lowest[1]);
        }


    }
    else {
        for (let counter = 0; counter < iterations; counter++) {
            let lowest = [null, null];
            for (let i = 1; i < await getLength(); i++) {
                let school = null;
                async function get() {
                    school = await getNSchool(i);
                }
                await get();
                let total = 0;
                let localnulltotal = 0;
                const reportcard = JSON.parse(school.reportcard);
                for (let j = 0; j < reportcard.length; j++) {
                    if (reportcard[j]) {
                        total += Math.abs(reportcard[j] - userlist[j]) * (userlist[j] * 3);
                    }
                    else {
                        localnulltotal++;
                    }
                }
                total /= reportcard.length;
                if (removed.includes(school.id)) {
                    continue;
                }

                if (i == 1) {
                    lowest[0] = total;
                    lowest[1] = school.id;
                }
                else {
                    if (total <= lowest[0] && localnulltotal < 2) {
                        lowest[0] = total;
                        lowest[1] = school.id;

                    }
                }
            }
            removed.push(lowest[1]);
        }
    }
    for (let i = 0; i < removed.length; i++) {
        console.log(i + 1 + ": " + (await getNSchool(removed[i])).school_name);

    }

}

//User Preferences Key (1 = worst, 12 = best):
//Index 0: Academics
//Index 1: Value/Affordability
//Index 2: Diversity
//Index 3: Campus
//Index 4: Athletics
//Index 5: Party Scene
//Index 6: Professors
//Index 7: Location
//Index 8: Dorms
//Index 9: Campus Food
//Index 10: Student Life
//Index 11: Safety

// getClosest([7, 8, 9, 12, 10, 11, 12, 12, 4, 10, 7, 8], 10);




const states = ['Connecticut',
    'Delaware',
    'Florida',
    'Georgia',
    'Hawaii',
    'Idaho',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kansas',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'Montana',
    'Nebraska',
    'Nevada',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'North Dakota',
    'Ohio',
    'Oklahoma',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'South Dakota',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'Washington',
    'West Virginia',
    'Wisconsin',
    'Wyoming'];


// getClosest([12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12], 5, "Ohio");