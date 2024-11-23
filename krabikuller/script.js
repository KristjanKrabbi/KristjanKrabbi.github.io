// Import Firebase'i andmebaasi
import { database } from './firebase.js';
import { ref, push, set, get } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// Tellimuse salvestamine
document.getElementById('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const order = document.getElementById('order').value.trim();

    if (name && order) {
        const ordersRef = ref(database, 'orders');
        const newOrderRef = push(ordersRef);
        set(newOrderRef, { name: name, order: order })
            .then(() => {
                console.log("Tellimus salvestatud!");
                loadOrders(); // Laadi tellimused uuesti
            })
            .catch((error) => console.error("Salvestusviga:", error));
    }
});

// Tellimuste laadimine ja kuvamine
function loadOrders() {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const orders = snapshot.val();
            const ordersList = document.getElementById('ordersList');
            ordersList.innerHTML = ''; // Puhasta olemasolev nimekiri
            for (const key in orders) {
                const order = orders[key];
                const listItem = document.createElement('li');
                listItem.textContent = `${order.name}: ${order.order}`;
                ordersList.appendChild(listItem);
            }
        } else {
            console.log("Tellimusi pole.");
        }
    });
}

// Laadi tellimused esmakordselt
window.onload = loadOrders;
