#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;

    vector<int> nums = {5, 2, 9, 1, 7};
    sort(nums.begin(), nums.end());
    cout << "Sorted: ";
    for (int n : nums) cout << n << " ";
    cout << endl;
    return 0;
}
