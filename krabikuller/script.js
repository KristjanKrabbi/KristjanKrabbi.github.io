// Import Firebase'i andmebaasi
import { database } from './firebase.js';
import { ref, push, set, get } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

(function(){
    emailjs.init({
      publicKey: "-gdcP4QMdCn-ac1Pi",
    });
 })();
 document.getElementById('menu__button').addEventListener("click", function (event) {
    document.getElementById('main_menu').classList.toggle('active') 

    document.getElementById('loginPanel').classList.toggle('active') 
    console.log("tore");
})   
// Tellimuse salvestamine
document.getElementById('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const order = document.getElementById('order').value.trim();

    if (name && order) {
        const ordersRef = ref(database, 'orders');
        const newOrderRef = push(ordersRef);

        // Lisa ajatempel
        const timestamp = new Date().toISOString();

        // Salvesta tellimus andmebaasi
        set(newOrderRef, { name, order, timestamp })
            .then(() => {
                console.log("Tellimus salvestatud!");
                const wantsToPay = confirm("Kas soovid maksta kohe?");
                if (wantsToPay) {
                    window.location.href = "https://www.swedbank.ee/pay?id=ul9ghn42vs";
                }
                // Lisa toidunimi eraldi nimekirja
                const foodNamesRef = ref(database, 'foodNames');
                get(foodNamesRef).then((snapshot) => {
                    const existingFoodNames = snapshot.exists() ? snapshot.val() : {};

                    // Kontrolli, kas toit on juba olemas
                    if (!Object.values(existingFoodNames).includes(order)) {
                        const newFoodRef = push(foodNamesRef);
                        set(newFoodRef, order).then(() => {
                            console.log("Toidunimi lisatud eraldi nimekirja.");
                            loadFoodSuggestions(); // Uuenda soovitusi
                        });
                    }
                }).catch((error) => {
                    console.error("Viga toidunime lisamisel:", error);
                });

                loadTodayOrders(); // Laadib uuesti tellimused
                 document.getElementById('name').value="";
     document.getElementById('order').value="";
            })
            .catch((error) => console.error("Salvestusviga:", error));
    }
});

document.getElementById('refreshOrdrers').addEventListener('click', function (e) {
    loadTodayOrders()
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
                const time = new Date(order.timestamp).toLocaleString(); // Inimloetav kuupäev ja kellaaeg
                listItem.textContent = `${order.name}: ${order.order} (${time})`;
                ordersList.appendChild(listItem);
            }
        } else {
            console.log("Tellimusi pole.");
        }
    });
}
function loadTodayOrders() {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const orders = snapshot.val();
            const ordersList = document.getElementById('ordersList');
            ordersList.innerHTML = ''; // Puhasta olemasolev nimekiri

            // Praegune kuupäev formaadis YYYY-MM-DD
            const today = new Date().toISOString().split('T')[0];

            // Läbi tellimused ja lisa ainult tänased
            for (const key in orders) {
                const order = orders[key];
                const orderDate = new Date(order.timestamp).toISOString().split('T')[0];
                if (orderDate === today) {
                    const listItem = document.createElement('li');
                    const time = new Date(order.timestamp).toLocaleTimeString(); // Ainult kellaaeg
                    listItem.textContent = `${order.name}: ${order.order} (${time})`;
                    ordersList.appendChild(listItem);
                }
            }
        } else {
            console.log("Tellimusi pole.");
        }
    });
}

function loadFoodSuggestions() {
    const foodNamesRef = ref(database, 'foodNames');
    get(foodNamesRef).then((snapshot) => {
        if (snapshot.exists()) {
            const foodNames = snapshot.val();

            // Lisa toidunimed <datalist> elementi
            const suggestionsList = document.getElementById('foodSuggestions');
            suggestionsList.innerHTML = ''; // Puhasta olemasolevad soovitused
            Object.values(foodNames).forEach(food => {
                const option = document.createElement('option');
                option.value = food; // Toidunimi
                suggestionsList.appendChild(option);
            });
        }
    }).catch((error) => {
        console.error("Viga toidusoovituste laadimisel:", error);
    });
}

// Kutsu funktsiooni lehe laadimisel
window.onload = () => {
    loadTodayOrders(); // Laadib tellimuste nimekirja
    loadFoodSuggestions(); // Laadib toidusoovitused
};

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
            
            //const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });

            const today = new Date().toLocaleDateString();
            let ordersText = `Toidutellimused (${today}):\n\n`;

            for (const key in orders) {
                const order = orders[key];
                ordersText += `${order.name}: ${order.order}\n`;
            }
            const blob = new Blob([ordersText], { type: 'text/csv' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tellimused_${new Date().toISOString().slice(0, 10)}.txt`;
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
document.getElementById('clearByDate').addEventListener('click', () => {
    const targetDate = prompt("Sisesta kuupäev (YYYY-MM-DD), mida soovid kustutada:");

    if (targetDate) {
        const ordersRef = ref(database, 'orders');
        get(ordersRef).then((snapshot) => {
            if (snapshot.exists()) {
                const orders = snapshot.val();

                // Filtreeri tellimused kuupäeva alusel
                const filteredOrders = Object.keys(orders).reduce((result, key) => {
                    const order = orders[key];

                    // Kontrolli ja teisenda kuupäev
                    const orderDate = order.timestamp && !isNaN(new Date(order.timestamp))
                        ? new Date(order.timestamp).toISOString().split('T')[0]
                        : null;

                    // Kui kuupäev ei vasta, jäta tellimus alles
                    if (orderDate !== targetDate) {
                        result[key] = order;
                    }
                    return result;
                }, {});

                // Salvesta uuesti andmebaasi
                set(ordersRef, filteredOrders)
                    .then(() => {
                        alert(`Kustutatud tellimused kuupäevalt: ${targetDate}`);
                        loadOrders();
                    })
                    .catch((error) => console.error("Kustutamisviga:", error));
            } else {
                alert("Pole midagi kustutada.");
            }
        });
    }
});



document.getElementById('sendEmail').addEventListener('click', () => {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const orders = snapshot.val();

            // Muudame tellimused loeteluks
            const today = new Date().toLocaleDateString();
            let ordersText = `Toidutellimused (${today}):\n\n`;

            for (const key in orders) {
                const order = orders[key];
                const time = new Date(order.timestamp).toLocaleString(); // Inimloetav kuupäev ja kellaaeg
                ordersText += `${order.name}: ${order.order} (${time})\n`;
            }

            // Saada EmailJS-iga
            emailjs.send("service_unpiobp", "template_bgww7mf", {
                message: ordersText,
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
});

// Laadi tellimused esmakordselt
//window.onload = loadTodayOrders;
