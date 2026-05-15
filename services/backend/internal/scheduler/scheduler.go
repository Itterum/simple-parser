package scheduler

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"simple-parser/backend/internal/db"
	"simple-parser/backend/internal/models"
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

func ProcessTask(workerURL string, task models.Task) (*ExtractResponse, error) {
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

func StartScheduler(database *sql.DB, workerURL string, concurrency int) {
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, concurrency)

	tasks, err := db.GetPendingTasks(database)
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

		go func(t models.Task) {
			defer wg.Done()
			defer func() { <-semaphore }()

			log.Printf("Processing task %d: %s", t.ID, t.URL)
			
			// Mark as processing
			if err := db.UpdateTaskStatus(database, t.ID, "processing", ""); err != nil {
				log.Printf("Warning: failed to update status to processing for task %d: %v", t.ID, err)
			}

			resp, err := ProcessTask(workerURL, t)
			if err != nil {
				log.Printf("Error processing task %d: %v", t.ID, err)
				if err := db.UpdateTaskStatus(database, t.ID, "failed", err.Error()); err != nil {
					log.Printf("Critical: failed to update status to failed for task %d: %v", t.ID, err)
				}
				return
			}

			if resp.Success {
				log.Printf("Successfully completed task %d", t.ID)
				if err := db.UpdateTaskStatus(database, t.ID, "completed", string(resp.Data)); err != nil {
					log.Printf("Critical: failed to update status to completed for task %d: %v", t.ID, err)
				}
			} else {
				log.Printf("Task %d failed: %s", t.ID, resp.Error)
				if err := db.UpdateTaskStatus(database, t.ID, "failed", resp.Error); err != nil {
					log.Printf("Critical: failed to update status to failed for task %d: %v", t.ID, err)
				}
			}
		}(task)
	}

	wg.Wait()
	log.Println("All tasks processed.")
}
