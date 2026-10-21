#include <iostream>
using namespace std;

class Node {
public:
    string username;
    Node* next;

    Node(string name) {
        username = name;
        next = NULL;
    }
};

class Stack {
public:
    Node* top;

    Stack() {
        top = NULL;
    }

    void login(string name) {
        Node* newNode = new Node(name);
        newNode->next = top;
        top = newNode;
        cout << name << " logged in successfully.\n";
    }

    void logout() {
        if (top == NULL) {
            cout << "No active session.\n";
            return;
        }
        Node* temp = top;
        cout << top->username << " logged out.\n";
        top = top->next;
        delete temp;
    }

    void activeUser() {
        if (top == NULL) {
            cout << "No active user.\n";
        } else {
            cout << "Currently active user: " << top->username << endl;
        }
    }

    void checkSession() {
        if (top == NULL) {
            cout << "No active sessions.\n";
        } else {
            cout << "Active sessions exist.\n";
        }
    }
};

int main() {
    Stack s;
    int choice;
    string name;

    do {
        cout << "\n--- Login Session Manager ---\n";
        cout << "1. Login\n";
        cout << "2. Logout\n";
        cout << "3. Display Active User\n";
        cout << "4. Check Active Sessions\n";
        cout << "5. Exit\n";
        cout << "Enter your choice: ";
        cin >> choice;

        switch(choice) {
            case 1:
                cout << "Enter username: ";
                cin >> name;
                s.login(name);
                break;
            case 2:
                s.logout();
                break;
            case 3:
                s.activeUser();
                break;
            case 4:
                s.checkSession();
                break;
            case 5:
                cout << "Exiting...\n";
                break;
            default:
                cout << "Invalid choice.\n";
        }
    } while(choice != 5);

    return 0;
}