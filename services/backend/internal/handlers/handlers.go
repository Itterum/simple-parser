package handlers

import (
	"database/sql"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
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
	Count       int
	Mu          sync.Mutex
}

func NewServer(database *sql.DB, store *sessions.CookieStore, workerURL, templateDir string) *Server {
	return &Server{
		DB:          database,
		Store:       store,
		WorkerURL:   workerURL,
		TemplateDir: templateDir,
	}
}

func (s *Server) IndexHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := s.Store.Get(r, "session-name")
	username, ok := session.Values["username"].(string)
	if !ok {
		username = "Guest"
	}

	tasks, err := db.GetAllTasks(s.DB)
	if err != nil {
		log.Printf("Error fetching tasks: %v", err)
	}
	log.Printf("Fetched %d tasks for dashboard", len(tasks))

	metrics, err := db.GetMetrics(s.DB)
	if err != nil {
		log.Printf("Error fetching metrics: %v", err)
	}

	tmpl, err := template.ParseFiles(filepath.Join(s.TemplateDir, "index.html"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	tmpl.Execute(w, models.PageData{
		Username: username,
		Tasks:    tasks,
		Metrics:  metrics,
	})
}

func (s *Server) RunTasksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Run scheduler in background
	go func() {
		log.Println("Starting background scheduler run...")
		scheduler.StartScheduler(s.DB, s.WorkerURL, 5) // Default concurrency 5
		log.Println("Background scheduler run finished.")
	}()

	// Return to index (HTMX will refresh)
	w.Header().Set("HX-Trigger", "tasksUpdated")
	s.IndexHandler(w, r)
}

func (s *Server) ResetFailedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := db.ResetFailedTasks(s.DB); err != nil {
		log.Printf("Error resetting failed tasks: %v", err)
		http.Error(w, "Failed to reset tasks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("HX-Trigger", "tasksUpdated")
	s.IndexHandler(w, r)
}

func (s *Server) ClickedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.Mu.Lock()
	s.Count++
	currentCount := s.Count
	s.Mu.Unlock()

	tmpl, err := template.ParseFiles(filepath.Join(s.TemplateDir, "button.html"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, models.PageData{Count: currentCount})
}

func (s *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		tmpl, _ := template.ParseFiles(filepath.Join(s.TemplateDir, "register.html"))
		tmpl.Execute(w, nil)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	_, err = s.DB.Exec("INSERT INTO users (username, password) VALUES (?, ?)", username, hashedPassword)
	if err != nil {
		tmpl, _ := template.ParseFiles(filepath.Join(s.TemplateDir, "register.html"))
		tmpl.Execute(w, models.PageData{Error: "Username already exists"})
		return
	}

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func (s *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		tmpl, _ := template.ParseFiles(filepath.Join(s.TemplateDir, "login.html"))
		tmpl.Execute(w, nil)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	var dbPassword string
	err := s.DB.QueryRow("SELECT password FROM users WHERE username = ?", username).Scan(&dbPassword)
	if err != nil {
		tmpl, _ := template.ParseFiles(filepath.Join(s.TemplateDir, "login.html"))
		tmpl.Execute(w, models.PageData{Error: "Invalid username or password"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(dbPassword), []byte(password))
	if err != nil {
		tmpl, _ := template.ParseFiles(filepath.Join(s.TemplateDir, "login.html"))
		tmpl.Execute(w, models.PageData{Error: "Invalid username or password"})
		return
	}

	session, _ := s.Store.Get(r, "session-name")
	session.Values["authenticated"] = true
	session.Values["username"] = username
	session.Save(r, w)

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (s *Server) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := s.Store.Get(r, "session-name")
	session.Values["authenticated"] = false
	session.Save(r, w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}
