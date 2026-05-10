package main

import (
	"log"
	"os"
)

func main() {
	dbPath := "simple-parser.db"
	workerURL := "http://localhost:3000"
	concurrency := 2

	db, err := initDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Example: Seed tasks if the database is empty
	tasks, _ := getPendingTasks(db)
	if len(tasks) == 0 {
		log.Println("Seeding initial tasks for testing...")
		addTask(db, "https://github.com/trending", "github-extractor")
		addTask(db, "https://github.com/trending/javascript", "github-extractor")
	}

	// Start the scheduler
	startScheduler(db, workerURL, concurrency)

	log.Println("Orchestrator finished.")
	os.Exit(0)
}
