package config

import (
	"encoding/json"
	"os"
)

type ConfigTask struct {
	Name      string          `json:"name"`
	Extractor string          `json:"extractor"`
	URLs      []string        `json:"urls"`
	Schema    json.RawMessage `json:"schema,omitempty"`
}

func LoadTasksFromJSON(path string) ([]ConfigTask, error) {
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
