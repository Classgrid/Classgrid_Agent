#include <iostream>
#include <stack>
#include <queue>
#include <cstdlib>
#include <ctime>
using namespace std;

struct Node {
    int data;
    Node* left;
    Node* right;
    Node(int v) : data(v), left(nullptr), right(nullptr) {}
};

class BST {
public:
    Node* root;
    BST() : root(nullptr) {}

    // ---------- Insert (without recursion) ----------
    void insert(int v) {
        Node* nn = new Node(v);
        if (!root) { root = nn; return; }
        Node* cur = root;
        while (true) {
            if (v == cur->data) { delete nn; cout << v << " already exists, skipped\n"; return; }
            if (v < cur->data) {
                if (!cur->left) { cur->left = nn; return; }
                cur = cur->left;
            } else {
                if (!cur->right) { cur->right = nn; return; }
                cur = cur->right;
            }
        }
    }

    // ---------- Insert (with recursion) ----------
    Node* insertRec(Node* node, int v) {
        if (!node) return new Node(v);
        if (v < node->data) node->left = insertRec(node->left, v);
        else if (v > node->data) node->right = insertRec(node->right, v);
        else cout << v << " already exists, skipped\n";
        return node;
    }

    // ---------- Search ----------
    bool search(int v) {
        Node* cur = root;
        while (cur) {
            if (v == cur->data) return true;
            cur = (v < cur->data) ? cur->left : cur->right;
        }
        return false;
    }

    // ---------- Traversals (recursive) ----------
    void inorder(Node* node) {
        if (!node) return;
        inorder(node->left);
        cout << node->data << " ";
        inorder(node->right);
    }

    void preorder(Node* node) {
        if (!node) return;
        cout << node->data << " ";
        preorder(node->left);
        preorder(node->right);
    }

    void postorder(Node* node) {
        if (!node) return;
        postorder(node->left);
        postorder(node->right);
        cout << node->data << " ";
    }

    // ---------- Inorder without recursion (using stack) ----------
    void inorderIterative() {
        stack<Node*> st;
        Node* cur = root;
        while (cur || !st.empty()) {
            while (cur) { st.push(cur); cur = cur->left; }
            cur = st.top(); st.pop();
            cout << cur->data << " ";
            cur = cur->right;
        }
    }

    // ---------- Count leaves (with recursion) ----------
    int countLeavesRec(Node* node) {
        if (!node) return 0;
        if (!node->left && !node->right) return 1;
        return countLeavesRec(node->left) + countLeavesRec(node->right);
    }

    // ---------- Count leaves (without recursion, using queue) ----------
    int countLeavesIterative() {
        if (!root) return 0;
        int count = 0;
        queue<Node*> q;
        q.push(root);
        while (!q.empty()) {
            Node* cur = q.front(); q.pop();
            if (!cur->left && !cur->right) count++;
            if (cur->left) q.push(cur->left);
            if (cur->right) q.push(cur->right);
        }
        return count;
    }

    // ---------- Height (recursive) ----------
    int height(Node* node) {
        if (!node) return 0;
        int lh = height(node->left);
        int rh = height(node->right);
        return 1 + (lh > rh ? lh : rh);
    }
};

int main() {
    srand(time(0));
    BST tree;

    cout << "=== INSERT (without recursion) - random values ===\n";
    for (int i = 0; i < 6; i++) {
        int v = rand() % 100 + 1;
        cout << "Inserting " << v << "\n";
        tree.insert(v);
    }

    cout << "\n=== INSERT (with recursion) - random values ===\n";
    for (int i = 0; i < 4; i++) {
        int v = rand() % 100 + 1;
        cout << "Inserting " << v << "\n";
        tree.root = tree.insertRec(tree.root, v);
    }

    cout << "\n=== TRAVERSALS ===\n";
    cout << "Inorder   : "; tree.inorder(tree.root);   cout << "\n";
    cout << "Preorder  : "; tree.preorder(tree.root);  cout << "\n";
    cout << "Postorder : "; tree.postorder(tree.root); cout << "\n";
    cout << "Inorder (without recursion): "; tree.inorderIterative(); cout << "\n";

    cout << "\n=== SEARCH ===\n";
    int key;
    cout << "Enter value to search: ";
    cin >> key;
    if (tree.search(key)) cout << key << " FOUND in the tree\n";
    else cout << key << " NOT found in the tree\n";

    cout << "\n=== COUNT LEAVES ===\n";
    cout << "Leaves (with recursion)    : " << tree.countLeavesRec(tree.root) << "\n";
    cout << "Leaves (without recursion) : " << tree.countLeavesIterative() << "\n";

    cout << "\n=== HEIGHT (recursive) ===\n";
    cout << "Height of tree: " << tree.height(tree.root) << "\n";

    return 0;
}
