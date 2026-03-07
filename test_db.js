import sqlite3Pkg from 'sqlite3';
const sqlite3 = sqlite3Pkg.verbose();
const db = new sqlite3.Database('cases.sqlite');
db.run(`CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    folder_path TEXT,
    victim TEXT,
    accused TEXT,
    sections TEXT,
    summary TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
db.run(
    `INSERT INTO cases (id, folder_path, victim, accused, sections, summary) 
        VALUES (?, ?, ?, ?, ?, ?) 
        ON CONFLICT(id) DO UPDATE SET 
        folder_path=excluded.folder_path, victim=excluded.victim, accused=excluded.accused, sections=excluded.sections, summary=excluded.summary`,
    ['test-id', '/test/path', 'V', 'A', 'S', 'Sum'],
    function (err) {
        console.log("Insert result:", err ? err.message : "Success");
    }
);
