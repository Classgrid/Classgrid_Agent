#include <iostream>
using namespace std;

class Node {
public:
    int coeff;
    int exp;
    Node* next;

    Node(int c, int e) {
        coeff = c;
        exp = e;
        next = NULL;
    }
};

class Polynomial {
public:
    Node* head;

    Polynomial() {
        head = NULL;
    }

    void insertTerm(int coeff, int exp) {
        Node* newNode = new Node(coeff, exp);
        if (head == NULL) {
            head = newNode;
            return;
        }
        Node* temp = head;
        while (temp->next != NULL) {
            temp = temp->next;
        }
        temp->next = newNode;
    }

    void display() {
        Node* temp = head;
        if (temp == NULL) {
            cout << "0\n";
            return;
        }
        while (temp != NULL) {
            if (temp != head && temp->coeff > 0) {
                cout << " + ";
            }
            cout << temp->coeff << "x^" << temp->exp;
            temp = temp->next;
        }
        cout << endl;
    }

    Polynomial add(Polynomial p2) {
        Polynomial result;
        Node* p1 = head;
        Node* q2 = p2.head;

        while (p1 != NULL && q2 != NULL) {
            if (p1->exp == q2->exp) {
                result.insertTerm(p1->coeff + q2->coeff, p1->exp);
                p1 = p1->next;
                q2 = q2->next;
            } else if (p1->exp > q2->exp) {
                result.insertTerm(p1->coeff, p1->exp);
                p1 = p1->next;
            } else {
                result.insertTerm(q2->coeff, q2->exp);
                q2 = q2->next;
            }
        }

        while (p1 != NULL) {
            result.insertTerm(p1->coeff, p1->exp);
            p1 = p1->next;
        }

        while (q2 != NULL) {
            result.insertTerm(q2->coeff, q2->exp);
            q2 = q2->next;
        }

        return result;
    }
};

int main() {
    Polynomial p1, p2;
    int terms, coeff, exp;

    cout << "Enter number of terms in Polynomial 1: ";
    cin >> terms;
    for (int i = 0; i < terms; i++) {
        cout << "Enter coefficient and exponent: ";
        cin >> coeff >> exp;
        p1.insertTerm(coeff, exp);
    }

    cout << "Enter number of terms in Polynomial 2: ";
    cin >> terms;
    for (int i = 0; i < terms; i++) {
        cout << "Enter coefficient and exponent: ";
        cin >> coeff >> exp;
        p2.insertTerm(coeff, exp);
    }

    cout << "\nPolynomial 1: ";
    p1.display();
    cout << "Polynomial 2: ";
    p2.display();

    Polynomial sum = p1.add(p2);
    cout << "Sum: ";
    sum.display();

    return 0;
}