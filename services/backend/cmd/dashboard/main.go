package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"simple-parser/backend/internal/db"
	"simple-parser/backend/internal/handlers"
	"simple-parser/backend/internal/middleware"

	"github.com/gorilla/sessions"
)

func main() {
	// CLI Flags
	dbPathFlag := flag.String("db", "data/simple-parser.db", "Path to SQLite database")
	workerURLFlag := flag.String("worker", "http://localhost:3000", "Node.js worker URL")
	templatesFlag := flag.String("templates", "services/backend/templates", "Path to HTML templates directory")
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

	// Initialize server with dependencies
	srv := handlers.NewServer(database, store, *workerURLFlag, *templatesFlag)

	// Public routes
	http.HandleFunc("/register", srv.RegisterHandler)
	http.HandleFunc("/login", srv.LoginHandler)
	http.HandleFunc("/logout", srv.LogoutHandler)

	// Protected routes
	http.HandleFunc("/", middleware.Auth(store, srv.IndexHandler))
	http.HandleFunc("/run", middleware.Auth(store, srv.RunTasksHandler))
	http.HandleFunc("/reset-failed", middleware.Auth(store, srv.ResetFailedHandler))
	http.HandleFunc("/clicked", middleware.Auth(store, srv.ClickedHandler))

	fmt.Printf("Server starting at http://localhost:%s\n", *portFlag)
	if err := http.ListenAndServe(":"+*portFlag, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
