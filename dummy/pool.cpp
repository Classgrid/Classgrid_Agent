// Assignment 6
// Design and implement a Library Book Index System using a Threaded Binary Search Tree (TBT).
// Each node stores (Book ID, Book Title). Threading supports fast inorder traversal
// without recursion or stack.

#include <iostream>
#include <string>
using namespace std;

struct Node {
    int bookId;
    string title;
    Node* left;
    Node* right;
    bool leftThread;   // true if left points to inorder predecessor
    bool rightThread;  // true if right points to inorder successor

    Node(int id, string t) {
        bookId = id;
        title = t;
        left = right = nullptr;
        leftThread = rightThread = true;
    }
};

class ThreadedBST {
private:
    Node* root;

    Node* inorderSuccessor(Node* p) {
        if (p->rightThread)
            return p->right;
        p = p->right;
        while (!p->leftThread)
            p = p->left;
        return p;
    }

public:
    ThreadedBST() {
        root = nullptr;
    }

    void insert(int id, string title) {
        Node* newNode = new Node(id, title);

        if (root == nullptr) {
            root = newNode;
            return;
        }

        Node* curr = root;
        Node* parent = nullptr;

        while (curr != nullptr) {
            parent = curr;
            if (id < curr->bookId) {
                if (!curr->leftThread)
                    curr = curr->left;
                else
                    break;
            } else if (id > curr->bookId) {
                if (!curr->rightThread)
                    curr = curr->right;
                else
                    break;
            } else {
                cout << "Book ID " << id << " already exists. Skipping.\n";
                delete newNode;
                return;
            }
        }

        if (id < parent->bookId) {
            newNode->left = parent->left;
            newNode->right = parent;
            parent->leftThread = false;
            parent->left = newNode;
        } else {
            newNode->right = parent->right;
            newNode->left = parent;
            parent->rightThread = false;
            parent->right = newNode;
        }
    }

    void inorder() {
        if (root == nullptr) {
            cout << "Library is empty.\n";
            return;
        }

        Node* curr = root;
        while (!curr->leftThread)
            curr = curr->left;

        while (curr != nullptr) {
            cout << "Book ID: " << curr->bookId << "  |  Title: " << curr->title << "\n";
            curr = inorderSuccessor(curr);
        }
    }

    Node* search(int id) {
        Node* curr = root;
        while (curr != nullptr) {
            if (id == curr->bookId)
                return curr;
            if (id < curr->bookId) {
                if (curr->leftThread)
                    return nullptr;
                curr = curr->left;
            } else {
                if (curr->rightThread)
                    return nullptr;
                curr = curr->right;
            }
        }
        return nullptr;
    }

    // NEW: search by full title (exact match)
    Node* searchByTitle(string t) {
        if (root == nullptr)
            return nullptr;

        Node* curr = root;
        while (!curr->leftThread)
            curr = curr->left;   // go to leftmost (smallest ID)

        while (curr != nullptr) {
            if (curr->title == t)
                return curr;
            curr = inorderSuccessor(curr);
        }
        return nullptr;
    }
};

int main() {
    ThreadedBST lib;
    int choice, id;
    string title;

    do {
        cout << "\n===== Library Book Index System (TBT) =====\n";
        cout << "1. Add Book\n";
        cout << "2. Display Books (Inorder)\n";
        cout << "3. Search Book by ID\n";
        cout << "4. Search Book by Title\n";
        cout << "5. Exit\n";
        cout << "Enter your choice: ";

        if (!(cin >> choice)) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "Invalid input! Please enter a number.\n";
            continue;
        }
        cin.ignore(10000, '\n');

        switch (choice) {
            case 1:
                cout << "Enter Book ID: ";
                if (!(cin >> id)) {
                    cin.clear();
                    cin.ignore(10000, '\n');
                    cout << "Invalid ID.\n";
                    break;
                }
                cin.ignore(10000, '\n');
                cout << "Enter Book Title: ";
                getline(cin, title);
                lib.insert(id, title);
                cout << "Book added successfully.\n";
                break;

            case 2:
                cout << "\n--- Books in sorted order (inorder) ---\n";
                lib.inorder();
                break;

            case 3:
                cout << "Enter Book ID to search: ";
                if (!(cin >> id)) {
                    cin.clear();
                    cin.ignore(10000, '\n');
                    cout << "Invalid ID.\n";
                    break;
                }
                cin.ignore(10000, '\n');
                if (lib.search(id) != nullptr)
                    cout << "Book found: " << lib.search(id)->title << "\n";
                else
                    cout << "Book not found.\n";
                break;

            case 4:
                cout << "Enter Book Title to search: ";
                getline(cin, title);
                if (lib.searchByTitle(title) != nullptr)
                    cout << "Book found: ID " << lib.searchByTitle(title)->bookId << "\n";
                else
                    cout << "Book not found.\n";
                break;

            case 5:
                cout << "Exiting...\n";
                break;

            default:
                cout << "Invalid choice. Try again.\n";
        }
    } while (choice != 5);

    return 0;
}