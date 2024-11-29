// Import Firebase'i andmebaasi
import { database } from '../krabikuller/firebase.js';
import { ref, push, set, get } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
let chart = null; // Globaalse muutuja lisamine
async function fetchElectricityPrices() {
    const now = new Date();
    const start = new Date(now.setMinutes(0, 0, 0));  // Alustame praegusest tunni algusest
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);  // Lõpeta 24 tunni pärast

    const API_URL = `https://dashboard.elering.ee/api/nps/price?start=${start.toISOString()}&end=${end.toISOString()}`;
    // const API_URL =`http://localhost:3000/proxy?start=${start.toISOString()}&end=${end.toISOString()}`
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.success) {
            const priceData = data.data.ee;

            const labels = [];
            const prices = [];

            priceData.forEach(hourData => {
                const timestamp = hourData.timestamp * 1000;  // Muuda timestamp millisekunditeks
                const date = new Date(timestamp);
                labels.push(date.getHours() + ':00');  // Lisa tunni nimi (nt "13:00")
                prices.push(hourData.price * 0.122).toFixed(2);  // Lisa hind
            });
            document.getElementById('currentPrice').textContent = prices[0].toFixed(2);
            document.getElementById('nextHourPrice').textContent = prices[1].toFixed(2);
            // Joonista graafik
            drawChart(labels, prices);
        } else {
            console.error('API vastus ei olnud edukas');
        }
    } catch (error) {
        console.error('Päringu viga:', error);
    }
}

