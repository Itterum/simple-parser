package main

import (
	"encoding/json"
	"log"
	"os"
)

type ConfigTask struct {
	Extractor string          `json:"extractor"`
	URLs      []string        `json:"urls"`
	Schema    json.RawMessage `json:"schema,omitempty"`
}

func loadTasksFromJSON(path string) ([]ConfigTask, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var tasks []ConfigTask
	if err := json.Unmarshal(file, &tasks); err != nil {
		return nil, err
	}
	return tasks, nil
}

func main() {
	dbPath := "simple-parser.db"
	workerURL := "http://localhost:3000"
	concurrency := 2
	tasksConfigPath := "tasks.json"

	db, err := initDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Load tasks from JSON
	configTasks, err := loadTasksFromJSON(tasksConfigPath)
	if err != nil {
		log.Printf("Warning: Failed to load tasks.json: %v", err)
	} else {
		log.Printf("Loaded %d task groups from %s", len(configTasks), tasksConfigPath)
		for _, ct := range configTasks {
			schemaStr := ""
			if ct.Schema != nil {
				schemaStr = string(ct.Schema)
			}
			for _, url := range ct.URLs {
				// Check if task already exists to avoid duplicates
				var exists bool
				err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM tasks WHERE url = ? AND extractor_name = ?)", url, ct.Extractor).Scan(&exists)
				if err == nil && !exists {
					log.Printf("Adding task: %s (%s)", url, ct.Extractor)
					addTask(db, url, ct.Extractor, schemaStr)
				}
			}
		}
	}

	// Start the scheduler
	startScheduler(db, workerURL, concurrency)

	log.Println("Orchestrator finished.")
	os.Exit(0)
}
