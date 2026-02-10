# Activity Analysis Dashboard & API

Full-stack application (Node.js/Express + React/ChakraUI) to ingest, parse, and visualize user activity data from remote CSV files.

## 🚀 Setup & Run Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### 1. Backend Setup

The backend runs on port `3000`.

```bash
cd backend
npm install

# Run in development mode (using nodemon + ts-node)
npm run dev
```

### 1. Frontend Setup

cd frontend
npm install

# Run the development server

npm run dev

Open your browser at the URL provided by Vite (e.g., http://localhost:5173).

Data Structure & Optimization

1. Robust CSV Parsing (Streaming)
   Instead of loading the entire file into memory as a buffer (which would crash on large datasets), the application uses Node.js Streams piped into csv-parse.

Strategy: Rows are processed one by one as they arrive from the network.

Dirty Data Handling: The parser is configured with quote: false and relax_column_count: true to handle malformed JSON fields within the CSV (e.g., unescaped quotes inside metadata).

Atomic Swap: Data is loaded into a temporary array tempStorage. The global memoryDB is only updated once the entire stream is successfully processed, preventing partial data states during updates.

2. Performance: O(N) Aggregation (Action Trends)
   For the /action_trends endpoint, performance was prioritized to handle large datasets efficiently.

Naive Approach (Avoided): Nested loops filtering by user and action would result in O(N\*M) complexity, which is slow for large N.

Implemented Approach (HashMap):

Algorithm: O(N) (Linear Time).

We iterate through the data array once.

A Map<string, number> is used to store frequencies.

Key Generation: A composite key string is created: "${user_id}|${action}".

Value: The count is incremented in O(1).

Finally, the map is converted to an array and sorted. Since the number of unique User-Action pairs is significantly smaller than the total dataset, the sorting cost is negligible.

3. Data Storage
   In-Memory: Data is stored in a global variable memoryDB: Activity[]. While volatile (resets on restart), this ensures extremely fast read access (microsecond latency) for the requested endpoints without database overhead for this specific challenge scope.

🤖 AI Tool Usage Description
This project utilized Gemini 3 Pro (Google) as a pair programmer assistant. Specific contributions included:

Boilerplate & Configuration:

Generating the initial tsconfig.json to resolve compatibility issues between CommonJS, ESModules, and ts-node.

setting up the nodemon configuration for TypeScript execution.

Algorithm Optimization:

Suggesting the O(N) HashMap strategy for the action_trends endpoint to ensure scalability instead of using .filter inside loops.

Debugging & Robustness:

diagnosing "Dirty CSV" parsing errors (Invalid Closing Quote) and suggesting the quote: false + raw string reconstruction strategy to handle malformed JSON in the CSV.

Identifying the timezone data mismatch (filtering for 2025 while data was from 2024) via a custom debug endpoint.

Frontend Charting:

Assisting in the migration from Recharts to Chart.js to resolve TypeScript strict typing incompatibilities.

📡 API Endpoints
GET /summary
Returns aggregate stats for a specific user.

Params: user_id, start_time (ISO), end_time (ISO).

GET /action_trends
Returns the top 3 most frequent User-Action pairs.

Params: start_time (ISO), end_time (ISO).
