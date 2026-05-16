package models

import (
	"encoding/json"
	"time"
)

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}

type Task struct {
	ID            int             `json:"id"`
	TaskKey       string          `json:"task_key"`
	URL           string          `json:"url"`
	ExtractorName string          `json:"extractor_name"`
	Status        string          `json:"status"`
	Result        json.RawMessage `json:"result"`
	Schema        string          `json:"schema,omitempty"`
	Retries       int             `json:"retries"`
	CreatedAt     string          `json:"created_at"`
	UpdatedAt     string          `json:"updated_at"`
}

// ResultString returns the result as a string for template rendering.
func (t Task) ResultString() string {
	return string(t.Result)
}

// FormattedDate converts the SQLite timestamp to a more readable format.
func (t Task) FormattedDate() string {
	// SQLite default format is 2006-01-02 15:04:05 or ISO
	layout := "2006-01-02T15:04:05Z"
	parsed, err := time.Parse(layout, t.UpdatedAt)
	if err != nil {
		// Try alternative SQLite format
		layoutAlt := "2006-01-02 15:04:05"
		parsed, err = time.Parse(layoutAlt, t.UpdatedAt)
		if err != nil {
			return t.UpdatedAt // Return raw if parsing fails
		}
	}
	return parsed.Format("02 Jan, 15:04")
}

type Metrics struct {
	TotalTasks      int `json:"total_tasks"`
	PendingTasks    int `json:"pending_tasks"`
	ProcessingTasks int `json:"processing_tasks"`
	CompletedTasks  int `json:"completed_tasks"`
	FailedTasks     int `json:"failed_tasks"`
}

type PageData struct {
	Count    int     `json:"count"`
	Username string  `json:"username"`
	Error    string  `json:"error"`
	Tasks    []Task  `json:"tasks"`
	Metrics  Metrics `json:"metrics"`
}
