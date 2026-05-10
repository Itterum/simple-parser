package main

import (
	"encoding/json"
	"flag"
	"fmt"
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
	// CLI Flags
	extractorFlag := flag.String("extractor", "", "Extractor name for single run")
	urlFlag := flag.String("url", "", "URL for single run")
	concurrencyFlag := flag.Int("concurrency", 2, "Number of concurrent tasks")
	dbPathFlag := flag.String("db", "simple-parser.db", "Path to SQLite database")
	workerURLFlag := flag.String("worker", "http://localhost:3000", "Node.js worker URL")
	tasksJSONFlag := flag.String("config", "tasks.json", "Path to tasks JSON config")
	
	flag.Parse()

	db, err := initDB(*dbPathFlag)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Mode 1: Single Run (CLI Mode)
	if *extractorFlag != "" && *urlFlag != "" {
		log.Printf("Running in Single Extraction mode: %s", *urlFlag)
		task := Task{
			URL:           *urlFlag,
			ExtractorName: *extractorFlag,
		}
		resp, err := processTask(*workerURLFlag, task)
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
				err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM tasks WHERE url = ? AND extractor_name = ?)", url, ct.Extractor).Scan(&exists)
				if err == nil && !exists {
					log.Printf("Adding task to queue: %s (%s)", url, ct.Extractor)
					addTask(db, url, ct.Extractor, schemaStr)
				}
			}
		}
	}

	startScheduler(db, *workerURLFlag, *concurrencyFlag)

	log.Println("Orchestrator finished.")
}
