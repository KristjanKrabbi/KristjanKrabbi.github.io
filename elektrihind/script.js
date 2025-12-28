// Import Firebase'i andmebaasi
import { database } from '../krabikuller/firebase.js';
import { ref, push, set, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
let chart = null; // Globaalse muutuja lisamine
let timestamps = [];
let labels = [];
let prices = [];
let lastHour = new Date().getHours();
let now = new Date();
let currentTimestamp = new Date(RoundTime(now, 15)).getTime() / 1000

document.addEventListener("DOMContentLoaded", function () {

    let threshold = document.getElementById('priceThreshold').value;
    async function fetchElectricityPrices() {
        console.log('fetchElectricityPrices')
        // now = new Date();
        const currentTime = new Date(RoundTime(now, 15)).getTime() / 1000
        const currentHour = now.getHours();
        const currentDate = now.toISOString().split('T')[0]; // Praegune kuupäev (YYYY-MM-DD)
        const lastHourRef = ref(database, 'electricityPrices/lastHour');
        //const currentTimestamp = Math.floor(now.getTime() / 1000); // Praegune aeg sekundites
        // currentTimestamp = new Date(RoundTime(now, 15)).getTime() / 1000
        // Math.floor(
        //     new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() - 14, 0).getTime() / 1000
        // );
        console.log("Praegune aeg ", { currentTimestamp });
        // console.log('timestamps.length', timestamps.length)
        console.log("Praegune aeg ", { currentTime });

        if (labels.length > 0 && prices.length > 0) {

            await filterData(currentTimestamp, timestamps);
            console.log("Andmed mälust:", { labels, prices, timestamps });
            drawChart(labels, prices); // Kasutame mälus olevaid andmeid
            if (labels.length >= 96 || lastHour === currentHour) {
                console.log(`timestamps.length ${timestamps.length} viimane tund ${lastHour}`)
                return;
            }
        }

        try {
            let lastHourData = null
            let dataLastHour = null
            let lastDate = null
            if (timestamps.length !== 0) {
                console.log(timestamps.length)

                // Hangi viimane salvestatud tund Firebase'ist
                const snapshot = await get(lastHourRef);

                if (snapshot.exists()) {
                    lastHourData = snapshot.val();
                    //const{ hour: dataLastHour, date: lastDate } = lastHourData;
                    lastDate = lastHourData.date
                    dataLastHour = lastHourData.hour
                    console.log(lastDate + ' ' + dataLastHour)
                }
            } else {
                dataLastHour = currentHour
                lastDate = currentDate
            }
            console.log(lastDate + ' ' + dataLastHour)
            // Kontrollime, kas tund või kuupäev on muutunud
            if (dataLastHour === currentHour && lastDate === currentDate) {
                console.log("Tund ja kuupäev pole muutunud. Laen andmed Firebase'ist...");
                const pricesRef = ref(database, 'electricityPrices/current');
                const priceSnapshot = await get(pricesRef);

                if (priceSnapshot.exists()) {
                    const data = priceSnapshot.val();
                    console.log('data.length ', data.data.length);
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
                    timestamps = data.data.filter(item => item.timestamp >= today)
                    await filterData(currentTimestamp, data.data);
                    /* const filteredData = data.data.filter(item => item.timestamp >= currentTimestamp);
 
                    labels = filteredData.map(item => {
                    //labels = data.data.map(item => {
                        const timestamp = item.timestamp * 1000; // Muudame millisekunditeks
                        //return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const date = new Date(item.timestamp * 1000)
                        //console.log("timestamp "+date)
                        return (date.getHours() +':'+ date.getMinutes());
                    }).slice(0,96);
                    prices = filteredData.map(item => item.price * 0.124).slice(0,96);
                    timestamps=filteredData; */

                    //prices = data.data.map(item => item.price * 0.122).slice(0,24);
                    lastHour = currentHour; // Uuendame viimase tunni jälgijat
                    console.log("Andmed Firebase'ist:", { labels, prices, timestamps });
                    drawChart(labels, prices);
                    if (labels.length >= 96) {
                        return;
                    }
                } else {
                    console.error("Firebase'ist ei leitud andmeid.");
                }
            }


            if (labels.length <= 60 && dataLastHour !== currentHour) {
                console.log('labels.length laen serverist', labels.length)

                const API_URL = "https://us-central1-krabikuller.cloudfunctions.net/fetchElectricityPrices";

                const start = new Date(now.setMinutes(0, 0, 0)).toISOString();
                // Järgmise päeva kuupäeva ja südaöö arvutamine
                const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
                const end = new Date(tomorrow.getTime() +  60 * 60 * 1000).toISOString(); // Järgmise päeva südaöö
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
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
                        timestamps = data.data.ee.filter(item => item.timestamp >= today)
                        await filterData(currentTimestamp, data.data.ee)
                        /* labels = data.data.ee.map(item => {
                            const timestamp =new Date( item.timestamp * 1000);
                            return (timestamp.getHours() + ':'+ timestamp.getMinutes());
                          }).slice(0, 96);
                          prices = data.data.ee.map(item => item.price* 0.124).slice(0, 96);
                          timestamps=data.data.ee; */
                        lastHour = currentHour; // Uuendame viimase tunni jälgijat
                        console.log("Andmed serverist:", { labels, prices, timestamps });
                        drawChart(labels, prices);
                    })
            }
            //.catch(error => console.error("Error:", error));
        } catch (error) {
            console.error("Viga Firebase'i päringus:", error);
        }
    }
    async function filterData(currentTimestamp, data) {

        const filteredData = data.filter(item => item.timestamp >= currentTimestamp);
        labels = filteredData.map(item => {
            const date = new Date(item.timestamp * 1000);// Muudame millisekunditeks
            return (date.getHours() + ':' + date.getMinutes());
        }).slice(0, SelectedHourscookie('',get)*4);
        prices = filteredData.map(item => item.price * 0.124).slice(0,  SelectedHourscookie('',get)*4);
        //timestamps = filteredData;
    }

    function loadUserPreferences() {
        console.log('loadUserPreferences')
        let userPreferences = getCookie('UserPreferences')
        if (!userPreferences) {

            setCookie('UserPreferences', document.getElementById('priceThreshold').value, 365)
        }
        document.getElementById('priceThreshold').value = userPreferences;
        threshold = userPreferences;
        document.getElementById(SelectedHourscookie('',get)+'h').classList.add('active-btn')
       console.log( SelectedHourscookie('',get)+'h')

    }

    /* async function loadUserPreferences() {
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
    } */

    document.getElementById('priceThreshold').addEventListener('change', async () => {
        console.log('priceThreshold change')
        threshold = (document.getElementById('priceThreshold').value);
        if (isNaN(parseFloat(threshold))) {
            alert("Palun sisesta kehtiv number!");
            return;
        }
        console.log('priceThreshold change', threshold)
        drawChart(labels, prices)

        setCookie('UserPreferences', threshold, 365)

        /* const ipResponse = await fetch("https://api.ipify.org?format=json");
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
        }); */
    });

    function drawChart(labels, prices) {

        console.log('drawChart threshold=' + threshold + prices.Number)
        const minPrice = Math.min(...prices);  // Leia madalaim hind
        const minIndex = prices.indexOf(minPrice);  // Leia madalaima hinna indeks
        // Leia järgmine madalaim hind
        let nextMinPrice = Number.MAX_VALUE;
        let nextMinIndex = -1;
        let belowThresholdIndex = -1;
        let belowThreshold = "Pole saadaval";

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
                console.log('belowThreshold' + labels[index])
                belowThreshold = `${labels[index]} (${price.toFixed(2)} senti/KWh)`;
                //document.getElementById('belowThreshold').textContent = `${labels[index]} (${price.toFixed(2)} senti/KWh)`|| "Pole saadaval";
                belowThresholdIndex = index;
            }
        });
        document.getElementById('belowThreshold').textContent = belowThreshold;
        //document.getElementById('currentPrice').parentElement.parentElement.textContent='xxx:<strong> <span id="currentPrice" class="data">Laadimine...</span></strong>'
        document.getElementById('currentPrice').textContent = prices[0].toFixed(2);

        document.getElementById('nextHourPrice').textContent = prices[1].toFixed(2);

        const backgroundColors = prices.map((price, index) => {
            if (index === minIndex) return 'green'; // Kõige madalam hind
            if (index === nextMinIndex) return 'orange'; // Järgmine madalaim hind
            if (price <= threshold) return 'orange';
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
        console.log("nextLowestTime=" + nextLowestTime)
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
                    borderWidth: 0.5,
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
    const selector = document.getElementsByClassName("selectedDay");
    document.getElementById('refresh').addEventListener('click', function (e) {
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        now = new Date();
        lastHour = now.getHours()
        currentTimestamp = new Date(RoundTime(now, 15)).getTime() / 1000
        fetchElectricityPrices();
        this.classList.add('active-btn');
    });
    document.getElementById('tomorrow').addEventListener('click', function (e) {
        //const now = new Date();
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) / 1000;
        currentTimestamp = tomorrow;
        //lastHour=0
        console.log(currentTimestamp)
        filterData(tomorrow, timestamps);
        console.log("Andmed mälust tomorrow:", { labels, prices, timestamps });
        drawChart(labels, prices);
        this.classList.add('active-btn');
        //fetchElectricityPrices();
    });
    document.getElementById('today').addEventListener('click', function (e) {
        //const now = new Date();
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
        currentTimestamp = today;
        //lastHour=0
        console.log(currentTimestamp)
        //  filterData(today, timestamps);
        //     console.log("Andmed mälust:", { labels, prices, timestamps });
        //     drawChart(labels, prices);
        fetchElectricityPrices();
        this.classList.add('active-btn');
    });

    const buttons = document.getElementsByClassName("selectedHours");
    var buttonId=''
    /* for (let i = 0; i < buttons.length; i++) {
       // buttons[i].style.backgroundColor=""  
        buttons[i].addEventListener("click", function (e) {
            buttonId=e.target.id
            console.log(`You clicked: ${this.textContent}`,e.target.id,(e.target.id).replace(/\D/g, ''))
            SelectedHourscookie(buttonId.replace(/\D/g, ''),set)
            //alert(`You clicked: ${this.textContent}`);
            filterData(currentTimestamp, timestamps);

            buttons.forEach(b => b.style.backgroundColor="");
            buttons[i].style.backgroundColor="green";
        document.getElementById(buttonId).style.backgroundColor="green";
        drawChart(labels, prices);

        });
      
    } */
    Array.from(buttons).forEach(button => {
        button.addEventListener('click', function () {
            // Remove 'active-btn' class from all buttons
            Array.from(buttons).forEach(btn => btn.classList.remove('active-btn'));
console.log(button.id)
SelectedHourscookie(button.id.replace(/\D/g, ''),set)
            // Add 'active-btn' class to the clicked button
            this.classList.add('active-btn');
            filterData(currentTimestamp, timestamps);
            drawChart(labels, prices);
        });
    });

    console.log('end line 250 threshold=' + threshold)
    window.addEventListener('load', loadUserPreferences());
    //loadUserPreferences()
    fetchElectricityPrices();  // Lae hinnad ja joonista graafik
});

