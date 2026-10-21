// Assignment: Maze Path Finding using DFS and BFS
// The maze is a grid of cells. Each cell is a vertex.
// 1 = open cell, 0 = blocked cell.
// Goal: find a path from start (src) to goal (dest) using DFS and BFS.

#include <iostream>
#include <algorithm>
#include <vector>
#include <queue>
#include <stack>
using namespace std;

class Maze {
private:
    vector<vector<int>> grid;   // the maze: 1 = open, 0 = blocked
    int rows, cols;

    // 4 possible moves: up, down, left, right
    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};

    // Check if a cell is inside the grid and open
    bool isValid(int r, int c, vector<vector<bool>>& visited) {
        return (r >= 0 && r < rows && c >= 0 && c < cols &&
                grid[r][c] == 1 && !visited[r][c]);
    }

public:
    // Constructor: load the maze
    Maze(vector<vector<int>> g) {
        grid = g;
        rows = grid.size();
        cols = grid[0].size();
    }

    // ---------- DFS (recursive) ----------
    // Returns true if a path exists from (r,c) to (dr_,dc_).
    // Stores the path in 'path' as (row,col) pairs.
    bool dfs(int r, int c, int dr_, int dc_,
             vector<vector<bool>>& visited,
             vector<pair<int,int>>& path) {

        // Mark current cell and add to path
        visited[r][c] = true;
        path.push_back({r, c});

        // Reached the goal?
        if (r == dr_ && c == dc_)
            return true;

        // Try all 4 neighbours
        for (int i = 0; i < 4; i++) {
            int nr = r + dr[i];
            int nc = c + dc[i];

            if (isValid(nr, nc, visited)) {
                if (dfs(nr, nc, dr_, dc_, visited, path))
                    return true;   // path found, stop
            }
        }

        // Dead end: backtrack (remove this cell from path)
        path.pop_back();
        return false;
    }

    // ---------- BFS (shortest path) ----------
    // Uses a queue. parent[][] stores where each cell was reached from,
    // so we can rebuild the shortest path at the end.
    vector<pair<int,int>> bfs(int sr, int sc, int dr_, int dc_) {
        vector<vector<bool>> visited(rows, vector<bool>(cols, false));
        vector<vector<pair<int,int>>> parent(rows,
            vector<pair<int,int>>(cols, {-1, -1}));

        queue<pair<int,int>> q;
        q.push({sr, sc});
        visited[sr][sc] = true;

        bool found = false;

        while (!q.empty()) {
            auto [r, c] = q.front();
            q.pop();

            if (r == dr_ && c == dc_) {
                found = true;
                break;
            }

            for (int i = 0; i < 4; i++) {
                int nr = r + dr[i];
                int nc = c + dc[i];

                if (isValid(nr, nc, visited)) {
                    visited[nr][nc] = true;
                    parent[nr][nc] = {r, c};   // remember where we came from
                    q.push({nr, nc});
                }
            }
        }

        vector<pair<int,int>> path;
        if (!found)
            return path;   // empty = no path

        // Rebuild path from goal back to start
        int r = dr_, c = dc_;
        while (!(r == sr && c == sc)) {
            path.push_back({r, c});
            auto p = parent[r][c];
            r = p.first;
            c = p.second;
        }
        path.push_back({sr, sc});
        reverse(path.begin(), path.end());   // start -> goal order
        return path;
    }

    // Print a path nicely
    void printPath(vector<pair<int,int>>& path, string algo) {
        if (path.empty()) {
            cout << algo << ": No path found.\n";
            return;
        }
        cout << algo << " path (" << path.size() << " steps):\n";
        for (auto [r, c] : path)
            cout << "(" << r << "," << c << ") ";
        cout << "\n";
    }
};

int main() {
    // Sample maze: 1 = open, 0 = blocked
    vector<vector<int>> grid = {
        {1, 0, 1, 1, 1},
        {1, 1, 1, 0, 1},
        {0, 0, 0, 0, 1},
        {1, 1, 1, 1, 1}
    };

    Maze maze(grid);

    int sr = 0, sc = 0;   // start (top-left)
    int dr_ = 3, dc_ = 4; // goal  (bottom-right)

    // --- DFS ---
    vector<vector<bool>> visited(4, vector<bool>(5, false));
    vector<pair<int,int>> dfsPath;
    maze.dfs(sr, sc, dr_, dc_, visited, dfsPath);
    maze.printPath(dfsPath, "DFS");

    // --- BFS ---
    vector<pair<int,int>> bfsPath = maze.bfs(sr, sc, dr_, dc_);
    maze.printPath(bfsPath, "BFS");

    return 0;
}