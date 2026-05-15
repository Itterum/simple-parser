package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"simple-parser/backend/internal/db"
	"simple-parser/backend/internal/models"
	"simple-parser/backend/internal/scheduler"
)

type ConfigTask struct {
	Name      string          `json:"name"`
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
	// CLI Flags
	extractorFlag := flag.String("extractor", "", "Extractor name for single run")
	urlFlag := flag.String("url", "", "URL for single run")
	concurrencyFlag := flag.Int("concurrency", 2, "Number of concurrent tasks")
	dbPathFlag := flag.String("db", "data/simple-parser.db", "Path to SQLite database")
	workerURLFlag := flag.String("worker", "http://localhost:3000", "Node.js worker URL")
	tasksJSONFlag := flag.String("config", "configs/tasks.json", "Path to tasks JSON config")
	resetFlag := flag.Bool("reset", false, "Reset all tasks in DB to pending before starting")
	refreshFlag := flag.Bool("refresh", false, "Reset tasks from tasks.json to pending even if they exist")
	
	flag.Parse()

	database, err := db.InitDB(*dbPathFlag)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	if *resetFlag {
		log.Println("Resetting all tasks in database to pending...")
		if err := db.ResetAllTasks(database); err != nil {
			log.Fatalf("Failed to reset tasks: %v", err)
		}
	}

	// Mode 1: Single Run (CLI Mode)
	if *extractorFlag != "" && *urlFlag != "" {
		log.Printf("Running in Single Extraction mode: %s", *urlFlag)
		task := models.Task{
			TaskKey:       "cli-task",
			URL:           *urlFlag,
			ExtractorName: *extractorFlag,
		}
		resp, err := scheduler.ProcessTask(*workerURLFlag, task)
		if err != nil {
			log.Fatalf("Extraction failed: %v", err)
		}
		if resp.Success {
			fmt.Println(string(resp.Data))
		} else {
			log.Fatalf("Extraction error: %s", resp.Error)
		}
		return
	}

	// Mode 2: Orchestrator Mode (Batch Mode)
	configTasks, err := loadTasksFromJSON(*tasksJSONFlag)
	if err != nil {
		log.Printf("Warning: Failed to load %s: %v", *tasksJSONFlag, err)
	} else {
		log.Printf("Loaded %d task groups from %s", len(configTasks), *tasksJSONFlag)
		for _, ct := range configTasks {
			schemaStr := ""
			if ct.Schema != nil {
				schemaStr = string(ct.Schema)
			}
			for _, url := range ct.URLs {
				var exists bool
				err := database.QueryRow("SELECT EXISTS(SELECT 1 FROM tasks WHERE task_key = ? AND url = ? AND extractor_name = ?)", ct.Name, url, ct.Extractor).Scan(&exists)
				if err == nil && !exists {
					log.Printf("Adding task to queue: %s | %s (%s)", ct.Name, url, ct.Extractor)
					db.AddTask(database, ct.Name, url, ct.Extractor, schemaStr)
				} else if *refreshFlag {
					log.Printf("Refreshing task: %s | %s (%s)", ct.Name, url, ct.Extractor)
					db.ResetTask(database, ct.Name, url, ct.Extractor)
				}
			}
		}
	}

	scheduler.StartScheduler(database, *workerURLFlag, *concurrencyFlag)

	log.Println("Orchestrator finished.")
}
