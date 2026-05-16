package main

import (
	"flag"
	"fmt"
	"log"
	"simple-parser/backend/internal/db"
	"simple-parser/backend/internal/models"
	"simple-parser/backend/internal/scheduler"
)

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

	// Mode 2: Sync and Run (Orchestrator Mode)
	if err := db.SyncTasks(database, *tasksJSONFlag, *refreshFlag); err != nil {
		log.Printf("Sync failed: %v", err)
	}

	scheduler.StartScheduler(database, *workerURLFlag, *concurrencyFlag)

	log.Println("Orchestrator finished.")
}
