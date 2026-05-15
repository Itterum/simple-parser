#!/bin/bash

# Start orchestrator in the background
echo "Starting orchestrator..."
./orchestrator -config configs/tasks.json -db data/simple-parser.db -worker http://worker:3000 &

# Start dashboard in the foreground
echo "Starting dashboard..."
exec ./dashboard -templates ./templates -db data/simple-parser.db -worker http://worker:3000
