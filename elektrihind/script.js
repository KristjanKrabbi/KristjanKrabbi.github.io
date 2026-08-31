// Import Firebase'i andmebaasi
import { database } from '../krabikuller/firebase.js';
import { ref, push, set, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
let chart = null; // Globaalse muutuja lisamine
let timestamps = [];
let labels = [];
let prices = [];
let lastHour = new Date().getHours();
const selectorState = { day: 'refresh', selectedHour: null, timeInteval: null };
document.addEventListener("DOMContentLoaded", function () {
    let now = new Date();
    let currentTimestamp = new Date(RoundTime(now, 15)).getTime() / 1000;
    const lastHourRef = ref(database, 'electricityPrices/lastHour');
    let threshold = document.getElementById('priceThreshold').value;
    let tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) / 1000;
    let today = 0
    const stockPriceHour = 14 //the hour from which stock prices are requested
    const stockPriceRelease = new Date(now.getFullYear(), now.getMonth(), now.getDate(), stockPriceHour, 0, 0).getTime() / 1000;

    /**
     * appState
     * @param {string} source-'memory'  'database'  'server'
     * @param {string} lastFetch-timestamp
     */
    const appState = { source: null, lastFetch: null };


    async function fetchElectricityPrices() {
        const {
            //now,
            currentHour,
            currentDate,
            tomorrowStart,
            tomorrowEnd
        } = getTimeContext();
        console.log('fetchElectricityPrices ', now.toLocaleString());

        // 1️⃣ Mälu
        if (canUseMemory(currentTimestamp)) {
            await filterData(currentTimestamp, timestamps);
            appState.source = 'memory';
            drawChart(labels, prices);
            const lastTimestamp = timestamps.at(-1)?.timestamp

            if (appState.lastFetch == currentTimestamp || lastTimestamp >= tomorrowEnd || currentTimestamp < stockPriceRelease) {
                console.log('andmed mälus piisavad. viimane timestamps: ' + new Date(lastTimestamp * 1000).toLocaleString() + ' lastFetch ' + new Date(appState.lastFetch * 1000).toLocaleString()
                    , appState.lastFetch == currentTimestamp, lastTimestamp >= tomorrowEnd, currentTimestamp < stockPriceRelease);
                return;
            }
        }

        // 2️⃣ Andmebaas
        if (ShouldDatabase(currentTimestamp, tomorrowStart)) {
            await GetDatabasePrices(currentHour, currentDate);

            if (canUseDatabase(currentTimestamp, tomorrowStart, tomorrowEnd, now)) {

                appState.source = 'database';
                //appState.lastFetch = currentTimestamp;

                return;
            }
        } else { return }
        // 3️⃣ Server
        console.log('                       GetStockPrices')
        GetStockPrices(currentHour, currentDate);
        appState.source = 'server';
    }

    function canUseMemory(currentTimestamp) {
        const lastTimestamp = timestamps.at(-1)?.timestamp;
        return lastTimestamp && lastTimestamp > currentTimestamp;
    }
    function ShouldDatabase(currentTimestamp, tomorrowStart) {
        const lastTimestamp = timestamps.at(-1)?.timestamp;
        if (!lastTimestamp) return true;
        const hasDataUntilTodayMidnight = lastTimestamp >= tomorrowStart;
        const fetchedRecently = appState.lastFetch == currentTimestamp;
        if (fetchedRecently && hasDataUntilTodayMidnight) {
            console.log('hiljutine päring + andmed kuni südaööni → ÄRA päringut tee')
            return false;
        }
        return true;

    }
    function canUseDatabase(currentTimestamp, tomorrowStart, tomorrowEnd, now) {
        const lastTimestamp = timestamps.at(-1)?.timestamp;
        if (!lastTimestamp) return false;

        // const stockPriceRelease = new Date(now.getFullYear(), now.getMonth(), now.getDate(), stockPriceHour, 0, 0).getTime() / 1000;

        const hasDataUntilTodayMidnight = lastTimestamp >= tomorrowStart;
        const hasDataUntilTomorrowEnd = lastTimestamp >= tomorrowEnd;
        const isBeforeRelease = currentTimestamp < stockPriceRelease;
        const isAfterRelease = currentTimestamp >= stockPriceRelease;

        // Enne avaldamist + andmed kuni südaööni → ÄRA päringut tee
        if (isBeforeRelease && hasDataUntilTodayMidnight) {
            console.log('Enne avaldamist + andmed kuni südaööni → ÄRA päringut tee')
            return true;
        }

        // Pärast avaldamist:
        // kui homsed andmed on juba olemas → kasuta DB-d
        if (isAfterRelease && hasDataUntilTomorrowEnd) {
            console.log('kui homsed andmed on juba olemas → kasuta DB-d')
            return true;
        }
        if (appState.lastFetch == currentTimestamp) {
            console.log('appState.lastFetch == currentTimestamp')
            return true;
        }

        // Muudel juhtudel on vaja serverist küsida
        console.log('Muudel juhtudel on vaja serverist küsida')
        return false;
    }

    async function GetDatabasePrices(currentHour, currentDate) {

        try {

            console.log(" Laen andmed Firebase'ist...");
            const pricesRef = ref(database, 'electricityPrices/current');
            const priceSnapshot = await get(pricesRef);

            if (priceSnapshot.exists()) {
                const data = priceSnapshot.val();
                const { todayStart } = getTimeContext();
                timestamps = data.data.filter(item => item.timestamp >= todayStart)
                await filterData(currentTimestamp, data.data);
                lastHour = currentHour; // Uuendame viimase tunni jälgijat
                console.log("Andmed Firebase'ist:", { labels, prices, timestamps });
                drawChart(labels, prices);

            } else {
                console.error("Firebase'ist ei leitud andmeid.");
            }
            //}

        } catch (error) {
            console.error("Viga Firebase'i päringus:", error);
        }
    }

    async function GetStockPrices(currentHour, currentDate) {
        try {
            const API_URL = "https://us-central1-krabikuller.cloudfunctions.net/fetchElectricityPrices";
            // const API_URL = `https://corsproxy.io/?https://dashboard.elering.ee/api/nps/price`;
            

            const start = new Date(now.setMinutes(0, 0, 0)).toISOString();
            // Järgmise päeva kuupäeva ja südaöö arvutamine
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);

            const end = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(); // Järgmise päeva südaöö
            //const end = new Date(Date.now(now.setMinutes(0, 0, 0)) + 24 * 60 * 60 * 1000).toISOString();
            console.log(`?start=${start} & end=${end}`)
            console.log(`${API_URL}?start=${start}&end=${end}`)
            // console.log("start=" + Date.parse(start) + " & " + (new Date(now.setMinutes(0, 0, 0)).toLocaleString()))
            fetch(`${API_URL}?start=${start}&end=${end}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Viga: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })

                .then(async data => {
                    console.log(data);
                    // Salvestame andmed Firebase'i
                    await set(lastHourRef, { hour: currentHour, date: currentDate });
                    appState.lastFetch = currentTimestamp;
                    const pricesRef = ref(database, 'electricityPrices/current');
                    const snapshot = await get(pricesRef);
                    let combinedData = []
                    if (snapshot.exists()) {
                        // Olemasolevate andmete käsitlus
                        const existingData = snapshot.val();
                        // Veendume, et andmed on massiivid
                        const existingPrices = Array.isArray(existingData.data) ? existingData.data : [];
                        const newPrices = Array.isArray(data.data.ee) ? data.data.ee : [];
                        //Eemaldame vanemad kanded
                        const { yesterdayStart } = getTimeContext();
                        const sorteddata = existingPrices.filter(item => item.timestamp >= yesterdayStart);
                        // Kombineerime massiivid ja eemaldame võimalikud duplikaadid
                        combinedData = [...sorteddata, ...newPrices].reduce((unique, item) => {
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
                    //const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
                    const { todayStart } = getTimeContext();
                    timestamps = combinedData.filter(item => item.timestamp >= todayStart)
                    await filterData(currentTimestamp, data.data.ee)

                    lastHour = currentHour; // Uuendame viimase tunni jälgijat
                    console.log("Andmed serverist:", { labels, prices, timestamps });
                    drawChart(labels, prices);
                })
        } catch (error) {
            console.error("Viga börs'i päringus:", error);
        }

    }
   
    async function filterData(currentTimestamp, data) {

        const selectedHours = selectorState.selectedHour;

        let filteredData = data.filter(
            item => item.timestamp >= currentTimestamp
        );

        // Tavaline 15-minutiline vaade
        if (selectorState.timeInteval == "15") {

            labels = filteredData.map(item => {
                const date = new Date(item.timestamp * 1000);

                let minutes = date.getMinutes();
                minutes = minutes.toString().padStart(2, '0');

                return `${date.getHours()}:${minutes}`;
            }).slice(0, selectedHours * 4);

            prices = filteredData
                .map(item => item.price * 0.124)
                .slice(0, selectedHours * 4);

            return;
        }

        // ==========================================
        // TUNNIPÕHINE VAADE
        // ==========================================

        const hourlyData = {};

        filteredData.forEach(item => {

            const date = new Date(item.timestamp * 1000);


            // const hourKey =
            //    `${date.getHours().toString().padStart(2, '0')}:00`;
            const hourKey =
                //`${date.getFullYear()}-` +
                // `${date.getMonth()}-` +
                `${date.getDate()}-` +
                `${date.getHours()}`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = [];
            }

            hourlyData[hourKey].push(item.price);
        });

        labels = [];
        prices = [];

        Object.entries(hourlyData)
            .slice(0, selectedHours)
            .forEach(([hour, hourPrices]) => {

                const average =
                    hourPrices.reduce((sum, price) => sum + price, 0)
                    / hourPrices.length;

                const [d, h] = hour.split("-").map(Number);
                labels.push(h + ':00')
                //labels.push(hour.slice(hour.search('-')+1)+' 00');
                // const hourx=`${date.getHours().toString().padStart(2, '0')}:00`
                // labels.push(hourx);
                prices.push(average * 0.124);
            });

        console.log("Tunnipõhised hinnad:", {
            labels,
            prices
        });
    }
    function loadUserPreferences() {
        //console.log('loadUserPreferences')
        let userPreferences = getCookie('UserPreferences')
        if (!userPreferences) {
            userPreferences = threshold
            setCookie('UserPreferences', threshold, 365)
        }
        document.getElementById('priceThreshold').value = userPreferences;
        threshold = userPreferences;
        let SelectedHours = SelectedHourscookie('', get)
        if (!SelectedHours) {
            SelectedHourscookie('24', set)
            SelectedHours = '24'
        }
        document.getElementById(SelectedHours + 'h').classList.add('active-btn')
        selectorState.selectedHour = SelectedHours

        let timeInteval = getCookie('timeInteval')
        if (!timeInteval) {
            timeInteval = '15'
            setCookie('timeInteval', '15', 365)
        }
        selectorState.timeInteval = timeInteval
        document.getElementById('toggleSwitch').checked = (timeInteval == 60);
        document.getElementById('statusText').textContent = (timeInteval == 60) ? '1h intervall' : '15 min intervall'

    }

    document.getElementById('priceThreshold').addEventListener('change', async () => {

        threshold = (document.getElementById('priceThreshold').value);
        if (isNaN(parseFloat(threshold))) {
            alert("Palun sisesta kehtiv number!");
            return;
        }

        setCookie('UserPreferences', threshold, 365)
        drawChart(labels, prices)
    });

    function drawChart(labels, prices) {
        const mean = data => {
            if (data.length < 1) { return; } return data.reduce((prev, current) => prev + current) / data.length;
        };

        const minPrice = Math.min(...prices);  // Leia madalaim hind
        const minIndex = prices.indexOf(minPrice);  // Leia madalaima hinna indeks
        const maxPrice = Math.max(...prices);
        const midPrice = mean(prices);

        // Leia järgmine madalaim hind
        let nextMinPrice = Number.MAX_VALUE;
        let nextMinIndex = -1;
        let belowThresholdIndex = -1;
        let belowThreshold = "Pole saadaval";
        let bTTime = ''
        let btIndex = 0

        if (minIndex !== 0) {

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

                if (index == 0 && selectorState.day == 'refresh') {
                    bTTime = 'Praegu'
                } else {
                    bTTime = `${labels[index]}`
                }
                belowThreshold = `${bTTime} (${prices[index].toFixed(2)} senti/KWh)`;
                //document.getElementById('belowThreshold').textContent = `${labels[index]} (${price.toFixed(2)} senti/KWh)`|| "Pole saadaval";
                belowThresholdIndex = index;
            }
        });
        let lowestPriceRow = ''
        let secondPriceRow = ''
        let firstPriceRow = ''
        let secondPriceRowPrice = ''
        let firstPriceRowPrice = ''
        if (selectorState.day == 'tomorrow' || selectorState.day == 'today') {
            if (selectorState.selectedHour == '24') {
                lowestPriceRow = 'Päeva odavaim hind on kell:'
                secondPriceRow = 'Päeva kõrgeim hind:senti/KWh'
                firstPriceRow = 'Päeva keskmine hind:senti/KWh'
            } else {
                lowestPriceRow = 'Ajavahemiku odavaim hind on kell:'
                secondPriceRow = 'Ajavahemiku kõrgeim hind:senti/KWh'
                firstPriceRow = 'Ajavahemiku keskmine hind:senti/KWh'
            }

            secondPriceRowPrice = maxPrice.toFixed(2);
            firstPriceRowPrice = midPrice.toFixed(2);

        } else {
            lowestPriceRow = 'Järgmine odavaim hind on kell:'
            secondPriceRow = 'Järgmise tunni hind:senti/KWh'
            firstPriceRow = 'Hetke hind:senti/KWh'
            secondPriceRowPrice = prices[1].toFixed(2)
            firstPriceRowPrice = prices[0].toFixed(2)

        };

        document.getElementById('belowThreshold').textContent = belowThreshold;

        document.getElementById('lowestPriceRow').textContent = lowestPriceRow
        document.getElementById('currentPrice').textContent = firstPriceRowPrice;
        document.getElementById('firstPriceRow').textContent = firstPriceRow;

        document.getElementById('nextHourPrice').textContent = secondPriceRowPrice;
        document.getElementById('secondPriceRow').textContent = secondPriceRow;
        // Muuda madalaima hinna tulba värvi 
        const backgroundColors = prices.map((price, index) => {
            if (index === minIndex) return 'green'; // Kõige madalam hind
            if (index === nextMinIndex) return 'orange'; // Järgmine madalaim hind
            if (price <= threshold) return 'orange';
            return 'rgba(75, 192, 192, 0.2)'; // Muud tulbad
        });

        // Muuda madalaima hinna tulba äärise värv
        const borderColors = prices.map((price, index) => {
            if (index === minIndex) return 'darkgreen';
            if (index === nextMinIndex) return 'darkorange';
            return 'rgba(75, 192, 192, 1)';
        });

        // Kuvame järgmise madalaima hinna kellaaja
        const nextLowestTime = labels[nextMinIndex];

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
                    borderWidth: 0.6,
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
    const selectedHoursButtons = document.getElementsByClassName("selectedHours");
    document.getElementById('refresh').addEventListener('click', function (e) {
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        now = new Date();
        //lastHour = now.getHours()
        //currentTimestamp = new Date(RoundTime(now, 15)).getTime() / 1000
        currentTimestamp = getTimeContext().currentTimestamp
        selectorState.selectedHour = SelectedHourscookie('', get);
        selectorState.day = 'refresh'
        activeButtonsClassList(selectedHoursButtons, selectorState.selectedHour + 'h');
        fetchElectricityPrices();
        this.classList.add('active-btn');
    });
    document.getElementById('tomorrow').addEventListener('click', function (e) {
        now = new Date();
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) / 1000;
        currentTimestamp = tomorrow;
        //lastHour=0

        activeButtonsClassList(selectedHoursButtons, (selectorState.day == 'tomorrow')? selectorState.selectedHour+'h':'24h');
        selectorState.selectedHour = (selectorState.day == 'tomorrow')? selectorState.selectedHour:'24';
        selectorState.day = 'tomorrow'
        filterData(tomorrow, timestamps);
        // console.log("Andmed mälust tomorrow:", { labels, prices, timestamps });
        //document.getElementById('24h').classList.add('active-btn')
        appState.source = 'memory';
        drawChart(labels, prices);
        this.classList.add('active-btn');

    });
    document.getElementById('today').addEventListener('click', function (e) {
        now = new Date();
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
        currentTimestamp = today;

        activeButtonsClassList(selectedHoursButtons, (selectorState.day == 'today')? selectorState.selectedHour+'h':'24h');
        selectorState.selectedHour =(selectorState.day == 'today')? selectorState.selectedHour:'24';
        selectorState.day = 'today'
        filterData(today, timestamps);
        appState.source = 'memory';
        drawChart(labels, prices);
        this.classList.add('active-btn');
    });

    Array.from(selectedHoursButtons).forEach(button => {
        button.addEventListener('click', function () {
            // Remove 'active-btn' class from all buttons
            Array.from(selectedHoursButtons).forEach(btn => btn.classList.remove('active-btn'));

            SelectedHourscookie(button.id.replace(/\D/g, ''), set)
            selectorState.selectedHour = button.id.replace(/\D/g, '');
            // Add 'active-btn' class to the clicked button
            this.classList.add('active-btn');
            filterData(currentTimestamp, timestamps);
            appState.source = 'memory';
            drawChart(labels, prices);
        });
    });
    /**
     * @param {HTMLAllCollection} collection 
     * @param {HTMLElement} element 
     * @param {string} elementId 
     */
    function activeButtonsClassList(collection, elementId) {
        Array.from(collection).forEach(btn => btn.classList.remove('active-btn'));

        document.getElementById(elementId).classList.add('active-btn');
        // element.classList.add('active-btn');
    }

    document.getElementById('toggleSwitch').addEventListener('change', function () {
        const switchState = this.checked ? true : false;
        document.getElementById('statusText').textContent = switchState ? '1h intervall' : '15 min intervall'
        setCookie("timeInteval", switchState ? '60' : '15', 365)
        selectorState.timeInteval = switchState ? '60' : '15'
        document.getElementById(selectorState.day).click();

    })

    window.addEventListener('load', loadUserPreferences());
    //loadUserPreferences()
    fetchElectricityPrices();  // Lae hinnad ja joonista graafik


});

/**ymardab alla 'step' sammuga */
function RoundTime(now, step) {
    // Get current minutes
    let minutes = now.getMinutes();
    let roundedMinutes = Math.floor(minutes / step) * step;
    let nowTime = new Date(now)
    nowTime.setMinutes(roundedMinutes, 0, 0);
    //console.log("Rounded time:", now.toTimeString().slice(0, 5)); // HH:MM format
    return nowTime
}


function SelectedHourscookie(value, getSet) {
    if (getSet == get) {
        const selectedHours = getCookie('SelectedHours')
        return selectedHours
    } else if (getSet == set) {

        setCookie('SelectedHours', value, 365)

    }

}
/**
 * Set a cookie
 * @param {string} name - Cookie name,
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
function getTimeContext() {
    const now = new Date();

    return {
        now,
        currentTimestamp: (RoundTime(now, 15)).getTime() / 1000,
        currentHour: now.getHours(),
        currentDate: now.toISOString().split('T')[0],
        todayStart: new Date(
            now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0
        ).getTime() / 1000,
        tomorrowStart: new Date(
            now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0
        ).getTime() / 1000,
        tomorrowEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0).getTime() / 1000,
        yesterdayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0).getTime() / 1000
    };
}
