let db;

const request = indexedDB.open('budget_tracker', 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
    // save a reference to the database 
    const db = event.target.result;
    db.createObjectStore('new_balance', {
        autoIncrement: true
    });
};
// upon a successful 
request.onsuccess = function (event) {
    // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
    db = event.target.result;

    // check if app is online, 
    if (navigator.onLine) {
        uploadBalance();
    }
};

request.onerror = function (event) {
    // log error here
    console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new balance and there's no internet connection
function saveRecord(record) {
    // open a new transaction with the database with read and write permissions 
    const transaction = db.transaction(['new_balance'], 'readwrite');

    // access the object store for `new_balance`
    const balanceObjectStore = transaction.objectStore('new_balance');

    // add record to your store with add method
    balanceObjectStore.add(record);

    alert('It seems that you aren\'t connected to the internet. Your new transaction will be saved and uploaded when the this device is connected to the internet again');
}

function uploadBalance() {
    // open a transaction on your db
    const transaction = db.transaction(['new_balance'], 'readwrite');

    // access your object store
    const balanceObjectStore = transaction.objectStore('new_balance');

    // get all records from store and set to a variable
    const getAll = balanceObjectStore.getAll();

    // upon a successful .getAll() execution, run this function
    getAll.onsuccess = function () {
        // if there was data in indexedDb's store, let's send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(serverResponse => {
                if (serverResponse.message) {
                    throw new Error(serverResponse);
                }
                // open one more transaction
                const transaction = db.transaction(['new_balance'], 'readwrite');
                // access the new_balance object store
                const balanceObjectStore = transaction.objectStore('new_balance');
                // clear all items in your store
                balanceObjectStore.clear();

                alert('All saved transactions has been submitted!');
            })
            .catch(err => {
                console.log(err);
            });
        }
    };
}

// listen for app coming back online
window.addEventListener('online', uploadBalance);