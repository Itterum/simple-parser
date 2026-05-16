package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"simple-parser/backend/internal/db"
	"simple-parser/backend/internal/models"
	"simple-parser/backend/internal/scheduler"

	"github.com/gorilla/sessions"
	"golang.org/x/crypto/bcrypt"
)

type Server struct {
	DB          *sql.DB
	Store       *sessions.CookieStore
	WorkerURL   string
	TemplateDir string
	ConfigPath  string
	Count       int
	Mu          sync.Mutex
}

func NewServer(database *sql.DB, store *sessions.CookieStore, workerURL, templateDir, configPath string) *Server {
	return &Server{
		DB:          database,
		Store:       store,
		WorkerURL:   workerURL,
		TemplateDir: templateDir,
		ConfigPath:  configPath,
	}
}

// JSON Helper
func (s *Server) jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (s *Server) GetDashboardData(w http.ResponseWriter, r *http.Request) {
	session, _ := s.Store.Get(r, "session-name")
	username, ok := session.Values["username"].(string)
	if !ok {
		username = "Guest"
	}

	tasks, err := db.GetAllTasks(s.DB)
	if err != nil {
		log.Printf("Error fetching tasks: %v", err)
	}

	metrics, err := db.GetMetrics(s.DB)
	if err != nil {
		log.Printf("Error fetching metrics: %v", err)
	}

	s.jsonResponse(w, models.PageData{
		Username: username,
		Tasks:    tasks,
		Metrics:  metrics,
	}, http.StatusOK)
}

func (s *Server) ApiSyncConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := db.SyncTasks(s.DB, s.ConfigPath, false); err != nil {
		log.Printf("Error syncing config: %v", err)
		s.jsonResponse(w, map[string]string{"error": "Failed to sync tasks"}, http.StatusInternalServerError)
		return
	}

	s.jsonResponse(w, map[string]string{"message": "Config synchronized"}, http.StatusOK)
}

func (s *Server) ApiRunTasksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	go func() {
		log.Println("Starting background scheduler run...")
		scheduler.StartScheduler(s.DB, s.WorkerURL, 5)
		log.Println("Background scheduler run finished.")
	}()

	s.jsonResponse(w, map[string]string{"message": "Processing started"}, http.StatusAccepted)
}

func (s *Server) ApiResetFailedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := db.ResetFailedTasks(s.DB); err != nil {
		log.Printf("Error resetting failed tasks: %v", err)
		s.jsonResponse(w, map[string]string{"error": "Failed to reset tasks"}, http.StatusInternalServerError)
		return
	}

	s.jsonResponse(w, map[string]string{"message": "Failed tasks reset"}, http.StatusOK)
}

func (s *Server) ApiDeleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		idStr = r.FormValue("id")
	}
	
	id, err := strconv.Atoi(idStr)
	if err != nil {
		s.jsonResponse(w, map[string]string{"error": "Invalid task ID"}, http.StatusBadRequest)
		return
	}

	if err := db.DeleteTask(s.DB, id); err != nil {
		log.Printf("Error deleting task %d: %v", id, err)
		s.jsonResponse(w, map[string]string{"error": "Failed to delete task"}, http.StatusInternalServerError)
		return
	}

	s.jsonResponse(w, map[string]string{"message": "Task deleted"}, http.StatusOK)
}

func (s *Server) ApiRegisterHandler(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(creds.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	_, err = s.DB.Exec("INSERT INTO users (username, password) VALUES (?, ?)", creds.Username, hashedPassword)
	if err != nil {
		s.jsonResponse(w, map[string]string{"error": "Username already exists"}, http.StatusConflict)
		return
	}

	s.jsonResponse(w, map[string]string{"message": "User registered"}, http.StatusCreated)
}

func (s *Server) ApiLoginHandler(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var dbPassword string
	err := s.DB.QueryRow("SELECT password FROM users WHERE username = ?", creds.Username).Scan(&dbPassword)
	if err != nil {
		s.jsonResponse(w, map[string]string{"error": "Invalid credentials"}, http.StatusUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(dbPassword), []byte(creds.Password))
	if err != nil {
		s.jsonResponse(w, map[string]string{"error": "Invalid credentials"}, http.StatusUnauthorized)
		return
	}

	session, _ := s.Store.Get(r, "session-name")
	session.Values["authenticated"] = true
	session.Values["username"] = creds.Username
	session.Save(r, w)

	s.jsonResponse(w, map[string]string{"message": "Logged in", "username": creds.Username}, http.StatusOK)
}

func (s *Server) ApiLogoutHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := s.Store.Get(r, "session-name")
	session.Values["authenticated"] = false
	session.Save(r, w)
	s.jsonResponse(w, map[string]string{"message": "Logged out"}, http.StatusOK)
}

func (s *Server) ApiStatusHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := s.Store.Get(r, "session-name")
	auth, ok := session.Values["authenticated"].(bool)
	if !ok || !auth {
		s.jsonResponse(w, map[string]interface{}{"authenticated": false}, http.StatusOK)
		return
	}
	username := session.Values["username"].(string)
	s.jsonResponse(w, map[string]interface{}{"authenticated": true, "username": username}, http.StatusOK)
}
