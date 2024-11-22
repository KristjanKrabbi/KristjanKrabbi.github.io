//import { getDatabase, ref, set, get, child, push } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPPfEB46a1d_gxWknguGbbiGNNODjflhA",
  authDomain: "krabikuller.firebaseapp.com",
  databaseURL: "https://krabikuller-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "krabikuller",
  storageBucket: "krabikuller.firebasestorage.app",
  messagingSenderId: "124331997863",
  appId: "1:124331997863:web:1a025488223010e08ef982",
  measurementId: "G-MT2PJRBTRZ"
};

// Initialize Firebase
const app =firebase. initializeApp(firebaseConfig);
const analytics =firebase. getAnalytics(app);
document.addEventListener('DOMContentLoaded', function () {
 /*    const ordersList = document.getElementById('ordersList');
    const dbRef =  firebase.database().ref('orders'); // Firebase'i andmebaasi viide

    // Lae olemasolevad tellimused
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        displayOrders(data);
    }); */
    const database = getDatabase(app); // Seome Firebase-i andmebaasi

// Funktsioon tellimuse salvestamiseks
function saveOrder(name, order) {
    const ordersRef = ref(database, 'orders'); // Andmebaasi viide tellimuste kohta
    const newOrderRef = push(ordersRef); // Loome uue tellimuse
    set(newOrderRef, {
        name: name,
        order: order
    });
}
const ordersList = document.getElementById('ordersList'); // Nimekiri tellimustest

// Funktsioon, mis kuvab tellimused veebilehel
function displayOrders(orders) {
    ordersList.innerHTML = ''; // Puhastame olemasoleva nimekirja
    for (const key in orders) {
        const order = orders[key];
        const listItem = document.createElement('li');
        listItem.textContent = `${order.name}: ${order.order}`;
        ordersList.appendChild(listItem);
    }
}

// Funktsioon, et laadida tellimused Firebase'ist ja kuvada need
function loadOrders() {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            displayOrders(data);
        } else {
            console.log("Ei leitud tellimusi");
        }
    }).catch((error) => {
        console.error(error);
    });
}

// Laadige tellimused iga kord, kui leht laeb
window.onload = loadOrders;


    /* document.getElementById('orderForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const order = document.getElementById('order').value.trim();

        if (name && order) {
            // Salvesta tellimus Firebase'i
            const newOrder = { name, order };
            dbRef.push(newOrder);

            // Tühjenda sisestusväljad
            document.getElementById('name').value = '';
            document.getElementById('order').value = '';
        } else {
            alert('Palun täida kõik väljad!');
        }
    }); */
    document.getElementById('orderForm').addEventListener('submit', function (e) {
        e.preventDefault(); // Takistame vormi vaikimisi käitumist
    
        const name = document.getElementById('name').value.trim();
        const order = document.getElementById('order').value.trim();
    
        if (name && order) {
            // Salvestame tellimuse Firebase'i
            saveOrder(name, order);
    
            // Tühjendame vormi
            document.getElementById('name').value = '';
            document.getElementById('order').value = '';
            loadOrders(); // Laadige uuesti tellimused
        } else {
            alert('Palun täida kõik väljad!');
        }
    });
    

    function displayOrders(orders) {
        ordersList.innerHTML = ''; // Puhasta nimekiri
        for (const key in orders) {
            const order = orders[key];
            const listItem = document.createElement('li');
            listItem.textContent = `${order.name}: ${order.order}`;
            ordersList.appendChild(listItem);
        }
    }
});
