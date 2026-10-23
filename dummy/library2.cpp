#include <iostream>
#include <string>
using namespace std;

// Node structure
struct Patient {
    int id;
    string name;
    int age;
    string illness;
    Patient *next;
};

Patient *head = nullptr;

// 1. Register a new patient (insert at end of queue)
void registerPatient() {
    Patient *newNode = new Patient;
    cout << "Enter Patient ID: ";
    cin >> newNode->id;
    cin.ignore();
    cout << "Enter Patient Name: ";
    getline(cin, newNode->name);
    cout << "Enter Age: ";
    cin >> newNode->age;
    cin.ignore();
    cout << "Enter Illness: ";
    getline(cin, newNode->illness);
    newNode->next = nullptr;

    if (head == nullptr) {
        head = newNode;
    } else {
        Patient *temp = head;
        while (temp->next != nullptr)
            temp = temp->next;
        temp->next = newNode;
    }
    cout << "\nPatient registered successfully!\n";
}

// 2. Remove a patient after consultation (remove from front)
void removePatient() {
    if (head == nullptr) {
        cout << "\nQueue is empty. No patient to remove.\n";
        return;
    }
    Patient *temp = head;
    head = head->next;
    cout << "\nPatient " << temp->name << " (ID: " << temp->id << ") consulted and removed.\n";
    delete temp;
}

// 3. Display all patients in the queue
void displayPatients() {
    if (head == nullptr) {
        cout << "\nQueue is empty.\n";
        return;
    }
    Patient *temp = head;
    cout << "\n--- Patients in Queue ---\n";
    while (temp != nullptr) {
        cout << "ID: " << temp->id
             << " | Name: " << temp->name
             << " | Age: " << temp->age
             << " | Illness: " << temp->illness << endl;
        temp = temp->next;
    }
}

// 4. Search for a patient using Patient ID
void searchPatient() {
    if (head == nullptr) {
        cout << "\nQueue is empty.\n";
        return;
    }
    int id;
    cout << "Enter Patient ID to search: ";
    cin >> id;

    Patient *temp = head;
    while (temp != nullptr) {
        if (temp->id == id) {
            cout << "\nPatient Found!\n";
            cout << "ID: " << temp->id << "\nName: " << temp->name
                 << "\nAge: " << temp->age << "\nIllness: " << temp->illness << endl;
            return;
        }
        temp = temp->next;
    }
    cout << "\nPatient with ID " << id << " not found.\n";
}

int main() {
    int choice;
    while (true) {
        cout << "\n===== Patient Management System =====\n";
        cout << "1. Register a new patient\n";
        cout << "2. Remove a patient after consultation\n";
        cout << "3. Display all patients in the queue\n";
        cout << "4. Search for a patient using Patient ID\n";
        cout << "5. Exit\n";
        cout << "Enter your choice: ";
        cin >> choice;

        switch (choice) {
            case 1: registerPatient(); break;
            case 2: removePatient(); break;
            case 3: displayPatients(); break;
            case 4: searchPatient(); break;
            case 5: cout << "\nExiting...\n"; return 0;
            default: cout << "\nInvalid choice! Try again.\n";
        }
    }
    return 0;
}