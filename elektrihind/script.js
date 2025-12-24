// Import Firebase'i andmebaasi
import { database } from '../krabikuller/firebase.js';
import { ref, push, set, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
let chart = null; // Globaalse muutuja lisamine
let labels = [];
let prices = [];
let lastHour = new Date().getHours();
document.addEventListener("DOMContentLoaded", function () {
let threshold = parseFloat(document.getElementById('priceThreshold').value);
async function fetchElectricityPrices() {
    console.log('fetchElectricityPrices')
    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = now.toISOString().split('T')[0]; // Praegune kuupäev (YYYY-MM-DD)
    const lastHourRef = ref(database, 'electricityPrices/lastHour');
    //const currentTimestamp = Math.floor(now.getTime() / 1000); // Praegune aeg sekundites
    const currentTimestamp = Math.floor(
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(),now.getMinutes()-14 , 0).getTime() / 1000
        
      );
      console.log("Praegune aeg " ,{currentTimestamp});
    if (labels.length > 0 && prices.length > 0 && currentHour === lastHour) {
        console.log("Andmed mälust:", { labels, prices });
        filterData(currentTimestamp);
        drawChart(labels, prices); // Kasutame mälus olevaid andmeid
        return;
    }
    else if (labels.length > 0 && prices.length > 0 ) {
        console.log("Andmed mälust:", { labels, prices });
        filterData(currentTimestamp);
        drawChart(labels, prices);
    } 

    try {
        // Hangi viimane salvestatud tund Firebase'ist
    const snapshot = await get(lastHourRef);
        if (snapshot.exists()) {
            const lastHourData = snapshot.val();
            const { hour: lastHour, date: lastDate } = lastHourData;

            // Kontrollime, kas tund või kuupäev on muutunud
            if (lastHour === currentHour && lastDate === currentDate) {
                console.log("Tund ja kuupäev pole muutunud. Laen andmed Firebase'ist...");
                const pricesRef = ref(database, 'electricityPrices/current');
                const priceSnapshot = await get(pricesRef);

                if (priceSnapshot.exists()) {
                    const data = priceSnapshot.val();
                    const filteredData = data.data.filter(item => item.timestamp >= currentTimestamp);
                    labels = filteredData.map(item => {
                    //labels = data.data.map(item => {
                        const timestamp = item.timestamp * 1000; // Muudame millisekunditeks
                        //return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const date = new Date(timestamp)
                        //console.log("timestamp "+date.getHours() + ':00')
                        return (date.getHours() +':'+ date.getMinutes());
                    }).slice(0,96);
                    prices = filteredData.map(item => item.price * 0.124).slice(0,96);

                    //prices = data.data.map(item => item.price * 0.122).slice(0,24);
                    //lastHour = currentHour; // Uuendame viimase tunni jälgijat
                    console.log("Andmed Firebase'ist:", { labels, prices });
                    drawChart(labels, prices);
                    return;
                } else {
                    console.error("Firebase'ist ei leitud andmeid.");
                }
            }
        }
    //} catch (error) {
        //console.error("Viga Firebase'i päringus:", error);
    //}

    //const start = new Date(now.setMinutes(0, 0, 0));  // Alustame praegusest tunni algusest
    //const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);  // Lõpeta 24 tunni pärast

    //const API_URL = `https://dashboard.elering.ee/api/nps/price?start=${start.toISOString()}&end=${end.toISOString()}`;

    const API_URL = "https://us-central1-krabikuller.cloudfunctions.net/fetchElectricityPrices";

    const start = new Date(now.setMinutes(0, 0, 0)).toISOString();
    // Järgmise päeva kuupäeva ja südaöö arvutamine
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const end = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Järgmise päeva südaöö
    //const end = new Date(Date.now(now.setMinutes(0, 0, 0)) + 24 * 60 * 60 * 1000).toISOString();
    console.log(`${API_URL}?start=${start}&end=${end}`)
    console.log("start=" + Date.parse(start) + " & " + (new Date(now.setMinutes(0, 0, 0)).toLocaleString()))
    fetch(`${API_URL}?start=${start}&end=${end}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Viga: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })


        .then(async data => {
            console.log(data); // Kasutage andmeid vastavalt vajadusele
            console.log(data.data.ee.length)
            // Salvestame andmed Firebase'i
            await set(lastHourRef, { hour: currentHour, date: currentDate });
            const pricesRef = ref(database, 'electricityPrices/current');
            //await set(pricesRef, { data: data.data.ee });
            const snapshot = await get(pricesRef);

            if (snapshot.exists()) {
                // Olemasolevate andmete käsitlus
                const existingData = snapshot.val();

                // Veendume, et andmed on massiivid
                const existingPrices = Array.isArray(existingData.data) ? existingData.data : [];
                const newPrices = Array.isArray(data.data.ee) ? data.data.ee : [];

                // Kombineerime massiivid ja eemaldame võimalikud duplikaadid
                const combinedData = [...existingPrices, ...newPrices].reduce((unique, item) => {
                    if (!unique.some(entry => entry.timestamp === item.timestamp)) {
                        unique.push(item);
                    }
                    return unique;
                }, []);

                await update(pricesRef, {
                    ...existingData,
                    data: combinedData,
                    end, // Värskenda lõpuaeg
                    
                });
                console.log("Olemasolevat kirjet uuendati Firebase'is!");
            } else {
                // Uute andmete käsitlus
                const newData = {

                    start,
                    lastHour,
                    end,
                    data: Array.isArray(data.data.ee) ? data.data.ee : [],
                    timestamp: new Date().toISOString(),
                };

                await set(pricesRef, newData);
                console.log("Uus kirje lisati Firebase'i!");
            }

            labels = data.data.ee.map(item => {
                const timestamp = item.timestamp * 1000;
                return new Date(timestamp).getHours() + ':'+ date.getMinutes();
              }).slice(0, 96);
          
              prices = data.data.ee.map(item => item.price* 0.124).slice(0, 96);
              console.log("Andmed serverist:", { labels, prices });
              //drawChart(labels, prices);
            /* const priceData = data.data.ee;
            const priceDataLenght=24

            labels = [];
            prices = [];


            priceData.forEach(hourData => {
                const timestamp = hourData.timestamp * 1000;  // Muuda timestamp millisekunditeks
                const date = new Date(timestamp);
                labels.push(date.getHours() + ':00');  // Lisa tunni nimi (nt "13:00")
                prices.push(hourData.price * 0.122).toFixed(2);  // Lisa hind
            }); */
            //document.getElementById('currentPrice').textContent = prices[0].toFixed(2);
            //document.getElementById('nextHourPrice').textContent = prices[1].toFixed(2);
            // Joonista graafik
            drawChart(labels, prices);
            //} else {
            //  console.error('API vastus ei olnud edukas');
            //}
        })
        //.catch(error => console.error("Error:", error));
    } catch (error) {
        console.error("Viga Firebase'i päringus:", error);
    }
}
async function filterData(currentTimestamp) {
    
  const filteredLabels = [];
const filteredPrices = [];
const currentDate = new Date(currentTimestamp * 1000);

for (let i = 0; i < labels.length; i++) {
    
const [hours, minutes] = labels[i].split(":").map(Number);
const labelDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    hours,
    minutes,
    0
);
    if (labelDate >= currentDate) {
        //console.log(labels[i])
        filteredLabels.push(labels[i]);
        //console.log(prices[i])
        filteredPrices.push(prices[i]);
    }
}
labels=filteredLabels
prices=filteredPrices
//console.log(filteredLabels);
//console.log(filteredPrices);


    /* const filteredData = data.filter(item => item.labels >= currentTimestamp);
    labels = filteredData.map(item => {
                    //labels = data.data.map(item => {
                        const timestamp = item.timestamp * 1000; // Muudame millisekunditeks
                        //return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const date = new Date(timestamp)
                        //console.log("timestamp "+date.getHours() + ':00')
                        return (date.getHours() +':'+ date.getMinutes());
                    }).slice(0,96);
                    prices =  filteredData.map(item => item.price * 0.122).slice(0,96);*/

}


async function loadUserPreferences() {
    console.log('loadUserPreferences')
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
            if (threshold !== userData.threshold) {


                threshold = userData.threshold


                document.getElementById('priceThreshold').value = threshold;
                if (labels.length > 0) {
                    console.log(prices[0])
                
                drawChart(labels, prices)
            }
            }

            //document.getElementById('belowThreshold').textContent = userData.belowThreshold; // Esimene hind alla künnise
            console.log("Andmed laaditud:", userData);
        } else {
            console.log("Andmeid ei leitud selle IP-aadressiga.");
        }
    } catch (error) {
        console.error("Andmete laadimine ebaõnnestus:", error);
    }
}
document.getElementById('priceThreshold').addEventListener('change', async () => {
    console.log('priceThreshold change')
    threshold = parseFloat(document.getElementById('priceThreshold').value);
    if (isNaN(threshold)) {
        alert("Palun sisesta kehtiv number!");
        return;
    }
    drawChart(labels, prices)

    const ipResponse = await fetch("https://api.ipify.org?format=json");
    const ipData = await ipResponse.json();
    //const userIp = ipData.ip;
    const userIp = ipData.ip.replaceAll(".", "_");

    console.log((userIp))
    const userRef = ref(database, `userPreferences/${userIp}`);

    set(userRef, {
        ip: userIp,
        threshold: threshold,
        //belowThreshold: belowThreshold,
        timestamp: new Date().toISOString()
    }).then(() => {
        console.log("Andmed salvestatud Firebase’i! " + threshold);
    }).catch((error) => {
        console.error("Andmete salvestamine ebaõnnestus:", error);
    });
});
function drawChart(labels, prices) {

    console.log('drawChart threshold=' + threshold + prices.Number)
    const minPrice = Math.min(...prices);  // Leia madalaim hind
    const minIndex = prices.indexOf(minPrice);  // Leia madalaima hinna indeks
    //threshold  = parseFloat(document.getElementById('priceThreshold').value);
    // Leia järgmine madalaim hind
    let nextMinPrice = Number.MAX_VALUE;
    let nextMinIndex = -1;
    let belowThresholdIndex = -1;
    let belowThreshold = "Pole saadaval";
    //prices[0]!==minPrice 
    //index !== minIndex
    //document.getElementById('currentPrice').textContent = prices[0].toFixed(2);
    //document.getElementById('nextHourPrice').textContent = prices[1].toFixed(2);
    console.log("minIndex index is " + minIndex)
    if (minIndex !== 0) {
        console.log("minIndex index is not 0")
        nextMinPrice = minPrice;
        nextMinIndex = minIndex;
    }


    prices.forEach((price, index) => {
        if (index !== minIndex && price < nextMinPrice) {
            // Kontrollime, et hind ei ole sama, mis minPrice ja on väiksem kui järgmine madalaim hind
            nextMinPrice = price;
            nextMinIndex = index;
        }
        if (belowThresholdIndex === -1 && price < threshold) {
            console.log('belowThreshold'+labels[index])
            belowThreshold = `${labels[index]} (${price.toFixed(2)} senti/KWh)`;
            //document.getElementById('belowThreshold').textContent = `${labels[index]} (${price.toFixed(2)} senti/KWh)`|| "Pole saadaval";
            belowThresholdIndex = index;
        }


    });
 //document.getElementById('belowThreshold').textContent = belowThreshold;

 document.getElementById('belowThreshold').textContent = belowThreshold;
 document.getElementById('currentPrice').textContent = prices[0].toFixed(2);
 document.getElementById('nextHourPrice').textContent = prices[1].toFixed(2);



    const backgroundColors = prices.map((price, index) => {
        if (index === minIndex) return 'green'; // Kõige madalam hind
        if (index === nextMinIndex) return 'orange'; // Järgmine madalaim hind
        if (price <= document.getElementById('priceThreshold').value) return 'orange';
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
    console.log("nextLowestTime="+nextLowestTime)
    document.getElementById('nextLowestTime').textContent = nextLowestTime + " hind: " + nextMinPrice.toFixed(2) + " senti/KWh" || "Pole saadaval";
     if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('priceChart').getContext('2d');
    chart = new Chart(ctx, {
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
console.log('end line 250 threshold=' + threshold)
window.addEventListener('load', loadUserPreferences);
//loadUserPreferences()
fetchElectricityPrices();  // Lae hinnad ja joonista graafik
});