async function loadUserPreferences() {
    try {
        // Hangi kasutaja IP-aadress
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        const userIp = ipData.ip.replaceAll(".", "_");

        // Firebase'i viide kasutaja IP-aadressiga
        const userRef = ref(database, `userPreferences/${userIp}`);

        // Lae andmed Firebase'ist
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();

            // Kuvame andmed lehel
            document.getElementById('priceThreshold').value = userData.threshold; // Sisendväli
            document.getElementById('belowThreshold').textContent = userData.belowThreshold; // Esimene hind alla künnise
            console.log("Andmed laaditud:", userData);
        } else {
            console.log("Andmeid ei leitud selle IP-aadressiga.");
        }
    } catch (error) {
        console.error("Andmete laadimine ebaõnnestus:", error);
    }
}
window.addEventListener('load', loadUserPreferences);
function drawChart(labels, prices) {
    const minPrice = Math.min(...prices);  // Leia madalaim hind
    const minIndex = prices.indexOf(minPrice);  // Leia madalaima hinna indeks
     // Leia järgmine madalaim hind
     let nextMinPrice = Number.MAX_VALUE;
     let nextMinIndex = -1;

     prices.forEach((price, index) => {
        if (prices[0]!==minPrice  && price < nextMinPrice) {
            // Kontrollime, et hind ei ole sama, mis minPrice ja on väiksem kui järgmine madalaim hind
            nextMinPrice = price;
            nextMinIndex = index;
        }
    });
    document.getElementById('priceThreshold').addEventListener('change', async () => {
        console.log(parseFloat(document.getElementById('priceThreshold').value))
    //})
    //document.getElementById('checkThreshold').addEventListener('click', async () => {
        const threshold = parseFloat(document.getElementById('priceThreshold').value);
    
        if (isNaN(threshold)) {
            alert("Palun sisesta kehtiv number!");
            return;
        }
    
        // Leia hind alla määratud künnise
        let belowThreshold = "Pole saadaval";
        let belowThresholdIndex = -1;
    
        prices.forEach((price, index) => {
            if (belowThresholdIndex === -1 && price < threshold) {
                belowThreshold = `${labels[index]} (${price.toFixed(2)} senti/KWh)`;
                belowThresholdIndex = index;
            }
        });
    
        document.getElementById('belowThreshold').textContent = belowThreshold;
    
        // Hangi kasutaja IP-aadress
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        //const userIp = ipData.ip;
        const userIp = ipData.ip.replaceAll(".", "_");
        // Salvestamine Firebase’i
        const entry = {
            ip: userIp,
            threshold: threshold,
            belowThreshold: belowThreshold,
            timestamp: new Date().toISOString()
        };
        console.log((userIp))
        const userRef = ref(database, `userPreferences/${userIp}`);
        console.log(toString(userRef))
        set(userRef, {
            ip: userIp,
            threshold: threshold,
            belowThreshold: belowThreshold,
            timestamp: new Date().toISOString()
        }).then(() => {
            console.log("Andmed salvestatud Firebase’i!");
        }).catch((error) => {
            console.error("Andmete salvestamine ebaõnnestus:", error);
        });

        //const newUserRef = push(userRef);
        //set(newUserRef, { entry })
        /* database.ref('userPreferences').push(entry, (error) => {
            if (error) {
                console.error("Andmete salvestamine ebaõnnestus:", error);
            } else {
                console.log("Andmed salvestatud Firebase’i:", entry);
            }
        }); */
    });
    
    const backgroundColors = prices.map((price, index) => {
        if (index === minIndex) return 'green'; // Kõige madalam hind
        if (index === nextMinIndex) return 'orange'; // Järgmine madalaim hind
        return 'rgba(75, 192, 192, 0.2)'; // Muud tulbad
    });
    /* const backgroundColors = prices.map((price, index) => {
        return index === minIndex ? 'green' : 'rgba(75, 192, 192, 0.2)';  // Muuda madalaima hinna tulba värv 
    }); */
    const borderColors = prices.map((price, index) => {
        if (index === minIndex) return 'darkgreen';
        if (index === nextMinIndex) return 'darkorange';
        return 'rgba(75, 192, 192, 1)';
    });
   /*  const borderColors = prices.map((price, index) => {
        return index === minIndex ? 'darkgreen' : 'rgba(75, 192, 192, 1)';  // Muuda madalaima hinna tulba äärise värv
    }); */
    // Kuvame järgmise madalaima hinna kellaaja
    const nextLowestTime = labels[nextMinIndex];
    document.getElementById('nextLowestTime').textContent = nextLowestTime +" hind: "+nextMinPrice.toFixed(2) +" senti/KWh" || "Pole saadaval";
    if (chart) {
        chart.destroy();
    }
    
    const ctx = document.getElementById('priceChart').getContext('2d');
    chart=new Chart(ctx, {
        type: 'bar',  // Kasuta joongraafikut 'line'
        data: {
            labels: labels,
            datasets: [{
                display: true,
                label: '',
                align: 'center',
                data: prices,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                backgroundColor: backgroundColors,  // Rakenda kohandatud taustavärvid
                borderColor: borderColors,  // Rakenda kohandatud äärisevärvid
                borderWidth: 2,
                stepped: true,  // Määrab astmelise joonistamise
                pointBackgroundColor: function (context) {
                    return context.dataIndex === minIndex ? 'red' : 'rgba(75, 192, 192, 1)';
                },
                pointRadius: function (context) {
                    return context.dataIndex === minIndex ? 6 : 3;
                },
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Tunnid'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hind senti/KWh'
                    }
                }
            },
            plugins: {
                tooltip: {
                    usePointStyle: true,
                    // Eemaldame värvilise ruudu
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            const label = context.dataset.label || '';
                            const value = context.raw;
                            return context.dataIndex === minIndex

                                ? `${label} ${value.toFixed(2)} s/KWh (madalaim)`
                                : `${label} ${value.toFixed(2)} s/KWh`;
                            }
                            
                        }
                        
                        
                        

                    }
                    
                    
                    
                }
            }
        });
}
document.getElementById('refresh').addEventListener('click', function (e) {


    fetchElectricityPrices();
});


fetchElectricityPrices();  // Lae hinnad ja joonista graafik
