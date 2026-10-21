#include <iostream>
#include <string>
using namespace std;

struct Coach {
    int coachNumber;
    string coachType;   // AC / Sleeper / General
    Coach* prev;
    Coach* next;
    Coach(int n, string t) : coachNumber(n), coachType(t), prev(nullptr), next(nullptr) {}
};

class Train {
    Coach* head;   // engine side
    Coach* tail;   // last coach
public:
    Train() : head(nullptr), tail(nullptr) {}

    void addFront(int n, string t) {
        Coach* c = new Coach(n, t);
        if (!head) { head = tail = c; }
        else { c->next = head; head->prev = c; head = c; }
        cout << "Added coach " << n << " (" << t << ") at FRONT.\n";
    }

    void addRear(int n, string t) {
        Coach* c = new Coach(n, t);
        if (!tail) { head = tail = c; }
        else { c->prev = tail; tail->next = c; tail = c; }
        cout << "Added coach " << n << " (" << t << ") at REAR.\n";
    }

    void addAt(int pos, int n, string t) {
        if (pos <= 1) { addFront(n, t); return; }
        Coach* cur = head;
        for (int i = 1; cur && i < pos - 1; i++) cur = cur->next;
        if (!cur || !cur->next) { addRear(n, t); return; }
        Coach* c = new Coach(n, t);
        c->next = cur->next; c->prev = cur;
        cur->next->prev = c; cur->next = c;
        cout << "Added coach " << n << " (" << t << ") at position " << pos << ".\n";
    }

    void removeCoach(int n) {
        Coach* cur = head;
        while (cur && cur->coachNumber != n) cur = cur->next;
        if (!cur) { cout << "Coach " << n << " not found.\n"; return; }
        if (cur == head) {
            head = cur->next;
            if (head) head->prev = nullptr;
            else tail = nullptr;
        } else if (cur == tail) {
            tail = cur->prev;
            tail->next = nullptr;
        } else {
            cur->prev->next = cur->next;
            cur->next->prev = cur->prev;
        }
        delete cur;
        cout << "Removed coach " << n << ".\n";
    }

    void search(int n) {
        Coach* cur = head;
        while (cur && cur->coachNumber != n) cur = cur->next;
        if (cur) cout << "Coach " << n << " FOUND. Type: " << cur->coachType << "\n";
        else cout << "Coach " << n << " NOT found.\n";
    }

    void displayForward() {
        cout << "Engine -> ";
        if (!head) { cout << "(empty)\n"; return; }
        Coach* cur = head;
        while (cur) {
            cout << "[" << cur->coachNumber << ":" << cur->coachType << "]";
            if (cur->next) cout << " -> ";
            cur = cur->next;
        }
        cout << " -> Last Coach\n";
    }

    void displayBackward() {
        cout << "Last Coach -> ";
        if (!tail) { cout << "(empty)\n"; return; }
        Coach* cur = tail;
        while (cur) {
            cout << "[" << cur->coachNumber << ":" << cur->coachType << "]";
            if (cur->prev) cout << " -> ";
            cur = cur->prev;
        }
        cout << " -> Engine\n";
    }
};

int main() {
    Train t;

    cout << "=== ADD COACHES ===\n";
    t.addRear(101, "AC");
    t.addRear(102, "Sleeper");
    t.addRear(103, "General");
    t.addFront(100, "AC");
    t.addAt(3, 105, "Sleeper");

    cout << "\n=== DISPLAY (Engine to Last) ===\n";
    t.displayForward();

    cout << "\n=== DISPLAY (Last to Engine) ===\n";
    t.displayBackward();

    cout << "\n=== SEARCH ===\n";
    t.search(102);
    t.search(999);

    cout << "\n=== REMOVE ===\n";
    t.removeCoach(105);
    t.removeCoach(100);
    t.removeCoach(999);

    cout << "\n=== FINAL DISPLAY ===\n";
    t.displayForward();
    return 0;
}