package main

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

type Task struct {
	ID            int
	URL           string
	ExtractorName string
	Status        string
	Result        string
	Schema        string
	Retries       int
	CreatedAt     string
	UpdatedAt     string
}

func initDB(path string) (*sql.DB, error) {
	// Enable WAL mode and set a busy timeout for better concurrency
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		url TEXT NOT NULL,
		extractor_name TEXT NOT NULL,
		status TEXT DEFAULT 'pending',
		result TEXT,
		schema TEXT,
		retries INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		return nil, fmt.Errorf("failed to create table: %w", err)
	}

	return db, nil
}

func addTask(db *sql.DB, url, extractor, schema string) error {
	_, err := db.Exec("INSERT INTO tasks (url, extractor_name, schema) VALUES (?, ?, ?)", url, extractor, schema)
	return err
}

func getPendingTasks(db *sql.DB) ([]Task, error) {
	rows, err := db.Query("SELECT id, url, extractor_name, schema, retries FROM tasks WHERE status = 'pending'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.URL, &t.ExtractorName, &t.Schema, &t.Retries); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func updateTaskStatus(db *sql.DB, id int, status, result string) error {
	_, err := db.Exec("UPDATE tasks SET status = ?, result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", status, result, id)
	return err
}
