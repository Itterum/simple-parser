package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"simple-parser/backend/internal/db"
	"simple-parser/backend/internal/handlers"
	"simple-parser/backend/internal/middleware"

	"github.com/gorilla/sessions"
)

func main() {
	// CLI Flags
	dbPathFlag := flag.String("db", "data/simple-parser.db", "Path to SQLite database")
	workerURLFlag := flag.String("worker", "http://localhost:3000", "Node.js worker URL")
	tasksJSONFlag := flag.String("config", "configs/tasks.json", "Path to tasks JSON config")
	publicDirFlag := flag.String("public", "public", "Path to static files directory (React dist)")
	portFlag := flag.String("port", "8080", "Port to run the dashboard on")
	
	flag.Parse()

	// Initialize database
	database, err := db.InitDB(*dbPathFlag)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Initialize session store
	store := sessions.NewCookieStore([]byte("a-very-secret-key"))

	// Initial sync
	log.Printf("Syncing tasks from %s...", *tasksJSONFlag)
	if err := db.SyncTasks(database, *tasksJSONFlag, false); err != nil {
		log.Printf("Initial sync warning: %v", err)
	}

	// Initialize server with dependencies
	// Note: TemplateDir is no longer used for HTML rendering but kept for compatibility in struct if needed
	srv := handlers.NewServer(database, store, *workerURLFlag, "", *tasksJSONFlag)

	// API Routes
	http.HandleFunc("/api/register", srv.ApiRegisterHandler)
	http.HandleFunc("/api/login", srv.ApiLoginHandler)
	http.HandleFunc("/api/logout", srv.ApiLogoutHandler)
	http.HandleFunc("/api/status", srv.ApiStatusHandler)

	// Protected API routes
	http.HandleFunc("/api/dashboard", middleware.Auth(store, srv.GetDashboardData))
	http.HandleFunc("/api/sync", middleware.Auth(store, srv.ApiSyncConfigHandler))
	http.HandleFunc("/api/run", middleware.Auth(store, srv.ApiRunTasksHandler))
	http.HandleFunc("/api/reset-failed", middleware.Auth(store, srv.ApiResetFailedHandler))
	http.HandleFunc("/api/delete", middleware.Auth(store, srv.ApiDeleteTaskHandler))

	// Static files serving (React SPA)
	// We use a custom handler to support SPA routing (redirect all non-API to index.html)
	fs := http.FileServer(http.Dir(*publicDirFlag))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// If it's an API route that wasn't matched above, return 404
		// (Though http.HandleFunc usually handles this, we want to be explicit)
		
		// Check if file exists in public dir
		path := filepath.Join(*publicDirFlag, r.URL.Path)
		_, err := os.Stat(path)
		if os.IsNotExist(err) || r.URL.Path == "/" {
			// Serve index.html for SPA routing
			http.ServeFile(w, r, filepath.Join(*publicDirFlag, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	fmt.Printf("Server starting at http://localhost:%s\n", *portFlag)
	if err := http.ListenAndServe(":"+*portFlag, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
