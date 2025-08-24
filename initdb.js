const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('schools.db');
db.serialize(() => {
    db.run(
        `CREATE TABLE IF NOT EXISTS school_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT UNIQUE,
            reportcard TEXT
        )`);
    console.log('schools db created');
});

db.close();