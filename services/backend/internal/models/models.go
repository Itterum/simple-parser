package models

import "encoding/json"

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
// json.RawMessage renders as a byte array by default in templates.
func (t Task) ResultString() string {
	return string(t.Result)
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
