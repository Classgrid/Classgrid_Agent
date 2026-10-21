#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

const int V = 8;
string name[V] = {
    "Main Gate", "Computer Dept", "Mechanical Dept", "Civil Dept",
    "Electronics Dept", "Library", "Canteen", "Admin Block"
};

int graph[V][V] = {
    //       MG   CS   ME   CE   EC   LIB  CAN  ADM
    { 0,  120,   0,   0,   0,   0,  200,  80 },
    {120,   0,  60,   0,  90, 150,    0,   0 },
    {  0,  60,   0,  70,   0,   0,  100,   0 },
    {  0,   0,  70,   0,  40,   0,    0, 110 },
    {  0,  90,   0,  40,   0,  50,    0,   0 },
    {  0, 150,   0,   0,  50,   0,   60,   0 },
    {200,   0, 100,   0,   0,  60,    0, 130 },
    { 80,   0,   0, 110,   0,   0,  130,   0 }
};

// ============ PRIM'S ============
int minKey(int key[], bool mstSet[]) {
    int mn = 1e9, idx = -1;
    for (int v = 0; v < V; v++)
        if (!mstSet[v] && key[v] < mn) mn = key[v], idx = v;
    return idx;
}

void primMST() {
    int parent[V], key[V];
    bool mstSet[V] = {false};
    for (int i = 0; i < V; i++) key[i] = 1e9;
    key[0] = 0; parent[0] = -1;

    for (int c = 0; c < V - 1; c++) {
        int u = minKey(key, mstSet);
        mstSet[u] = true;
        for (int v = 0; v < V; v++)
            if (graph[u][v] && !mstSet[v] && graph[u][v] < key[v])
                parent[v] = u, key[v] = graph[u][v];
    }

    int total = 0;
    cout << "=== PRIM'S MST ===\n";
    for (int i = 1; i < V; i++) {
        cout << name[parent[i]] << " - " << name[i]
             << "   " << graph[parent[i]][i] << " m\n";
        total += graph[parent[i]][i];
    }
    cout << "Total: " << total << " m\n\n";
}

// ============ KRUSKAL'S ============
struct Edge { int u, v, w; };
bool cmp(Edge a, Edge b) { return a.w < b.w; }

int parent[V];
int findSet(int x) { return parent[x] == x ? x : parent[x] = findSet(parent[x]); }
void unionSet(int a, int b) { parent[findSet(a)] = findSet(b); }

void kruskalMST() {
    vector<Edge> edges;
    for (int i = 0; i < V; i++)
        for (int j = i + 1; j < V; j++)
            if (graph[i][j]) edges.push_back({i, j, graph[i][j]});

    sort(edges.begin(), edges.end(), cmp);
    for (int i = 0; i < V; i++) parent[i] = i;

    int total = 0;
    cout << "=== KRUSKAL'S MST ===\n";
    for (Edge e : edges) {
        if (findSet(e.u) != findSet(e.v)) {
            unionSet(e.u, e.v);
            cout << name[e.u] << " - " << name[e.v] << "   " << e.w << " m\n";
            total += e.w;
        }
    }
    cout << "Total: " << total << " m\n";
}

int main() {
    primMST();
    kruskalMST();
    return 0;
}