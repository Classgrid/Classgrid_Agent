#include <iostream>
#include <string>
#include <cmath>
using namespace std;

class Node {
public:
    char data;
    Node* next;
    Node(char value) {
        data = value;
        next = NULL;
    }
};

class Stack {
public:
    Node* top;
    Stack() {
        top = NULL;
    }

    void push(char x) {
        Node* temp = new Node(x);
        temp->next = top;
        top = temp;
    }

    char pop() {
        if (top == NULL) {
            return '\0';
        }
        Node* temp = top;
        char x = top->data;
        top = top->next;
        delete temp;
        return x;
    }

    char peek() {
        if (top == NULL) {
            return '\0';
        }
        return top->data;
    }

    bool isEmpty() {
        return top == NULL;
    }
};

int precedence(char op) {
    if (op == '^') return 3;
    if (op == '*' || op == '/') return 2;
    if (op == '+' || op == '-') return 1;
    return 0;
}

bool isOperator(char c) {
    return (c == '+' || c == '-' || c == '*' || c == '/' || c == '^');
}

string infixToPostfix(string infix) {
    Stack s;
    string postfix = "";
    for (int i = 0; i < infix.length(); i++) {
        char c = infix[i];
        if (isalnum(c)) {
            postfix += c;
        } else if (c == '(') {
            s.push(c);
        } else if (c == ')') {
            while (!s.isEmpty() && s.peek() != '(') {
                postfix += s.pop();
            }
            s.pop();
        } else if (isOperator(c)) {
            while (!s.isEmpty() && precedence(s.peek()) >= precedence(c)) {
                postfix += s.pop();
            }
            s.push(c);
        }
    }
    while (!s.isEmpty()) {
        postfix += s.pop();
    }
    return postfix;
}

string infixToPrefix(string infix) {
    string reversed = "";
    for (int i = infix.length() - 1; i >= 0; i--) {
        if (infix[i] == '(') reversed += ')';
        else if (infix[i] == ')') reversed += '(';
        else reversed += infix[i];
    }
    string postfix = infixToPostfix(reversed);
    string prefix = "";
    for (int i = postfix.length() - 1; i >= 0; i--) {
        prefix += postfix[i];
    }
    return prefix;
}

int evaluatePostfix(string postfix) {
    Stack s;
    for (int i = 0; i < postfix.length(); i++) {
        char c = postfix[i];
        if (isdigit(c)) {
            s.push(c - '0');
        } else if (isOperator(c)) {
            int b = s.pop();
            int a = s.pop();
            int result;
            switch (c) {
                case '+': result = a + b; break;
                case '-': result = a - b; break;
                case '*': result = a * b; break;
                case '/': result = a / b; break;
                case '^': result = pow(a, b); break;
            }
            s.push(result + '0');
        }
    }
    return s.pop() - '0';
}

int evaluatePrefix(string prefix) {
    Stack s;
    for (int i = prefix.length() - 1; i >= 0; i--) {
        char c = prefix[i];
        if (isdigit(c)) {
            s.push(c - '0');
        } else if (isOperator(c)) {
            int a = s.pop();
            int b = s.pop();
            int result;
            switch (c) {
                case '+': result = a + b; break;
                case '-': result = a - b; break;
                case '*': result = a * b; break;
                case '/': result = a / b; break;
                case '^': result = pow(a, b); break;
            }
            s.push(result + '0');
        }
    }
    return s.pop() - '0';
}

int main() {
    string infix;
    int choice;

    cout << "Enter an infix expression: ";
    cin >> infix;

    string postfix = infixToPostfix(infix);
    string prefix = infixToPrefix(infix);

    cout << "\nPostfix: " << postfix << endl;
    cout << "Prefix: " << prefix << endl;

    cout << "\nChoose evaluation:\n";
    cout << "1. Evaluate Postfix\n";
    cout << "2. Evaluate Prefix\n";
    cout << "Enter choice: ";
    cin >> choice;

    if (choice == 1) {
        cout << "Postfix result: " << evaluatePostfix(postfix) << endl;
    } else if (choice == 2) {
        cout << "Prefix result: " << evaluatePrefix(prefix) << endl;
    } else {
        cout << "Invalid choice!" << endl;
    }

    return 0;
}