package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"simple-parser/backend/internal/models"

	_ "modernc.org/sqlite"
)

func InitDB(dataSourceName string) (*sql.DB, error) {
	// Ensure the directory for the database file exists
	dir := filepath.Dir(dataSourceName)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	// Enable WAL mode and set a busy timeout for better concurrency
	db, err := sql.Open("sqlite", dataSourceName+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}

	createTasksTableSQL := `
	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_key TEXT NOT NULL,
		url TEXT NOT NULL,
		extractor_name TEXT NOT NULL,
		status TEXT DEFAULT 'pending',
		result TEXT,
		schema TEXT,
		retries INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	createUsersTableSQL := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE,
		password TEXT
	);`

	if _, err := db.Exec(createTasksTableSQL); err != nil {
		return nil, fmt.Errorf("failed to create tasks table: %w", err)
	}

	if _, err := db.Exec(createUsersTableSQL); err != nil {
		return nil, fmt.Errorf("failed to create users table: %w", err)
	}

	return db, nil
}

func AddTask(db *sql.DB, key, url, extractor, schema string) error {
	_, err := db.Exec("INSERT INTO tasks (task_key, url, extractor_name, schema) VALUES (?, ?, ?, ?)", key, url, extractor, schema)
	return err
}

func GetPendingTasks(db *sql.DB) ([]models.Task, error) {
	rows, err := db.Query("SELECT id, task_key, url, extractor_name, schema, retries FROM tasks WHERE status = 'pending'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		if err := rows.Scan(&t.ID, &t.TaskKey, &t.URL, &t.ExtractorName, &t.Schema, &t.Retries); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func GetAllTasks(db *sql.DB) ([]models.Task, error) {
	rows, err := db.Query("SELECT id, task_key, url, extractor_name, status, result, created_at, updated_at FROM tasks ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		var resultStr sql.NullString
		if err := rows.Scan(&t.ID, &t.TaskKey, &t.URL, &t.ExtractorName, &t.Status, &resultStr, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		if resultStr.Valid {
			t.Result = json.RawMessage([]byte(resultStr.String))
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func UpdateTaskStatus(db *sql.DB, id int, status, result string) error {
	_, err := db.Exec("UPDATE tasks SET status = ?, result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", status, result, id)
	return err
}

func ResetAllTasks(db *sql.DB) error {
	_, err := db.Exec("UPDATE tasks SET status = 'pending', updated_at = CURRENT_TIMESTAMP")
	return err
}

func ResetTask(db *sql.DB, key, url, extractor string) error {
	_, err := db.Exec("UPDATE tasks SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE task_key = ? AND url = ? AND extractor_name = ?", key, url, extractor)
	return err
}

func ResetFailedTasks(db *sql.DB) error {
	_, err := db.Exec("UPDATE tasks SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE status = 'failed'")
	return err
}

func GetMetrics(db *sql.DB) (models.Metrics, error) {
	var m models.Metrics
	err := db.QueryRow(`
		SELECT 
			COUNT(*),
			SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
			SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END),
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END),
			SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)
		FROM tasks
	`).Scan(&m.TotalTasks, &m.PendingTasks, &m.ProcessingTasks, &m.CompletedTasks, &m.FailedTasks)
	return m, err
}
