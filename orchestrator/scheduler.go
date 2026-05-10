package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
)

type ExtractRequest struct {
	URL       string          `json:"url"`
	Extractor string          `json:"extractor"`
	Headless  bool            `json:"headless"`
	Schema    json.RawMessage `json:"schema,omitempty"`
}

type ExtractResponse struct {
	Success bool            `json:"success"`
	URL     string          `json:"url"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error"`
}

func processTask(workerURL string, task Task) (*ExtractResponse, error) {
	var schema json.RawMessage
	if task.Schema != "" {
		schema = json.RawMessage(task.Schema)
	}

	reqBody, err := json.Marshal(ExtractRequest{
		URL:       task.URL,
		Extractor: task.ExtractorName,
		Headless:  true,
		Schema:    schema,
	})
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(workerURL+"/api/v1/extract", "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var extractResp ExtractResponse
	if err := json.Unmarshal(body, &extractResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w, body: %s", err, string(body))
	}

	return &extractResp, nil
}

func startScheduler(db *sql.DB, workerURL string, concurrency int) {
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, concurrency)

	tasks, err := getPendingTasks(db)
	if err != nil {
		log.Fatalf("Failed to fetch pending tasks: %v", err)
	}

	if len(tasks) == 0 {
		log.Println("No pending tasks found.")
		return
	}

	log.Printf("Starting processing of %d tasks...", len(tasks))

	for _, task := range tasks {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(t Task) {
			defer wg.Done()
			defer func() { <-semaphore }()

			log.Printf("Processing task %d: %s", t.ID, t.URL)
			
			// Mark as processing
			updateTaskStatus(db, t.ID, "processing", "")

			resp, err := processTask(workerURL, t)
			if err != nil {
				log.Printf("Error processing task %d: %v", t.ID, err)
				updateTaskStatus(db, t.ID, "failed", err.Error())
				return
			}

			if resp.Success {
				log.Printf("Successfully completed task %d", t.ID)
				updateTaskStatus(db, t.ID, "completed", string(resp.Data))
			} else {
				log.Printf("Task %d failed: %s", t.ID, resp.Error)
				updateTaskStatus(db, t.ID, "failed", resp.Error)
			}
		}(task)
	}

	wg.Wait()
	log.Println("All tasks processed.")
}
