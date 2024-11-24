// Import Firebase'i andmebaasi
import { database } from './firebase.js';
import { ref, push, set, get } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

(function(){
    emailjs.init({
      publicKey: "-gdcP4QMdCn-ac1Pi",
    });
 })();

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
                alert("Tellimus salvestatud!")
                console.log("Tellimus salvestatud!");
                // loadOrders(); // Laadi tellimused uuesti
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
const adminPassword = "salajane123"; // Siin saad määrata parooli

document.getElementById('loginButton').addEventListener('click', () => {
    const inputPassword = document.getElementById('adminPassword').value;
    if (inputPassword === adminPassword) {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('loginPanel').style.display = 'none';
        loadOrders(); // Laadi tellimused uuesti
    } else {
        alert('Vale parool!');
    }
});
document.getElementById('downloadOrders').addEventListener('click', () => {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const orders = snapshot.val();
            const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tellimused_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert('Pole midagi alla laadida!');
        }
    }).catch((error) => {
        console.error('Allalaadimisviga:', error);
    });
});
document.getElementById('clearOrders').addEventListener('click', () => {
    const confirmDelete = confirm('Kas oled kindel, et soovid kõik tellimused kustutada?');
    if (confirmDelete) {
        const ordersRef = ref(database, 'orders');
        set(ordersRef, null).then(() => {
            alert('Kõik tellimused kustutatud!');
            loadOrders(); // Uuenda kuvamist
        }).catch((error) => {
            console.error('Kustutamisviga:', error);
        });
    }
});
/* document.getElementById('sendEmail').addEventListener('click', () => {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const orders = snapshot.val();
            const ordersJson = JSON.stringify(orders, null, 2);

            // Saada EmailJS-iga
            emailjs.send("service_unpiobp", "template_fmi1tti", {
                message: ordersJson,
                to_email: "krabypoiss@hotmail.com" // Saaja e-post
            }).then(() => {
                alert("E-post saadetud!");
            }).catch((error) => {
                console.error("Viga e-posti saatmisel:", error);
            });
        } else {
            alert('Pole midagi saata!');
        }
    });
}); */
document.getElementById('sendEmail').addEventListener('click', () => {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const orders = snapshot.val();
            
            // Vorminda tellimused tabeliks
            let message = '<table border="1" style="border-collapse: collapse; width: 100%;">';
            message += '<tr><th>Nimi</th><th>Tellimus</th></tr>';
            for (const key in orders) {
                message += `<tr><td>${orders[key].name}</td><td>${orders[key].order}</td></tr>`;
            }
            message += '</table>';

            // Saada EmailJS-iga
            emailjs.send("service_unpiobp", "template_fmi1tti", {
                message: message,
                to_email: "krabypoiss@hotmail.com"
            }).then(() => {
                alert("E-post saadetud!");
            }).catch((error) => {
                console.error("Viga e-posti saatmisel:", error);
            });
        } else {
            alert('Pole midagi saata!');
        }
    });
});

// Laadi tellimused esmakordselt
//window.onload = loadOrders;