/**ymardab alla 'step' sammuga */
function RoundTime(now, step) {

    // Get current minutes
    let minutes = now.getMinutes();

    let roundedMinutes = Math.floor(minutes / step) * step;

    now.setMinutes(roundedMinutes, 0, 0);

    console.log("Rounded time:", now.toTimeString().slice(0, 5)); // HH:MM format
    return now
}

function UserPreferencescookie(value,getSet){
    if (getSet==get) {
       const userPreferences= getCookie('UserPreferences')
        return userPreferences
    } else if (getSet==set) {
        setCookie('UserPreferences',value,365)

    }


}
function SelectedHourscookie(value,getSet){
     if (getSet==get) {
       const selectedHours= getCookie('SelectedHours')
        return selectedHours
    } else if (getSet==set) {
        console.log('stt SelectedHours',value)
        setCookie('SelectedHours',value,365)
        
    }
//setCookie('SelectedHours',value,365)
}
/**
 * Set a cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days
 */
function setCookie(name, value, days) {
    if (typeof name !== "string" || typeof value !== "string") {
        console.error("Cookie name and value must be strings.");
        return;
    }
    let expires = "";
    if (typeof days === "number") {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value || "")}${expires}; path=/; Secure; SameSite=Strict`;
}

/**
 * Get a cookie by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
function getCookie(name) {
    const nameEQ = encodeURIComponent(name) + "=";
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        c = c.trim();
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length));
        }
    }
    return null;
}

/**
 * Delete a cookie by name
 * @param {string} name - Cookie name
 */
function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict`;
}
